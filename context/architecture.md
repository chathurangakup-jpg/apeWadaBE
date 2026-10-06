# Architecture Context

## Stack

| Layer                   | Technology                             | Role                                                                              |
| ----------------------- | -------------------------------------- | --------------------------------------------------------------------------------- |
| Customer/Worker Mobile  | Expo React Native + TypeScript         | Main mobile application for customers and workers                                 |
| Navigation              | Expo Router                            | File-based navigation and protected/public routes                                 |
| UI                      | React Native Paper + custom components | Application UI and reusable components                                            |
| State Management        | Redux Toolkit                          | Global application state management                                               |
| API Data Management     | RTK Query                              | API requests, caching, loading/error states, and data synchronization             |
| Admin Web               | Next.js + TypeScript                   | Web application for administrators                                                |
| Backend                 | Node.js + Express.js + TypeScript      | REST API, business logic, authentication, authorization, and application services |
| Authentication          | JWT                                    | User authentication and session authorization                                     |
| Database                | PostgreSQL                             | Persistent application data, relationships, jobs, users, bookings, reviews, etc.  |
| File Storage            | Supabase Storage                       | Profile images, job images, worker portfolio images, and other uploaded media     |
| Real-Time Communication | Socket.IO                              | Real-time customer/worker chat and related real-time events                       |
| Push Notifications      | Expo Notifications                     | Push notifications for mobile users                                               |
| Web Server              | Nginx                                  | Reverse proxy and HTTPS/traffic routing                                           |
| Containerization        | Docker                                 | Containerized backend and supporting services                                     |
| CI/CD                   | Jenkins                                | Build, test, and deployment automation                                            |
| Version Control         | Git + GitHub                           | Source control and collaboration                                                  |

---

## System Architecture

```text
                         ┌──────────────────────┐
                         │      Customer        │
                         │   Expo React Native  │
                         └──────────┬───────────┘
                                    │
                                    │ REST API / Socket.IO
                                    │
                         ┌──────────▼───────────┐
                         │       Worker         │
                         │   Expo React Native  │
                         └──────────┬───────────┘
                                    │
                                    │
                              ┌─────▼─────┐
                              │   Nginx   │
                              │ Reverse   │
                              │  Proxy    │
                              └─────┬─────┘
                                    │
                     ┌──────────────▼──────────────┐
                     │       Node.js Backend       │
                     │      Express + TypeScript   │
                     │                             │
                     │  REST API                   │
                     │  JWT Authentication         │
                     │  Authorization               │
                     │  Business Logic              │
                     │  Socket.IO                   │
                     └───────┬───────────┬─────────┘
                             │           │
                    ┌────────▼───┐   ┌──▼────────────┐
                    │ PostgreSQL │   │ Supabase      │
                    │            │   │ Storage       │
                    │ App Data   │   │               │
                    │ Relations  │   │ Images/Media  │
                    └────────────┘   └───────────────┘


                         ┌──────────────────────┐
                         │       Admin          │
                         │ Next.js + TypeScript │
                         └──────────┬───────────┘
                                    │
                                    │ REST API
                                    ▼
                              Node.js Backend
```

The Node.js backend is the central application layer. Mobile and admin clients should not directly access PostgreSQL.

---

## System Boundaries

### Mobile Application

- `app/` — Expo Router screens, route groups, layouts, and navigation.
- `components/` — Reusable UI components shared across screens.
- `features/` — Feature-specific UI and application logic.
- `store/` — Redux Toolkit store, slices, and RTK Query APIs.
- `services/` — API and external-service integration where required.
- `hooks/` — Reusable React hooks.
- `constants/` — Application constants such as categories and configuration values.
- `utils/` — General utility functions.
- `locales/` — English and Sinhala translations.
- `assets/` — Static application assets such as images, icons, and animations.

The mobile application is responsible for presentation, local UI state, navigation, API consumption, and user interactions.

The mobile application must not contain business-critical authorization or security logic that can be trusted by the backend.

---

### Admin Web Application

- `app/` — Next.js routes and pages.
- `components/` — Reusable admin UI components.
- `features/` — Admin-specific feature modules.
- `services/` — Backend API communication.
- `store/` — Redux/RTK Query state where required.
- `utils/` — Admin utility functions.

The admin application is responsible for administrative UI and workflows.

Administrative authorization must always be enforced by the backend. Hiding an admin page in the frontend is not considered authorization.

---

