# ApeWada Database Schema

## 1. Database Overview

ApeWada uses **PostgreSQL** as the primary relational database.

The database stores:

- User accounts
- Customer profiles
- Worker profiles
- Worker categories
- Worker experience and education
- Worker portfolios
- Worker availability
- Service categories
- Customer jobs
- Job images
- Worker job requests and quotations
- Worker selection
- Bookings
- Job status history
- Cancellations
- Chat conversations and messages
- Notifications
- Ratings and reviews
- Admin approval records

Large media files such as images are stored in **Supabase Storage**. PostgreSQL stores the corresponding storage path/object information.

---

# 2. High-Level Entity Relationship

```text
                              ┌──────────────────┐
                              │      users       │
                              │──────────────────│
                              │ id               │
                              │ role             │
                              │ name             │
                              │ email            │
                              │ phone            │
                              │ password_hash    │
                              │ language         │
                              └───────┬──────────┘
                                      │
                     ┌────────────────┼────────────────┐
                     │                                 │
                     ▼                                 ▼
             ┌───────────────┐                 ┌────────────────┐
             │customer_profiles│                 │worker_profiles │
             └───────┬───────┘                 └───────┬────────┘
                     │                                   │
                     │                                   ├── worker_categories
                     │                                   ├── worker_experience
                     │                                   ├── worker_education
                     │                                   ├── worker_portfolio
                     │                                   └── worker_availability
                     │
                     ▼
                  ┌───────┐
                  │  jobs │
                  └───┬───┘
                      │
          ┌───────────┼─────────────────┐
          │           │                 │
          ▼           ▼                 ▼
     job_images   job_requests      job_status_history
                      │
                      ▼
                 ┌─────────┐
                 │ booking │
                 └────┬────┘
                      │
          ┌───────────┼───────────────┐
          │                           │
          ▼                           ▼
     cancellations                reviews


     Customer / Worker
             │
             ▼
     ┌─────────────────┐
     │  conversations  │
     └────────┬────────┘
              │
              ▼
          messages


     users
       │
       ▼
   notifications
```

---

# 3. Common Conventions

## Primary Keys

All major entities use UUID primary keys.

Example:

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```

UUIDs prevent predictable sequential IDs from being exposed through APIs.

## Timestamps

Tables that represent application entities should generally contain:

```text
created_at
updated_at
```

Timestamps should be stored using PostgreSQL `TIMESTAMPTZ`.

## Soft Delete

Do not physically delete important historical records such as:

- Completed jobs
- Cancelled jobs
- Bookings
- Reviews
- Chat messages
- Cancellation records

Where account/resource removal is required, prefer a soft-delete/deactivation approach where appropriate.

---

# 4. Users

## `users`

Stores authentication and common account information.

| Column             | Type         | Constraints  | Description                  |
| ------------------ | ------------ | ------------ | ---------------------------- |
| id                 | UUID         | PK           | User identifier              |
| role               | ENUM         | NOT NULL     | CUSTOMER / WORKER / ADMIN    |
| name               | VARCHAR(100) | NOT NULL     | User's display/full name     |
| email              | VARCHAR(255) | UNIQUE       | Login email                  |
| phone              | VARCHAR(20)  | UNIQUE       | Phone number                 |
| password_hash      | TEXT         | NOT NULL     | Hashed password              |
| avatar_path        | TEXT         | NULL         | Supabase Storage object path |
| preferred_language | ENUM         | NOT NULL     | EN / SI                      |
| is_active          | BOOLEAN      | DEFAULT TRUE | Account status               |
| last_login_at      | TIMESTAMPTZ  | NULL         | Last successful login        |
| created_at         | TIMESTAMPTZ  | NOT NULL     | Creation time                |
| updated_at         | TIMESTAMPTZ  | NOT NULL     | Last update                  |

### Role values

```text
CUSTOMER
WORKER
ADMIN
```

### Language values

```text
EN
SI
```

---

# 5. Customer Profile

## `customer_profiles`

Contains customer-specific information.

| Column     | Type         | Constraints | Description                             |
| ---------- | ------------ | ----------- | --------------------------------------- |
| user_id    | UUID         | PK, FK      | References users.id                     |
| address    | TEXT         | NULL        | Customer address                        |
| district   | VARCHAR(100) | NULL        | Sri Lankan district                     |
| city       | VARCHAR(100) | NULL        | City/town                               |
| venue      | TEXT         | NULL        | Default work venue/location information |
| created_at | TIMESTAMPTZ  | NOT NULL    | Creation time                           |
| updated_at | TIMESTAMPTZ  | NOT NULL    | Last update                             |

Relationship:

```text
users 1 ───── 1 customer_profiles
```

A customer profile cannot exist without a corresponding user.

---

# 6. Worker Profile

## `worker_profiles`

Contains professional worker information.

| Column              | Type         | Constraints | Description                    |
| ------------------- | ------------ | ----------- | ------------------------------ |
| user_id             | UUID         | PK, FK      | References users.id            |
| bio                 | TEXT         | NULL        | Professional description       |
| experience_years    | INTEGER      | NULL        | Years of experience            |
| education_summary   | TEXT         | NULL        | General education information  |
| district            | VARCHAR(100) | NULL        | Main working district          |
| city                | VARCHAR(100) | NULL        | Main working city/town         |
| venue               | TEXT         | NULL        | Optional address/work location |
| approval_status     | ENUM         | NOT NULL    | PENDING / APPROVED / REJECTED  |
| approval_reason     | TEXT         | NULL        | Admin rejection/approval note  |
| approved_by         | UUID         | FK          | Admin user                     |
| approved_at         | TIMESTAMPTZ  | NULL        | Approval timestamp             |
| availability_status | ENUM         | NOT NULL    | AVAILABLE / UNAVAILABLE        |
| average_rating      | NUMERIC(3,2) | DEFAULT 0   | Cached average rating          |
| review_count        | INTEGER      | DEFAULT 0   | Cached review count            |
| created_at          | TIMESTAMPTZ  | NOT NULL    | Creation time                  |
| updated_at          | TIMESTAMPTZ  | NOT NULL    | Last update                    |

### Worker approval

```text
PENDING
   ├──→ APPROVED
   └──→ REJECTED
