const pool = require("../config/db");
const { notifyUser } = require("./notification.services");

const normalizeTime = (value) => {
  if (!value) return null;
  const time = String(value);
  return time.length === 5 ? `${time}:00` : time;
};

const submitJobRequest = async (workerId, jobId, payload) => {
  const result = await pool.query(
    `
      INSERT INTO job_requests (job_id, worker_id, proposed_budget, message, proposed_date)
      SELECT j.id, wp.user_id, $3, $4, $5
      FROM jobs j
      JOIN worker_profiles wp ON wp.user_id = $1
      JOIN users u ON u.id = wp.user_id AND u.is_active = TRUE
      WHERE j.id = $2 AND j.status = 'OPEN' AND wp.approval_status = 'APPROVED'
        AND j.customer_id <> wp.user_id
      ON CONFLICT (job_id, worker_id) DO UPDATE
      SET proposed_budget = EXCLUDED.proposed_budget,
          message = EXCLUDED.message,
          proposed_date = EXCLUDED.proposed_date,
          status = 'PENDING',
          updated_at = NOW()
      WHERE job_requests.status IN ('REJECTED', 'WITHDRAWN')
      RETURNING id, job_id AS "jobId", worker_id AS "workerId",
        proposed_budget AS "proposedBudget", message,
        proposed_date AS "proposedDate", status,
        created_at AS "createdAt", updated_at AS "updatedAt"
    `,
    [
      workerId,
      jobId,
      payload.proposedBudget,
      payload.message,
      payload.proposedDate,
    ],
  );

  if (result.rowCount === 1) {
    const jobDetails = await pool.query(
      `SELECT customer_id, title FROM jobs WHERE id = $1`,
      [jobId],
    );
    const job = jobDetails.rows[0];
    if (job) {
      await notifyUser({
        userId: job.customer_id,
        type: "NEW_JOB_REQUEST",
        title: "New worker quotation",
        message: `A worker submitted a quotation for ${job.title}.`,
        data: { jobId, requestId: result.rows[0].id },
      });
    }
    return result.rows[0];
  }

  const statusResult = await pool.query(
    `
      SELECT j.status AS "jobStatus", wp.approval_status AS "approvalStatus",
        wp.user_id AS "workerId", j.customer_id AS "customerId",
        jr.status AS "existingRequestStatus"
      FROM jobs j
      LEFT JOIN worker_profiles wp ON wp.user_id = $1
      LEFT JOIN job_requests jr ON jr.job_id = j.id AND jr.worker_id = $1
      WHERE j.id = $2
    `,
    [workerId, jobId],
  );
  const state = statusResult.rows[0];
  if (!state) return { error: "JOB_NOT_FOUND" };
  if (!state.workerId || state.approvalStatus !== "APPROVED") {
    return { error: "WORKER_NOT_APPROVED" };
  }
  if (state.customerId === workerId) return { error: "OWN_JOB" };
  if (state.jobStatus !== "OPEN") return { error: "JOB_NOT_OPEN" };
  if (state.existingRequestStatus) return { error: "REQUEST_ALREADY_EXISTS" };
  return { error: "REQUEST_NOT_CREATED" };
};

const getBookingRequestsForWorker = async (workerId) => {
  const result = await pool.query(
    `
      SELECT b.id, b.job_id AS "jobId", j.title AS "jobTitle",
        b.customer_id AS "customerId", u.name AS "customerName",
        u.phone AS "customerPhone", b.worker_id AS "workerId",
        b.scheduled_date AS "scheduledDate", b.start_time AS "startTime",
        b.end_time AS "endTime", b.status,
        b.confirmed_at AS "confirmedAt", b.created_at AS "createdAt",
        b.updated_at AS "updatedAt"
      FROM bookings b
      JOIN users u ON u.id = b.customer_id
      LEFT JOIN jobs j ON j.id = b.job_id
      WHERE b.worker_id = $1
      ORDER BY CASE WHEN b.status = 'PENDING_CONFIRMATION' THEN 0 ELSE 1 END,
        b.created_at DESC
    `,
    [workerId],
  );
  return result.rows;
};

const listWorkerAvailability = async (workerId) => {
  const result = await pool.query(
    `
      SELECT id, availability_date AS "availabilityDate",
        start_time AS "startTime", end_time AS "endTime", status,
        booking_id AS "bookingId", created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM worker_availability
      WHERE worker_id = $1
      ORDER BY availability_date ASC, start_time ASC NULLS FIRST
    `,
    [workerId],
  );
  return result.rows;
};

