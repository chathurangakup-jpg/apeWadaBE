# ApeWada API and Postman Guide

This guide documents the APIs currently mounted by the backend and provides a Postman test flow with example requests. It follows the existing JavaScript/Express implementation.

## 1. Postman Setup

Start the backend with `npm run dev`. The default base URL is:

```text
http://localhost:4000
```

Create a Postman environment with these variables:

| Variable         | Value                                                              |
| ---------------- | ------------------------------------------------------------------ |
| `baseUrl`        | `http://localhost:4000`                                            |
| `customerToken`  | Token from customer login                                          |
| `workerToken`    | Token from worker login                                            |
| `adminToken`     | Token for an admin account provisioned outside public registration |
| `customerId`     | Customer user UUID                                                 |
| `workerId`       | Worker user UUID                                                   |
| `jobId`          | Job UUID                                                           |
| `categoryId`     | Active category UUID                                               |
| `bookingId`      | Booking UUID                                                       |
| `conversationId` | Conversation UUID                                                  |
| `notificationId` | Notification UUID                                                  |

For protected endpoints, choose **Authorization > Bearer Token** and set the token appropriate to the caller. Requests with JSON bodies should use `Content-Type: application/json` and **Body > raw > JSON**.

Public registration does not allow creating an ADMIN. Use an admin account provisioned by seed or directly in the database.

## 2. Endpoint Inventory

### Authentication

| Method | Path                 | Access | Purpose                       |
| ------ | -------------------- | ------ | ----------------------------- |
| POST   | `/api/auth/register` | Public | Register a CUSTOMER or WORKER |
| POST   | `/api/auth/login`    | Public | Login and receive a JWT       |

### User Profile

| Method | Path                            | Access        | Purpose                                                                 |
| ------ | ------------------------------- | ------------- | ----------------------------------------------------------------------- |
| GET    | `/api/user/me`                  | Authenticated | Get account and role-specific profile                                   |
| PATCH  | `/api/user/me`                  | Authenticated | Update name, phone, or preferred language                               |
| PATCH  | `/api/user/me/customer-profile` | CUSTOMER      | Update customer profile                                                 |
| PATCH  | `/api/user/me/worker-profile`   | WORKER        | Update worker profile, categories, experience, education, and portfolio |
| PATCH  | `/api/user/me/password`         | Authenticated | Change password                                                         |
| PATCH  | `/api/user/me/deactivate`       | Authenticated | Deactivate own account                                                  |

The current user prefix is `/api/user` (singular). Profile image upload is not currently mounted as an API.
Use a new email address and phone number each time you rerun registration because both are unique in the database. Replace the example values if they already exist.

Examples for the current user's update endpoints:

**PATCH** `{{baseUrl}}/api/user/me`

```json
{
  "name": "Updated Customer",
  "phone": "+94770000003",
  "preferredLanguage": "SI"
}
```

**PATCH** `{{baseUrl}}/api/user/me/customer-profile` (customer token):

```json
{
  "address": "123 Main Street",
  "district": "Colombo",
  "city": "Dehiwala",
  "venue": "My home"
}
```

**PATCH** `{{baseUrl}}/api/user/me/password`:

```json
{
  "currentPassword": "Password123!",
  "newPassword": "NewPassword123!"
}
```

**PATCH** `{{baseUrl}}/api/user/me/deactivate` has no body. This deactivates the test account, so do it last; that account will no longer be able to log in.

### Admin

All routes require an authenticated ADMIN token.

| Method | Path                                    | Purpose                                    |
| ------ | --------------------------------------- | ------------------------------------------ |
| GET    | `/api/admin/categories`                 | List categories                            |
| POST   | `/api/admin/categories`                 | Create category                            |
| PATCH  | `/api/admin/categories/:id`             | Update category fields                     |
| PATCH  | `/api/admin/jobs/:jobId/approval`       | Approve or reject a pending job            |
| PATCH  | `/api/admin/workers/:workerId/approval` | Approve or reject a pending worker profile |

### Customer

All routes require an authenticated CUSTOMER token.

