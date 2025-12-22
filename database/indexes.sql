-- 07_indexes.sql
USE sipms;

-- Index for product lookup by SKU
ALTER TABLE product
  ADD INDEX idx_product_sku (sku);

-- Index for inventory_level by (product_id, location_id)
ALTER TABLE inventory_level
  ADD INDEX idx_inventory_product_location (product_id, location_id);

-- Index for stock_movement by (movement_date, product_id)
ALTER TABLE stock_movement
  ADD INDEX idx_stock_movement_date_product (movement_date, product_id);

-- Index for sales_order filtering by date/status (dashboard charts)
ALTER TABLE sales_order
  ADD INDEX idx_sales_order_order_date_status (order_date, status);

-- Index for purchase_order filtering by date/status (dashboard charts)
ALTER TABLE purchase_order
  ADD INDEX idx_purchase_order_order_date_status (order_date, status);