```

Only `APPROVED` workers are publicly visible.

---

# 7. Service Categories

## `categories`

Stores available service categories.

| Column     | Type         | Constraints  | Description           |
| ---------- | ------------ | ------------ | --------------------- |
| id         | UUID         | PK           | Category ID           |
| name_en    | VARCHAR(100) | UNIQUE       | English name          |
| name_si    | VARCHAR(100) | NULL         | Sinhala name          |
| slug       | VARCHAR(100) | UNIQUE       | URL/API identifier    |
| icon       | VARCHAR(100) | NULL         | Icon identifier       |
| is_active  | BOOLEAN      | DEFAULT TRUE | Category availability |
| created_at | TIMESTAMPTZ  | NOT NULL     | Creation time         |
| updated_at | TIMESTAMPTZ  | NOT NULL     | Last update           |

Examples:

```text
plumbing
electrical
carpentry
cleaning
painting
gardening
grass-cutting
```

---

# 8. Worker Categories

## `worker_categories`

Many-to-many relationship between workers and service categories.

A worker can provide multiple services.

| Column      | Type        | Constraints |
| ----------- | ----------- | ----------- |
| worker_id   | UUID        | FK          |
| category_id | UUID        | FK          |
| created_at  | TIMESTAMPTZ | NOT NULL    |

Primary key:

```text
(worker_id, category_id)
```

Relationship:

```text
workers  N ───── N  categories
```

Example:

```text
Worker A
 ├── Plumbing
 ├── Electrical
 └── Gardening