### Backend

Suggested structure:

```text
backend/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── routes/
│   ├── services/
│   ├── repositories/
│   ├── models/
│   ├── middlewares/
│   ├── validators/
│   ├── sockets/
│   ├── utils/
│   ├── types/
│   └── server.ts
├── tests/
├── Dockerfile
└── package.json
```

- `controllers/` — Receive HTTP requests and return responses.
- `routes/` — Define REST API endpoints and route middleware.
- `services/` — Contain business logic and application workflows.
- `repositories/` — Handle PostgreSQL data access.
- `models/` — Database-related models/types where applicable.
- `middlewares/` — Authentication, authorization, validation, error handling, etc.
- `validators/` — Request payload validation.
- `sockets/` — Socket.IO connection and event handling.
- `config/` — Environment and application configuration.
- `utils/` — Shared backend utilities.
- `types/` — Shared TypeScript types/interfaces.

The backend owns business rules, authorization, validation, job lifecycle transitions, worker selection, bookings, cancellations, reviews, and other critical operations.

---

## Storage Model

### PostgreSQL

PostgreSQL is the primary application database.

It stores structured application data including:

- Users
- Customer profiles
- Worker profiles
- Worker categories
- Worker experience
- Worker education
- Worker portfolio metadata
- Worker availability
- Service categories
- Customer jobs
- Job images metadata
- Worker job requests
- Quotations
- Job assignments/bookings
- Job status history
- Cancellations
- Cancellation reasons
- Chat conversations
- Chat messages metadata/content
- Notifications
- Ratings
- Reviews
- Admin-related data
- Approval records

PostgreSQL is the source of truth for application state and relationships.

Images and other large binary files should not be stored directly inside PostgreSQL.

### Supabase Storage

Supabase Storage is used for uploaded media.

Examples:

```text
profile-images/
worker-portfolio/
job-images/
```

Storage contains:

- Customer profile images
- Worker profile images
- Worker portfolio images
- Customer job images
- Other approved application media

The database stores the relevant storage path/object identifier and metadata rather than the actual image binary.

The backend controls who is allowed to upload or associate media with application resources.

---

## Auth and Access Model

### Authentication

Users authenticate through the Node.js backend.

The backend:

1. Validates login credentials.
2. Generates JWT access tokens.
3. Returns the authenticated session/token to the client.
4. Validates the JWT on protected API requests.

The frontend must not be treated as a trusted authentication source.

### User Roles

A user has one primary application role:

```text
CUSTOMER
WORKER
ADMIN
```

Role-based authorization is enforced by the backend.

Example:

```text
Customer
  → Create jobs
  → Request/chat with workers
  → Select workers
  → Review workers

Worker
  → Manage worker profile
  → Manage availability
  → Request/quote on jobs
  → Communicate with customers
  → Manage assigned jobs

Admin
  → Approve workers
  → Approve jobs
  → Manage users
  → Manage categories
  → Monitor platform activity
```

### Worker Approval

Worker registration does not automatically make the worker publicly visible.

Worker lifecycle:

```text
Registered
    ↓
Profile Submitted
    ↓
Pending Admin Approval
    ↓
Approved
    ↓
Public Worker Profile
```

An unapproved worker cannot appear as an approved/public worker to customers.

### Customer Access

Customers do not require administrator approval after registration.

A registered customer can use the customer application according to the permissions associated with their account.

### Job Approval

Customer-created jobs require administrator approval before becoming visible to workers.

```text
Customer Creates Job
        ↓
Pending Approval
        ↓
Admin Approves
        ↓
Open
```

Rejected jobs must not be available for worker requests.

### Ownership

Resources must be associated with their owning user.

Examples:

- A customer owns their jobs.
- A worker owns their worker profile and portfolio.
- A user owns their cancellation history.
- A customer owns reviews they submit.
- A job belongs to the customer who created it.

The backend verifies ownership before allowing mutations.

---

## Authorization Rules

Authorization is enforced on the backend for every protected operation.

Examples:

- A customer cannot modify another customer's job.
- A worker cannot modify another worker's profile.
- A worker cannot submit a quotation on a rejected job.
- A worker cannot access private customer information without a valid job-related relationship.
- A customer cannot modify another customer's job.
- A customer cannot select a worker for a job they do not own.
- A customer cannot review a worker unless the relevant job has been completed.
- A worker cannot approve their own profile.
- An admin-only operation cannot be performed by a customer or worker.
- A user cannot modify another user's cancellation records.

