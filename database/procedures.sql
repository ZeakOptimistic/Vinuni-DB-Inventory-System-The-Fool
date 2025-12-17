-- 04_procedures.sql
USE sipms;

DROP PROCEDURE IF EXISTS sp_create_purchase_order;
DROP PROCEDURE IF EXISTS sp_confirm_sales_order;

-- 1. Create new purchase order
DELIMITER $$

CREATE PROCEDURE sp_create_purchase_order (
    IN p_supplier_id  INT,
    IN p_location_id  INT,
    IN p_order_date   DATE,
    IN p_expected_date DATE,
    IN p_total_amount DECIMAL(12,2),
    IN p_created_by   INT
)
BEGIN
    INSERT INTO purchase_order(
        supplier_id,
        location_id,
        order_date,
        expected_date,
        status,
        total_amount,
        created_by,
        created_at
    )
    VALUES (
        p_supplier_id,
        p_location_id,
        p_order_date,
        p_expected_date,
        'APPROVED',          -- modify if enum values differ: DRAFT / APPROVED / PARTIALLY_RECEIVED / CLOSED / CANCELLED
        p_total_amount,
        p_created_by,
        NOW()
    );

    -- return the newly created po_id
    SELECT LAST_INSERT_ID() AS po_id;
END$$

-- 2. Confirm sales order: check inventory + create stock movements
CREATE PROCEDURE sp_confirm_sales_order (
    IN p_so_id   BIGINT,
    IN p_user_id INT
)
BEGIN
    DECLARE v_location_id INT;
    DECLARE v_not_enough_stock INT DEFAULT 0;

    -- get the location of the sales order
    SELECT location_id INTO v_location_id
    FROM sales_order
    WHERE so_id = p_so_id
    FOR UPDATE;

    IF v_location_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Sales order not found';
    END IF;

    -- check stock for each item
    SELECT COUNT(*) INTO v_not_enough_stock
    FROM sales_order_item si
    LEFT JOIN inventory_level il
           ON il.product_id  = si.product_id
          AND il.location_id = v_location_id
    WHERE si.so_id = p_so_id
      AND (il.quantity_on_hand IS NULL
           OR il.quantity_on_hand < si.quantity);

    IF v_not_enough_stock > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Not enough stock to confirm sales order';
    END IF;

    -- update status SO
    UPDATE sales_order
    SET status = 'CONFIRMED'   -- modify if enum values differ
    WHERE so_id = p_so_id;

    -- insert stock movements (each line for each item)
    INSERT INTO stock_movement (
        product_id,
        location_id,
        quantity,
        movement_type,
        related_document_type,
        related_document_id,
        movement_date,
        created_by,
        created_at
    )
    SELECT
        si.product_id,
        v_location_id,
        si.quantity,
        'SALES_ISSUE',                 -- modified to correct enum movement_type
        'SALES_ORDER',
        p_so_id,
        NOW(),
        p_user_id,
        NOW()
    FROM sales_order_item si
    WHERE si.so_id = p_so_id;
END$$

DELIMITER ;