```

---

# 9. Worker Experience

## `worker_experience`

Stores professional experience records.

| Column       | Type         | Constraints   |
| ------------ | ------------ | ------------- |
| id           | UUID         | PK            |
| worker_id    | UUID         | FK            |
| company_name | VARCHAR(150) | NULL          |
| job_title    | VARCHAR(150) | NULL          |
| description  | TEXT         | NULL          |
| start_date   | DATE         | NULL          |
| end_date     | DATE         | NULL          |
| is_current   | BOOLEAN      | DEFAULT FALSE |
| created_at   | TIMESTAMPTZ  | NOT NULL      |
| updated_at   | TIMESTAMPTZ  | NOT NULL      |

A worker can have multiple experience records.

---

# 10. Worker Education

## `worker_education`

Stores education/training information.

| Column        | Type         | Constraints |
| ------------- | ------------ | ----------- |
| id            | UUID         | PK          |
| worker_id     | UUID         | FK          |
| institution   | VARCHAR(200) | NULL        |
| qualification | VARCHAR(200) | NULL        |
| description   | TEXT         | NULL        |
| start_date    | DATE         | NULL        |
| end_date      | DATE         | NULL        |
| created_at    | TIMESTAMPTZ  | NOT NULL    |
| updated_at    | TIMESTAMPTZ  | NOT NULL    |

---

# 11. Worker Portfolio

## `worker_portfolio`

Stores previous work/project information.

| Column       | Type         | Constraints |
| ------------ | ------------ | ----------- |
| id           | UUID         | PK          |
| worker_id    | UUID         | FK          |
| title        | VARCHAR(150) | NOT NULL    |
| description  | TEXT         | NULL        |
| completed_at | DATE         | NULL        |
| created_at   | TIMESTAMPTZ  | NOT NULL    |
| updated_at   | TIMESTAMPTZ  | NOT NULL    |

---

## `worker_portfolio_images`

Stores Supabase Storage references for portfolio images.

| Column            | Type         | Constraints |
| ----------------- | ------------ | ----------- |
| id                | UUID         | PK          |
| portfolio_id      | UUID         | FK          |
| storage_path      | TEXT         | NOT NULL    |
| original_filename | VARCHAR(255) | NULL        |
| mime_type         | VARCHAR(100) | NULL        |
| file_size         | BIGINT       | NULL        |
| sort_order        | INTEGER      | DEFAULT 0   |
| created_at        | TIMESTAMPTZ  | NOT NULL    |

The actual image is stored in Supabase Storage.

---

# 12. Customer Jobs

## `jobs`

Represents a service request created by a customer.

| Column           | Type         | Constraints | Description             |
| ---------------- | ------------ | ----------- | ----------------------- |
| id               | UUID         | PK          | Job ID                  |
| customer_id      | UUID         | FK          | Job owner               |
| title            | VARCHAR(200) | NOT NULL    | Job title               |
| description      | TEXT         | NOT NULL    | Job description         |
| category_id      | UUID         | FK          | Primary category        |
| district         | VARCHAR(100) | NOT NULL    | Job district            |
| city             | VARCHAR(100) | NULL        | Job city                |
| venue            | TEXT         | NOT NULL    | Work location           |
| preferred_date   | DATE         | NULL        | Customer preferred date |
| status           | ENUM         | NOT NULL    | Job lifecycle state     |
| approved_by      | UUID         | FK          | Admin                   |
| approved_at      | TIMESTAMPTZ  | NULL        | Approval time           |
| rejection_reason | TEXT         | NULL        | Admin rejection reason  |
| created_at       | TIMESTAMPTZ  | NOT NULL    | Creation time           |
| updated_at       | TIMESTAMPTZ  | NOT NULL    | Last update             |

### Job statuses

```text
PENDING_APPROVAL
OPEN
WORKER_SELECTED
SCHEDULED
IN_PROGRESS
COMPLETED
CANCELLED
REJECTED
```

---

# 13. Job Images

## `job_images`

Stores image references for customer jobs.

| Column            | Type         | Constraints |
| ----------------- | ------------ | ----------- |
| id                | UUID         | PK          |
| job_id            | UUID         | FK          |
| storage_path      | TEXT         | NOT NULL    |
| original_filename | VARCHAR(255) | NULL        |
| mime_type         | VARCHAR(100) | NULL        |
| file_size         | BIGINT       | NULL        |
| sort_order        | INTEGER      | DEFAULT 0   |
| created_at        | TIMESTAMPTZ  | NOT NULL    |

Actual image files are stored in Supabase Storage.

---

# 14. Job Requests / Quotations

## `job_requests`

Represents a worker's request to take a customer job.

One job can receive requests from multiple workers.

| Column          | Type          | Constraints |
| --------------- | ------------- | ----------- |
| id              | UUID          | PK          |
| job_id          | UUID          | FK          |
| worker_id       | UUID          | FK          |
| proposed_budget | NUMERIC(12,2) | NOT NULL    |
| message         | TEXT          | NULL        |
| proposed_date   | DATE          | NULL        |
| status          | ENUM          | NOT NULL    |
| created_at      | TIMESTAMPTZ   | NOT NULL    |
| updated_at      | TIMESTAMPTZ   | NOT NULL    |

### Request statuses

```text
PENDING
SELECTED
REJECTED
WITHDRAWN
```

Relationship:

```text
Job
 ├── Worker A → Rs. 15,000
 ├── Worker B → Rs. 18,000
 └── Worker C → Rs. 13,500
