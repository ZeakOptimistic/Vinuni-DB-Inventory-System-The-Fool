# Smart Inventory & Procurement Management System

## 📌 Project Title
Smart Inventory & Procurement Management System (SIPMS)

## 📝 Brief Description

This project was developed as a course project for the Databases and Database Systems course at VinUniversity.

SIPMS is a MySQL-based information system that helps a multi-branch retail
company manage its products, stock levels, and purchasing activities.

The system supports:
- Managing products, categories, suppliers, and multiple inventory locations
  (central warehouse and several stores).
- Tracking stock levels per location through stock movements
  (purchases, sales, returns, internal transfers, stock adjustments).
- Generating purchase orders when stock is low and recording goods received.
- Providing a web interface for CRUD operations and inventory analytics
  (low-stock alerts, top-selling products, stock value per location, etc.).
- Enforcing user authentication and role-based access control for admins,
  inventory managers, and store staff.

---

## 🎯 Functional Requirements

The system should provide at least the following features:

1. **Product & Category Management**
   - Create, read, update, delete (CRUD) products.
   - Assign products to one or more categories.
   - Store attributes such as SKU, barcode, unit price, unit of measure,
     reorder level, and status (active/inactive).

2. **Location & Stock Management**
   - Manage multiple locations (central warehouse + stores).
   - Track current stock quantity of each product at each location.
   - Record all stock movements (purchase, sale, transfer, adjustment)
     in a stock movement log.

3. **Supplier & Purchase Management**
   - Maintain supplier profiles (contact details, payment terms).
   - Create and manage purchase orders (POs) to suppliers.
   - Record goods receipt for each PO and update stock levels automatically.
   - Track PO status (draft, approved, partially received, closed).

4. **Sales & Order Tracking**
   - Record sales orders made at each store.
   - For each sales order, record items, quantities, discounts, and totals.
   - Reduce stock quantities when a sales order is confirmed.

5. **Internal Stock Transfers**
   - Create transfer requests between locations (e.g., warehouse → store).
   - Track transfer status (requested, in transit, received).
   - Update stock at source and destination locations accordingly.

6. **Alerts, Reports & Analytics**
   - Low-stock alerts for products whose quantity falls below reorder level.
   - Summary reports:
     - Stock level and valuation per location.
     - Top-selling products within a date range.
     - Purchase vs. sales quantities by product.
   - Visualize selected reports using charts in the web interface.

7. **User Management & Security**
   - User registration and login with hashed passwords.
   - Role-based access:
     - Admin: manage users, locations, and configuration.
     - Inventory Manager: manage products, suppliers, POs, transfers.
     - Store Staff: record sales orders and view stock for their store.
   - Log important actions (e.g., stock adjustments) in an audit log table.

---

## ⚙️ Non-functional Requirements

- **Performance**
  - Common queries (view stock per location, search product by SKU/name)
    should run within an acceptable time on a medium-sized dataset.
  - Appropriate indexing and/or partitioning will be applied and evaluated.

- **Reliability & Data Integrity**
  - Use primary keys, foreign keys, and constraints to ensure
    referential integrity.
  - Enforce business rules with triggers and stored procedures where needed
    (e.g., prevent negative stock).

- **Security**
  - Store passwords using secure hashing (e.g., bcrypt or MySQL hashing).
  - Use user roles and least-privilege GRANTs at the database level.
  - Protect the web application against SQL injection by using
    prepared statements / parameterized queries.

- **Usability**
  - Web interface should be simple and consistent.
  - Provide clear forms and tables for CRUD operations and reports.

- **Maintainability & Extensibility**
  - Organized repository structure (separate folders for SQL, backend, frontend).
  - Clear comments and documentation in code and SQL scripts.
  - Design that can be extended later (e.g., integration with POS or accounting).

---

## 🧱 Core Entitie

This is an outline; details will be refined in the ERD and DDL.

- **Product**
  - Attributes: product_id, name, SKU, barcode, description,
    unit_price, unit_of_measure, reorder_level, category_id, status.

- **Category**
  - Attributes: category_id, name, description.

