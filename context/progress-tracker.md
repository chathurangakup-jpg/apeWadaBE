# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- **Planning & Architecture — Complete**
- **Initial Backend Implementation — Not Started**

## Current Goal

- Start implementing the ApeWada backend foundation using **Node.js + Express.js + TypeScript + PostgreSQL**.
- Establish the project structure, database connection, environment configuration, JWT authentication, and initial user/role model.
- Build the backend foundation before implementing the customer and worker job workflows.

## Completed

### Product Definition

- Defined the three main entities:
  - Customer
  - Worker
  - Admin

- Defined the public dashboard flow.

- Defined customer registration and authentication flow.

- Defined worker registration and admin approval flow.

- Defined customer job creation and admin approval flow.

- Defined worker request/quotation flow.

- Defined customer-worker communication flow.

- Defined worker selection and scheduling flow.

- Defined worker availability and calendar requirements.

- Defined job lifecycle and cancellation flow.

- Defined mandatory cancellation reasons.

- Defined cancellation history for customers and workers.

- Defined customer-to-worker rating and review flow.

- Defined worker profile and portfolio requirements.

- Defined English and Sinhala localization.

- Defined first-version payment scope: **No payment gateway**.

### Architecture

- Mobile application: **Expo React Native + TypeScript + Expo Router**.
- State management: **Redux Toolkit + RTK Query**.
- Admin application: **Next.js + TypeScript**.
- Backend: **Node.js + Express.js + TypeScript**.
- Database: **PostgreSQL**.
- Authentication: **JWT implemented in the Node.js backend**.
- File storage: **Supabase Storage**.
- Real-time communication: **Socket.IO + Node.js**.
- Push notifications: **Expo Notifications**.
- Reverse proxy: **Nginx**.
- Containerization: **Docker**.
- CI/CD: **GitHub Actions**.
- Version control: **Git + GitHub**.

### Important Architecture Decisions

- PostgreSQL is the source of truth for application data.
- Supabase is used for file/media storage only.
- Authentication is handled by the Node.js backend rather than Supabase Auth or Clerk.
- Mobile and admin clients communicate with the backend rather than directly accessing PostgreSQL.
- Socket.IO provides real-time communication while PostgreSQL persists chat messages.
- The backend is designed as a modular monolith rather than separate microservices.
- Worker approval and customer job approval are handled by the admin application.
- Customer and worker booking/request workflows are separated.
- Online payment is outside the first-version scope.

## In Progress

- Backend project initialization.
- Backend folder/module structure.
- PostgreSQL database configuration.
- Environment variable configuration.
- Database schema planning.
- JWT authentication design.
- User and role model design.

## Next Up

### 1. Backend Foundation

- Create Node.js + Express.js + TypeScript project.
- Configure development scripts.
- Configure environment variables.
- Configure PostgreSQL connection.
- Configure application error handling.
- Configure request validation.
- Configure logging.
- Configure CORS.
- Configure security middleware.

### 2. Database Foundation

Create the initial database structure for:

- Users
- Customer profiles
- Worker profiles
- Roles
- Service categories

### 3. Authentication

Implement:

- Customer registration
- Worker registration
- Login
- Password hashing
- JWT access token
- Authentication middleware
- Role-based authorization

### 4. Worker Approval

Implement:

- Worker profile submission
- Pending approval state
- Admin worker approval/rejection
- Public visibility only after approval

### 5. Customer Jobs

Implement:

- Create job
- Job images
- Job categories
- Job approval
- Open jobs
- Job status management

### 6. Worker Requests

Implement:

- Worker job request
- Worker quotation/budget
- Customer viewing requests
- Customer-worker selection

### 7. Booking & Availability

Implement:

- Worker availability
- Availability calendar
- Worker date confirmation
- Booking creation
- Conflict prevention

### 8. Chat

Implement:

- Conversations
- Messages
- Socket.IO
- Message persistence
- Read/unread state
- Chat authorization