```

A worker should not be able to create duplicate active requests for the same job.

Recommended unique constraint:

```text
(job_id, worker_id)
```

---

# 15. Booking

## `bookings`

Represents the confirmed work arrangement after the customer selects a worker.

| Column         | Type        | Constraints |
| -------------- | ----------- | ----------- |
| id             | UUID        | PK          |
| job_id         | UUID        | UNIQUE, FK  |
| worker_id      | UUID        | FK          |
| scheduled_date | DATE        | NOT NULL    |
| start_time     | TIME        | NULL        |
| end_time       | TIME        | NULL        |
| status         | ENUM        | NOT NULL    |
| confirmed_at   | TIMESTAMPTZ | NULL        |
| created_at     | TIMESTAMPTZ | NOT NULL    |
| updated_at     | TIMESTAMPTZ | NOT NULL    |

### Booking statuses

```text
PENDING_CONFIRMATION
CONFIRMED
IN_PROGRESS
COMPLETED
CANCELLED
```

Only one confirmed booking can exist for a job.

---

# 16. Worker Availability

## `worker_availability`

Stores worker calendar availability.

| Column            | Type        | Constraints |
| ----------------- | ----------- | ----------- |
| id                | UUID        | PK          |
| worker_id         | UUID        | FK          |
| availability_date | DATE        | NOT NULL    |
| start_time        | TIME        | NULL        |
| end_time          | TIME        | NULL        |
| status            | ENUM        | NOT NULL    |
| created_at        | TIMESTAMPTZ | NOT NULL    |
| updated_at        | TIMESTAMPTZ | NOT NULL    |

### Availability statuses

```text
AVAILABLE
UNAVAILABLE
```

This table allows the system to determine whether a worker is available on a requested date.

The schema should later be extended if ApeWada requires multiple time slots per day.

---

# 17. Job Status History

## `job_status_history`

Stores every important job status change.

| Column     | Type        | Constraints |
| ---------- | ----------- | ----------- |
| id         | UUID        | PK          |
| job_id     | UUID        | FK          |
| old_status | VARCHAR(50) | NULL        |
| new_status | VARCHAR(50) | NOT NULL    |
| changed_by | UUID        | FK          |
| note       | TEXT        | NULL        |
| created_at | TIMESTAMPTZ | NOT NULL    |

Example:

```text
PENDING_APPROVAL
        ↓
OPEN
        ↓
WORKER_SELECTED
        ↓
SCHEDULED
        ↓
IN_PROGRESS
        ↓