- **Supplier**
  - Attributes: supplier_id, name, contact_name, phone, email, address,
    payment_terms, status.

- **Location**
  - Attributes: location_id, name, type (warehouse / store),
    address, manager_user_id.

- **InventoryLevel**
  - Attributes: product_id, location_id, quantity_on_hand,
    last_updated.
  - Represents current stock for a product at a location.

- **StockMovement**
  - Attributes: movement_id, product_id, from_location_id,
    to_location_id, quantity, movement_type
    (PURCHASE, SALE, TRANSFER, ADJUSTMENT), related_document_type,
    related_document_id, movement_date, created_by.

- **PurchaseOrder**
  - Attributes: po_id, supplier_id, location_id (destination),
    order_date, expected_date, status, total_amount.

- **PurchaseOrderItem**
  - Attributes: po_id, product_id, ordered_qty, received_qty,
    unit_price, line_total.

- **SalesOrder**
  - Attributes: so_id, location_id (store), customer_name (optional),
    order_date, status, total_amount.

- **SalesOrderItem**
  - Attributes: so_id, product_id, quantity, unit_price, discount,
    line_total.

- **User**
  - Attributes: user_id, username, hashed_password, full_name,
    email, role_id, status.

- **Role**
  - Attributes: role_id, role_name, description.

- **AuditLog**
  - Attributes: log_id, user_id, action_type, entity_name,
    entity_id, description, created_at.

(We will choose a subset of these as the minimum 4+ core entities required and keep the rest as extensions.)

---

## Features Overview

### Master data

- **Products**
  - SKU, name, category, unit price, reorder level, status (ACTIVE / INACTIVE)
- **Categories**
  - Grouping for products
- **Suppliers**
  - Contact info, status; used by purchase orders
- **Locations**
  - Warehouses / stores; stock is tracked separately per location

### Inventory & stock movements

- Logical table **`inventory_level`** stores on-hand quantity per (`product`, `location`)
- All changes go through **stock movement procedures + triggers** to ensure consistency
- Business rules enforced at DB level:
  - Prevent negative stock on confirm sales / transfer
  - Keep source & destination locations consistent for transfers

### Purchase flow (PO)

- Create purchase orders to suppliers for a destination location
- Confirm / approve PO, then receive quantity
- On receiving, stock at destination location increases
- PO statuses: `DRAFT`, `APPROVED`, `PARTIALLY_RECEIVED`, `CLOSED`

### Sales flow (SO)

- Create sales order at a location with line items
- Confirm sales order:
  - Decrease stock at that location
  - Block confirmation when stock is not enough (DB trigger / procedure)
- SO statuses: `DRAFT`, `CONFIRMED`, `CANCELLED`

### Internal transfer flow

- Transfer stock of a product from one location to another
- On success:
  - Stock at source decreases
  - Stock at destination increases
- Fully enforced by stored procedure & triggers (no negative stock allowed)

### Analytics & reports

Backend `/api/reports/*` endpoints provide:

- **Low stock report**
  - Products below reorder level, optionally filtered by location
- **Stock per location**
  - Snapshot view of on-hand quantity and stock value per (`product`, `location`)
- **Top-selling products (last 30 days)**
  - Aggregation of sales orders to identify best sellers

On the frontend:

- **Dashboard**
  - Cards: total products, purchase orders, sales orders, estimated stock value
  - Mini chart: PO/SO counts in last 7 days
  - Low-stock products table
  - Recent purchase & sales orders
- **ReportsPage**
  - Tabs: Low stock, Stock per location, Top selling (30 days)

### Security & accounts

- Login with username + password via `/api/auth/login/`
- JWT-style token stored on the frontend (via axios interceptors)
- Role model (`Role`, `AppUser`) used to distinguish admin / manager / staff
- Route guard on frontend: unauthenticated users are redirected to `/login`

---

## 🔧 Tech Stack

- **Database**: MySQL 8.x
- **Backend**: Python 3.10+, Django, Django REST Framework, MySQL client, SimpleJWT
- **Frontend**: React 18 + Vite, React Router, Axios
- **Tools**: MySQL Workbench, Postman, VS Code

---

## Repository Structure

