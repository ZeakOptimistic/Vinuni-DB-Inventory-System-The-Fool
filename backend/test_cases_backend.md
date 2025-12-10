# Backend API Test Cases – SIPMS

## 1. Authentication

| ID    | API              | Method | Scenario                               | Input / Precondition                               | Expected Result                                                                 |
|-------|------------------|--------|----------------------------------------|----------------------------------------------------|---------------------------------------------------------------------------------|
| AU-01 | /api/auth/login/ | POST   | Login with valid credentials           | username = khai, password = khai123               | 200 OK, response contains `access` (JWT) and `user` info                        |
| AU-02 | /api/auth/login/ | POST   | Login with wrong password              | Existing username, incorrect password             | 401 Unauthorized, error message like “Invalid credentials”                      |
| AU-03 | /api/products/   | GET    | Call protected API without token       | No `Authorization` header                         | 401, error “Authentication credentials were not provided.”                      |
| AU-04 | /api/products/   | GET    | Call API with invalid token            | `Authorization: Bearer abcxyz`                    | 401, error indicating invalid token                                             |

---

## 2. Product / Inventory Master Data

### 2.1. Product

| ID    | API            | Method | Scenario                                   | Input / Precondition                                                                       | Expected Result                                                                                              |
|-------|----------------|--------|--------------------------------------------|--------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------|
| PR-01 | /api/products/ | GET    | List all products                          | Logged in, demo data loaded                                                                | 200 OK, returns list of products; each item has `product_id`, `name`, `sku`, `unit_price`, etc.             |
| PR-02 | /api/products/ | POST   | Create a valid product                     | JSON body includes all required fields (category, name, sku, unit_price, unit_of_measure…) | 201 Created, response is the new product; `sku` matches input, `product_id` is non-zero                     |
| PR-03 | /api/products/ | POST   | Create product with missing required field | Missing `name` or `category` field                                                         | 400 Bad Request, validation error for the missing field                                                     |
| PR-04 | /api/products/ | PATCH  | Update a product                           | Existing product from PR-02                                                                | 200 OK, updated field (e.g. `name`) is changed in response and in DB                                        |
| PR-05 | /api/products/ | DELETE | Delete a product                           | Existing product from PR-02                                                                | 204 No Content (or 200 depending on config), subsequent GET `/api/products/{id}/` returns 404 Not Found     |

### 2.2. Other master data (Category, Supplier, Location)

At minimum, similar tests for each master API:

| ID    | API              | Method | Scenario                           | Input / Precondition | Expected Result                                  |
|-------|------------------|--------|------------------------------------|----------------------|--------------------------------------------------|
| CT-01 | /api/categories/ | GET    | List all categories                | Logged in            | 200, returns list of categories                  |
| CT-02 | /api/categories/ | POST   | Create category without `name`     | JSON missing `name`  | 400, validation error for `name`                 |
| SP-01 | /api/suppliers/  | GET    | List all suppliers                 | Logged in            | 200, returns list of suppliers                   |
| LO-01 | /api/locations/  | GET    | List all locations                 | Logged in            | 200, returns list of locations                   |

---

## 3. Purchase Order (PO)

