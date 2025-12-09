-- 06_security.sql
USE sipms;

-- NOTE: change the passwords before running, and DO NOT commit real passwords to Git

CREATE USER IF NOT EXISTS 'sipms_admin'@'localhost'
  IDENTIFIED BY '<admin_password>';

CREATE USER IF NOT EXISTS 'sipms_manager'@'localhost'
  IDENTIFIED BY '<manager_password>';

CREATE USER IF NOT EXISTS 'sipms_staff'@'localhost'
  IDENTIFIED BY '<staff_password>';

-- Admin: full privileges on sipms schema
GRANT ALL PRIVILEGES ON sipms.* TO 'sipms_admin'@'localhost';

-- Manager: CRUD on business tables + EXECUTE procedures
GRANT SELECT, INSERT, UPDATE, DELETE
ON sipms.product            TO 'sipms_manager'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE
ON sipms.category           TO 'sipms_manager'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE
ON sipms.supplier           TO 'sipms_manager'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE
ON sipms.location           TO 'sipms_manager'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE
ON sipms.inventory_level    TO 'sipms_manager'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE
ON sipms.purchase_order     TO 'sipms_manager'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE
ON sipms.purchase_order_item TO 'sipms_manager'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE
ON sipms.sales_order        TO 'sipms_manager'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE
ON sipms.sales_order_item   TO 'sipms_manager'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE
ON sipms.stock_movement     TO 'sipms_manager'@'localhost';

GRANT EXECUTE ON PROCEDURE sipms.sp_create_purchase_order
    TO 'sipms_manager'@'localhost';
GRANT EXECUTE ON PROCEDURE sipms.sp_confirm_sales_order
    TO 'sipms_manager'@'localhost';

-- Staff: view data + create sales order, use confirm procedure
GRANT SELECT
ON sipms.product            TO 'sipms_staff'@'localhost';
GRANT SELECT
ON sipms.inventory_level    TO 'sipms_staff'@'localhost';
GRANT SELECT
ON sipms.location           TO 'sipms_staff'@'localhost';
GRANT SELECT
ON sipms.supplier           TO 'sipms_staff'@'localhost';

GRANT SELECT, INSERT
ON sipms.sales_order        TO 'sipms_staff'@'localhost';
GRANT SELECT, INSERT
ON sipms.sales_order_item   TO 'sipms_staff'@'localhost';

GRANT EXECUTE ON PROCEDURE sipms.sp_confirm_sales_order
    TO 'sipms_staff'@'localhost';

FLUSH PRIVILEGES;
