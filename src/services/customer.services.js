const pool = require("../config/db");
const { notifyUser } = require("./notification.services");

const getJob = async (client, jobId) => {
  const jobResult = await client.query(
    `
      SELECT j.id, j.customer_id AS "customerId", j.title, j.description,
        j.category_id AS "categoryId", c.name_en AS "categoryNameEn",
        c.name_si AS "categoryNameSi", c.slug AS "categorySlug",
        j.district, j.city, j.venue, j.preferred_date AS "preferredDate",
        j.status, j.approved_by AS "approvedBy", j.approved_at AS "approvedAt",
        j.rejection_reason AS "rejectionReason", j.created_at AS "createdAt",
        j.updated_at AS "updatedAt"
      FROM jobs j
      JOIN categories c ON c.id = j.category_id
      WHERE j.id = $1
    `,
    [jobId],
  );

  if (!jobResult.rows[0]) {
    return null;
  }

  const imagesResult = await client.query(
    `
      SELECT id, storage_path AS "storagePath",
        original_filename AS "originalFilename", mime_type AS "mimeType",
        file_size AS "fileSize", sort_order AS "sortOrder",
        created_at AS "createdAt"
      FROM job_images
      WHERE job_id = $1
      ORDER BY sort_order ASC, created_at ASC
    `,
    [jobId],
  );

  return { ...jobResult.rows[0], images: imagesResult.rows };
};

const getAllJobs = async () => {
  const result = await pool.query(`
    SELECT j.id, j.customer_id AS "customerId", j.title, j.description,
      j.category_id AS "categoryId", c.name_en AS "categoryNameEn",
      c.name_si AS "categoryNameSi", c.slug AS "categorySlug",
      j.district, j.city, j.venue, j.preferred_date AS "preferredDate",
      j.status, j.approved_by AS "approvedBy", j.approved_at AS "approvedAt",
      j.rejection_reason AS "rejectionReason",
      j.created_at AS "createdAt", j.updated_at AS "updatedAt",
      json_build_object(
        'id', customer.id,
        'name', customer.name,
        'avatarPath', customer.avatar_path
      ) AS customer,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', ji.id,
              'storagePath', ji.storage_path,
              'originalFilename', ji.original_filename,
              'mimeType', ji.mime_type,
              'fileSize', ji.file_size,
              'sortOrder', ji.sort_order,
              'createdAt', ji.created_at
            ) ORDER BY ji.sort_order, ji.created_at
          )
          FROM job_images ji
          WHERE ji.job_id = j.id
        ),
        '[]'::json
      ) AS images
    FROM jobs j
    JOIN categories c ON c.id = j.category_id
    JOIN users customer ON customer.id = j.customer_id
    ORDER BY j.created_at DESC
  `);

  return result.rows;
};

const validateCustomer = async (client, customerId) => {
  const result = await client.query(
    `SELECT id FROM users WHERE id = $1 AND role = 'CUSTOMER' AND is_active = TRUE`,
    [customerId],
  );

  if (result.rowCount === 0) {
    const error = new Error("Active customer account is required");
    error.code = "CUSTOMER_ACCOUNT_REQUIRED";
    throw error;
  }
};

const validateActiveCategory = async (client, categoryId) => {
  const result = await client.query(
    `SELECT id FROM categories WHERE id = $1 AND is_active = TRUE`,
    [categoryId],
  );

  if (result.rowCount === 0) {
    const error = new Error("Category does not exist or is inactive");
    error.code = "INVALID_CATEGORY";
    throw error;
  }
};

