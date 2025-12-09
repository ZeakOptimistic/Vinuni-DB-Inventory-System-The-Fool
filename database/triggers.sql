-- 05_triggers.sql
USE sipms;

DROP TRIGGER IF EXISTS before_insert_stock_movement;
DROP TRIGGER IF EXISTS after_insert_stock_movement;

DELIMITER $$

CREATE TRIGGER before_insert_stock_movement
BEFORE INSERT ON stock_movement
FOR EACH ROW
BEGIN
    IF NEW.quantity <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Quantity in stock_movement must be > 0';
    END IF;
END$$

CREATE TRIGGER after_insert_stock_movement
AFTER INSERT ON stock_movement
FOR EACH ROW
BEGIN
    DECLARE v_current_qty INT;
    DECLARE v_new_qty INT;
    DECLARE v_delta INT;

    -- determine delta based on movement_type (match enum)
    CASE NEW.movement_type
        WHEN 'PURCHASE_RECEIPT' THEN SET v_delta = NEW.quantity;        -- import
        WHEN 'SALES_ISSUE'      THEN SET v_delta = -NEW.quantity;       -- export
        WHEN 'ADJUSTMENT'       THEN SET v_delta = NEW.quantity;        -- modify can +/-, depend use way
        ELSE SET v_delta = 0;
    END CASE;

    SELECT quantity_on_hand
      INTO v_current_qty
      FROM inventory_level
     WHERE product_id  = NEW.product_id
       AND location_id = NEW.location_id
     FOR UPDATE;

    IF v_current_qty IS NULL THEN
        SET v_current_qty = 0;
    END IF;

    SET v_new_qty = v_current_qty + v_delta;

    IF v_new_qty < 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Inventory would become negative';
    ELSE
        INSERT INTO inventory_level(product_id, location_id, quantity_on_hand, last_updated)
        VALUES (NEW.product_id, NEW.location_id, v_new_qty, NOW())
        ON DUPLICATE KEY UPDATE
            quantity_on_hand = v_new_qty,
            last_updated     = NOW();
    END IF;
END$$

DELIMITER ;