```text
project-root/                                   # Root of SIPMS system
│
├── backend/                                    # Django backend (API + business logic)
│   ├── src/
│   │   ├── manage.py                           # Django management CLI (runserver, migrate)
│   │   │
│   │   ├── config/                             # Django project configuration
│   │   │   ├── __init__.py                     # Marks folder as module
│   │   │   ├── urls.py                         # Main URL router mapping all app URLs
│   │   │   ├── wsgi.py                         # WSGI entrypoint for production servers
│   │   │   ├── asgi.py                         # ASGI entrypoint for async servers
│   │   │   └── settings
│   │   │       ├── __init__                    # Settings module bootstrap
│   │   │       ├── base                        # Core settings (DB, apps, middleware)
│   │   │       ├── dev                         # Dev overrides (DEBUG=True, local DB)
│   │   │       └── prod                        # Production overrides (secure configs)
│   │   │
│   │   ├── apps/                               # All Django domain apps
│   │   │
│   │   │   ├── accounts/                       # User/Role/Auth domain
│   │   │   │   ├── __init__.py                 # Module init
│   │   │   │   ├── admin.py                    # Django admin config for User/Role
│   │   │   │   ├── apps.py                     # AppConfig registration
│   │   │   │   ├── authentication.py           # Custom auth helpers (token/password)
│   │   │   │   ├── models.py                   # User, Role database models
│   │   │   │   ├── permissions.py              # Role-based permission classes
│   │   │   │   ├── serializers.py              # User/Role serializers for DRF
│   │   │   │   ├── services.py                 # Business logic (create user, hash password)
│   │   │   │   ├── urls.py                     # /api/auth/ /api/users/
│   │   │   │   └── views.py                    # Authentication + user CRUD API
│   │   │
│   │   │   ├── audit/                          # System audit logging
│   │   │   │   ├── __init__.py                 # Module init
│   │   │   │   ├── admin.py                    # Admin display for AuditLog
│   │   │   │   ├── apps.py                     # AppConfig
│   │   │   │   ├── models.py                   # AuditLog model
│   │   │   │   ├── services.py                 # Write audit logs from actions
│   │   │   │   └── views.py                    # API endpoints (optional)
│   │   │
│   │   │   ├── inventory/                      # Product / Category / Stock domain
│   │   │   │   ├── __init__.py
│   │   │   │   ├── admin.py                    # Admin config for inventory tables
│   │   │   │   ├── apps.py                     # AppConfig
│   │   │   │   ├── models.py                   # Product, Category, Location, Stock models
│   │   │   │   ├── serializers.py              # Transform DB models ↔ API format
│   │   │   │   ├── services.py                 # Stock management logic + stored procedures
│   │   │   │   ├── urls.py                     # /api/products/ /api/categories/ ...
│   │   │   │   └── views.py                    # CRUD endpoints for inventory
│   │   │
│   │   │   ├── orders/                         # Purchase/Sales Order domain
│   │   │   │   ├── __init__.py
│   │   │   │   ├── admin.py                    # Admin config for orders
│   │   │   │   ├── apps.py                     # AppConfig
│   │   │   │   ├── models.py                   # PurchaseOrder, SalesOrder, Items
│   │   │   │   ├── serializers.py              # Convert order models ↔ API responses
│   │   │   │   ├── services.py                 # Order creation + stored procedures
│   │   │   │   ├── urls.py                     # /api/purchase-orders/ /api/sales-orders/
│   │   │   │   └── views.py                    # Order CRUD + confirm order API
│   │   │
│   │   │   └── reports/                        # Reporting + dashboards
│   │   │       ├── __init__.py
│   │   │       ├── admin.py                    # Admin view for report tables (if any)
│   │   │       ├── apps.py                     # AppConfig
│   │   │       ├── models.py                   # Usually empty (views don't require models)
│   │   │       ├── serializers.py              # Format report responses
│   │   │       ├── urls.py                     # /api/reports/
│   │   │       └── views.py                    # Fetch data from MySQL views
│   │   │
│   │   ├── common/                             # Helper modules shared across apps
│   │   │   ├── __init__.py
│   │   │   ├── db.py                           # Raw SQL + stored procedure helpers
│   │   │   ├── exceptions.py                   # Clean API error responses from DB errors
│   │   │   └── utils.py                        # Pagination, formatting, misc helpers
│   │   │
│   │   └── scripts/                            # Utility scripts for development
│   │       ├── __init__.py
│   │       ├── call_sp_demo.py                 # Example: call stored procedures manually
│   │       ├── load_demo_data.py               # Load initial demo data from CSV/SQL
│   │       └── test_cases_backend.md           # Backend test plan (recommend: move to docs/)
│   │
│   └── requirements.txt                        # Python dependency list
│
│
├── database/                                   # SQL schema + DB logic
│   ├── schema.sql                              # CREATE TABLE definitions
│   ├── seed_data.sql                           # Insert initial sample data
│   ├── views.sql                               # SQL VIEW definitions
│   ├── procedures.sql                          # Stored procedures for business logic
│   ├── triggers.sql                            # DB triggers for audit + stock update
│   ├── security.sql                            # DB user roles + GRANT permissions
│   ├── indexes.sql                             # Performance indexes + EXPLAIN samples
│   └── erd/
│       ├── erd.png                             # ERD diagram image
│       └── erd.mwb                             # MySQL Workbench source file
│
│
├── docs/                                       # Project documentation
│   ├── design/                                 # System design documentation
│   │   ├── design_document.pdf                 # Final design report
│   │   ├── design_document.tex                 # LaTeX source
│   │   └── diagram_sipms.png                   # Architecture diagram
│   ├── test_plan.md                            # End-to-end test flows for SIPMS
│   ├── installation.md                         # Installation guide for backend/frontend
│   ├── db-schema.md                            # Human-readable DB schema explanation
│
│
├── frontend/                                   # React SPA
│   ├── public/                                 # HTML template + static files
│   ├── src/
│   │   ├── api/                                # API request modules (axios)
│   │   │   ├── httpClient.js                   # Axios config + interceptors
│   │   │   ├── authApi.js                      # Login / logout API
│   │   │   ├── productApi.js                   # Product APIs
│   │   │   ├── purchaseOrderApi.js             # Purchase order APIs
│   │   │   ├── salesOrderApi.js                # Sales order APIs
│   │   │   ├── supplierApi.js                  # Supplier CRUD APIs
│   │   │   └── reportApi.js                    # Dashboard/reporting APIs
│   │   │
│   │   ├── components/                         # Reusable UI components
│   │   │   ├── categories/                     # Category modals/forms
│   │   │   ├── locations/                      # Location modals/forms
│   │   │   ├── products/                       # Product modals/forms
│   │   │   ├── purchaseOrders/                 # Purchase order modals/forms
│   │   │   ├── salesOrders/                    # Sales order modals/forms
│   │   │   └── suppliers/                      # Supplier modals/forms
│   │   │
│   │   ├── context/
│   │   │   └── AuthContext.jsx                 # Auth state provider
│   │   │
│   │   ├── hooks/
│   │   │   └── useAuth.js                      # Authentication hook (login/logout/session)
│   │   │
│   │   ├── layouts/
│   │   │   ├── AuthLayout.jsx                  # Layout for login pages
│   │   │   └── DashboardLayout.jsx             # Main dashboard layout
│   │   │
│   │   ├── pages/                              # Screens / routes
│   │   │   ├── auth/LoginPage.jsx              # Login page
│   │   │   ├── dashboard/DashboardPage.jsx     # Dashboard overview
│   │   │   ├── categories/CategoriesPage.jsx   # Category list page
│   │   │   ├── locations/LocationsPage.jsx     # Location list page
│   │   │   ├── products/ProductsPage.jsx       # Product list page
│   │   │   ├── purchaseOrders/PurchaseOrdersPage.jsx
│   │   │   ├── salesOrders/SalesOrdersPage.jsx
│   │   │   ├── suppliers/SuppliersPage.jsx
│   │   │   ├── reports/ReportsPage.jsx
│   │   │   └── transfers/TransfersPage.jsx     # For transfer operations
│   │
│   │   ├── router/
│   │   │   └── index.jsx                       # React Router configuration
│   │   │
│   │   ├── styles/
│   │   │   └── global.css                      # Global styling
│   │   │
│   │   ├── App.jsx                             # Main React app component
│   │   └── main.jsx                            # Entry point for Vite / React
│   │
│   ├── package.json                            # Frontend dependencies
│   └── vite.config.js                          # Vite configuration
│
└── README.md                                   # Root project introduction + quick start

```
---