const insertImages = async (client, jobId, images) => {
  for (const image of images) {
    await client.query(
      `
        INSERT INTO job_images
          (job_id, storage_path, original_filename, mime_type, file_size, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        jobId,
        image.storagePath,
        image.originalFilename,
        image.mimeType,
        image.fileSize,
        image.sortOrder,
      ],
    );
  }
};

const createJob = async (customerId, payload) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await validateCustomer(client, customerId);
    await validateActiveCategory(client, payload.categoryId);

    const result = await client.query(
      `
        INSERT INTO jobs
          (customer_id, title, description, category_id, district, city, venue, preferred_date, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING_APPROVAL')
        RETURNING id
      `,
      [
        customerId,
        payload.title,
        payload.description,
        payload.categoryId,
        payload.district,
        payload.city ?? null,
        payload.venue,
        payload.preferredDate ?? null,
      ],
    );

    const jobId = result.rows[0].id;
    await insertImages(client, jobId, payload.images ?? []);
    const job = await getJob(client, jobId);
    await client.query("COMMIT");
    return job;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const updateJob = async (customerId, jobId, payload) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const existingResult = await client.query(
      `SELECT id, status FROM jobs WHERE id = $1 AND customer_id = $2 FOR UPDATE`,
      [jobId, customerId],
    );
    const existing = existingResult.rows[0];

    if (!existing) {
      await client.query("ROLLBACK");
      return null;
    }

    if (existing.status !== "PENDING_APPROVAL") {
      const error = new Error("Only jobs pending approval can be edited");
      error.code = "JOB_NOT_EDITABLE";
      throw error;
    }

    if (payload.categoryId !== undefined) {
      await validateActiveCategory(client, payload.categoryId);
    }

    const columnMap = {
      title: "title",
      description: "description",
      categoryId: "category_id",
      district: "district",
      city: "city",
      venue: "venue",
      preferredDate: "preferred_date",
    };
    const updates = Object.entries(columnMap).filter(
      ([field]) => payload[field] !== undefined,
    );

    if (updates.length > 0) {
      const values = updates.map(([field]) => payload[field]);
      values.push(jobId);
      values.push(customerId);
      const assignments = updates.map(
        ([, column], index) => `${column} = $${index + 1}`,
      );
      assignments.push("updated_at = NOW()");

      await client.query(
        `UPDATE jobs SET ${assignments.join(", ")} WHERE id = $${values.length - 1} AND customer_id = $${values.length}`,
        values,
      );
    }

    if (payload.images !== undefined) {
      await client.query(`DELETE FROM job_images WHERE job_id = $1`, [jobId]);
      await insertImages(client, jobId, payload.images);

      if (updates.length === 0) {
        await client.query(`UPDATE jobs SET updated_at = NOW() WHERE id = $1`, [
          jobId,
        ]);
      }
    }

    const job = await getJob(client, jobId);
    await client.query("COMMIT");
    return job;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const removeJob = async (customerId, jobId) => {
  const result = await pool.query(
    `DELETE FROM jobs WHERE id = $1 AND customer_id = $2 AND status = 'PENDING_APPROVAL' RETURNING id`,
    [jobId, customerId],
  );

  if (result.rowCount === 1) {
    return "REMOVED";
  }

  const existingResult = await pool.query(
    `SELECT status FROM jobs WHERE id = $1 AND customer_id = $2`,
    [jobId, customerId],
  );
  if (!existingResult.rows[0]) {
    return null;
  }

  const error = new Error("Only jobs pending approval can be removed");
  error.code = "JOB_NOT_REMOVABLE";
  throw error;
};

const listJobRequests = async (customerId, jobId) => {
  const result = await pool.query(
    `
      SELECT jr.id, jr.job_id AS "jobId", jr.worker_id AS "workerId",
        u.name AS "workerName", u.avatar_path AS "workerAvatarPath",
        wp.bio AS "workerBio", wp.experience_years AS "experienceYears",
        wp.average_rating AS "averageRating", wp.review_count AS "reviewCount",
        jr.proposed_budget AS "proposedBudget", jr.message,
        jr.proposed_date AS "proposedDate", jr.status,
        jr.created_at AS "createdAt", jr.updated_at AS "updatedAt"
      FROM jobs j
      JOIN job_requests jr ON jr.job_id = j.id
      JOIN users u ON u.id = jr.worker_id
      JOIN worker_profiles wp ON wp.user_id = jr.worker_id
      WHERE j.id = $1 AND j.customer_id = $2
      ORDER BY jr.created_at ASC
    `,
    [jobId, customerId],
  );
  const ownershipResult = await pool.query(
    `SELECT id FROM jobs WHERE id = $1 AND customer_id = $2`,
    [jobId, customerId],
  );
  return ownershipResult.rowCount === 0 ? null : result.rows;
};

const createBookingRequest = async (customerId, payload) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await validateCustomer(client, customerId);

    const partiesResult = await client.query(
      `
        SELECT u.id, u.role, u.is_active, wp.approval_status
        FROM users u
        LEFT JOIN worker_profiles wp ON wp.user_id = u.id
        WHERE u.id = $1
        FOR UPDATE OF u
      `,
      [payload.workerId],
    );
    const worker = partiesResult.rows[0];
    if (
      !worker ||
      worker.role !== "WORKER" ||
      !worker.is_active ||
      worker.approval_status !== "APPROVED"
    ) {
      const error = new Error("An active, approved worker is required");
      error.code = "WORKER_NOT_AVAILABLE";
      throw error;
    }
    if (payload.workerId === customerId) {
      const error = new Error(
        "Customers cannot create a booking request for themselves",
      );
      error.code = "INVALID_BOOKING_PARTIES";
      throw error;
    }

    if (payload.jobId) {
      const jobResult = await client.query(
        `SELECT id, status FROM jobs WHERE id = $1 AND customer_id = $2 FOR UPDATE`,
        [payload.jobId, customerId],
      );
      const job = jobResult.rows[0];
      if (!job) {
        const error = new Error("Job not found");
        error.code = "JOB_NOT_FOUND";
        throw error;
      }
      if (job.status !== "OPEN") {
        const error = new Error("Only open jobs can be booked");
        error.code = "JOB_NOT_OPEN";
        throw error;
      }

      const requestResult = await client.query(
        `SELECT id FROM job_requests WHERE job_id = $1 AND worker_id = $2 AND status = 'PENDING' FOR UPDATE`,
        [payload.jobId, payload.workerId],
      );
      if (requestResult.rowCount === 0) {
        const error = new Error(
          "The worker must have a pending quotation for this job",
        );
        error.code = "JOB_REQUEST_REQUIRED";
        throw error;
      }

      await client.query(
        `UPDATE job_requests SET status = 'SELECTED', updated_at = NOW() WHERE job_id = $1 AND worker_id = $2`,
        [payload.jobId, payload.workerId],
      );
      await client.query(
        `UPDATE job_requests SET status = 'REJECTED', updated_at = NOW() WHERE job_id = $1 AND worker_id <> $2 AND status = 'PENDING'`,
        [payload.jobId, payload.workerId],
      );
      await client.query(
        `UPDATE jobs SET status = 'WORKER_SELECTED', updated_at = NOW() WHERE id = $1`,
        [payload.jobId],
      );
    }

    const result = await client.query(
      `
        INSERT INTO bookings (job_id, customer_id, worker_id, scheduled_date, start_time, end_time, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'PENDING_CONFIRMATION')
        RETURNING id, job_id AS "jobId", customer_id AS "customerId",
          worker_id AS "workerId", scheduled_date AS "scheduledDate",
          start_time AS "startTime", end_time AS "endTime", status,
          confirmed_at AS "confirmedAt", created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [
        payload.jobId,
        customerId,
        payload.workerId,
        payload.scheduledDate,
        payload.startTime,
        payload.endTime,
      ],
    );

    await client.query("COMMIT");
    const booking = result.rows[0];
    await notifyUser({
      userId: payload.workerId,
      type: "WORKER_SELECTED",
      title: "New booking request",
      message: "A customer sent you a booking request.",
      data: { bookingId: booking.id, jobId: booking.jobId },
    });
    return booking;
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") {
      error.code = "BOOKING_ALREADY_EXISTS";
    }
    throw error;
  } finally {
    client.release();
  }
};

