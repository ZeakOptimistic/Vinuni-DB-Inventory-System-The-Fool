-- 03_views.sql
USE sipms;

-- Delete if exists
DROP VIEW IF EXISTS view_stock_per_location;
DROP VIEW IF EXISTS view_low_stock_products;
DROP VIEW IF EXISTS view_top_selling_products_last_30_days;

-- 1. Inventory levels per product per location
CREATE VIEW view_stock_per_location AS
SELECT
    il.product_id,
    p.name        AS product_name,
    p.sku,
    il.location_id,
    l.name        AS location_name,
    il.quantity_on_hand,
    p.reorder_level,
    p.unit_price,
    (COALESCE(il.quantity_on_hand, 0) * COALESCE(p.unit_price, 0)) AS stock_value,
    (il.quantity_on_hand < p.reorder_level) AS is_below_reorder_level
FROM inventory_level AS il
JOIN product  AS p ON p.product_id   = il.product_id
JOIN location AS l ON l.location_id  = il.location_id;

-- 2. Lacking stock products (below reorder level)
CREATE VIEW view_low_stock_products AS
SELECT *
FROM view_stock_per_location
WHERE quantity_on_hand < reorder_level;

-- 3. Top selling products in the last 30 days
CREATE VIEW view_top_selling_products_last_30_days AS
SELECT
    si.product_id,
    p.name AS product_name,
    p.sku,
    SUM(si.quantity)   AS total_qty_sold,
    SUM(si.line_total) AS total_revenue
FROM sales_order_item AS si
JOIN sales_order      AS so ON so.so_id = si.so_id
JOIN product          AS p  ON p.product_id = si.product_id
WHERE so.order_date >= (CURRENT_DATE - INTERVAL 30 DAY)
  -- Modified to match the defined enum values in schema.sql
  AND so.status = 'CONFIRMED'
GROUP BY si.product_id, p.name, p.sku
ORDER BY total_qty_sold DESC;
