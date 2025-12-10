# Backend Requirements & Setup – Smart Inventory & Procurement Management System (SIPMS)

This document describes all **backend requirements**, tech stack, environment
configuration, and setup steps for running the Django + MySQL backend.

---

## 1. Technology Stack

**Runtime**

- Python **3.10+**
- MySQL **8.x** (or compatible 5.7+)

**Frameworks & Libraries**

- [Django](https://www.djangoproject.com/) – main web framework
- [Django REST Framework](https://www.django-rest-framework.org/) – REST APIs
- [PyJWT](https://pyjwt.readthedocs.io/) – JSON Web Tokens for authentication
- MySQL driver for Python (`mysqlclient` or `PyMySQL`)
- Optional: `python-dotenv` (if you want to load environment variables from a `.env` file)

---

## 2. Project Structure (backend)

High-level structure of the backend folder:

```text
backend/
├─ database/
│  ├─ schema.sql          # DDL for all tables
│  ├─ views.sql           # SQL definitions for analytical views
│  ├─ procedures.sql      # Stored procedures (PO, SO, stock updates…)
│  ├─ triggers.sql        # Triggers (audit / consistency, if any)
│  ├─ indexes.sql         # Additional indexes
│  ├─ security.sql        # Users, grants, roles
│  └─ seed_data.sql       # Demo data (products, users, orders…)
│
├─ src/
│  ├─ config/             # Django project (settings, urls, asgi, wsgi)
│  ├─ apps/
│  │  ├─ accounts/        # Auth, user, role, JWT
│  │  ├─ inventory/       # Product, category, supplier, location, stock
│  │  ├─ orders/          # Purchase orders, sales orders, stock movement
│  │  ├─ reports/         # Reporting APIs (based on DB views)
│  │  └─ audit/           # Audit log (optional / extension)
│  │
│  ├─ common/
│  │  ├─ db.py            # Shared DB helpers (raw SQL, call procedures, query views)
│  │  ├─ utils.py         # Misc helpers (pagination, slug, parsing)
│  │  └─ exceptions.py    # App-level exceptions & custom DRF exception handler
│  │
│  ├─ scripts/
│  │  ├─ call_sp_demo.py  # CLI script to test stored procedures from Python
│  │  └─ load_demo_data.py# CLI script to execute seed_data.sql via Django connection
│  │
│  └─ manage.py           # Django management script
│
├─ venv/                  # Python virtual environment (local, not committed)
└─ docs/
   ├─ backend_test_cases.md # Manual API & DB test cases
   └─ (other documentation)
```
---

## 3. Python Dependencies (`requirements.txt` example)

Create a `requirements.txt` inside the `backend/` folder with at least:

    Django>=4.2,<6.0
    djangorestframework>=3.15,<4.0
    mysqlclient>=2.2          # or PyMySQL if preferred
    PyJWT>=2.8,<3.0
    python-dotenv>=1.0        # optional, only if using .env files

If installing `mysqlclient` on Windows is difficult, replace it with **PyMySQL** and update Django settings accordingly.

---

## 4. Environment Variables

The backend reads configuration primarily from environment variables defined in `config/settings.py`.

### Minimum required variables

- `DJANGO_SECRET_KEY` – Secret key for Django & JWT signing
  (dev fallback: `"dev-secret-change-me"` — must change in production)
- `DB_NAME` – database name (default: `sipms`)
- `DB_USER` – database user (default: `sipms_user`)
- `DB_PASSWORD` – password for DB user
- `DB_HOST` – host of the database (default: `localhost`)
- `DB_PORT` – database port (default: `3306`)

### Optional variables

- `DEBUG` – set to `False` for production deployments
- `ALLOWED_HOSTS` – comma-separated list of domains allowed in production

Environment variables may be set in your OS or via a `.env` file when using `python-dotenv`.

---

## 5. Database Requirements & Initialization

### Create MySQL database & user

    CREATE DATABASE sipms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

    CREATE USER 'sipms_user'@'localhost' IDENTIFIED BY 'StrongPassword123!';
    GRANT ALL PRIVILEGES ON sipms.* TO 'sipms_user'@'localhost';
    FLUSH PRIVILEGES;

### Apply schema & database objects (order matters)

- `schema.sql` – tables  
- `indexes.sql` – optional indexes  
- `views.sql` – reporting views  
- `procedures.sql` – stored procedures  
- `triggers.sql` – triggers  
- `security.sql` – additional grants/roles  
- `seed_data.sql` – demo data  

Run these using MySQL client or:

    cd backend/src
    python -m scripts.load_demo_data

### Django migrations

Django still requires its own system tables:

    cd backend/src
    python manage.py migrate

---

# 6. Setting Up the Backend (Local Development)

## Create a virtual environment

### Windows (PowerShell)

    python -m venv venv
    .\venv\Scripts\activate

### macOS / Linux

    python3 -m venv venv
    source venv/bin/activate

---

## Install dependencies

    pip install --upgrade pip
    pip install -r requirements.txt

---

## Configure environment variables

### Option A: System environment variables

Set them directly in your OS.

### Option B: `.env` file (if using python-dotenv)

    DJANGO_SECRET_KEY=dev-secret-change-me
    DB_NAME=sipms
    DB_USER=sipms_user
    DB_PASSWORD=StrongPassword123!
    DB_HOST=localhost
    DB_PORT=3306

---

## Initialize database

- Create DB & user in MySQL  
- Run SQL files in correct order  
- Run migrations:

    python manage.py migrate

---

## Create superuser (optional)

    python manage.py createsuperuser

---

## 7. Running the Development Server

From `backend/src`:

    python manage.py runserver

Backend will be available at:

    http://127.0.0.1:8000/

---

## Key API endpoints

- **POST** `/api/auth/login/` – returns JWT  
- **GET** `/api/products/` – requires Bearer token  
- **POST** `/api/purchase-orders/` – create purchase order  
- **POST** `/api/purchase-orders/{id}/receive-all/` – receive items  
- **POST** `/api/sales-orders/` – create + confirm order  

---

## 8. Helper Scripts

Run from `backend/src`.

## Call stored procedure

    python -m scripts.call_sp_demo sp_confirm_sales_order 1 2

Executes:

    CALL sp_confirm_sales_order(1, 2);

## Load demo data

    python -m scripts.load_demo_data

---

## 9. Testing

Manual API & DB test cases are in:

    docs/backend_test_cases.md

### Test coverage includes:

- Authentication & JWT  
- CRUD operations (products, categories, suppliers, locations)  
- Purchase order workflow (create + receive)  
- Sales order workflow (create + confirm)  
- Stock integrity (inventory_level, stock_movement, reporting views)

Automated tests may use:

- Django `APITestCase`
- PyTest