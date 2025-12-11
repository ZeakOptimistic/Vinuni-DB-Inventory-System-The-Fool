-- 01_schema.sql
DROP DATABASE IF EXISTS sipms;
CREATE DATABASE sipms
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sipms;

SET NAMES utf8mb4;

-- Drop tables in child->parent order
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS stock_movement;
DROP TABLE IF EXISTS sales_order_item;
DROP TABLE IF EXISTS purchase_order_item;
DROP TABLE IF EXISTS inventory_level;
DROP TABLE IF EXISTS sales_order;
DROP TABLE IF EXISTS purchase_order;
DROP TABLE IF EXISTS product;
DROP TABLE IF EXISTS category;
DROP TABLE IF EXISTS supplier;
DROP TABLE IF EXISTS location;
DROP TABLE IF EXISTS app_user;
DROP TABLE IF EXISTS role;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================
-- 1. Category
-- =========================
CREATE TABLE category (
    category_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100) NOT NULL UNIQUE,
    description   VARCHAR(255),
    status        ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE'
);

-- =========================
-- 2. Role
-- =========================
CREATE TABLE role (
    role_id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_name    VARCHAR(50) NOT NULL UNIQUE,
    description  VARCHAR(255)
);

-- =========================
-- 3. User
-- =========================
CREATE TABLE app_user (
    user_id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(150),
    email         VARCHAR(150),
    role_id       INT UNSIGNED NOT NULL,
    status        ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_role
        FOREIGN KEY (role_id) REFERENCES role(role_id)
);

