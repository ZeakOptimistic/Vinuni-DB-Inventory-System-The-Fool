# Frontend Requirements – Smart Inventory & Procurement Management System

## 1. Objective

Design and implement a simple, role-based web frontend for the existing SIPMS backend, focusing on:

- Viewing and managing master data (categories, products, suppliers, locations).
- Creating and managing sales orders and purchase orders.
- Handling stock in/out through the purchase order "receive all" flow.
- Respecting authentication (JWT) and authorization (role-based) rules already implemented in the backend.

The frontend will be built as a single-page application (SPA) using a modern JS framework (e.g., React), but the requirements below are framework-agnostic.

---

## 2. Global Behaviors

### 2.1. Authentication

- Login uses:
  - `POST /api/auth/login/`
  - Request body: `{ "username": string, "password": string }`.
  - On success, save:
    - `access` (JWT) for API calls.
    - `user` object (id, username, full_name, role) for display and authorization.

- For all subsequent API calls (except login):
  - Add HTTP header:  
    `Authorization: Bearer <access_token>`.

- If any protected API returns **401/403**:
  - Redirect user back to the login page.
  - Optionally clear token from local storage.

### 2.2. Authorization / Roles

- Role values come from `user.role`, e.g. `"ADMIN"`, `"MANAGER"`, `"CLERK"`, etc.
- General rules:
  - Any authenticated user:
    - Can **view** master data lists and details (products, suppliers, locations, categories).
    - Can **view** lists of sales orders and purchase orders.
  - Only staff (`ADMIN`, `MANAGER`, `CLERK`):
    - Can **create/update/delete** master data.
    - Can **create** sales orders and purchase orders.
    - Can trigger **receive all** for purchase orders.
  - Only `ADMIN` and `MANAGER` may be allowed to see future admin/report screens (audit, dashboard, etc.).

Frontend should hide/disable buttons and actions that the current role is not allowed to perform.

### 2.3. Error Handling

- Display validation errors from the backend clearly to the user (e.g. missing fields, invalid product IDs).
- For business/DB errors such as insufficient stock on sales order:
  - Backend returns `400` with a simple JSON: `{ "detail": "<message>" }`.
  - Frontend should show this message near the form (e.g. at the top of the "Create Sales Order" dialog).

---

## 3. Pages / Screens

### 3.1. Login Page

**Route:** `/login`  

**Purpose:**

- Authenticate the user and store the JWT + user info.

**UI Elements:**

- Username input, password input, "Login" button.
- Error message area.

**API:**

- `POST /api/auth/login/`

**Success Flow:**

- On success:
  - Save token and user info.
  - Redirect to `/dashboard` (or `/products` if no dashboard yet).

**Error Flow:**

- On `400` with `{"detail": "Invalid credentials"}`, show message underneath form.

---

### 3.2. Layout / Shell

**Applies to all authenticated routes.**

- Top navigation bar:
  - App name.
  - Current user name (`user.full_name` or `user.username`).
  - Logout button.
- Side navigation menu:
  - Products
  - Suppliers
  - Locations
  - Categories
  - Sales Orders
  - Purchase Orders
  - (Future) Dashboard / Reports
- Role-based visibility of menu items (e.g., some admin features only for ADMIN/MANAGER).

---

### 3.3. Product Management

**Routes:**

- List: `/products`
- Create/Edit: `/products/new`, `/products/:id/edit`
- View: `/products/:id` (optional, or reuse edit view in read-only mode)

**APIs:**

- `GET /api/products/?page=&page_size=&search=&ordering=`
- `POST /api/products/`
- `GET /api/products/{id}/`
- `PUT/PATCH /api/products/{id}/`
- `DELETE /api/products/{id}/`

**Data Model (based on ProductSerializer):**

- `product_id` (read-only)
- `category` (FK id)
- `name`
- `sku`
- `barcode`
- `description`
- `unit_price`
- `unit_of_measure`
- `reorder_level`
- `status` (`"ACTIVE"` or `"INACTIVE"`)
- `created_at` (read-only)
- `updated_at` (read-only)
- `category_name` (read-only, for list display)

**UI Requirements:**

- List page:
  - Table with columns: SKU, Name, Category, Unit Price, Status, Actions.
  - Search box (bind to `?search=`).
  - Sort controls (e.g. sort by name or unit price via `?ordering=`).
  - Pagination controls using DRF pagination fields (`count`, `next`, `previous`).
- Actions:
  - "New Product" button (only for staff).
  - Edit / Delete actions per row (only for staff).
- Form validation:
  - Required fields: category, name, sku, unit_price, unit_of_measure, reorder_level, status.

---

### 3.4. Supplier Management

**Routes:** `/suppliers`, `/suppliers/new`, `/suppliers/:id/edit`

**APIs:**

- `GET /api/suppliers/`
- `POST /api/suppliers/`
- `GET /api/suppliers/{id}/`
- `PUT/PATCH /api/suppliers/{id}/`
- `DELETE /api/suppliers/{id}/`

**Data Fields:**

- `supplier_id` (read-only)
- `name`
- `contact_name`
- `phone`
- `email`
- `address`
- `payment_terms`
- `status`
- `created_at` (read-only)

**UI Requirements:**

- List table with basic info (Name, Contact, Phone, Status).
- Search by name/contact/email (`?search=`).
- Staff can create/update/delete.

