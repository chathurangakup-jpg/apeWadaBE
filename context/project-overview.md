# ApeWada

## Overview

There are 3 entities in the project: **Worker, Customer, and Admin**.

Workers and customers use the mobile application, while admins use a separate web application.

Customers can register as customers and create jobs for services they need. For example:

- Garden grass cutting
- Broken water pipe
- Electrical repair
- House cleaning
- Painting
- Carpentry
- Plumbing

A customer can create a job with a description, service category, preferred date, location, and optional images.

After a customer posts a job and the admin approves it, suitable workers can view the job and send a request/quotation with their proposed budget and availability.

Customers can communicate with workers through real-time chat before accepting a worker's request. The customer can discuss the job requirements and clarify details with the worker.

The customer selects a worker from the received requests. The worker then confirms and books the work date for the customer based on their availability.

Workers can create and maintain their professional profiles, including:

- Profile information
- Experience
- Education
- Service categories
- Previous jobs
- Portfolio images
- Customer ratings and reviews
- Availability
- Cancellation history

Workers can belong to multiple service categories and can manage their availability through a calendar. Customers can view a worker's available dates before discussing and selecting a worker.

After the scheduled work is completed, the customer can mark the job as completed and rate the worker.

If either the customer or worker cancels a confirmed job, a cancellation reason is required. Cancellation information is recorded and can be displayed on the relevant user's profile.

Workers can also view customer information relevant to their work, such as the customer's profile, venue/location information, phone number, and cancellation history.

The first version of ApeWada will not include an online payment gateway. Payments between customers and workers will be handled outside the application.

ApeWada supports **English and Sinhala**. Customers and workers can select their preferred language from the application settings.

The admin web application allows administrators to:

- Manage customers
- Review and approve worker profiles
- Review and approve customer jobs
- Manage workers
- Manage jobs
- Monitor bookings
- Review cancellations
- Manage reported or problematic content

---

## Goals

1. Build a trusted service marketplace that connects customers with suitable workers for household and local service requirements.

2. Allow customers to easily create service jobs, attach images, communicate with workers, compare worker requests/quotations, and select a suitable worker.

3. Allow workers to build professional profiles, showcase their experience and previous work, manage service categories and availability, and receive job opportunities.

4. Provide a clear job lifecycle from job creation and worker selection through scheduling, completion, cancellation, and customer review.

5. Provide real-time communication between customers and workers through in-app chat before and after worker selection when appropriate.

6. Build an admin approval and management system to improve the quality and trustworthiness of workers and customer-posted jobs.

7. Support both Sinhala and English so that customers and workers can use the application in their preferred language.

---

## Core User Flow

### 1. Public Dashboard

When the application is installed, users can access the public dashboard without signing in.

The public dashboard allows users to:

- View customer-posted jobs
- Filter jobs by service category
- Browse workers by service category
- Search for workers
- View worker profiles
- View worker ratings and reviews
- View worker availability
- View job details

Examples of service categories include:

- Plumbing
- Electrical
- Carpentry
- Cleaning
- Painting
- Gardening
- Grass Cutting

Users can browse the platform before creating an account.

If an unauthenticated user attempts to perform an action that requires authentication, such as requesting a worker, posting a job, sending a message, or submitting a quotation, the application navigates the user to the sign-in/sign-up flow.

### 2. Authentication and Registration

Users can register as either:

- Customer
- Worker

Customer registration does not require admin approval.

Worker registration requires profile information and professional details. The worker profile remains unavailable publicly until an administrator approves it.

### 3. Customer Flow

After signing in as a customer, the customer has access to the main application with four bottom tabs:

- Home
- Notifications
- Chats
- Profile

A customer can:

1. Create a job.
2. Add a title and description.
3. Select one or more relevant service categories where appropriate.
4. Add location/venue information.
5. Select a preferred date.
6. Attach images.
7. Submit the job.
8. Wait for admin approval.
9. Receive worker requests/quotations.
10. Chat with workers before accepting a request.
11. Compare worker profiles, ratings, experience, previous work, and proposed budgets.
12. Select a worker.
13. Worker confirms and books the work date.
14. Track the job status.
15. Chat with the selected worker.
16. Cancel the job when necessary by providing a cancellation reason.
17. Mark the job as completed.
18. Rate and review the worker.