const cancelCustomerBooking = async (customerId, bookingId, reason) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const bookingResult = await client.query(
      `SELECT id, job_id, status FROM bookings WHERE id = $1 AND customer_id = $2 FOR UPDATE`,
      [bookingId, customerId],
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
      `INSERT INTO cancellations (job_id, booking_id, cancelled_by, cancelled_by_role, reason) VALUES ($1, $2, $3, 'CUSTOMER', $4)`,
      [booking.job_id, booking.id, customerId, reason],
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

const createWorkerReview = async (customerId, bookingId, payload) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const bookingResult = await client.query(
      `SELECT id, job_id, worker_id, status FROM bookings WHERE id = $1 AND customer_id = $2 FOR UPDATE`,
      [bookingId, customerId],
    );
    const booking = bookingResult.rows[0];
    if (!booking) {
      const error = new Error("Completed booking not found");
      error.code = "BOOKING_NOT_FOUND";
      throw error;
    }
    if (booking.status !== "COMPLETED" || !booking.job_id) {
      const error = new Error(
        "A completed job booking is required to review a worker",
      );
      error.code = "BOOKING_NOT_COMPLETED";
      throw error;
    }

    const workerResult = await client.query(
      `SELECT user_id FROM worker_profiles WHERE user_id = $1 FOR UPDATE`,
      [booking.worker_id],
    );
    if (workerResult.rowCount === 0) {
      const error = new Error("Worker profile not found");
      error.code = "BOOKING_NOT_FOUND";
      throw error;
    }

    const reviewResult = await client.query(
      `
        INSERT INTO reviews (job_id, customer_id, worker_id, rating, comment)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, job_id AS "jobId", customer_id AS "customerId",
          worker_id AS "workerId", rating, comment,
          created_at AS "createdAt", updated_at AS "updatedAt"
      `,
      [
        booking.job_id,
        customerId,
        booking.worker_id,
        payload.rating,
        payload.comment,
      ],
    );

    const profileResult = await client.query(
      `
        UPDATE worker_profiles wp
        SET review_count = stats.review_count,
          average_rating = stats.average_rating,
          updated_at = NOW()
        FROM (
          SELECT COUNT(*)::INTEGER AS review_count,
            ROUND(AVG(rating)::NUMERIC, 2) AS average_rating
          FROM reviews
          WHERE worker_id = $1
        ) stats
        WHERE wp.user_id = $1
        RETURNING wp.average_rating AS "averageRating",
          wp.review_count AS "reviewCount"
      `,
      [booking.worker_id],
    );

    await client.query("COMMIT");
    return { ...reviewResult.rows[0], ...profileResult.rows[0] };
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") {
      error.code = "REVIEW_ALREADY_EXISTS";
      error.message = "This job has already been reviewed";
    }
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  getAllJobs,
  createJob,
  updateJob,
  removeJob,
  listJobRequests,
  createBookingRequest,
  cancelCustomerBooking,
  createWorkerReview,
};