| Method | Path                                       | Purpose                                                     |
| ------ | ------------------------------------------ | ----------------------------------------------------------- |
| POST   | `/api/customer/jobs`                       | Create a job; initial status is PENDING_APPROVAL            |
| PATCH  | `/api/customer/jobs/:id`                   | Update an owned pending job                                 |
| DELETE | `/api/customer/jobs/:id`                   | Remove an owned pending job                                 |
| GET    | `/api/customer/jobs/:id/requests`          | List quotations for an owned job                            |
| POST   | `/api/customer/bookings`                   | Request a booking with a worker, optionally linked to a job |
| PATCH  | `/api/customer/bookings/:bookingId/cancel` | Cancel a confirmed/in-progress booking with a reason        |

### Worker

All routes require an authenticated WORKER token.

| Method | Path                                      | Purpose                                              |
| ------ | ----------------------------------------- | ---------------------------------------------------- |
| POST   | `/api/worker/jobs/:jobId/requests`        | Submit a quotation for an OPEN job                   |
| GET    | `/api/worker/booking-requests`            | List booking requests sent to the worker             |
| PATCH  | `/api/worker/bookings/:bookingId/respond` | Accept or reject a pending booking request           |
| PATCH  | `/api/worker/bookings/:bookingId/cancel`  | Cancel a confirmed/in-progress booking with a reason |
| GET    | `/api/worker/availability`                | List worker availability entries                     |
| POST   | `/api/worker/availability`                | Add one or more availability entries                 |

Worker `GET /api/user/me` also includes pending booking requests in the worker profile.

### Conversations

All routes require an authenticated CUSTOMER or WORKER participant.

| Method | Path                                          | Purpose                                              |
| ------ | --------------------------------------------- | ---------------------------------------------------- |
| POST   | `/api/conversations`                          | Create or return a conversation; `jobId` is optional |
| GET    | `/api/conversations`                          | List the current user's conversations                |
| GET    | `/api/conversations/:conversationId/messages` | Read text-message history                            |
| POST   | `/api/conversations/:conversationId/messages` | Send a text message                                  |
| PATCH  | `/api/conversations/:conversationId/read`     | Mark incoming messages as read                       |

Image/file messages are not supported in this stage.

### Notifications and Push Tokens

All routes require authentication and operate only on the current user's records.

| Method | Path                                      | Purpose                                                                           |
| ------ | ----------------------------------------- | --------------------------------------------------------------------------------- |
| GET    | `/api/notifications`                      | List notifications; supports `limit`, `unreadOnly`, and `before` query parameters |
| PATCH  | `/api/notifications/:notificationId/read` | Mark one notification as read                                                     |
| PATCH  | `/api/notifications/read-all`             | Mark all notifications as read                                                    |
| POST   | `/api/notifications/push-tokens`          | Register an Expo push token                                                       |
| DELETE | `/api/notifications/push-tokens`          | Deactivate a registered Expo push token                                           |

### Internal Socket Test Routes

These routes are enabled only when `NODE_ENV` is not `production`. They require a valid Bearer token and are intended for development socket-event testing, not normal application calls.

| Method | Path                            | Body shape                                                             |
| ------ | ------------------------------- | ---------------------------------------------------------------------- |
| POST   | `/internal/socket/emit-message` | `{ "conversationId": "...", "message": {}, "participantIds": [] }`     |
| POST   | `/internal/socket/emit-read`    | `{ "conversationId": "...", "readerId": "...", "participantIds": [] }` |
| POST   | `/internal/socket/emit-created` | `{ "conversation": {}, "participantIds": [] }`                         |

## 3. Postman Test Data

### 3.1 Register Test Users

Register a customer:

**POST** `{{baseUrl}}/api/auth/register`

```json
{
  "name": "Postman Customer",
  "email": "postman.customer@example.com",
  "phone": "+94770000001",
  "password": "Password123!",
  "role": "CUSTOMER",
  "preferredLanguage": "EN"
}
```

Register a worker:

**POST** `{{baseUrl}}/api/auth/register`

```json
{
  "name": "Postman Worker",
  "email": "postman.worker@example.com",
  "phone": "+94770000002",
  "password": "Password123!",
  "role": "WORKER",
  "preferredLanguage": "EN"
}
```

Save each returned `data.user.id` in `customerId` or `workerId`. New workers start with `PENDING` approval and cannot submit quotations until an admin approves them.

### 3.2 Login and Save Tokens

**POST** `{{baseUrl}}/api/auth/login`

```json
{
  "email": "postman.customer@example.com",
  "password": "Password123!"
}
```