COMPLETED
```

This provides an audit trail rather than relying only on the current job status.

---

# 18. Cancellations

## `cancellations`

Cancellation must be stored as a separate record.

| Column            | Type        | Constraints |
| ----------------- | ----------- | ----------- |
| id                | UUID        | PK          |
| job_id            | UUID        | FK          |
| cancelled_by      | UUID        | FK          |
| cancelled_by_role | ENUM        | NOT NULL    |
| reason            | TEXT        | NOT NULL    |
| created_at        | TIMESTAMPTZ | NOT NULL    |

A cancellation cannot be created without a reason.

The cancellation history can be queried by:

```text
cancelled_by
```

to display a user's cancellation history.

Important:

Do not store only:

```text
customer.cancelled_jobs = 5
```

Instead, store each cancellation as a separate record.

A cancellation count can be calculated or cached later.

---

# 19. Conversations

## `conversations`

Represents a chat conversation.

| Column      | Type        | Constraints |
| ----------- | ----------- | ----------- |
| id          | UUID        | PK          |
| job_id      | UUID        | FK          |
| customer_id | UUID        | FK          |
| worker_id   | UUID        | FK          |
| created_at  | TIMESTAMPTZ | NOT NULL    |
| updated_at  | TIMESTAMPTZ | NOT NULL    |

A conversation is associated with a job.

This allows customers and workers to communicate about a specific job.

A customer can chat with workers before selecting one.

---

# 20. Conversation Participants

## `conversation_participants`

Provides a flexible participant model.

| Column          | Type        | Constraints |
| --------------- | ----------- | ----------- |
| conversation_id | UUID        | FK          |
| user_id         | UUID        | FK          |
| joined_at       | TIMESTAMPTZ | NOT NULL    |
| last_read_at    | TIMESTAMPTZ | NULL        |

Primary key:

```text
(conversation_id, user_id)
```

This model makes it easier to extend chat functionality later.

---

# 21. Chat Messages

## `messages`

Stores persistent chat messages.

| Column          | Type        | Constraints |
| --------------- | ----------- | ----------- |
| id              | UUID        | PK          |
| conversation_id | UUID        | FK          |
| sender_id       | UUID        | FK          |
| message_type    | ENUM        | NOT NULL    |
| content         | TEXT        | NULL        |
| attachment_path | TEXT        | NULL        |
| sent_at         | TIMESTAMPTZ | NOT NULL    |
| read_at         | TIMESTAMPTZ | NULL        |

### Message types

```text
TEXT
IMAGE
FILE
SYSTEM
```

Socket.IO provides real-time delivery, while PostgreSQL stores message history.

---

# 22. Notifications

## `notifications`

Stores application notifications.

| Column     | Type         | Constraints   |
| ---------- | ------------ | ------------- |
| id         | UUID         | PK            |
| user_id    | UUID         | FK            |
| type       | VARCHAR(100) | NOT NULL      |
| title      | VARCHAR(200) | NOT NULL      |
| message    | TEXT         | NOT NULL      |
| data       | JSONB        | NULL          |
| is_read    | BOOLEAN      | DEFAULT FALSE |
| created_at | TIMESTAMPTZ  | NOT NULL      |

Example notification types:

```text
WORKER_APPROVED
WORKER_REJECTED
JOB_APPROVED
JOB_REJECTED
NEW_JOB_REQUEST
WORKER_SELECTED
BOOKING_CONFIRMED
JOB_STARTED
JOB_COMPLETED
JOB_CANCELLED
NEW_MESSAGE
NEW_REVIEW
```

---

# 23. Push Notification Tokens

## `push_tokens`

Stores Expo push notification tokens.

| Column       | Type        | Constraints  |
| ------------ | ----------- | ------------ |
| id           | UUID        | PK           |
| user_id      | UUID        | FK           |
| token        | TEXT        | UNIQUE       |
| platform     | ENUM        | NOT NULL     |
| is_active    | BOOLEAN     | DEFAULT TRUE |
| last_used_at | TIMESTAMPTZ | NULL         |
| created_at   | TIMESTAMPTZ | NOT NULL     |
| updated_at   | TIMESTAMPTZ | NOT NULL     |

### Platform

```text
IOS
ANDROID
```

A user may have multiple devices.

---

# 24. Reviews

## `reviews`

Customers can rate workers after completed jobs.

| Column      | Type        | Constraints |
| ----------- | ----------- | ----------- |
| id          | UUID        | PK          |
| job_id      | UUID        | UNIQUE, FK  |
| customer_id | UUID        | FK          |
| worker_id   | UUID        | FK          |
| rating      | SMALLINT    | NOT NULL    |
| comment     | TEXT        | NULL        |
| created_at  | TIMESTAMPTZ | NOT NULL    |
| updated_at  | TIMESTAMPTZ | NOT NULL    |

### Rating

Valid values:

```text
1
2
3
4
5
```

Only the customer associated with the job can create its review.

A job can have only one customer review.

---

# 25. Admin Approval Records

## `approval_records`

Stores administrative approval/rejection actions.

| Column      | Type        | Constraints |
| ----------- | ----------- | ----------- |
| id          | UUID        | PK          |
| entity_type | ENUM        | NOT NULL    |
| entity_id   | UUID        | NOT NULL    |
| admin_id    | UUID        | FK          |
| action      | ENUM        | NOT NULL    |
| reason      | TEXT        | NULL        |
| created_at  | TIMESTAMPTZ | NOT NULL    |

### Entity types

```text
WORKER
JOB
```

### Actions

```text
APPROVED
REJECTED
```

This provides an audit trail for administrative decisions.

---

# 26. Relationships

## User Relationships

```text
users
 ├── 1:1 customer_profiles
 ├── 1:1 worker_profiles
 ├── 1:N notifications
 ├── 1:N push_tokens
 └── 1:N cancellations