### 4. Worker Flow

After signing in as a worker, the worker has access to:

- Home
- Notifications
- Chats
- Profile

A worker can:

1. Create a professional profile.
2. Add experience and education.
3. Select multiple service categories.
4. Add previous jobs and portfolio images.
5. Submit the profile for admin approval.
6. Become publicly visible after approval.
7. Set availability status.
8. Manage available/unavailable dates using a calendar.
9. Browse approved customer jobs.
10. View job details and attached images.
11. Chat with customers before accepting a job.
12. Send a request/quotation with a proposed budget.
13. Wait for the customer to select the worker.
14. Confirm and book the work date after being selected.
15. Communicate with the customer through real-time chat.
16. Start and complete the work.
17. Cancel a job when necessary by providing a cancellation reason.
18. View their cancellation history.
19. View customer information required for completing the job.

Workers cannot rate customers, but they can view relevant customer information such as:

- Customer profile
- Venue/location
- Phone number
- Cancellation history

### 5. Worker Request / Quotation Flow

A customer job can receive requests from multiple workers.

For example:

```text
Customer creates Job
        ↓
Admin approves Job
        ↓
Job becomes Open
        ↓
Multiple Workers view Job
        ↓
Worker A → Rs. 15,000
Worker B → Rs. 18,000
Worker C → Rs. 13,500
        ↓
Customer chats with workers
        ↓
Customer selects one Worker
        ↓
Worker confirms date
        ↓
Job becomes Scheduled
```

The customer can communicate with workers before selecting one.

### 6. Booking and Scheduling Flow

A customer does not directly book a worker.

Instead:

```text
Customer → Creates/requests job
        ↓
Worker → Sends request/quotation
        ↓
Customer → Selects worker
        ↓
Worker → Confirms and books available date
        ↓
Job → Scheduled
```

The worker's availability calendar is used to determine suitable work dates.

### 7. Job Lifecycle

A job follows a controlled lifecycle:

```text
Pending Approval
      ↓
Open
      ↓
Worker Selected
      ↓
Scheduled
      ↓
In Progress
      ↓
Completed
```

A job can also be cancelled:

```text
Pending Approval ──→ Cancelled
Open ──────────────→ Cancelled
Worker Selected ───→ Cancelled
Scheduled ─────────→ Cancelled
In Progress ───────→ Cancelled
```

When a customer or worker cancels a confirmed job, a cancellation reason is required.

The cancellation is stored against the user and job and can contribute to the user's cancellation history.

### 8. Review Flow

Only customers can review workers.

After a job is completed, the customer can:

- Give a rating
- Write a review

The worker's profile displays their accumulated ratings and reviews.

Workers cannot rate customers.

### 9. Admin Flow

Administrators use the web application.

The admin can:

- View customers
- View workers
- Approve/reject worker profiles
- View customer jobs
- Approve/reject customer jobs
- Manage jobs
- Monitor job status
- View worker requests
- View bookings
- View cancellations
- Review cancellation reasons
- Manage categories
- Manage problematic or reported content

---

## Features

### Authentication and User Management

- Customer registration and login
- Worker registration and login
- Role-based access
- Customer profile management
- Worker profile management
- Profile avatar
- Phone number
- Preferred language
- Account settings

### Customer Features

- Public job browsing
- Worker browsing
- Worker search
- Worker category filtering
- Job creation
- Job description
- Job category
- Job location/venue
- Preferred date
- Job image attachments
- View worker requests
- View worker quotations
- Compare worker profiles
- View worker experience
- View worker portfolio
- View worker ratings and reviews
- View worker availability
- Chat with workers
- Select a worker
- View job status
- Cancel jobs with a reason
- View own cancellation history
- Complete jobs
- Rate and review workers

### Worker Features

- Worker professional profile
- Experience
- Education
- Multiple service categories
- Portfolio
- Previous jobs
- Portfolio images
- Worker ratings and reviews
- Availability status
- Availability calendar
- View customer jobs
- Filter jobs by category
- View job details
- View job images
- Send job requests/quotations
- Chat with customers
- Confirm work dates
- Manage assigned jobs
- Update job status
- Cancel jobs with a reason
- View own cancellation history
- View relevant customer information

