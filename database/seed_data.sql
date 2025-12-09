-- seed_data.sql  —  sample data for SIPMS

USE sipms;

SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM audit_log;
DELETE FROM stock_movement;
DELETE FROM sales_order_item;
DELETE FROM purchase_order_item;
DELETE FROM inventory_level;
DELETE FROM sales_order;
DELETE FROM purchase_order;
DELETE FROM app_user;
DELETE FROM role;
DELETE FROM supplier;
DELETE FROM product;
DELETE FROM category;
DELETE FROM location;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================
-- Roles
-- =========================
INSERT INTO role (role_id, role_name, description) VALUES
  (1, 'ADMIN',   'System administrator'),
  (2, 'MANAGER', 'Inventory manager'),
  (3, 'CLERK',   'Warehouse/store clerk');

-- =========================
-- Users (password_hash is dummy, will be replaced by real hash in Django)
-- =========================
INSERT INTO app_user
  (user_id, username, password_hash, full_name, email, role_id, status)
VALUES
  (1, 'khai',  'demo_hash_1', 'Tran Quang Khai',  'khai@example.com', 1, 'ACTIVE'),
  (2, 'tri',   'demo_hash_2', 'Thai Huu Tri',     'tri@example.com',  2, 'ACTIVE'),
  (3, 'han',   'demo_hash_3', 'Nguyen Ngoc Han',  'han@example.com',  3, 'ACTIVE'),
  (4, 'admin_demo',   'demo_hash_admin',   'Demo Admin',   'admin.demo@example.com',   1, 'ACTIVE'),
  (5, 'manager_demo', 'demo_hash_manager', 'Demo Manager', 'manager.demo@example.com', 2, 'ACTIVE');

-- =========================
-- Categories
-- =========================
INSERT INTO category (category_id, name, description) VALUES
  (1, 'Electronics', 'Consumer electronics and accessories'),
  (2, 'Office',      'Office supplies and stationery'),
  (3, 'Food',        'Packaged food and drinks');

-- =========================
-- Suppliers
-- =========================
INSERT INTO supplier
  (supplier_id, name, contact_name, phone, email, address,
   payment_terms, status)
VALUES
  (1, 'Alpha Supplies', 'Nguyen Van A', '+84-90-000-0001',
     'alpha@example.com', 'Hanoi, Vietnam', 'Net 30', 'ACTIVE'),
  (2, 'Beta Trading', 'Tran Thi B', '+84-90-000-0002',
     'beta@example.com', 'HCMC, Vietnam', 'Net 15', 'ACTIVE'),
  (3, 'Gamma Foods', 'Le Van C', '+84-90-000-0003',
     'gamma@example.com', 'Da Nang, Vietnam', 'Prepaid', 'ACTIVE');

-- =========================
-- Locations
-- =========================
INSERT INTO location
  (location_id, name, type, address, status)
VALUES
  (1, 'Main Warehouse',   'WAREHOUSE', 'Hanoi Campus',              'ACTIVE'),
  (2, 'Showroom A',       'STORE',     'Hanoi Campus - Building A', 'ACTIVE'),
  (3, 'Showroom B',       'STORE',     'HCMC Branch',               'ACTIVE'),
  (4, 'Overflow Storage', 'WAREHOUSE', 'External warehouse',        'ACTIVE');

-- =========================
-- Products (10 items)
-- =========================
INSERT INTO product
  (product_id, category_id, name, sku, barcode, description,
   unit_price, unit_of_measure, reorder_level, status)