---

## Real-Time Communication

Socket.IO is used for real-time communication between customers and workers.

The Node.js backend owns the Socket.IO connection and event handling.

Typical events include:

```text
connection
join_conversation
send_message
receive_message
message_read
typing
stop_typing
job_status_changed
worker_selected
booking_confirmed
```

Chat messages should also be persisted in PostgreSQL so that users can retrieve their conversation history after reconnecting.

Socket.IO provides real-time delivery; PostgreSQL provides persistent message history.

Authentication must also be applied to Socket.IO connections so that users cannot join conversations they are not authorized to access.

---

## Job Lifecycle Invariants

The job lifecycle must follow valid state transitions.

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

A job can transition to:

```text
CANCELLED
```

from appropriate active states.

The backend must reject invalid state transitions.

For example:

- A completed job cannot become open again.
- A cancelled job cannot become scheduled.
- A worker cannot mark another customer's job as completed.
- A customer cannot mark a job as completed before the appropriate workflow state.
- A worker cannot be selected for a rejected job.

---

## File Upload Model

Files are uploaded to Supabase Storage.

The backend should validate:

- File type
- File size
- Ownership
- Associated resource
- Upload permissions

Example:

```text
Customer
   ↓
Create Job
   ↓
Upload Image
   ↓
Supabase Storage
   ↓
Storage path saved in PostgreSQL
   ↓
Job references image
```

The application should avoid storing permanent public file URLs when access control requires private files. Storage paths/object identifiers should be treated as the canonical reference.

---

## Notifications

Expo Notifications is used for mobile push notifications.

Notifications may be generated for:

- Worker profile approval/rejection
- Customer job approval/rejection
- New worker request
- New quotation
- Worker selected
- Booking/date confirmation
- Job status changes
- Job cancellation
- New chat messages
- New customer review

The backend is responsible for deciding when a notification should be generated.

---

## Deployment Architecture

The production backend is containerized using Docker.

A typical deployment is:

```text
Internet
   ↓
Nginx
   ↓
Dockerized Node.js API
   ↓
PostgreSQL

Node.js
   ├── Socket.IO
   ├── Supabase Storage
   └── Expo Push Notification Service

Jenkins
   ↓
Build
   ↓
Test
   ↓
Docker Image
   ↓
Deploy to Server
```

Nginx is responsible for reverse proxying HTTP/HTTPS traffic to the backend.

Jenkins is responsible for CI/CD automation.

Secrets such as:

- JWT secret
- PostgreSQL credentials
- Supabase credentials
- Expo notification credentials

must be provided through environment variables or a secure secrets mechanism and must never be committed to source control.

---

## Invariants

1. **The backend is the source of truth for authorization.** Client-side role checks must never be relied upon for security.

2. **PostgreSQL is the source of truth for application state.** Redux state and cached API data are client-side representations only.

3. **Only approved workers are publicly visible to customers.**

4. **Customer jobs must be approved by an administrator before workers can request/quote on them.**

5. **A worker cannot request/quote on a job that is not open.**

6. **A customer can only select a worker for a job owned by that customer.**

7. **A worker can only manage jobs for which they are legitimately involved in the request, selection, or booking workflow.**

8. **A booking cannot create a conflicting worker schedule.**

9. **Cancellation requires a cancellation reason.**

10. **Cancelled jobs cannot continue through the normal work-completion lifecycle.**

11. **Only customers can submit worker ratings and reviews.**

12. **A customer can review a worker only for an eligible completed job.**

13. **A user cannot modify another user's profile, jobs, availability, reviews, or cancellation records without appropriate authorization.**

14. **Chat access is restricted to users who are authorized participants in the relevant conversation.**

15. **Chat messages are persisted in PostgreSQL; Socket.IO is responsible for real-time delivery, not permanent storage.**

16. **Uploaded files must be associated with an authorized application resource and user.**

17. **Business-critical state transitions are validated and enforced by the backend.**

18. **JWT secrets, database credentials, Supabase credentials, and other secrets must never be committed to source control.**

19. **The mobile and admin clients must communicate with the backend through defined APIs rather than directly accessing PostgreSQL.**

20. **Redux Toolkit/RTK Query state must never be treated as authoritative application state.**

21. **English and Sinhala localization must not change business logic or database meaning.**

22. **Payment processing is outside the responsibility of the first-version application.**
