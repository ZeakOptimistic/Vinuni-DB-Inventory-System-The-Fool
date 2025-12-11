# SIPMS – Test Plan

This document describes the main manual test scenarios for the Smart Inventory & Procurement Management System (SIPMS).  
Focus: end-to-end flows that combine database logic, backend APIs, and frontend UI.

---

## 1. Environment

- Database: MySQL with schema, views, procedures, triggers, and indexes from `database/*.sql`.
- Backend: Django REST API (`backend/`), running on `http://localhost:8000/`.
- Frontend: React SPA (`frontend/`), running on `http://localhost:5173/`.
- Test user:
  - Username: `admin_demo`
  - Password: `admin123`
  - Role: `ADMIN`.

---

## 2. Test scenarios

### TC01 – Purchase increases stock

**Goal**

Verify that a purchase order receipt increases on-hand inventory at the receiving location.

**Preconditions**

- Product `P1` exists and is ACTIVE.
- Location `L1` exists and is ACTIVE.
- Current stock for `P1` at `L1` is known (check `view_stock_per_location` or Dashboard).

**Steps**

1. Login to the frontend as a staff user.
2. Go to **Purchase Orders** page.
3. Click **New purchase order**.
4. Select supplier and location `L1`.
5. Add line for product `P1` with quantity `Q` and unit price.
6. Save PO (status `DRAFT`).
7. Confirm / approve the PO (status becomes `APPROVED` if applicable).
8. Receive all items (status becomes `CLOSED` or `PARTIALLY_RECEIVED` depending on implementation).
9. Open Dashboard / Reports → `Stock per location` and check stock for (`P1`, `L1`).

**Expected result**

- On-hand quantity for (`P1`, `L1`) increases exactly by `Q`.
- A new `stock_movement` row of type `PURCHASE_RECEIPT` exists in the database.

---

### TC02 – Sales decreases stock

**Goal**

Verify that a confirmed sales order decreases stock from the selected location.

**Preconditions**

- Product `P1` has enough stock at location `L1` (>= `Q` units).

**Steps**

1. Login as staff.
2. Go to **Sales Orders** page.
3. Click **New sales order**.
4. Select location `L1` and customer info.
5. Add product `P1` with quantity `Q`.
6. Save SO in `DRAFT`.
7. Confirm the sales order (status `CONFIRMED`).
8. Check Dashboard / Reports → `Stock per location` for (`P1`, `L1`).

**Expected result**

- On-hand quantity for (`P1`, `L1`) decreases by `Q`.
- A new `stock_movement` row of type `SALES_ISSUE` is created.
- Top-selling report shows `P1` with increased `total_qty_sold`.

---

### TC03 – Overselling is blocked by database trigger

**Goal**

Ensure that the system prevents confirming a sales order when stock is not enough.

**Preconditions**

- Product `P1` has **limited stock** at location `L1` (e.g. 5 units).
- No other concurrent changes to stock.

**Steps**

1. Login as staff.
2. Create a new sales order at location `L1` with product `P1` and quantity `Q` where `Q` is larger than available stock (e.g. `Q = 10`).
3. Save the sales order in `DRAFT`.
4. Try to confirm the sales order.

**Expected result**

- API returns **400 Bad Request** with an error message similar to:
  - `"Not enough stock to confirm sales order"`.
- Status of the sales order remains `DRAFT` (or not confirmed).
- On-hand quantity for (`P1`, `L1`) is unchanged.
- No `stock_movement` is created for this SO.

---

### TC04 – Multiple transfers keep two locations consistent

**Goal**

Verify that transferring stock between locations updates both locations correctly and never goes negative.

**Preconditions**

- Product `P1` exists.
- Two locations `L1` and `L2` exist.
- `L1` has enough stock of `P1` (e.g. 20 units), `L2` has some initial stock.

**Steps**

1. Login as staff.
2. Open **Transfers** page.
3. Perform transfer #1: `P1`, from `L1` to `L2`, quantity `Q1` (e.g. 5).
4. Perform transfer #2: `P1`, from `L1` to `L2`, quantity `Q2` (e.g. 3).
5. Open Reports → **Stock per location** and filter by `P1`.

**Expected result**

- Stock at `L1` decreases by `Q1 + Q2`.
- Stock at `L2` increases by `Q1 + Q2`.
- There are matching `stock_movement` rows: `TRANSFER_OUT` at `L1` and `TRANSFER_IN` at `L2` for each transfer.
- No inventory_level row has negative quantity.

---

### TC05 – Login & security

**Goal**

Check authentication and basic access control.

**Steps**

1. Call `/api/products/` from Postman **without** Authorization header.
2. Try to open `http://localhost:5173/dashboard` in browser without login.
3. Login with wrong password.
4. Login with correct username/password.

**Expected result**

- (1) API returns `401 Unauthorized`.
- (2) Frontend redirects to `/login`.
- (3) Login page shows error message, no token stored.
- (4) Login redirects to dashboard and token is stored (localStorage or cookie).

---

### TC06 – CRUD master data (Products)

**Goal**

Verify that basic CRUD works and is reflected in UI.

**Steps**

1. Login as staff.
2. Go to **Products** page.
3. Create a new product with unique SKU.
4. Search by SKU or name to ensure it appears in the list.
5. Edit product fields (e.g. price).
6. Delete the product, confirming in the modal.

**Expected result**

- New product appears in list and can be used in purchase/sales/transfer.
- Edited fields are updated.
- After delete, product is no longer visible in frontend lists (or marked inactive, depending on design).

---

### TC07 – Dashboard & reports consistency

**Goal**

Ensure that summary cards, charts, and reports match detailed data.

**Steps**

1. Make at least one purchase, one sale, and one transfer (using scenarios above).
2. Open Dashboard.
3. Open Reports → each tab.

**Expected result**

- Product count, total stock value, low-stock table on Dashboard match report data.
- Top-selling chart on Dashboard is consistent with **Top selling** report tab.
- Low-stock products shown on Dashboard also appear in **Low stock** report.

---

### TC08 – Error handling and validations

**Goal**

Check that invalid inputs are handled gracefully.

**Examples**

- Transfer with the same source and destination location.
- Transfer with quantity = 0 or negative.
- Creating PO/SO without any line item.

**Expected result**

- API returns 400 with appropriate error messages.
- Frontend shows error alert, no partial modifications in the database.
