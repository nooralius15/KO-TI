# Project Summary: KO-TI E-Commerce & Adoption Platform

**Developer:** Nooreldein Elkaweifi  
**Role:** Full-Stack Software Engineer  
**Repository:** [https://github.com/nooralius15/KO-TI](https://github.com/nooralius15/KO-TI)  
**License:** ISC License  

---

## 📌 Executive Overview

**KO-TI** is an enterprise-grade full-stack e-commerce and pet adoption platform built with **Node.js (Express 5), MariaDB/MySQL, and vanilla JavaScript**. Engineered with defensive backend principles, the application solves real-world distributed e-commerce challenges, including **race conditions and inventory overselling during checkout**, **asynchronous payment and webhook lifecycles**, **role-based access control (RBAC)**, and **automated integration testing**.

The application is containerized with **Docker Compose** for one-command deployment and is backed by a **27-test automated integration suite** using Jest and Supertest.

---

## 🛠️ Core Competencies & Technical Skills Demonstrated

| Domain | Technologies & Methodologies |
| :--- | :--- |
| **Backend Engineering** | Node.js (v18+), Express 5.x, RESTful API Design, Middleware Architecture |
| **Database & Concurrency** | MySQL 8.0 / MariaDB, `mysql2/promise`, ACID Transactions, Pessimistic Row Locking (`SELECT ... FOR UPDATE`), Relational Schema Design, Soft Deletes |
| **Payments & Integrations** | Stripe API (v18), Stripe Checkout, Asynchronous Webhooks, Cryptographic Signature Verification, Automated Refunds |
| **Security & Authentication** | Role-Based Access Control (RBAC), Persistent Sessions (`express-mysql-session`), Bcrypt Password Hashing, SHA-256 Token Recovery, Route-Level Access Guards, Rate Limiting |
| **Quality Assurance** | Jest, Supertest, Ephemeral Test Database Provisioning (27 Passing Integration Tests) |
| **DevOps & Infrastructure** | Docker, Docker Compose, Git, GitHub Actions Ready, Multi-Stage Builds |
| **Frontend Development** | HTML5, CSS3 (Responsive Design), Vanilla JavaScript (ES6+), Fetch API, LocalStorage State Management |

---

## 🏗️ System Architecture

```
+--------------------------------------------------------------------------+
|                                FRONTEND                                  |
|   HTML5 / Responsive CSS3 / Vanilla JavaScript (ES6+) / LocalStorage     |
|   Product Search & Sort  *  Adoption Application Modal  *  Shopping Cart |
+-------------------------------------+------------------------------------+
                                      | HTTP REST / JSON / Session Cookies
                                      v
+--------------------------------------------------------------------------+
|                          BACKEND (Node.js & Express 5)                   |
|   ACID Transactions  *  Rate Limiters  *  Multer Uploads  *  RBAC Guards |
|   Stripe Checkout & Webhooks  *  Nodemailer Email Service                |
+-------------------------------------+------------------------------------+
                                      | Connection Pooling (mysql2/promise)
                                      v
+--------------------------------------------------------------------------+
|                         DATABASE (MariaDB / MySQL)                       |
|   users  *  products  *  orders  *  order_items  *  password_resets      |
|   adoption_inquiries  *  sessions                                        |
+--------------------------------------------------------------------------+
```

---

## 🚀 Key Engineering Achievements

### 1. Atomic Checkout & Concurrency Control
* **Problem:** In high-concurrency environments, multiple customers attempting to purchase the last available stock item simultaneously can cause race conditions and negative inventory (overselling).
* **Solution:** Engineered the checkout initialization (`POST /create-checkout-session`) inside an **ACID database transaction** utilizing **pessimistic row-level locking (`SELECT ... FOR UPDATE`)**.
* **Impact:** Locks product rows during stock validation and atomically decrements inventory. If available stock is insufficient or if Stripe communication fails, the transaction rolls back cleanly (`conn.rollback()`), guaranteeing data consistency.

### 2. End-to-End Payment & Webhook Lifecycle Engine
* **Asynchronous Webhook Processing:** Raw Stripe payloads are verified against cryptographic webhook signing secrets before triggering business logic.
* **Abandoned Session Recovery:** Listens for `checkout.session.expired` webhooks to automatically release reserved product stock back to the catalog and flag orders as `failed`.
* **Automated Refund Handling:** When an administrator cancels a paid order, the backend calls `stripe.refunds.create()`, updates payment status to `refunded`, and atomically restores product quantities.

### 3. Defensive Security Architecture
* **Protected Server Views:** Moved admin and customer dashboards from public directories to private `views/`, completely preventing static URL traversal bypass. Access is gated by server-side RBAC session checks.
* **Session Persistence:** Configured `express-session` with MySQL backing (`express-mysql-session`), enabling sessions to survive application restarts with a 24-hour TTL.
* **Credential Protection:** Passwords hashed with 10-round salted bcrypt; password reset tokens hashed using SHA-256 with 1-hour expiration timestamps and anti-enumeration generic responses.
* **Brute-Force Mitigation:** Configured `express-rate-limit` thresholds across authentication and inquiry endpoints.

### 4. Comprehensive Automated Test Suite
* Built a **27-test integration suite** across 4 test suites:
  * `tests/auth.test.js`: User registration, duplicate email handling, login validation, and RBAC redirects.
  * `tests/inventory.test.js`: Stock level retrieval and out-of-stock checkout rejection.
  * `tests/admin.test.js`: Admin product CRUD, file uploads (`multer`), updates, and access controls.
  * `tests/routes.test.js`: Static file protection (404 verification) and unauthenticated route guards.
* **Zero Contamination:** Automated `globalSetup` and `globalTeardown` scripts provision, migrate, seed, and drop an isolated `koti_test` database for each test run.

### 5. Multi-Service Containerization
* Orchestrated with **Docker Compose** (`Dockerfile` + `docker-compose.yml`), allowing developers and evaluators to boot the entire stack (Node.js application + MariaDB database with automated schema initialization) using a single command:
  ```bash
  docker compose up --build
  ```

---

## 💼 Resume / CV Project Bullets (STAR / XYZ Format)

* **Architected transactional e-commerce backend** utilizing ACID database transactions and row-level locking (`SELECT ... FOR UPDATE`) in MySQL, preventing inventory overselling and race conditions across concurrent purchases.
* **Engineered complete Stripe payment lifecycle engine** utilizing cryptographically signed webhooks to automate order fulfillment, inventory release upon session expiration, and admin-triggered payment refunds.
* **Hardened application security** by implementing Role-Based Access Control (RBAC), private view routing to eliminate static URL traversal, 10-round bcrypt password hashing, and rate limiting on sensitive endpoints.
* **Developed 27-test automated integration suite** (Jest & Supertest) with ephemeral database provisioning, and containerized the multi-service architecture using **Docker Compose** for automated deployment.

---

## 📂 Verification & Quick Commands

```bash
# Clone the repository
git clone https://github.com/nooralius15/KO-TI.git
cd KO-TI

# Install dependencies
npm install

# Run automated integration test suite (27 tests)
npm test

# Run via Docker Compose
docker compose up --build
```
