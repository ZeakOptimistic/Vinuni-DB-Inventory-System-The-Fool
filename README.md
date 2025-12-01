# Smart Inventory & Procurement Management System

## 📌 Project Title
Smart Inventory & Procurement Management System (SIPMS)

## 📝 Brief Description

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

## 🧱 Planned Core Entities (Initial Draft)

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

## 🔧 Tech Stack

- **Database:** MySQL 8.x
- **Backend:** Python 3.x with Flask
- **Frontend:** HTML5, CSS3, Bootstrap, basic JavaScript
- **Tools:** MySQL Workbench, Git, GitHub, Postman (for API testing)

---

## 👥 Team Members and Roles

| Name                   | Email                    | Role                 |
|------------------------|--------------------------|----------------------|
| Tran Quang Khai (you)  | 23khai.tq@vinuni.edu.vn  | Software Developer   |
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
