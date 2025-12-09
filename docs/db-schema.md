# Database Setup

This document explains how to create the `sipms` database and load the
sample data used for development, testing, and demonstrations.  
All SQL scripts are located in the `database/` folder:

- `schema.sql` – creates the `sipms` database (tables, primary keys, foreign keys, basic indexes)
- `seed_data.sql` – inserts sample data for demo and testing
- `views.sql` – defines reporting views
- `procedures.sql` – defines stored procedures for purchase and sales orders
- `triggers.sql` – defines triggers to validate stock movements and keep inventory levels in sync
- `indexes.sql` – adds extra indexes for performance (on top of those in `schema.sql`)
- `security.sql` – optional script to create MySQL roles/users with different privileges

---

## 1. Prerequisites

Before starting, make sure you have:

- MySQL 8.x installed and running on `localhost:3306`
- The MySQL command–line client available  
  (`mysql -V` should show the version)
- The project repository cloned locally so the `database/` folder exists

Example structure:

```text
Vinuni-DB-Inventory-System-The-Fool/
├── backend/
├── frontend/
├── database/
│   ├── schema.sql
│   ├── seed_data.sql
│   ├── views.sql
│   ├── procedures.sql
│   ├── triggers.sql
│   ├── indexes.sql
│   └── security.sql
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

All of these should return a non-zero count.

---

## 4. Advanced Database Features

After the schema and sample data are in place, you can create the views, stored procedures, triggers, extra indexes and security roles.

Make sure the `sipms` database is active:

```sql
USE sipms;
```

### 4.1 Views

Create the reporting views:

```sql
SOURCE views.sql;
```

Main views include:

- `view_stock_per_location` – stock on hand per product and location
- `view_low_stock_products` – products below reorder level
- optional “top selling products” view

### 4.2 Stored Procedures

Create stored procedures:

```sql
SOURCE procedures.sql;
```

Defines procedures such as:

- `sp_create_purchase_order(...)` – create purchase order header
- `sp_confirm_sales_order(...)` – confirm sales order + record stock movements

Status values (DRAFT, CONFIRMED, CLOSED…) must match ENUM definitions.

### 4.3 Triggers

Create the triggers:

```sql
SOURCE triggers.sql;
```

Behavior:

- `before_insert_stock_movement` – validates quantity
- `after_insert_stock_movement` – updates inventory, prevents negative stock

### 4.4 Extra Indexes

Add performance indexes:

```sql
SOURCE indexes.sql;
```

Improves lookup speed for:

- product name / SKU
- `(product_id, location_id)`
- movement history by date/product/location

### 4.5 Security Roles (optional)

```sql
SOURCE security.sql;
```

Creates MySQL users/roles (admin, manager, staff) with different privileges.

---

## 5. Optional: Create a Dedicated MySQL User

While logged in as admin:

```sql
CREATE USER 'sipms_user'@'localhost' IDENTIFIED BY '<your_password_here>';
GRANT ALL PRIVILEGES ON sipms.* TO 'sipms_user'@'localhost';
FLUSH PRIVILEGES;
```

Test:

```bash
mysql -u sipms_user -p
```

Inside MySQL:

```sql
USE sipms;
SHOW TABLES;
```

Do not commit real passwords to Git.

---

## 6. Resetting the Database During Development

From project folder:

```bash
cd Vinuni-DB-Inventory-System-The-Fool/database
mysql -u root -p
```

Inside MySQL:

```sql
SOURCE schema.sql;   -- optional
USE sipms;
SOURCE seed_data.sql;
```

Re-run as needed:

```sql
SOURCE views.sql;
SOURCE procedures.sql;
SOURCE triggers.sql;
SOURCE indexes.sql;
SOURCE security.sql;
```

Scripts are idempotent for development.

---

## 7. Quick Tests for Advanced Features

```sql
-- Views
SELECT * FROM view_stock_per_location LIMIT 10;
SELECT * FROM view_low_stock_products LIMIT 10;

-- Procedures
CALL sp_create_purchase_order(1,1,CURDATE(),CURDATE()+INTERVAL 5 DAY,1000000,1);
CALL sp_confirm_sales_order(1,1);

-- Trigger test
INSERT INTO stock_movement (
    product_id, location_id, quantity,
    movement_type, related_document_type, related_document_id,
    movement_date, created_by
) VALUES (
    1,1,5,
    'PURCHASE_RECEIPT','PURCHASE_ORDER',1,
    NOW(),1
);

SELECT * FROM inventory_level WHERE product_id=1 AND location_id=1;
```

Valid movements should update inventory.  
Invalid movements (negative stock) should raise an error.

---

## 8. Common Issues

### 8.1 PowerShell Input Redirection

This does **not** work:

```bash
mysql -u root -p < schema.sql
```

Instead, inside MySQL:

```sql
SOURCE schema.sql;
SOURCE seed_data.sql;
```