---

### 3.5. Location Management

**Routes:** `/locations`, `/locations/new`, `/locations/:id/edit`

**APIs:**

- `GET /api/locations/`
- `POST /api/locations/`
- `GET /api/locations/{id}/`
- `PUT/PATCH /api/locations/{id}/`
- `DELETE /api/locations/{id}/`

**Fields:**

- `location_id` (read-only)
- `name`
- `type` (`"WAREHOUSE"` / `"STORE"`)
- `address`
- `status`
- `created_at` (read-only)

**UI Requirements:**

- Show list with Name, Type, Address, Status.
- simple forms for create/edit.

---

### 3.6. Category Management

**Routes:** `/categories`, `/categories/new`, `/categories/:id/edit`

**APIs:**

- `GET /api/categories/`
- `POST /api/categories/`
- `GET /api/categories/{id}/`
- `PUT/PATCH /api/categories/{id}/`
- `DELETE /api/categories/{id}/`

**Fields:**

- `category_id` (read-only)
- `name`
- `description`

---

### 3.7. Sales Orders

**Routes:**

- List: `/sales-orders`
- Create: `/sales-orders/new`
- (Optional) Details: `/sales-orders/:id`

**APIs:**

- `GET /api/sales-orders/`
- `POST /api/sales-orders/`

**Order Data (SalesOrderSerializer):**

- `so_id`
- `location_id`
- `location_name`
- `order_date`
- `customer_name`
- `status`
- `total_amount`
- `created_by_id`
- `created_at`
- `items` (array of SalesOrderItemSerializer):
  - `product_id`
  - `product_name`
  - `sku`
  - `quantity`
  - `unit_price`
  - `discount`
  - `line_total`

**UI Requirements:**

- List screen:
  - Table: Order ID, Date, Customer, Location, Status, Total Amount.
  - Show nested items in expandable rows or a detail panel.
- Create screen:
  - Form fields:
    - Location dropdown (from `/api/locations/`).
    - Customer name (optional).
    - Order date (default today).
  - Order lines table:
    - Each line: product (select from `/api/products/`), quantity, optional discount.
    - Optionally show unit price and line total.
  - Summary footer showing computed total amount.
- Behavior:
  - On submit, call `POST /api/sales-orders/` with payload:
    - `location_id`, `customer_name`, `order_date`, `items`.
  - Handle errors:
    - If not enough stock, show backend message from `detail`.

---

### 3.8. Purchase Orders

**Routes:**

- List: `/purchase-orders`
- Create: `/purchase-orders/new`
- View / Receive: `/purchase-orders/:id`

**APIs:**

- `GET /api/purchase-orders/`
- `POST /api/purchase-orders/`
- `POST /api/purchase-orders/{po_id}/receive-all/`

**Order Data (PurchaseOrderSerializer):**

- `po_id`
- `supplier_id`, `supplier_name`
- `location_id`, `location_name`
- `order_date`
- `expected_date`
- `status`
- `total_amount`
- `created_by_id`
- `created_at`
- `items`:
  - `product_id`
  - `product_name`
  - `sku`
  - `ordered_qty`
  - `received_qty`
  - `unit_price`
  - `line_total`

**UI Requirements:**

- List screen:
  - Table: PO ID, Supplier, Location, Order Date, Expected Date, Status, Total.
  - Status badge (e.g. APPROVED, CLOSED).
- Create screen:
  - Supplier dropdown (`/api/suppliers/`).
  - Location dropdown (`/api/locations/`).
  - Order date & expected date.
  - Items table:
    - Product selection, ordered quantity, optional unit price.
- Detail screen:
  - Show header info and items list (including ordered vs received qty).
  - Show a prominent "Receive all" button if:
    - There is at least one item with `received_qty < ordered_qty`.
  - On clicking "Receive all":
    - Call `POST /api/purchase-orders/{po_id}/receive-all/`.
    - Refresh data from response.
  - If backend responds with 400 `"Nothing left to receive..."`, show info message.

---

### 3.9. Future: Dashboard / Reports

The database already contains views and audit tables, but the `reports` and `audit` apps are not implemented yet.

- Reserve routes:
  - `/dashboard`
  - `/audit-log`
- Once backend endpoints exist, connect them via the same JWT pattern.

---

## 4. Non-functional Requirements

- Use a consistent UI framework (e.g., Material UI, Ant Design, or Bootstrap) for tables, dialogs, and forms.
- All API calls should be wrapped by a reusable API client:
  - Automatically attach Authorization header if token exists.
  - Centralized error handling (e.g. interceptor).
- Frontend should be mobile-friendly (at least basic responsiveness):
  - Tables scroll horizontally on small screens.
- Clear separation of concerns:
  - `services/api/*` modules for API calls.
  - `pages/*` for route-level components.
  - `components/*` for reusable components (tables, forms, etc.).

---

## 5. Minimal Implementation Scope

To consider the frontend "complete enough" for the current project:

1. Implement Login + token storage + logout.
2. Implement Products list + create/edit (with category integration).
3. Implement Suppliers and Locations list + create/edit.
4. Implement Sales Orders list + create.
5. Implement Purchase Orders list + create + receive all.
6. Handle basic error cases and enforce role-based UI (show/hide buttons).