Copy `data.token` into `customerToken`. Repeat with the worker's email and save `data.token` as `workerToken`. The login response uses the key `token`.

### 3.3 Get the Current User

Use either user's token.

**GET** `{{baseUrl}}/api/user/me`

No body. The response contains `data.user` and `data.profile`.

### 3.4 Create a Category as Admin

Use `adminToken`.

**POST** `{{baseUrl}}/api/admin/categories`

```json
{
  "nameEn": "Plumbing",
  "nameSi": "Plumbing",
  "slug": "plumbing",
  "icon": "wrench",
  "isActive": true
}
```

Save `data.category.id` as `categoryId`. English name and slug must be unique. For a real Sinhala category, use its Sinhala translation in `nameSi`.

Update an existing category with **PATCH** `{{baseUrl}}/api/admin/categories/{{categoryId}}`:

```json
{
  "nameSi": "Updated Sinhala category name",
  "isActive": true
}
```

### 3.5 Approve the Worker

Use `adminToken` and the saved `workerId`.

**PATCH** `{{baseUrl}}/api/admin/workers/{{workerId}}/approval`

```json
{
  "decision": "APPROVE"
}
```

Optional rejection example:

```json
{
  "decision": "REJECT",
  "reason": "Please provide clearer professional details."
}
```

### 3.6 Update the Worker Profile

Use `workerToken`.

**PATCH** `{{baseUrl}}/api/user/me/worker-profile`

```json
{
  "bio": "Experienced residential plumber.",
  "experienceYears": 8,
  "educationSummary": "NVQ Level 4",
  "district": "Colombo",
  "city": "Dehiwala",
  "venue": "Dehiwala",
  "categoryIds": ["{{categoryId}}"],
  "experiences": [
    {
      "companyName": "ABC Services",
      "jobTitle": "Plumber",
      "description": "Residential plumbing work",
      "startDate": "2018-01-01",
      "endDate": null,
      "isCurrent": true
    }
  ],
  "education": [
    {
      "institution": "Technical College",
      "qualification": "NVQ Level 4",
      "description": "Plumbing",
      "startDate": "2016-01-01",
      "endDate": "2017-12-31"
    }
  ],
  "portfolio": [
    {
      "title": "Bathroom renovation",
      "description": "Completed a bathroom plumbing renovation",
      "completedAt": "2024-06-15"
    }
  ]
}
```

Each supplied collection array replaces that collection. Omit an array to preserve its current rows; send `[]` to clear it.

### 3.7 Create a Customer Job

Use `customerToken` and `categoryId`.

**POST** `{{baseUrl}}/api/customer/jobs`

```json
{
  "title": "Repair leaking kitchen pipe",
  "description": "There is a leak under the kitchen sink.",
  "categoryId": "{{categoryId}}",
  "district": "Colombo",
  "city": "Dehiwala",
  "venue": "45 Example Road, Dehiwala",
  "preferredDate": "2026-11-15",
  "images": []
}
```

The new job starts as `PENDING_APPROVAL`. Save `data.job.id` as `jobId`.

Update a pending job with **PATCH** `{{baseUrl}}/api/customer/jobs/{{jobId}}`:

```json
{
  "title": "Repair leaking kitchen pipe urgently",
  "preferredDate": "2026-11-16",
  "images": []
}
```

Delete is supported only while the job is pending approval: **DELETE** `{{baseUrl}}/api/customer/jobs/{{jobId}}`. Run this only on a disposable test job because it removes the pending job and its image metadata.

### 3.8 Approve the Job

Use `adminToken`.

**PATCH** `{{baseUrl}}/api/admin/jobs/{{jobId}}/approval`

```json
{
  "decision": "APPROVE"
}
```

The job becomes `OPEN`; approved workers can now submit quotations.

### 3.9 Worker Submits a Quotation

Use `workerToken`.

**POST** `{{baseUrl}}/api/worker/jobs/{{jobId}}/requests`

```json
{
  "proposedBudget": 15000,
  "message": "I can repair the pipe and replace the connector.",
  "proposedDate": "2026-11-15"
}
```

The customer receives a `NEW_JOB_REQUEST` notification. To list quotations, use `customerToken`:

**GET** `{{baseUrl}}/api/customer/jobs/{{jobId}}/requests`

### 3.10 Customer Requests a Booking

