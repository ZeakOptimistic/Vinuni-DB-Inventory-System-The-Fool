# Database Setup

This document explains how to create the `sipms` database and load the sample data used for development, testing, and demonstrations. All SQL scripts are located in the `database/` folder:

- `schema.sql` – creates the `sipms` database (tables, primary keys, foreign keys, indexes)
- `seed_data.sql` – inserts sample data for demo and testing

---

## 1. Prerequisites

Before starting, make sure you have:

- MySQL 8.x installed and running on `localhost:3306`
- The MySQL command–line client available (`mysql -V` should show the version)
- The project repository cloned locally so the `database/` folder exists

Example structure:

```text
Vinuni-DB-Inventory-System-The-Fool/
├── backend/
├── frontend/
├── database/
│   ├── schema.sql
│   └── seed_data.sql
└── docs/
```

---

## 2. Create the Schema

Open a terminal and move into the `database/` folder:

```bash
cd Vinuni-DB-Inventory-System-The-Fool/database
```

Log into MySQL as an administrator (for example, `root`):

```bash
mysql -u root -p
```

Enter your password when prompted. Inside the MySQL prompt, run:

```sql
SOURCE schema.sql;
```

The script will:

- drop the `sipms` database if it already exists
- create a fresh `sipms` database using UTF8MB4 encoding
- create all tables, primary keys, foreign keys, and indexes

Verify that the schema exists:

```sql
USE sipms;
SHOW TABLES;
```

You should see the core tables, e.g. `product`, `category`, `supplier`, `location`, `inventory_level`, `purchase_order`, `sales_order`, `stock_movement`, `role`, `app_user`, `audit_log`, …

---

## 3. Load Sample Data

Make sure the `sipms` database is selected:

```sql
USE sipms;
```

Execute the seed script:

```sql
SOURCE seed_data.sql;
```

The script will:

- temporarily disable foreign key checks
- delete existing rows in the correct order
- insert sample roles, users, categories, suppliers, locations, and products
- set initial inventory levels for several locations
- create one demo purchase order and one demo sales order (with line items)
- create the corresponding stock movements and audit log entries

Quick sanity checks:

```sql
SELECT COUNT(*) FROM product;
SELECT COUNT(*) FROM app_user;
SELECT COUNT(*) FROM purchase_order;
SELECT COUNT(*) FROM sales_order;
```

All of these should return a non–zero count.

---

## 4. Optional: Create a Dedicated MySQL User

For development it is convenient to use a separate MySQL user instead of `root`.

While logged in as an admin user (e.g. `root`), run:

```sql
CREATE USER 'sipms_user'@'localhost'
  IDENTIFIED BY '<your_password_here>';

GRANT ALL PRIVILEGES ON sipms.*
  TO 'sipms_user'@'localhost';

FLUSH PRIVILEGES;
```

Then test the new account:

```bash
mysql -u sipms_user -p
```

and inside MySQL:

```sql
USE sipms;
SHOW TABLES;
```

Use this `sipms_user` account later in the backend (e.g. Django) database configuration.

> **Note:** Do not commit the real password to Git.  
> Keep it as `<your_password_here>` in public files.

---

## 5. Resetting the Database During Development

You can reset the sample data at any time by re–running the seed script.

From the project folder:

```bash
cd Vinuni-DB-Inventory-System-The-Fool/database
mysql -u root -p
```

Inside MySQL:

```sql
USE sipms;
SOURCE seed_data.sql;
```

Because the script disables foreign key checks and truncates data in the correct order, it is safe to execute multiple times.

---

This completes the setup instructions for the `sipms` database.
