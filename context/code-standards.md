# Code Standards

## General

- Keep modules small, single-responsibility, and easy to read.
- Fix the root cause rather than layering workarounds around symptoms.
- Do not mix authentication, validation, database access, and business logic in the same route handler.
- Prefer clear, maintainable code over clever abstractions.

## JavaScript / Node.js

- Use consistent JavaScript patterns across the project and follow the existing Express code style.
- Avoid loose dynamic logic when a clear object shape or validation step is available.
- Treat request and response objects as untrusted input/output boundaries.
- Avoid production debug logging with `console.log`; remove it or replace it with a structured logger if needed.
- Keep helper functions small and predictable, and avoid side effects in utility code.

## Express API

- Routes should define endpoints and delegate business behavior to controllers/services.
- Validate request params, query values, and body payloads before performing business logic.
- Enforce authentication and authorization checks before any mutation or privileged action.
- Return consistent JSON response shapes for success and error cases.
- Centralize unexpected error handling and avoid swallowing exceptions silently.

## Database and PostgreSQL

- Use parameterized SQL and avoid interpolating user input directly into queries.
- Add migrations for all schema changes and keep migration naming consistent.
- Validate data at the API boundary before writing to the database.
- Keep transactional boundaries explicit when a flow requires multiple database operations.
- Do not duplicate derived data in multiple tables when it can be computed or fetched correctly.

## Styling and Naming

- Use `camelCase` for variables and functions, `PascalCase` for constructors/classes, and descriptive names.
- Prefer early returns and guard clauses over deeply nested conditionals.
- Keep code readable and maintainable with sensible line lengths and clear grouping.
- Avoid magic numbers and hardcoded strings where a constant or enum is more appropriate.
- Only add comments when they explain non-obvious business intent or a tricky edge case.

## File Organization

- `src/routes/` — Express route definitions and endpoint wiring.
- `src/controllers/` — request handling and response serialization.
- `src/services/` — business rules, orchestration, and domain logic.
- `src/validators/` — request validation and sanitization rules.
- `src/middleware/` — auth, JWT, password, and shared request checks.
- `src/config/` — environment and database configuration.
- `src/socket/` — real-time Socket.IO integration and event handlers.
- `src/migrations/` — SQL schema and seed migration files.
- `src/scripts/` — helper scripts and operational utilities.

## API Route Expectations

- Validate and parse request input before any logic runs.
- Enforce auth and ownership checks before any mutation.
- Return predictable response shapes and clear error messages.
- Keep route handlers focused on a single responsibility.
- Ensure database operations and permission checks are completed before sending a success response.
