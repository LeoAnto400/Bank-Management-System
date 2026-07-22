# 🏦 Financial Account & Transaction Management System

[![CI](https://github.com/LeoAnto400/Bank-Management-System/actions/workflows/ci.yml/badge.svg)](https://github.com/LeoAnto400/Bank-Management-System/actions/workflows/ci.yml)

A full-stack banking system simulation modeling real-world financial workflows — account
management, internal transfers, deposits/withdrawals, credit/debit cards, and loan
origination/repayment — with an emphasis on transactional correctness and access control,
not just CRUD.

---

## What this project demonstrates

- **ACID-correct money movement.** Every balance-changing operation (deposits, withdrawals,
  transfers, loan disbursal/repayment) runs inside a SQL transaction with `SELECT ... FOR
  UPDATE` row locking, so concurrent requests against the same account can't race each other
  into an inconsistent balance.
- **Defense-in-depth auth.** bcrypt password hashing (with automatic migration of any legacy
  hashes), short-lived JWTs, role-based access control (customer vs. branch admin), and a
  second password confirmation on sensitive admin actions (editing a customer, approving a
  loan, running a counter transaction).
- **A relational schema that enforces its own invariants** — FK constraints, `CHECK`
  constraints, `UNIQUE` constraints, and DB-level triggers that auto-flag suspicious activity
  (rapid transactions, high-value transfers, repeated failed logins) directly into a fraud log.
- **An integration test suite that exercises real SQL**, not mocks — Jest + Supertest against
  an actual MySQL database, including the transaction-locking and legacy-password-migration
  paths — wired into CI on every push.

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, React Router, Vite |
| Backend | Node.js, Express 5 |
| Database | MySQL 8 (raw SQL via `mysql2`, no ORM) |
| Auth | bcrypt, hand-rolled HMAC-signed JWT, `express-rate-limit` |
| Testing | Jest, Supertest |
| CI/CD | GitHub Actions |
| Containerization | Docker, Docker Compose |

---

## Features

- Customer signup/login and separate branch-accountant (admin) signup/login
- Self-service account opening, status changes (Active / Frozen / Closed)
- Self-service deposits, withdrawals, and internal transfers (capped per transaction, with
  password re-confirmation on transfers)
- Debit/credit card issuance and self-service block/unblock, with the CVV shown once at
  issuance and only ever stored as a hash
- Loan application, branch-accountant approve/reject workflow with EMI calculation, and loan
  repayment with interest/principal splitting
- Branch admin dashboard: accounts, customers, transactions, active loans, audit log, and
  pending loan applications for that branch
- Fraud log monitoring (admin-only) backed by DB triggers that auto-detect rapid transactions,
  high-value transfers, round-tripping, and repeated failed logins
- Full audit trail for sensitive admin actions (before/after values)

---

## Project structure

```
backend/
  config/        env validation (fail-fast) + MySQL connection
  controllers/   thin request handlers: parse, validate, call a service, respond
  services/      business logic (dashboard aggregation, loan review/approval, admin access)
  middleware/    JWT auth guards, rate limiters
  routes/        Express route definitions
  utils/         password hashing, JWT signing, loan/EMI math, shared query helpers
  tests/         Jest + Supertest integration suite
  scripts/       test database setup
banking-frontend/
  src/pages/       route-level views (login, dashboards, accounts, loans, ...)
  src/components/  shared layout + modal components
  src/dashboard/   data-fetching + state for the customer/admin dashboards
dbSyntax.sql       core schema (branches, accounts, transactions, loans, fraud logs, triggers)
auth_schema.sql     login/auth schema (added on top of dbSyntax.sql)
```

---

## Getting started

### Option A — Docker Compose (fastest)

Requires Docker Desktop.

```bash
cp .env.example .env        # fill in MYSQL_ROOT_PASSWORD and JWT_SECRET
docker compose up --build
```

This builds and starts three containers — MySQL (schema auto-loaded from `dbSyntax.sql` +
`auth_schema.sql` on first boot), the API, and the frontend:

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api

### Option B — Run locally

Requires Node.js 20+ and a local MySQL 8 server.

```bash
# 1. Load the schema into your local MySQL server
mysql -u root -p < dbSyntax.sql
mysql -u root -p < auth_schema.sql

# 2. Backend
cd backend
cp .env.example .env        # fill in DB credentials + JWT_SECRET
npm install
npm start                   # http://localhost:5000

# 3. Frontend (separate terminal)
cd banking-frontend
npm install
npm run dev                 # http://localhost:5173
```

`auth_schema.sql` also seeds every existing customer/accountant with a default password of
`Cust@<customer_id>` / `Admin@<accountant_id>` (e.g. `Cust@1`) so you have working logins out
of the box.

### Environment variables

`backend/.env` (see `backend/.env.example`):

| Variable | Description |
| --- | --- |
| `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL connection details |
| `JWT_SECRET` | Random string, 32+ characters. The server refuses to start without it — there is no insecure default. Generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `PORT` | API port (default `5000`) |
| `CORS_ORIGIN` | Comma-separated list of browser origins allowed to call this API. Defaults to `http://localhost:5173` if unset. |

Root `.env` (Docker Compose only, see `.env.example`): `MYSQL_ROOT_PASSWORD`, `JWT_SECRET`.

---

## Testing

The backend test suite runs against a real, isolated MySQL database (`financial_system_test`)
— not mocks — so it also exercises the actual transaction/locking logic.

```bash
cd backend
npm run test:db:setup   # (re)builds financial_system_test from the schema files
npm test                # runs automatically before `npm test` via a pretest hook
```

31 tests cover signup/login validation, bcrypt hashing and legacy-hash migration, account
creation, self-service transactions (including overdraft and ownership checks), atomic
transfers, and regression coverage for previously-open endpoints that are now auth-gated.

CI (`.github/workflows/ci.yml`) runs this same suite against a MySQL service container on
every push/PR, plus a frontend lint + build check.

---

## API overview

All endpoints are under `/api`. `/me`-scoped endpoints act on the authenticated user found in
the JWT; nothing lets a caller act on another customer's data.

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/signup` | — | Customer or admin registration |
| POST | `/login` | — | Customer login |
| POST | `/admin/login` | — | Branch accountant login |
| GET | `/customers/me/dashboard` | Customer | Profile, accounts, transactions, loans, cards |
| PUT | `/customers/me/profile` | Customer | Update personal details |
| POST | `/customers/me/loan-applications` | Customer | Apply for a loan |
| POST | `/customers/me/loans/:loanId/repay` | Customer | Make a loan repayment |
| POST | `/accounts/me` | Customer | Open a new account |
| PATCH | `/accounts/:accountId/status` | Customer | Change account status |
| POST | `/transactions/me` | Customer | Self-service deposit/withdrawal |
| POST | `/transfers/me` | Customer | Internal transfer (password-confirmed) |
| POST | `/cards/me` | Customer | Issue a debit/credit card for one of my accounts |
| PATCH | `/cards/:cardId/status` | Customer | Block/unblock a card |
| GET | `/admin/me/dashboard` | Admin | Branch-scoped accounts/customers/loans/audit log |
| POST | `/admin/accounts/:accountId/counter-transaction` | Admin | Branch counter deposit/withdrawal |
| POST | `/admin/loan-applications/:applicationId/review` | Admin | Approve/reject a loan application |
| PUT | `/admin/accounts/:accountId` | Admin | Edit an account |
| PUT | `/admin/customers/:customerId` | Admin | Edit/KYC a customer |
| GET | `/fraud`, `/fraud/high-risk` | Admin | Fraud log monitoring |
| GET | `/dashboard` | Admin | Bank-wide summary stats |

Login/signup are rate-limited; sensitive admin mutations require a `confirm_password` field
re-verified server-side against the caller's own password hash.

---

## Database design

Twelve core tables (`Branches`, `Customers`, `Accountants`, `Accounts`, `Transactions`,
`Transfers`, `Cards`, `Loan_Applications`, `Loans`, `Loan_Payments`, `Audit_Logs`,
`Fraud_Logs`) plus an auth layer (`Customer_Login`, `Admin_Login`, `Login_Attempts`), all
`InnoDB` with FK/`CHECK`/`UNIQUE` constraints. `dbSyntax.sql` also defines triggers that
auto-populate `Fraud_Logs` on suspicious patterns (high-value transactions, rapid repeated
transactions, round-tripping transfers), and `auth_schema.sql` adds triggers that flag
repeated failed logins and post-lockout "account takeover" attempts.

---

## Known limitations

Kept visible rather than hidden — these are the next things on the list:

- The remaining controllers (`accountController.js`, `transactionController.js`,
  `transferController.js`) still inline their SQL directly; only the two largest
  (`adminController.js`, `customerController.js`) have been split into `services/` so far.