Use `customerToken` and `workerId`.

**POST** `{{baseUrl}}/api/customer/bookings`

```json
{
  "jobId": "{{jobId}}",
  "workerId": "{{workerId}}",
  "scheduledDate": "2026-11-15",
  "startTime": "09:00",
  "endTime": "11:00"
}
```

For a direct booking request without a job, omit `jobId`. For a job-linked request, the selected worker must have a pending quotation for that open job. Save `data.booking.id` as `bookingId`.

Direct booking request body (no `jobId`):

```json
{
  "workerId": "{{workerId}}",
  "scheduledDate": "2026-11-20"
}
```

The worker receives a booking notification. To view booking requests, use `workerToken`:

**GET** `{{baseUrl}}/api/worker/booking-requests`

### 3.11 Worker Confirms or Rejects the Booking Request

Use `workerToken` to accept:

**PATCH** `{{baseUrl}}/api/worker/bookings/{{bookingId}}/respond`

```json
{
  "decision": "ACCEPT",
  "scheduledDate": "2026-11-15",
  "startTime": "09:00",
  "endTime": "11:00"
}
```

The customer receives `BOOKING_CONFIRMED`; the booking's date/time is recorded as unavailable in the worker calendar.

To reject a still-pending booking request, send only:

```json
{
  "decision": "REJECT"
}
```

### 3.12 Cancel a Confirmed Booking

Cancellation is separate from rejecting a pending request. It requires a reason and can be called by the booking's customer or worker.

Customer:

**PATCH** `{{baseUrl}}/api/customer/bookings/{{bookingId}}/cancel`

Worker:

**PATCH** `{{baseUrl}}/api/worker/bookings/{{bookingId}}/cancel`

Body for either:

```json
{
  "reason": "I am unable to attend on the scheduled date."
}
```

### 3.13 Set Worker Availability

Use `workerToken`.

**POST** `{{baseUrl}}/api/worker/availability`

```json
{
  "availability": [
    {
      "availabilityDate": "2026-11-16",
      "startTime": "09:00",
      "endTime": "12:00",
      "status": "AVAILABLE"
    },
    {
      "availabilityDate": "2026-11-18",
      "status": "AVAILABLE"
    }
  ]
}
```

List availability with **GET** `{{baseUrl}}/api/worker/availability`.

### 3.14 Start a Text Conversation

Use either the customer or worker token. The other account must be the participant, and the worker must be approved. `jobId` is optional; if supplied, it must belong to the customer and be in an eligible state.

**POST** `{{baseUrl}}/api/conversations`

```json
{
  "participantId": "{{workerId}}"
}
```

When called with a worker token, use `"participantId": "{{customerId}}"`. Save `data.conversation.id` as `conversationId`.

Send a text message:

**POST** `{{baseUrl}}/api/conversations/{{conversationId}}/messages`

```json
{
  "content": "Hi, I would like to discuss the job details."
}
```

Read messages with **GET** `{{baseUrl}}/api/conversations/{{conversationId}}/messages?limit=50`; mark incoming messages read with **PATCH** `{{baseUrl}}/api/conversations/{{conversationId}}/read`.

### 3.15 Notifications and Push Tokens

List the current user's notifications:

**GET** `{{baseUrl}}/api/notifications?unreadOnly=true&limit=50`

Mark one read:

**PATCH** `{{baseUrl}}/api/notifications/{{notificationId}}/read`

Mark all read:

**PATCH** `{{baseUrl}}/api/notifications/read-all`

Register an Expo token:

**POST** `{{baseUrl}}/api/notifications/push-tokens`

```json
{
  "token": "ExponentPushToken[replace-with-device-token]",
  "platform": "IOS"
}
```

Deactivate it with **DELETE** `{{baseUrl}}/api/notifications/push-tokens` and body:

```json
{
  "token": "ExponentPushToken[replace-with-device-token]"
}
```

## 4. Migrations and Scope Notes

Apply database migrations in numeric order before testing the related APIs. The feature migrations include categories, worker profile records, jobs, requests/bookings, availability/cancellations, conversations, direct conversations, and notifications/push tokens.

Admin accounts must already exist; they cannot be registered through the public auth API. Admin approval routes require `adminToken`.

The `/internal/socket/*` routes are development-only. The user avatar upload endpoint described in the original user API spec is not currently mounted.