```

## Worker Relationships

```text
worker_profiles
 ├── N:M categories
 ├── 1:N experience
 ├── 1:N education
 ├── 1:N portfolio
 ├── 1:N availability
 ├── 1:N job_requests
 ├── 1:N bookings
 └── 1:N reviews
```

## Customer Relationships

```text
customer_profiles
 ├── 1:N jobs
 ├── 1:N cancellations
 ├── 1:N conversations
 └── 1:N reviews
```

## Job Relationships

```text
jobs
 ├── 1:N job_images
 ├── 1:N job_requests
 ├── 1:1 booking
 ├── 1:N status_history
 ├── 1:N cancellations
 ├── 1:N conversations
 └── 1:1 review
```

---

# 27. Job Request vs Booking

These are intentionally separate entities.

```text
                    JOB
                     │
           ┌─────────┼─────────┐
           │         │         │
           ▼         ▼         ▼
        Request    Request    Request
        Worker A   Worker B   Worker C
           │         │         │
           └─────────┼─────────┘
                     │
               Customer selects
                     │
                     ▼
                  BOOKING
                     │
                     ▼
              Scheduled Work
```

A `job_request` means:

> "I am interested in doing this job and my proposed budget is X."

A `booking` means:

> "This worker has been selected and the work arrangement/date has been confirmed."

This separation is required because multiple workers can request the same job, while only one worker can normally be selected for the final booking.

---

# 28. Job Lifecycle

The backend must enforce valid state transitions.

```text
PENDING_APPROVAL
       │
       ├──────────→ REJECTED
       │
       ▼
     OPEN
       │
       ▼
WORKER_SELECTED
       │
       ▼
  SCHEDULED
       │
       ▼
 IN_PROGRESS
       │
       ▼
  COMPLETED
```

Cancellation can occur from permitted active states:

```text
PENDING_APPROVAL ──→ CANCELLED
OPEN ──────────────→ CANCELLED
WORKER_SELECTED ───→ CANCELLED
SCHEDULED ─────────→ CANCELLED
IN_PROGRESS ───────→ CANCELLED
```

The backend must prevent invalid transitions.

---

# 29. Important Database Constraints

The following constraints should be enforced at the database and/or service layer.

### Users

- Email must be unique where provided.
- Phone number should be unique where required.
- Role must be one of CUSTOMER, WORKER, ADMIN.

### Worker

- Worker profile must belong to a WORKER user.
- Only approved workers are publicly discoverable.
- Worker categories cannot be duplicated.

### Jobs

- Job must belong to a CUSTOMER.
- Job must reference a valid category.
- Rejected jobs cannot receive worker requests.
- Cancelled jobs cannot receive new requests.

### Job Requests

- One worker should have only one active request for a job.
- Worker must be approved before submitting a request.
- Worker cannot request their own job.
- Only open jobs can receive requests.

### Booking

- A job can have only one final booking.
- A booking must reference the selected worker.
- Worker schedule conflicts must be prevented.
- Booking cannot exist for a rejected job.

### Cancellation

- Cancellation reason is mandatory.
- Cancellation must reference the user who cancelled.
- Cancellation cannot be silently overwritten.

### Reviews

- Only the customer who owns the job can submit the review.
- Review can only be submitted after job completion.
- One review per job.
- Rating must be between 1 and 5.

### Chat

- Only authorized participants can access a conversation.
- Message sender must be a conversation participant.
- Chat messages are persisted in PostgreSQL.

---

# 30. Indexing Strategy

Indexes should be added for frequently queried fields.

Recommended indexes include:

```text
users.email
users.phone
users.role

worker_profiles.approval_status
worker_profiles.availability_status
worker_profiles.district

worker_categories.category_id
worker_categories.worker_id

jobs.customer_id
jobs.category_id
jobs.status
jobs.district
jobs.created_at

job_requests.job_id
job_requests.worker_id
job_requests.status

bookings.worker_id
bookings.scheduled_date
bookings.status

worker_availability.worker_id
worker_availability.availability_date

cancellations.job_id
cancellations.cancelled_by

conversations.job_id
conversations.customer_id
conversations.worker_id

messages.conversation_id
messages.created_at

notifications.user_id
notifications.is_read
notifications.created_at