## 👥 Team Members and Roles

| Name                   | Email                    | Role                 |
|------------------------|--------------------------|----------------------|
| Tran Quang Khai        | 23khai.tq@vinuni.edu.vn  | Software Developer   |
| Thai Huu Tri           | 23tri.th@vinuni.edu.vn   | Software Developer   |
| Nguyen Ngoc Han        | 22han.nn@vinuni.edu.vn   | Software Developer   |

---

## 📆 Timeline (Planned Milestones)

| Timeline         | Activity                                            |
|------------------|-----------------------------------------------------|
| Dec 1, 2025      | Team registration & topic selection                 |
| Dec 8, 2025      | Peer review of proposals                            | 
| Dec 15, 2025     | Submit design document (ERD, DDL, task division)    |
| Dec 22, 2025     | Final submission & presentation slides              |

---

## Set up

This part explains **only how to set up and run** the project (database, backend, frontend) after cloning from GitHub.

---

### Prerequisites

Please install these first:

- **Git**
- **MySQL 8.x**
- **Python 3.10+**
- **Node.js 18+** and **npm**

Recommended tools: VS Code, MySQL Workbench, Postman.

---

### Clone the repository

```bash
git clone https://github.com/ZeakOptimistic/Vinuni-DB-Inventory-System-The-Fool.git
cd Vinuni-DB-Inventory-System-The-Fool
```