### Job Management

- Create jobs
- Edit jobs where applicable
- Job approval
- Job rejection
- Job images
- Job categories
- Job location
- Preferred dates
- Worker requests
- Worker quotations
- Worker selection
- Scheduling
- Job status tracking
- Job cancellation
- Cancellation reasons
- Job completion
- Customer reviews

### Real-Time Chat

- Customer-to-worker chat
- Real-time messages
- Message timestamps
- Chat history
- Notifications for new messages
- Unread message count
- Job-related conversations

Customers can communicate with workers before accepting a worker's request.

### Worker Availability

- Available/unavailable status
- Calendar-based availability
- Block specific dates
- View worker available dates
- Prevent conflicting bookings
- Update availability

### Reviews and Ratings

- Customer can rate workers
- Customer can write reviews
- Worker rating displayed on profile
- Review history displayed on worker profile
- Ratings associated with completed jobs

### Notifications

- New worker request
- New quotation
- Worker selected
- Booking/date confirmation
- Job status changes
- Job cancellation
- New chat message
- Admin approval/rejection
- New review

### Localization

- English
- Sinhala
- User-selectable language
- Localized application UI
- Language preference saved to the user's profile/settings

### Admin Web Application

- Admin authentication
- Customer management
- Worker management
- Worker profile approval
- Customer job approval
- Job management
- Category management
- Booking monitoring
- Cancellation monitoring
- Review monitoring
- User management
- Content moderation

---

## Scope

### In Scope

- Customer mobile application
- Worker mobile application
- Customer registration and authentication
- Worker registration and authentication
- Role-based access
- Public dashboard
- Customer profiles
- Worker professional profiles
- Worker portfolio
- Multiple worker categories
- Customer job creation
- Job image uploads
- Admin job approval
- Admin worker approval
- Worker requests/quotations
- Customer-worker communication
- Real-time chat
- Worker availability
- Availability calendar
- Worker selection
- Work-date scheduling
- Job status management
- Job cancellation
- Mandatory cancellation reasons
- Cancellation history
- Job completion
- Customer ratings and reviews
- Push/in-app notifications
- English localization
- Sinhala localization
- Admin web application
- Customer management
- Worker management
- Job management
- Basic moderation and approval workflows

### Out of Scope

The following features are not included in the first version:

- Online payment gateway
- In-app wallet
- Escrow payments
- Commission/payment processing
- Worker subscription plans
- Customer subscription plans
- Automated worker payouts
- Advanced AI worker matching
- AI-generated quotations
- Video calls
- Voice calls
- Live GPS worker tracking
- Complex dispute resolution/payment protection system
- Multi-country support
- International currency/payment support

Payments between customers and workers will be handled outside the application in the first version.

---

## Success Criteria

1. A new user can register as either a customer or worker.

2. A customer can register and immediately use customer features without admin approval.

3. A worker can complete their professional profile and submit it for admin approval.

4. An administrator can approve or reject worker profiles.

5. An approved worker can become publicly visible to customers.

6. A customer can create a job with a description, category, location, preferred date, and optional images.

7. An administrator can approve or reject customer jobs.

8. An approved job can be viewed by suitable workers.

9. Multiple workers can submit requests/quotations for the same customer job.

10. A customer can communicate with workers through real-time chat before selecting a worker.

11. A customer can select one worker from the received requests.

12. A selected worker can confirm and schedule the work date based on their availability.

13. The system prevents conflicting worker bookings for the same date/time where applicable.

14. Customers and workers can view the current status of their jobs.

15. Either the customer or worker can cancel a job by providing a cancellation reason.

16. Cancellation records are stored and displayed in the relevant user's cancellation history.

17. A worker can manage their availability and customers can view available dates.

18. A customer can mark a completed job and submit a rating/review for the worker.

19. Worker profiles display relevant ratings, reviews, experience, portfolio, and previous work.

20. Workers can view relevant customer information required to perform an accepted job.

21. Customers and workers receive notifications for important job, chat, approval, booking, and cancellation events.

22. Users can switch between English and Sinhala.

23. An administrator can manage customers, workers, jobs, approvals, categories, bookings, cancellations, and reviews through the web application.

24. The first version can operate without an integrated payment gateway.
