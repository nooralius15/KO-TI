# 🐾 KO-TI — Full-Stack Pet Shop & Adoption Platform

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-v5.1-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-v8.0%2F%20MariaDB-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Stripe](https://img.shields.io/badge/Stripe-Checkout%20%26%20Refunds-635BFF?logo=stripe&logoColor=white)](https://stripe.com/)
[![Jest](https://img.shields.io/badge/Tested%20with-Jest%20%26%20Supertest-C21325?logo=jest&logoColor=white)](https://jestjs.io/)
[![Docker](https://img.shields.io/badge/Containerized-Docker%20Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

**KO-TI** is an enterprise-grade full-stack e-commerce and pet adoption platform built with **Node.js (Express 5), MySQL/MariaDB, and vanilla JavaScript**. It features ACID database transactions with row-level locking, automated Stripe checkout, webhook lifecycle handling (completed & expired), automated Stripe refunds, inventory control with out-of-stock guards, role-based access control (RBAC), protected server-rendered views, an interactive adoption inquiry workflow, and a 27-test automated integration suite.

---

## 📑 Table of Contents

- [Features](#-features)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Project Directory Structure](#-project-directory-structure)
- [Database Schema](#-database-schema)
- [Quick Start with Docker Compose](#-quick-start-with-docker-compose)
- [Local Installation & Setup](#-local-installation--setup)
- [Running Automated Tests](#-running-automated-tests)
- [Environment Configuration](#-environment-configuration)
- [Stripe Webhook Configuration (Local Testing)](#-stripe-webhook-configuration-local-testing)
- [Default Test Accounts](#-default-test-accounts)
- [API Reference](#-api-reference)
- [Security Implementations](#-security-implementations)
- [License](#-license)

---

## ✨ Features

### 🛍️ Storefront & E-Commerce
- **Catalog Search & Sort:** Real-time client-side search by title and sorting by Price (Low→High, High→Low) and Name (A→Z).
- **Inventory Control & Stock Guards:** Real-time `stock_quantity` tracking. Out-of-stock items display a "Sold Out" badge with disabled cart buttons. Cart addition automatically respects available inventory limits.
- **ACID Database Transactions:** Order placement utilizes row-level locking (`SELECT ... FOR UPDATE`) inside atomic database transactions (`conn.beginTransaction`, `commit`, `rollback`) to eliminate race conditions and over-selling.
- **Server-Side Price Recalculation:** Order amounts are computed directly from database price records to neutralize client-side cart tampering.
- **Stripe Hosted Checkout:** PCI-compliant checkout sessions created via Stripe API with line-item metadata linking to database orders.
- **Webhook Fulfillment & Expiration:** Listens to `checkout.session.completed` to mark orders as `paid` and dispatch receipts. Automatically listens to `checkout.session.expired` to release reserved inventory and flag orders as `failed`.

### 🐾 Adoption Inquiries System
- **Interactive In-App Modal:** Replaces static email links with an interactive adoption application modal.
- **Database Persistence:** Stores inquiries in an `adoption_inquiries` table with applicant contact info, message, and pet association.
- **Admin Review Pipeline:** Dedicated Admin dashboard tab to review, manage, and transition adoption application statuses (`new` → `contacted` → `approved` → `rejected`).

### 🔐 Authentication & Security
- **Role-Based Access Control (RBAC):** Server-enforced permissions distinguishing `customer` and `admin` roles.
- **Protected View Directory:** Admin and user dashboards are served exclusively via authenticated Express routes from `views/` with `res.sendFile()`, entirely eliminating static file URL leakage.
- **MySQL-Backed Persistent Sessions:** `express-session` with `express-mysql-session` preserves sessions across restarts with a 24-hour TTL.
- **Rate Limiting:** Protects `/login`, `/register`, `/api/forgot-password`, `/api/update-profile`, and `/api/adoption-inquiries` using `express-rate-limit`.
- **Bcrypt Password Hashing:** 10-round salted password hashing for credential storage.
- **Secure Password Reset:** Tokenized password reset flow using SHA-256 token hashing, 1-hour expiration timestamps, and anti-enumeration generic responses.

### 👑 Admin Management Panel
- **Tabbed Dashboard Interface:** Seamless switching between **Orders**, **Products**, and **Adoptions**.
- **Product CRUD with Image Uploads:** Full administrative interface to create, update, and soft-deactivate products with file uploads handled via `multer` to `public/images/`.
- **Order Lifecycle & Automated Refunds:** Transition order fulfillment stages (`pending` → `confirmed` → `shipped` → `delivered` → `canceled`). Canceling a paid order triggers an automated Stripe refund (`stripe.refunds.create`), marks status as `refunded`, and restores inventory.
- **Soft Deletions:** Orders use `deleted_at` timestamping to preserve relational integrity.

### 🧪 Automated Integration Testing
- **27 Passing Integration Tests:** Comprehensive test suite with **Jest** and **Supertest** covering:
  - Authentication & RBAC enforcement
  - Route protection & static file 404 security
  - Inventory validation & out-of-stock checkout rejection
  - Admin product CRUD & soft-deactivation
- **Isolated Test Database:** Automated `globalSetup` and `globalTeardown` scripts create, migrate, seed, and drop a dedicated `koti_test` database for zero side effects on production data.

---

## 🏗 Architecture & Tech Stack

```
+-----------------------------------------------------------------------+
|                             Frontend                                  |
|     HTML5 / Responsive CSS3 / Vanilla JavaScript / Boxicons           |
|     Product Search & Sort  *  Adoption Modals  *  Cart (localStorage) |
+-----------------------------------+-----------------------------------+
                                    | HTTP / REST API / Cookies
                                    v
+-----------------------------------------------------------------------+
|                    Backend (Express 5.x & Node.js)                    |
|   ACID Transactions  *  Protected Views  *  RBAC  *  Multer Uploads   |
|   Stripe SDK (Checkout + Refunds)  *  Webhooks  *  Nodemailer Emails  |
+-----------------------------------+-----------------------------------+
                                    | mysql2/promise Connection Pool
                                    v
+-----------------------------------------------------------------------+
|                       Database (MySQL / MariaDB)                      |
|   users  *  products  *  orders  *  order_items  *  password_resets   |
|   adoption_inquiries  *  sessions                                     |
+-----------------------------------------------------------------------+
```

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Runtime** | Node.js (v18+) | JavaScript execution engine |
| **Framework** | Express.js (v5.1) | Minimalist web application framework |
| **Database** | MariaDB / MySQL 8.0+ | Relational storage engine with ACID guarantees |
| **DB Driver** | `mysql2/promise` | Connection pool with native async/await and transactions |
| **Sessions** | `express-session` + `express-mysql-session` | Server-side session store persisted in MySQL |
| **File Uploads** | `multer` | Multipart form handler for product catalog images |
| **Security** | `bcryptjs`, `express-rate-limit`, `crypto` | Salting, rate limiting, and cryptographic token generation |
| **Payments** | Stripe API (`stripe` v18) | Hosted checkout, webhook verification, and refund automation |
| **Testing** | Jest + Supertest | Automated integration test suite |
| **Containerization**| Docker & Docker Compose | Multi-container setup (Node.js app + MariaDB) |

---

## 📁 Project Directory Structure

```plaintext
KO-TI/
├── .env                       # Environment configuration
├── .dockerignore              # Docker build exclusions
├── .gitignore                 # Git exclusions
├── Dockerfile                 # Multi-stage container definition
├── docker-compose.yml         # Container orchestration (App + MariaDB)
├── jest.config.js             # Jest configuration
├── package.json               # Dependencies and npm scripts
├── server.js                  # Main Express application & API routing
├── db.js                      # Promise pool & raw connection export
├── email.js                   # Nodemailer configuration & HTML templates
├── koti.sql                   # Base database schema & initial seed data
├── migration_tier4.sql        # Migration: Inventory, refunds, payment status
├── migration_tier5.sql        # Migration: Adoption inquiries table
├── views/                     # Protected Server-Rendered Views
│   ├── admin.html             # Admin panel (Orders, Products CRUD, Adoptions)
│   └── dashboard.html         # Customer dashboard (Orders, Profile, Password)
├── public/                    # Static Assets (Publicly Served)
│   ├── index.html             # Storefront homepage with search & adoption modal
│   ├── cart.html              # Shopping cart page
│   ├── checkout.html          # Order confirmation & Stripe checkout launch
│   ├── login.html             # User login
│   ├── register.html          # User registration
│   ├── forgot-password.html   # Password recovery request
│   ├── reset-password.html    # Password recovery token submission
│   ├── 404.html               # Not Found page
│   ├── unauthorized.html      # Access Denied page
│   ├── css/                   # Stylesheets (style.css, dashboard.css, etc.)
│   ├── js/                    # Client scripts (main.js, utils.js, menu.js)
│   └── images/                # Product and UI images (includes uploads)
└── tests/                     # Integration Test Suite
    ├── setup.js               # Per-suite environment setup
    ├── globalSetup.js         # Automated test database creation & seeding
    ├── globalTeardown.js      # Automated test database cleanup
    ├── auth.test.js           # Registration, login, and RBAC tests
    ├── inventory.test.js      # Stock validation & checkout tests
    ├── admin.test.js          # Admin product CRUD & permission tests
    └── routes.test.js         # Protected view and route security tests
```

---

## 🐳 Quick Start with Docker Compose

Run the entire application (including the database and automated migrations) with a single command:

```bash
docker compose up --build
```

Once running:
- **Storefront:** [http://localhost:3000](http://localhost:3000)
- **Admin Panel:** [http://localhost:3000/admin](http://localhost:3000/admin)
- **MariaDB Database:** Port `3307` on localhost

To stop the containers:
```bash
docker compose down
```

---

## 💻 Local Installation & Setup

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/nooralius15/KO-TI.git
cd KO-TI
npm install
```

### 2. Configure Database
Ensure MySQL or MariaDB is running, then import the base schema and migrations:
```bash
mysql -u root -p -e "CREATE DATABASE koti;"
mysql -u root -p koti < koti.sql
mysql -u root -p koti < migration_tier4.sql
mysql -u root -p koti < migration_tier5.sql
```

### 3. Environment Variables
Create a `.env` file in the root directory (see [Environment Configuration](#-environment-configuration)).

### 4. Start the Application
```bash
npm start
```
The server will start at `http://localhost:3000`.

---

## 🧪 Running Automated Tests

Run the full integration test suite with Jest:

```bash
npm test
```

Expected output:
```plaintext
PASS tests/admin.test.js
PASS tests/auth.test.js
PASS tests/inventory.test.js
PASS tests/routes.test.js

Test Suites: 4 passed, 4 total
Tests:       27 passed, 27 total
Snapshots:   0 total
Time:        ~2.5 s
```

> **Note:** The test runner automatically provisions a clean `koti_test` database, executes all migrations, runs the tests, and tears down the test database upon completion.

---

## ⚙️ Environment Configuration

Example `.env` configuration file:

```env
# Server Configuration
PORT=3000
APP_URL=http://localhost:3000

# Express Session Secret (64-char random hex string)
SESSION_SECRET=51f7b2d1beb48d766b5a7e0b009122ab7d6b93d34dce545beab94a21005b6d6e076bdcf30e05101a6273361b4b01f49346d1903e4be040333e8b1a0eec37c49e

# Database Configuration
DB_HOST=localhost
DB_PORT=3307
DB_USER=root
DB_PASS=
DB_NAME=koti

# Stripe API Keys (https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_signing_secret_here

# SMTP Configuration (Optional - logs to console if omitted)
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=KOTI Pet Shop <noreply@koti.com>
```

---

## 💳 Stripe Webhook Configuration (Local Testing)

To test Stripe payment fulfillment and session expiration:

1. **Install and log in to Stripe CLI:**
   ```bash
   stripe login
   ```

2. **Forward webhook events:**
   ```bash
   stripe listen --forward-to localhost:3000/webhook/stripe
   ```

3. **Copy the signing secret:**
   Copy the `whsec_...` key into `.env` under `STRIPE_WEBHOOK_SECRET`.

---

## 👥 Default Test Accounts

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@koti.com` | `123456` |
| **Admin** | `nooralkowaifi@gmail.com` | `123456` |
| **Customer** | `user@koti.com` | `123456` |

---

## 📡 API Reference

### 🔐 Authentication & Account

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/register` | Public (Rate-limited) | Register a new customer account |
| `POST` | `/login` | Public (Rate-limited) | Authenticate user & issue session cookie |
| `GET` | `/logout` | Authenticated | Terminate session and redirect |
| `POST` | `/api/forgot-password` | Public (Rate-limited) | Generate & email password reset token |
| `POST` | `/api/reset-password` | Public (Rate-limited) | Validate reset token and update password |
| `POST` | `/api/change-password` | Authenticated | Change password from customer dashboard |

### 🛍️ Products, Checkout & Webhooks

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/products` | Public | List active products with stock quantities |
| `POST` | `/create-checkout-session` | Customer | Validate stock, lock rows, create order, & return Stripe URL |
| `POST` | `/webhook/stripe` | Stripe | Handle `checkout.session.completed` and `checkout.session.expired` |

### 🐾 Adoption Inquiries

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/adoption-inquiries` | Public (Rate-limited) | Submit an adoption application |
| `GET` | `/admin/adoption-inquiries` | Admin only | Retrieve all adoption applications |
| `PUT` | `/admin/adoption-inquiries/:id/status`| Admin only | Update inquiry status (`new`, `contacted`, `approved`, `rejected`) |

### 👑 Admin Management

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/admin/orders-with-items` | Admin only | Fetch all customer orders and line items |
| `POST` | `/admin/orders/:id/status` | Admin only | Update status (`shipped`, `delivered`, `canceled` with refund) |
| `DELETE`| `/admin/orders/:id` | Admin only | Soft-delete an order (`deleted_at = NOW()`) |
| `GET` | `/admin/products` | Admin only | Retrieve full catalog (active & inactive) |
| `POST` | `/admin/products` | Admin only | Create new product with image upload (`multer`) |
| `PUT` | `/admin/products/:id` | Admin only | Update product details or reactivate |
| `DELETE`| `/admin/products/:id` | Admin only | Soft-deactivate product (`is_active = 0`) |

---

## 🛡️ Security Implementations

- **ACID Transaction Isolation:** Checkout uses transactions with row-level locks (`FOR UPDATE`) to prevent race conditions and negative inventory.
- **Protected Views:** Dashboard and admin templates reside in `views/` and are inaccessible via direct static URL traversal.
- **SQL Injection Prevention:** 100% parameterized queries using `mysql2/promise`.
- **Brute-Force Mitigation:** `express-rate-limit` enforces strict thresholds across authentication and submission routes.
- **Cryptographic Signature Verification:** Stripe raw webhook requests are cryptographically verified before triggering business logic.
- **Password Security:** Salted bcrypt hashing (10 rounds) and SHA-256 token hashing for password recovery.
- **XSS Escaping:** Sanitization of rendered content using `escapeHtml()` utility.

---

## 📄 License

This project is licensed under the **ISC License**.