---

### Database Setup (MySQL)

We will create a database named sipms, load schema, views, procedures, triggers, indexes, and sample data.

The commands below use the MySQL root user.
If you use another user, adjust -u / -p accordingly.

---

#### Create schema (tables & constraints)

From the project root:

```sql
mysql -u root -p < database/schema.sql
```

`schema.sql` will:

- Drop existing DB sipms (if any)
- Create a fresh sipms database
- Create all core tables & constraints

---

#### Create views, procedures, triggers, indexes

```sql
mysql -u root -p sipms < database/views.sql
mysql -u root -p sipms < database/procedures.sql
mysql -u root -p sipms < database/triggers.sql
mysql -u root -p sipms < database/indexes.sql
```
---

#### Load sample data (for demo)

```sql
mysql -u root -p sipms < database/seed_data.sql
```

---

#### Log in mysql

```bash
cd Vinuni-DB-Inventory-System-The-Fool\database
mysql -u sipms_user -p
```

Password: `StrongPassword123!`

```sql
DROP DATABASE IF EXISTS sipms;

SOURCE schema.sql;
SOURCE seed_data.sql;
SOURCE views.sql;
SOURCE procedures.sql;
SOURCE triggers.sql;
SOURCE indexes.sql;
SOURCE security.sql;
```

---

Now you should have:
- Roles, users, products, suppliers, locations
- Initial stock levels
- Sample orders & stock movements

---

#### (Optional) Create a dedicated DB user

Django is configured by default to use:
- User: `sipms_user`
- Password: `StrongPassword123!`
- Database: `sipms`

Create this user:

```sql
CREATE USER IF NOT EXISTS 'sipms_user'@'localhost'
  IDENTIFIED BY 'StrongPassword123!';

GRANT ALL PRIVILEGES ON sipms.* TO 'sipms_user'@'localhost';
FLUSH PRIVILEGES;
```

You can also continue to use root, but then update the backend settings accordingly.

---

### 💡 Windows PowerShell note

If `<` redirection does not work:

Open `cmd.exe` or the MySQL client and use:

```sql
SOURCE C:/path/to/database/schema.sql;
```

### ⚙️ Backend Setup (Django API)

The backend lives in `backend/` and uses Django + DRF + MySQL.

---

#### Create and activate virtual environment