| ID    | API                                      | Method | Scenario                                          | Input / Precondition                                                                                           | Expected Result                                                                                                 |
|-------|------------------------------------------|--------|---------------------------------------------------|----------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------|
| PO-01 | /api/purchase-orders/                    | POST   | Create PO with 2 valid lines                      | Valid `supplier_id`, `location_id`; `items` contains 2 products with positive `ordered_qty`                    | 201 Created, response has new `po_id`, `items` with 2 lines, `received_qty = 0` on each, `total_amount` correct |
| PO-02 | /api/purchase-orders/                    | POST   | Create PO without any items                       | Request body has no `items` field or an empty list                                                            | 400, error “Purchase order must have at least one item.” (or equivalent)                                       |
| PO-03 | /api/purchase-orders/                    | POST   | Create PO with non-existing supplier              | `supplier_id = 9999`                                                                                           | 400, error `"supplier_id": "Supplier does not exist."` (or equivalent)                                          |
| PO-04 | /api/purchase-orders/                    | GET    | List purchase orders                              | At least one PO created (PO-01)                                                                               | 200, list of POs; the PO from PO-01 appears at the top (depending on ordering)                                  |
| PO-05 | /api/purchase-orders/{id}/receive-all/   | POST   | Receive all remaining quantity for the first time | Use `po_id` from PO-01, no previous receive-all call for this PO                                              | 200 OK, in response each item has `received_qty == ordered_qty`; if all lines full, `status = "CLOSED"`        |
| PO-06 | /api/purchase-orders/{id}/receive-all/   | POST   | Call receive-all again on fully received PO       | Same `po_id` as in PO-05                                                                                      | 400 Bad Request, error `"All items in PO have been received in full."`                                         |
| PO-07 | /api/purchase-orders/{id}/receive-all/   | POST   | Call receive-all on non-existing PO               | `po_id = 9999`                                                                                                | 404 Not Found, `"detail": "Purchase Order does not exist."` (or equivalent)                                     |

---

## 4. Sales Order (SO)

| ID    | API                | Method | Scenario                                | Input / Precondition                                                                                                       | Expected Result                                                                                          |
|-------|--------------------|--------|-----------------------------------------|----------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------|
| SO-01 | /api/sales-orders/ | POST   | Create SO with enough stock             | Choose `location_id` and `product_id`s that have enough stock (after receiving some POs). 1–2 items with small `quantity`. | 201 Created, new `so_id`, response `status = "CONFIRMED"`, `items` has correct `line_total` values       |
| SO-02 | /api/sales-orders/ | POST   | SO with non-existing location           | `location_id = 9999`                                                                                                       | 400, error `"location_id": "Location does not exist."`                                                   |
| SO-03 | /api/sales-orders/ | POST   | SO with non-existing product            | One item has `product_id = 9999`                                                                                           | 400, validation error inside `"items"` indicating product does not exist                                 |
| SO-04 | /api/sales-orders/ | POST   | SO with quantity greater than available | Choose a product and use a very large `quantity` (e.g., 999999) so it should exceed inventory                             | 400, `detail` message from stored procedure (e.g. “Not enough stock…”)                                   |
| SO-05 | /api/sales-orders/ | GET    | List sales orders                       | At least one SO created (SO-01)                                                                                            | 200, list of SOs; newly created SO appears at top (depending on ordering)                                |

---

## 5. Stock and Data Integrity (checked via DB, not API)

These are manual checks in MySQL Workbench / DBeaver but still documented.

| ID    | Table / View            | Scenario                                  | Steps                                                                                                              | Expected Result                                                                                                           |
|-------|-------------------------|-------------------------------------------|--------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------|
| ST-01 | stock_movement          | After receiving one PO                    | Perform PO-01 and PO-05, then query: `SELECT * FROM stock_movement WHERE related_document_type = 'PURCHASE_ORDER'` | Rows exist with `movement_type = 'PURCHASE_RECEIPT'`, `related_document_id = po_id`, `quantity` equals ordered quantity  |
| ST-02 | stock_movement          | After creating one SO                     | Perform SO-01, then query: `SELECT * FROM stock_movement WHERE related_document_type = 'SALES_ORDER'`              | Row exists with `movement_type` for sales issue (depends on schema), negative `quantity`, `related_document_id = so_id`  |
| ST-03 | inventory_level         | Inventory updated correctly after PO + SO | For a given product/location, check quantity before and after running receive PO and confirm SO                    | `quantity_on_hand` increases when receiving PO, decreases when confirming SO by the exact quantities                     |
| ST-04 | view_stock_per_location | Aggregated inventory per location         | `SELECT * FROM view_stock_per_location WHERE product_id = X`                                                       | Quantity in the view matches `inventory_level` table                                                                      |
| ST-05 | view_low_stock_products | Low-stock alert                           | Reduce inventory of one product below `reorder_level`, then query the view                                        | That product appears in the view with `current_qty` < `reorder_level`                                                    |

> You can add a `Status` column (PASSED/FAILED/COMMENTS) to track execution results during testing.