reviews.worker_id
reviews.customer_id
reviews.job_id
```

For the public job dashboard, an index around:

```text
jobs(status, category_id, created_at)
```

will be useful.

For worker discovery:

```text
worker_profiles(approval_status, district)
```

and the relevant worker/category relationship indexes should be used.

---

# 31. Data Ownership

| Resource            | Owner             | Who Can Modify         |
| ------------------- | ----------------- | ---------------------- |
| User account        | User              | User/Admin             |
| Customer profile    | Customer          | Customer/Admin         |
| Worker profile      | Worker            | Worker/Admin           |
| Worker portfolio    | Worker            | Worker/Admin           |
| Worker availability | Worker            | Worker                 |
| Job                 | Customer          | Customer/Admin         |
| Job images          | Customer          | Customer/Admin         |
| Job request         | Worker            | Worker                 |
| Booking             | Customer/Worker   | Authorized parties     |
| Cancellation        | Cancelling user   | System/Admin           |
| Conversation        | Customer + Worker | Participants           |
| Message             | Sender            | Sender/System          |
| Review              | Customer          | Customer/Admin         |
| Notification        | System            | System/User read state |
| Approval record     | Admin             | Admin                  |

---

# 32. Supabase Storage Structure

PostgreSQL stores metadata and storage paths while Supabase Storage stores the actual files.

Recommended structure:

```text
apewada/
├── profiles/
│   ├── customers/
│   └── workers/
│
├── jobs/
│   └── {job_id}/
│
├── worker-portfolios/
│   └── {worker_id}/
│       └── {portfolio_id}/
│
└── chat/
    └── {conversation_id}/
```

The exact bucket structure can be adjusted during implementation.

---

# 33. Security Considerations

1. Passwords must never be stored as plain text.

2. Passwords should be hashed using a secure password hashing algorithm such as Argon2id or bcrypt.

3. JWT secrets must be stored in environment variables/secrets management.

4. PostgreSQL credentials must never be committed to Git.

5. Supabase credentials must never be hardcoded in the mobile application.

6. Backend authorization must be performed for every protected resource.

7. Storage access must be controlled so that users cannot access unauthorized private files.

8. User-supplied image/file uploads must be validated.

9. API request payloads must be validated before database operations.

10. Database queries must use parameterized queries or a safe database abstraction to prevent SQL injection.

11. Sensitive customer information should only be exposed to workers when the worker has a legitimate job-related relationship.

12. Admin operations must be protected by both authentication and role-based authorization.

---

# 34. Future Extensions

The schema should be able to support future features without requiring a complete redesign.

Potential future entities include:

```text
payments
wallets
worker_payouts
subscriptions
promotions
disputes
reports
favorites
saved_workers
service_areas
worker_documents
verification_documents
```

These are intentionally outside the first-version scope.

---

# 35. MVP Database Priority

The initial implementation should not create every table at once.

Recommended implementation order:

### Phase 1 — Authentication

```text
users
customer_profiles
worker_profiles
```

### Phase 2 — Categories

```text
categories
worker_categories
```

### Phase 3 — Worker Profiles

```text
worker_experience
worker_education
worker_portfolio
worker_portfolio_images
worker_availability
```

### Phase 4 — Jobs

```text
jobs
job_images
job_status_history
```

### Phase 5 — Worker Requests

```text
job_requests
```

### Phase 6 — Booking

```text
bookings
```

### Phase 7 — Cancellation

```text
cancellations
```

### Phase 8 — Chat

```text
conversations
conversation_participants
messages
```

### Phase 9 — Reviews

```text
reviews
```

### Phase 10 — Notifications

```text
notifications
push_tokens
```

### Phase 11 — Administration

```text
approval_records
```

---

# 36. Database Design Principles

- PostgreSQL is the source of truth.
- Use UUIDs for public entity identifiers.
- Keep authentication data separate from role-specific profile data.
- Normalize relationships rather than storing repeated JSON data.
- Use join tables for many-to-many relationships.
- Keep job requests separate from bookings.
- Keep cancellation records separate from jobs/users.
- Keep job status history for auditability.
- Store media in Supabase Storage rather than PostgreSQL.
- Store media references in PostgreSQL.
- Enforce critical business rules in the backend and appropriate database constraints.
- Avoid storing calculated values as the only source of truth.
- Use transactions for multi-step operations such as worker selection and booking.
- Preserve historical job, booking, cancellation, and review data.