From project root:

```bash
cd backend

# create venv
python -m venv venv
```

Activate:

**Windows (PowerShell)**:

```bash
.\venv\Scripts\activate
```

**macOS / Linux**:

```bash
source venv/bin/activate
```

Your prompt should show `(venv)`.

---

#### Install Python dependencies

If `backend/requirements.txt` exists:

```bash
pip install -r requirements.txt
```

If not, install manually:

```bash
pip install django djangorestframework mysqlclient django-cors-headers pyjwt
```

**Note (Windows)**:

If `mysqlclient` fails, ensure MySQL is installed and available in PATH.

#### Configure database connection

Default in `backend/src/config/settings.py`:

```python
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": os.environ.get("DB_NAME", "sipms"),
        "USER": os.environ.get("DB_USER", "sipms_user"),
        "PASSWORD": os.environ.get("DB_PASSWORD", "StrongPassword123!"),
        "HOST": os.environ.get("DB_HOST", "localhost"),
        "PORT": os.environ.get("DB_PORT", "3306"),
    }
}
```

If using root:

```powershell
$env:DB_USER="root"
$env:DB_PASSWORD="<your-root-password>"
```

(Bash/zsh: `export DB_USER=...`)

---

#### Apply Django migrations

Migrations only create Django’s own tables.

```bash
cd src
python manage.py migrate
```

---

#### Create Django superuser
python manage.py createsuperuser

---

#### Set password for demo user (for API login)

The SQL seed inserts users but with dummy password hashes.

Start the Django shell:

```bash
python manage.py shell
```

Inside:

```python
from apps.accounts.models import AppUser
from apps.accounts.services import set_user_password

user = AppUser.objects.get(username="admin_demo")
set_user_password(user, "admin123")

print("Updated password for:", user.username)
exit()
```

Repeat for other users if needed (`admin_demo`, `manager_demo`, …).

---

#### Run backend server

```python
python manage.py runserver
```

API endpoints:

- http://localhost:8000/api/auth/login/
- http://localhost:8000/api/products/
- http://localhost:8000/api/purchase-orders/
- http://localhost:8000/api/sales-orders/
- http://localhost:8000/api/transfers/
- http://localhost:8000/api/reports/
...

Keep backend running while using the frontend.

---

## 🌐 Frontend Setup (React + Vite)

Frontend lives in frontend/ and communicates via REST API.

---

#### Install Node dependencies

Open a new terminal:

```bash
cd Vinuni-DB-Inventory-System-The-Fool/frontend
npm install
```

---

#### Configure API base URL

Check `frontend/src/api/httpClient.js`:

```javascript
const httpClient = axios.create({
  baseURL: "http://localhost:8000/api/",
});
```

Update if backend uses another port.

---

#### Run frontend dev server

```bash
npm run dev
```

Default URL:
➡️ http://localhost:5173/

Login page:
➡️ http://localhost:5173/login

Credentials (if set earlier):
- Username: `admin_demo`
- Password: `admin123`

---

## 📝 Summary (TL;DR)

**Clone repo**

```bash
git clone https://github.com/<your-org>/Vinuni-DB-Inventory-System-The-Fool.git
cd Vinuni-DB-Inventory-System-The-Fool
```
---

**MySQL**

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p sipms < database/views.sql
mysql -u root -p sipms < database/procedures.sql
mysql -u root -p sipms < database/triggers.sql
mysql -u root -p sipms < database/indexes.sql
mysql -u root -p sipms < database/seed_data.sql
```

---

**Backend**

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate        # or source venv/bin/activate
pip install -r requirements.txt
cd src
python manage.py migrate
```

Set demo password:

```python
python manage.py shell
>>> from apps.accounts.models import AppUser
>>> from apps.accounts.services import set_user_password
>>> set_user_password(AppUser.objects.get(username="admin_demo"), "admin123")
>>> exit()
```

Run server:

```bash
python manage.py runserver
```

---

**Frontend**

```bash
cd ../../frontend
npm install
npm run dev
```

Open:

➡️ http://localhost:5173/login

Login:
- Username: `admin_demo`
- Password: `admin123`
