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

-- (Optional) Fulltext index on product description for search
-- Need check MySQL version and storage engine support
-- ALTER TABLE stock_movement
-- PARTITION BY RANGE (YEAR(movement_date)) (
--   PARTITION p2024 VALUES LESS THAN (2025),
--   PARTITION pmax  VALUES LESS THAN MAXVALUE
-- );