const saveWorkerAvailability = async (workerId, entries) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const workerResult = await client.query(
      `SELECT user_id FROM worker_profiles WHERE user_id = $1 FOR UPDATE`,
      [workerId],
    );
    if (workerResult.rowCount === 0) {
      const error = new Error("Worker profile not found");
      error.code = "WORKER_PROFILE_NOT_FOUND";
      throw error;
    }

    const saved = [];
    for (const entry of entries) {
      const result = await client.query(
        `
          INSERT INTO worker_availability
            (worker_id, availability_date, start_time, end_time, status)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, availability_date AS "availabilityDate",
            start_time AS "startTime", end_time AS "endTime", status,
            booking_id AS "bookingId", created_at AS "createdAt",
            updated_at AS "updatedAt"
        `,
        [
          workerId,
          entry.availabilityDate,
          entry.startTime,
          entry.endTime,
          entry.status,
        ],
      );
      saved.push(result.rows[0]);
    }

    await client.query("COMMIT");
    return saved;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const respondToBookingRequest = async (workerId, bookingId, payload) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const bookingResult = await client.query(
      `SELECT id, job_id, status, scheduled_date, start_time, end_time FROM bookings WHERE id = $1 AND worker_id = $2 FOR UPDATE`,
      [bookingId, workerId],
    );
    const booking = bookingResult.rows[0];
    if (!booking) {
      await client.query("ROLLBACK");
      return null;
    }
    if (booking.status !== "PENDING_CONFIRMATION") {
      const error = new Error("Booking request is no longer pending");
      error.code = "BOOKING_NOT_PENDING";
      throw error;
    }

    let result;
    if (payload.decision === "ACCEPT") {
      const scheduledDate = payload.scheduledDate || booking.scheduled_date;
      const startTime = payload.startTime ?? booking.start_time;
      const endTime = payload.endTime ?? booking.end_time;
      const conflictResult = await client.query(
        `
          SELECT id
          FROM bookings
          WHERE worker_id = $1 AND id <> $2 AND scheduled_date = $3::date
            AND status IN ('CONFIRMED', 'IN_PROGRESS')
            AND (
              start_time IS NULL OR end_time IS NULL OR
              $4::time IS NULL OR $5::time IS NULL OR
              (start_time < $5::time AND end_time > $4::time)
            )
          LIMIT 1
        `,
        [workerId, bookingId, scheduledDate, startTime, endTime],
      );
      if (conflictResult.rowCount > 0) {
        const error = new Error(
          "The worker already has a booking at that time",
        );
        error.code = "SCHEDULE_CONFLICT";
        throw error;
      }

      const calendarResult = await client.query(
        `
          SELECT start_time, end_time, status
          FROM worker_availability
          WHERE worker_id = $1 AND availability_date = $2::date
            AND booking_id IS NULL
        `,
        [workerId, scheduledDate],
      );
      const normalizedStartTime = normalizeTime(startTime);
      const normalizedEndTime = normalizeTime(endTime);
      const unavailableConflict = calendarResult.rows.some((slot) => {
        if (slot.status !== "UNAVAILABLE") return false;
        if (!slot.start_time || !slot.end_time || !startTime || !endTime) {
          return true;
        }
        return (
          normalizeTime(slot.start_time) < normalizedEndTime &&
          normalizeTime(slot.end_time) > normalizedStartTime
        );
      });
      const availableWindows = calendarResult.rows.filter(
        (slot) => slot.status === "AVAILABLE",
      );
      const fitsAvailableWindow = availableWindows.some((slot) => {
        if (!slot.start_time && !slot.end_time) return true;
        if (!startTime || !endTime || !slot.start_time || !slot.end_time) {
          return false;
        }
        return (
          normalizeTime(slot.start_time) <= normalizedStartTime &&
          normalizeTime(slot.end_time) >= normalizedEndTime
        );
      });
      if (
        unavailableConflict ||
        (availableWindows.length > 0 && !fitsAvailableWindow)
      ) {
        const error = new Error(
          "The booking does not fit the worker's available calendar",
        );
        error.code = "WORKER_UNAVAILABLE";
        throw error;
      }

      result = await client.query(
        `
          UPDATE bookings
          SET scheduled_date = COALESCE($1::date, scheduled_date),
            start_time = COALESCE($2::time, start_time),
            end_time = COALESCE($3::time, end_time),
            status = 'CONFIRMED', confirmed_at = NOW(), updated_at = NOW()
          WHERE id = $4
          RETURNING id, job_id AS "jobId", customer_id AS "customerId",
            worker_id AS "workerId", scheduled_date AS "scheduledDate",
            start_time AS "startTime", end_time AS "endTime", status,
            confirmed_at AS "confirmedAt", created_at AS "createdAt",
            updated_at AS "updatedAt"
        `,
        [
          payload.scheduledDate ?? null,
          payload.startTime ?? null,
          payload.endTime ?? null,
          bookingId,
        ],
      );
      if (booking.job_id) {
        await client.query(
          `UPDATE jobs SET status = 'SCHEDULED', updated_at = NOW() WHERE id = $1 AND status = 'WORKER_SELECTED'`,
          [booking.job_id],
        );
      }
      await client.query(
        `
          INSERT INTO worker_availability
            (worker_id, availability_date, start_time, end_time, status, booking_id)
          VALUES ($1, $2, $3, $4, 'UNAVAILABLE', $5)
        `,
        [workerId, scheduledDate, startTime, endTime, bookingId],
      );
    } else {
      result = await client.query(
        `
          UPDATE bookings SET status = 'CANCELLED', updated_at = NOW()
          WHERE id = $1
          RETURNING id, job_id AS "jobId", customer_id AS "customerId",
            worker_id AS "workerId", scheduled_date AS "scheduledDate",
            start_time AS "startTime", end_time AS "endTime", status,
            confirmed_at AS "confirmedAt", created_at AS "createdAt",
            updated_at AS "updatedAt"
        `,
        [bookingId],
      );
      if (booking.job_id) {
        await client.query(
          `UPDATE jobs SET status = 'OPEN', updated_at = NOW() WHERE id = $1 AND status = 'WORKER_SELECTED'`,
          [booking.job_id],
        );
        await client.query(
          `UPDATE job_requests SET status = 'REJECTED', updated_at = NOW() WHERE job_id = $1 AND worker_id = $2 AND status = 'SELECTED'`,
          [booking.job_id, workerId],
        );
      }
    }

    await client.query("COMMIT");
    const updatedBooking = result.rows[0];
    if (payload.decision === "ACCEPT") {
      await notifyUser({
        userId: updatedBooking.customerId,
        type: "BOOKING_CONFIRMED",
        title: "Booking confirmed",
        message: "The worker confirmed your booking date.",
        data: { bookingId, jobId: updatedBooking.jobId },
      });
    } else {
      await notifyUser({
        userId: updatedBooking.customerId,
        type: "BOOKING_REJECTED",
        title: "Booking request declined",
        message: "The worker declined your booking request.",
        data: { bookingId, jobId: updatedBooking.jobId },
      });
    }
    return updatedBooking;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const cancelBooking = async (workerId, bookingId, reason) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const bookingResult = await client.query(
      `SELECT id, job_id, status FROM bookings WHERE id = $1 AND worker_id = $2 FOR UPDATE`,
      [bookingId, workerId],
    );
    const booking = bookingResult.rows[0];
    if (!booking) {
      await client.query("ROLLBACK");
      return null;
    }
    if (!["CONFIRMED", "IN_PROGRESS"].includes(booking.status)) {
      const error = new Error(
        "Only confirmed or in-progress bookings can be cancelled",
      );
      error.code = "BOOKING_NOT_CANCELLABLE";
      throw error;
    }

    await client.query(
      `INSERT INTO cancellations (job_id, booking_id, cancelled_by, cancelled_by_role, reason) VALUES ($1, $2, $3, 'WORKER', $4)`,
      [booking.job_id, booking.id, workerId, reason],
    );
    await client.query(
      `UPDATE bookings SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1`,
      [bookingId],
    );
    await client.query(
      `UPDATE worker_availability SET status = 'AVAILABLE', updated_at = NOW() WHERE booking_id = $1`,
      [bookingId],
    );
    if (booking.job_id) {
      await client.query(
        `UPDATE jobs SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1 AND status IN ('SCHEDULED', 'IN_PROGRESS')`,
        [booking.job_id],
      );
    }

    await client.query("COMMIT");
    return { bookingId, status: "CANCELLED" };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  submitJobRequest,
  getBookingRequestsForWorker,
  respondToBookingRequest,
  listWorkerAvailability,
  saveWorkerAvailability,
  cancelBooking,
};
