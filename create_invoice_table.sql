-- Set the search path to erp_turtle schema
SET search_path TO erp_turtle;

-- Check if invoices_invoice table already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'erp_turtle' 
        AND table_name = 'invoices_invoice'
    ) THEN
        -- Create the invoices_invoice table
        CREATE TABLE invoices_invoice (
            id SERIAL PRIMARY KEY,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
            created_by_id INTEGER NULL,
            updated_by_id INTEGER NULL,
            client_id INTEGER NOT NULL,
            company_id INTEGER NOT NULL,
            custom_fields JSONB NULL,
            account_id INTEGER NULL REFERENCES erp_turtle.customers_account(id) ON DELETE PROTECT,
            contact_id INTEGER NULL REFERENCES erp_turtle.customers_contact(id) ON DELETE SET NULL,
            order_id VARCHAR(100) NULL,
            invoice_number VARCHAR(50) NOT NULL,
            reference_number VARCHAR(100) NOT NULL DEFAULT '',
            place_of_supply VARCHAR(100) NOT NULL,
            gst_treatment VARCHAR(50) NOT NULL,
            gst_no VARCHAR(15) NULL,
            template_id INTEGER NOT NULL DEFAULT 1,
            date DATE NOT NULL,
            payment_terms INTEGER NULL,
            payment_terms_label VARCHAR(100) NULL,
            due_date DATE NULL,
            sub_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
            discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
            currency VARCHAR(3) NOT NULL DEFAULT 'INR',
            is_discount_before_tax BOOLEAN NOT NULL DEFAULT TRUE,
            discount_type VARCHAR(50) NOT NULL DEFAULT 'invoice_level',
            is_inclusive_tax BOOLEAN NOT NULL DEFAULT FALSE,
            other_charges NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
            total_tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
            grand_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
            line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
            allow_partial_payments BOOLEAN NOT NULL DEFAULT FALSE,
            notes TEXT NOT NULL DEFAULT '',
            terms TEXT NOT NULL DEFAULT 'Terms & Conditions apply',
            invoice_status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
            invoice_type VARCHAR(20) NOT NULL DEFAULT 'TAX',
            payment_status VARCHAR(20) NOT NULL DEFAULT 'UNPAID',
            invoice_url VARCHAR(512) NULL
        );

        -- Create indexes for better performance
        CREATE INDEX idx_invoices_invoice_client_id ON invoices_invoice(client_id);
        CREATE INDEX idx_invoices_invoice_account_id ON invoices_invoice(account_id);
        CREATE INDEX idx_invoices_invoice_order_id ON invoices_invoice(order_id);
        CREATE INDEX idx_invoices_invoice_invoice_number ON invoices_invoice(invoice_number);
        CREATE INDEX idx_invoices_invoice_date ON invoices_invoice(date);
        CREATE INDEX idx_invoices_invoice_due_date ON invoices_invoice(due_date);
        CREATE INDEX idx_invoices_invoice_invoice_status ON invoices_invoice(invoice_status);
        CREATE INDEX idx_invoices_invoice_payment_status ON invoices_invoice(payment_status);

        -- Add constraint for unique invoice number when not cancelled
        CREATE UNIQUE INDEX unique_invoice_number_if_not_cancelled 
        ON invoices_invoice(invoice_number) 
        WHERE invoice_status != 'CANCELLED';

        RAISE NOTICE 'invoices_invoice table created successfully in erp_turtle schema';
    ELSE
        RAISE NOTICE 'invoices_invoice table already exists in erp_turtle schema';
    END IF;
END
$$;