### 9. Job Completion & Reviews

Implement:

- Start work
- Complete work
- Customer rating
- Customer review

### 10. Notifications

Implement:

- Job notifications
- Worker request notifications
- Booking notifications
- Cancellation notifications
- Chat notifications
- Expo push notifications

## Open Questions

- Exact PostgreSQL database schema and relationships need to be finalized before implementation.
- Decide whether a job can have multiple service categories or exactly one primary category.
- Define whether worker quotations can be edited after submission.
- Define quotation expiration rules, if required.
- Define the exact worker availability model:
  - Full-day availability
  - Time slots
  - Both
- Define the exact booking model for date/time and duration.
- Define whether customers can edit an approved/open job and what happens to existing worker requests after an edit.
- Define whether customers can cancel a job at every lifecycle state or only selected states.
- Define whether workers can cancel after the work has started.
- Define the exact admin rejection workflow and whether rejection requires a reason.
- Define chat retention and message deletion rules.
- Define image/file size and type limits.
- Define notification preferences.
- Define password reset and account recovery flow.
- Define account deactivation/deletion behavior.

## Architecture Decisions

### Node.js + Express.js

- The backend uses Node.js, Express.js, and TypeScript.
- The backend is responsible for API endpoints, business logic, authentication, authorization, and integrations.
- A modular monolith is used initially to keep development and deployment manageable.

### PostgreSQL

- PostgreSQL is the primary application database.
- Structured entities and relationships are stored in PostgreSQL.
- PostgreSQL is the source of truth for application state.

### JWT Authentication

- Authentication is implemented by the Node.js backend.
- JWT is used for authenticated API requests.
- Passwords are stored only as secure password hashes.
- Authentication and authorization are enforced on the backend.

### Supabase Storage

- Supabase Storage is used for application media.
- PostgreSQL stores file/object references and metadata.
- Images are not stored directly in PostgreSQL.

### Socket.IO

- Socket.IO is used for real-time customer-worker chat.
- Chat messages are persisted in PostgreSQL.
- Socket.IO is responsible for real-time delivery.

### Redux Toolkit + RTK Query

- Redux Toolkit manages client-side global state.
- RTK Query handles API communication, caching, loading states, and invalidation.
- Client-side state is not treated as the source of truth.

### Admin Approval

- Customer registration does not require admin approval.
- Worker profiles require admin approval before public visibility.
- Customer jobs require admin approval before workers can request/quote on them.

### Job Request and Booking Separation

- A worker request/quotation is separate from a booking.
- Multiple workers can request/quote on one job.
- The customer selects a worker.
- The selected worker confirms/schedules the work date.
- A booking represents the confirmed work arrangement.

### Cancellation

- Customers and workers can cancel jobs according to the allowed job states.
- A cancellation reason is mandatory.
- Cancellation records are persisted rather than only maintaining a cancellation counter.
- Cancellation history can be displayed on the relevant user profile.

### Reviews

- Only customers can rate and review workers.
- Reviews are associated with completed jobs.
- Workers cannot rate customers.

### Localization

- English and Sinhala are supported.
- Language preference belongs to the user/application settings.
- Localization does not affect business logic or database relationships.

### Payments

- No online payment gateway is included in version one.
- Payment processing and payouts are outside the initial application scope.

## Session Notes

- Product requirements have been documented in `project-overview.md`.
- System architecture and technology choices have been documented in `architecture.md`.
- The next development step is the **Node.js backend foundation**.
- Before implementing business APIs, finalize the PostgreSQL entity relationships and database schema.
- Authentication should be implemented before protected customer/worker features.
- Keep business logic in backend services rather than controllers.
- Keep database access separate from controllers/business logic.
- Keep frontend authorization checks as a user-experience feature only; backend authorization remains mandatory.
- When implementing new features, update this progress tracker immediately after a meaningful implementation milestone.