-- =========================
-- 4. Supplier
-- =========================
CREATE TABLE supplier (
    supplier_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(150) NOT NULL,
    contact_name  VARCHAR(150),
    phone         VARCHAR(30),
    email         VARCHAR(150),
    address       VARCHAR(255),
    payment_terms VARCHAR(100),
    status        ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- 5. Location
-- =========================
CREATE TABLE location (
    location_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    type        ENUM('WAREHOUSE','STORE') NOT NULL,
    address     VARCHAR(255),
    status      ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- 6. Product
-- =========================
CREATE TABLE product (
    product_id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id      INT UNSIGNED NOT NULL,
    name             VARCHAR(150) NOT NULL,
    sku              VARCHAR(50)  NOT NULL UNIQUE,
    barcode          VARCHAR(50)  UNIQUE,
    description      TEXT,
    unit_price       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    unit_of_measure  VARCHAR(20)   NOT NULL DEFAULT 'unit',
    reorder_level    INT UNSIGNED  NOT NULL DEFAULT 0,
    status           ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                         ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_product_category
        FOREIGN KEY (category_id) REFERENCES category(category_id)
);

-- =========================
-- 7. PurchaseOrder (PO)
-- =========================
CREATE TABLE purchase_order (
    po_id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    supplier_id   INT UNSIGNED NOT NULL,
    location_id   INT UNSIGNED NOT NULL,       -- receive location
    order_date    DATE NOT NULL,
    expected_date DATE,
    status        ENUM('DRAFT','APPROVED','PARTIALLY_RECEIVED','CLOSED','CANCELLED')
                      NOT NULL DEFAULT 'DRAFT',
    total_amount  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    created_by    INT UNSIGNED NOT NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_po_supplier
        FOREIGN KEY (supplier_id) REFERENCES supplier(supplier_id),
    CONSTRAINT fk_po_location
        FOREIGN KEY (location_id) REFERENCES location(location_id),
    CONSTRAINT fk_po_user
        FOREIGN KEY (created_by) REFERENCES app_user(user_id)
);

-- =========================
-- 8. SalesOrder (SO)
-- =========================
CREATE TABLE sales_order (
    so_id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    location_id   INT UNSIGNED NOT NULL,        -- store location
    order_date    DATE NOT NULL,
    customer_name VARCHAR(150),
    status        ENUM('DRAFT','CONFIRMED','CANCELLED','REFUNDED')
                      NOT NULL DEFAULT 'DRAFT',
    total_amount  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    created_by    INT UNSIGNED NOT NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_so_location
        FOREIGN KEY (location_id) REFERENCES location(location_id),
    CONSTRAINT fk_so_user
        FOREIGN KEY (created_by) REFERENCES app_user(user_id)
);

-- =========================
-- 9. InventoryLevel (weak entity: (product, location))
-- =========================
CREATE TABLE inventory_level (
    product_id        INT UNSIGNED NOT NULL,
    location_id       INT UNSIGNED NOT NULL,
    quantity_on_hand  INT NOT NULL DEFAULT 0,
    last_updated      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (product_id, location_id),
    CONSTRAINT fk_il_product
        FOREIGN KEY (product_id) REFERENCES product(product_id),
    CONSTRAINT fk_il_location
        FOREIGN KEY (location_id) REFERENCES location(location_id)
);

-- =========================
-- 10. StockMovement
-- =========================
CREATE TABLE stock_movement (
    movement_id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id             INT UNSIGNED NOT NULL,
    location_id            INT UNSIGNED NOT NULL,
    quantity               INT NOT NULL,   -- >0: in, <0: out
    movement_type          ENUM('PURCHASE_RECEIPT','SALES_ISSUE',
                                'TRANSFER_IN','TRANSFER_OUT',
                                'ADJUSTMENT') NOT NULL,
    related_document_type  ENUM('PURCHASE_ORDER','SALES_ORDER',
                                'ADJUSTMENT','TRANSFER','INITIAL_LOAD') NULL,
    related_document_id    BIGINT UNSIGNED NULL,
    movement_date          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by             INT UNSIGNED NOT NULL,
    created_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sm_product
        FOREIGN KEY (product_id) REFERENCES product(product_id),
    CONSTRAINT fk_sm_location
        FOREIGN KEY (location_id) REFERENCES location(location_id),
    CONSTRAINT fk_sm_user
        FOREIGN KEY (created_by) REFERENCES app_user(user_id)
);

-- =========================
-- 11. PurchaseOrderItem (weak entity: belong to PO + Product)
-- =========================
CREATE TABLE purchase_order_item (
    po_id        BIGINT UNSIGNED NOT NULL,
    product_id   INT UNSIGNED    NOT NULL,
    ordered_qty  INT NOT NULL CHECK (ordered_qty > 0),
    received_qty INT NOT NULL DEFAULT 0 CHECK (received_qty >= 0),
    unit_price   DECIMAL(10,2) NOT NULL,
    line_total   DECIMAL(12,2) NOT NULL,
    PRIMARY KEY (po_id, product_id),
    CONSTRAINT fk_poi_po
        FOREIGN KEY (po_id) REFERENCES purchase_order(po_id),
    CONSTRAINT fk_poi_product
        FOREIGN KEY (product_id) REFERENCES product(product_id)
);

-- =========================
-- 12. SalesOrderItem (weak entity: belong to SO + Product)
-- =========================
CREATE TABLE sales_order_item (
    so_id      BIGINT UNSIGNED NOT NULL,
    product_id INT UNSIGNED    NOT NULL,
    quantity   INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    discount   DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    line_total DECIMAL(12,2) NOT NULL,
    PRIMARY KEY (so_id, product_id),
    CONSTRAINT fk_soi_so
        FOREIGN KEY (so_id) REFERENCES sales_order(so_id),
    CONSTRAINT fk_soi_product
        FOREIGN KEY (product_id) REFERENCES product(product_id)
);

-- =========================
-- 13. AuditLog
-- =========================
CREATE TABLE audit_log (
    log_id      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    entity_name VARCHAR(50) NOT NULL,
    entity_id   BIGINT UNSIGNED NOT NULL,
    description TEXT,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_user
        FOREIGN KEY (user_id) REFERENCES app_user(user_id)
);

-- =========================

-- Some indexes to support queries/reports
-- =========================
CREATE INDEX idx_product_name ON product(name);
CREATE INDEX idx_inventory_level_loc ON inventory_level(location_id);
CREATE INDEX idx_stock_movement_prod_date
    ON stock_movement(product_id, movement_date);
CREATE INDEX idx_stock_movement_loc_date
    ON stock_movement(location_id, movement_date);