VALUES
  (1, 1, 'USB-C Cable 1m',       'EL-USB-001', '111000000001',
   'USB-C charging cable 1 metre', 50000, 'piece', 20, 'ACTIVE'),
  (2, 1, 'Wireless Mouse',       'EL-MOU-001', '111000000002',
   '2.4GHz wireless mouse',       150000, 'piece', 15, 'ACTIVE'),
  (3, 1, 'Mechanical Keyboard',  'EL-KEY-001', '111000000003',
   'Compact mechanical keyboard', 750000, 'piece', 10, 'ACTIVE'),
  (4, 2, 'A4 Paper Ream',        'OF-PAP-001', '222000000001',
   '500 sheets A4 copy paper',    60000, 'ream', 25, 'ACTIVE'),
  (5, 2, 'Blue Ballpoint Pen',   'OF-PEN-001', '222000000002',
   'Box of 50 blue pens',         45000, 'box', 10, 'ACTIVE'),
  (6, 2, 'Notebook 100 pages',   'OF-NOT-001', '222000000003',
   'Lined notebook',              20000, 'piece', 30, 'ACTIVE'),
  (7, 3, 'Instant Noodles Pack', 'FO-NOO-001', '333000000001',
   'Pack of instant noodles',      8000, 'pack', 40, 'ACTIVE'),
  (8, 3, 'Bottled Water 500ml',  'FO-WAT-001', '333000000002',
   'Bottle of drinking water',     5000, 'bottle', 50, 'ACTIVE'),
  (9, 3, 'Chocolate Bar',        'FO-CHO-001', '333000000003',
   'Milk chocolate bar',          15000, 'piece', 30, 'ACTIVE'),
  (10,3, 'Coffee Drip Bag',      'FO-COF-001', '333000000004',
   'Drip coffee bag',             12000, 'bag',   25, 'ACTIVE');

-- =========================
-- InventoryLevel (initial stock)
-- =========================
INSERT INTO inventory_level (product_id, location_id, quantity_on_hand)
VALUES
  (1, 1, 100), (2, 1, 80), (3, 1, 40), (4, 1, 60), (5, 1, 50),
  (6, 1, 90),  (7, 1,120), (8, 1,150), (9, 1,70), (10,1,60),

  (1, 2, 20),  (2, 2,15),  (4, 2,25), (7, 2,30), (8, 2,40),

  (2, 3,10),   (3, 3, 8),  (9, 3,15), (10,3,20);

-- =========================
-- Purchase Order demo
-- =========================
INSERT INTO purchase_order
  (po_id, supplier_id, location_id, order_date, expected_date,
   status, total_amount, created_by)
VALUES
  (1, 1, 1, '2025-12-10', '2025-12-15',
   'CLOSED', 5000000, 2);

INSERT INTO purchase_order_item
  (po_id, product_id, ordered_qty, received_qty, unit_price, line_total)
VALUES
  (1, 1, 50, 50, 45000, 2250000),
  (1, 2, 30, 30, 130000, 3900000),
  (1, 4, 40, 40, 50000, 2000000);

-- =========================
-- Sales Order demo
-- =========================
INSERT INTO sales_order
  (so_id, location_id, order_date, customer_name,
   status, total_amount, created_by)
VALUES
  (1, 2, '2025-12-12', 'Internal Customer',
   'CONFIRMED', 650000, 3);

INSERT INTO sales_order_item
  (so_id, product_id, quantity, unit_price, discount, line_total)
VALUES
  (1, 1, 5, 50000, 0, 250000),
  (1, 2, 2, 150000, 0, 300000),
  (1, 4, 2, 50000, 0, 100000);

-- =========================
-- Stock movements (PO receipt + SO issue)
-- =========================
INSERT INTO stock_movement
  (movement_id, product_id, location_id, quantity,
   movement_type, related_document_type, related_document_id,
   movement_date, created_by)
VALUES
  (1, 1, 1,  50, 'PURCHASE_RECEIPT', 'PURCHASE_ORDER', 1,
   '2025-12-15 10:00:00', 2),
  (2, 2, 1,  30, 'PURCHASE_RECEIPT', 'PURCHASE_ORDER', 1,
   '2025-12-15 10:05:00', 2),
  (3, 4, 1,  40, 'PURCHASE_RECEIPT', 'PURCHASE_ORDER', 1,
   '2025-12-15 10:10:00', 2),
  (4, 1, 2,  -5, 'SALES_ISSUE',      'SALES_ORDER',    1,
   '2025-12-12 15:00:00', 3),
  (5, 2, 2,  -2, 'SALES_ISSUE',      'SALES_ORDER',    1,
   '2025-12-12 15:05:00', 3),
  (6, 4, 2,  -2, 'SALES_ISSUE',      'SALES_ORDER',    1,
   '2025-12-12 15:10:00', 3);

-- =========================
-- Audit log demo
-- =========================
INSERT INTO audit_log
  (log_id, user_id, action_type, entity_name, entity_id, description)
VALUES
  (1, 2, 'CREATE',  'PurchaseOrder', 1, 'Created purchase order #1'),
  (2, 2, 'UPDATE',  'PurchaseOrder', 1, 'Marked PO #1 as CLOSED'),
  (3, 3, 'CREATE',  'SalesOrder',    1, 'Created sales order #1');
