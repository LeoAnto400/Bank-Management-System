
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- ────────────────────────────────────────────────────────────────
--  DATABASE
-- ────────────────────────────────────────────────────────────────
DROP DATABASE IF EXISTS financial_system;

CREATE DATABASE financial_system
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE financial_system;


-- ================================================================
--  SECTION 1 — TABLE DEFINITIONS
--  Order: Branches → Customers → Accountants → Accounts →
--         Transactions → Transfers → Cards → Loans →
--         Loan_Payments → Audit_Logs → Fraud_Logs
-- ================================================================

-- ────────────────────────────────────────────────────────────────
--  TABLE 1 : Branches
-- ────────────────────────────────────────────────────────────────
CREATE TABLE Branches (
    branch_id           INT             NOT NULL AUTO_INCREMENT,
    branch_name         VARCHAR(120)    NOT NULL,
    branch_city         VARCHAR(80)     NOT NULL,
    branch_state        VARCHAR(80)     NOT NULL,
    branch_address      VARCHAR(300)    NOT NULL,
    ifsc_code           CHAR(11)        NOT NULL,           -- strict 11-char RBI format e.g. SBIN0001101
    branch_phone        VARCHAR(15)     NOT NULL,
    branch_email        VARCHAR(120)    NOT NULL,
    created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_branches          PRIMARY KEY (branch_id),
    CONSTRAINT uq_branches_ifsc     UNIQUE (ifsc_code),
    CONSTRAINT uq_branches_email    UNIQUE (branch_email)
) ENGINE = InnoDB;


-- ────────────────────────────────────────────────────────────────
--  TABLE 2 : Customers
-- ────────────────────────────────────────────────────────────────
CREATE TABLE Customers (
    customer_id         INT             NOT NULL AUTO_INCREMENT,
    first_name          VARCHAR(60)     NOT NULL,
    last_name           VARCHAR(60)     NOT NULL,
    date_of_birth       DATE            NOT NULL,
    gender              ENUM('Male','Female','Other')                    NOT NULL,
    pan_number          CHAR(10)        NOT NULL,           -- e.g. ABCDE1234F
    aadhaar_number      CHAR(12)        NOT NULL,
    customer_phone      VARCHAR(15)     NOT NULL,
    customer_email      VARCHAR(120)    NOT NULL,
    customer_address    VARCHAR(300)    NOT NULL,
    customer_city       VARCHAR(80)     NOT NULL,
    customer_state      VARCHAR(80)     NOT NULL,
    pincode             CHAR(6)         NOT NULL,
    kyc_status          ENUM('Pending','Verified','Rejected')            NOT NULL DEFAULT 'Pending',
    created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_customers             PRIMARY KEY (customer_id),
    CONSTRAINT uq_customers_pan         UNIQUE (pan_number),
    CONSTRAINT uq_customers_aadhaar     UNIQUE (aadhaar_number),
    CONSTRAINT uq_customers_email       UNIQUE (customer_email)
) ENGINE = InnoDB;


-- ────────────────────────────────────────────────────────────────
--  TABLE 3 : Accountants
--  FIX: TINYINT(1) → TINYINT  (removes Warning 1681)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE Accountants (
    accountant_id       INT             NOT NULL AUTO_INCREMENT,
    branch_id           INT             NOT NULL,
    first_name          VARCHAR(60)     NOT NULL,
    last_name           VARCHAR(60)     NOT NULL,
    employee_code       VARCHAR(15)     NOT NULL,
    employee_role       ENUM(                                            -- FIX: "role" → "employee_role"
                            'Junior Accountant',
                            'Senior Accountant',
                            'Branch Manager',
                            'Audit Officer',
                            'Compliance Officer'
                        )               NOT NULL,
    accountant_phone    VARCHAR(15)     NOT NULL,
    accountant_email    VARCHAR(120)    NOT NULL,
    joining_date        DATE            NOT NULL,
    is_active           TINYINT         NOT NULL DEFAULT 1,              -- FIX: was TINYINT(1)
    created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_accountants           PRIMARY KEY (accountant_id),
    CONSTRAINT uq_accountants_code      UNIQUE (employee_code),
    CONSTRAINT uq_accountants_email     UNIQUE (accountant_email),
    CONSTRAINT fk_accountants_branch    FOREIGN KEY (branch_id)
        REFERENCES Branches (branch_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB;


-- ────────────────────────────────────────────────────────────────
--  TABLE 4 : Accounts
-- ────────────────────────────────────────────────────────────────
CREATE TABLE Accounts (
    account_id           INT             NOT NULL AUTO_INCREMENT,
    account_number       VARCHAR(20)     NOT NULL,
    customer_id          INT             NOT NULL,
    branch_id            INT             NOT NULL,
    account_type         ENUM(
                             'Savings',
                             'Current',
                             'Fixed Deposit',
                             'Recurring Deposit'
                         )               NOT NULL,
    account_balance      DECIMAL(15,2)   NOT NULL DEFAULT 0.00,
    account_currency     CHAR(3)         NOT NULL DEFAULT 'INR',
    account_status       ENUM('Active','Inactive','Frozen','Closed')     NOT NULL DEFAULT 'Active',
    opened_date          DATE            NOT NULL,
    closed_date          DATE            NULL,
    annual_interest_rate DECIMAL(5,2)    NULL,
    created_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_accounts              PRIMARY KEY (account_id),
    CONSTRAINT uq_accounts_number       UNIQUE (account_number),
    CONSTRAINT fk_accounts_customer     FOREIGN KEY (customer_id)
        REFERENCES Customers (customer_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_accounts_branch       FOREIGN KEY (branch_id)
        REFERENCES Branches  (branch_id)   ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_accounts_balance     CHECK (account_balance >= 0)
) ENGINE = InnoDB;


-- ────────────────────────────────────────────────────────────────
--  TABLE 5 : Transactions
--  FIX: Table renamed from "Transaction" (MySQL reserved word)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE Transactions (
    transaction_id       INT             NOT NULL AUTO_INCREMENT,
    account_id           INT             NOT NULL,
    transaction_type     ENUM('Credit','Debit')                          NOT NULL,
    transaction_amount   DECIMAL(15,2)   NOT NULL,
    balance_after_txn    DECIMAL(15,2)   NOT NULL,
    transaction_desc     VARCHAR(255)    NOT NULL,
    transaction_channel  ENUM(
                             'ATM',
                             'Online Banking',
                             'Branch Counter',
                             'POS Terminal',
                             'UPI',
                             'NEFT',
                             'RTGS',
                             'IMPS'
                         )               NOT NULL,
    reference_number     VARCHAR(30)     NOT NULL,
    transaction_status   ENUM('Success','Failed','Pending','Reversed')   NOT NULL DEFAULT 'Success',
    transaction_date     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_transactions          PRIMARY KEY (transaction_id),
    CONSTRAINT uq_transactions_ref      UNIQUE (reference_number),
    CONSTRAINT fk_transactions_account  FOREIGN KEY (account_id)
        REFERENCES Accounts (account_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_transactions_amount  CHECK (transaction_amount > 0)
) ENGINE = InnoDB;


-- ────────────────────────────────────────────────────────────────
--  TABLE 6 : Transfers
--  FIX: Removed CHECK (sender_account_id <> receiver_account_id)
--       MySQL 8.0 Error 3823 — CHECK constraints cannot reference FK columns.
--       Enforcement moved to triggers trg_transfers_no_self_insert /
--       trg_transfers_no_self_update (created in Section 3).
-- ────────────────────────────────────────────────────────────────
CREATE TABLE Transfers (
    transfer_id             INT             NOT NULL AUTO_INCREMENT,
    sender_account_id       INT             NOT NULL,
    receiver_account_id     INT             NOT NULL,
    transfer_amount         DECIMAL(15,2)   NOT NULL,
    transfer_mode           ENUM('NEFT','RTGS','IMPS','UPI','Internal')  NOT NULL,
    reference_number        VARCHAR(30)     NOT NULL,
    transfer_remarks        VARCHAR(255)    NULL,
    transfer_status         ENUM('Success','Failed','Pending','Reversed') NOT NULL DEFAULT 'Success',
    initiated_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at            DATETIME        NULL,

    CONSTRAINT pk_transfers             PRIMARY KEY (transfer_id),
    CONSTRAINT uq_transfers_ref         UNIQUE (reference_number),
    CONSTRAINT fk_transfers_sender      FOREIGN KEY (sender_account_id)
        REFERENCES Accounts (account_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_transfers_receiver    FOREIGN KEY (receiver_account_id)
        REFERENCES Accounts (account_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    -- NOTE: sender ≠ receiver enforced by triggers, NOT a CHECK constraint
    CONSTRAINT chk_transfers_amount     CHECK (transfer_amount > 0)
) ENGINE = InnoDB;


-- ────────────────────────────────────────────────────────────────
--  TABLE 7 : Cards
-- ────────────────────────────────────────────────────────────────
CREATE TABLE Cards (
    card_id              INT             NOT NULL AUTO_INCREMENT,
    account_id           INT             NOT NULL,
    card_number          CHAR(16)        NOT NULL,
    card_type            ENUM('Debit','Credit')                          NOT NULL,
    card_network         ENUM('Visa','MasterCard','RuPay','Amex')        NOT NULL DEFAULT 'RuPay',
    card_holder_name     VARCHAR(100)    NOT NULL,
    issue_date           DATE            NOT NULL,
    expiry_date          DATE            NOT NULL,
    cvv_hash             VARCHAR(64)     NOT NULL,           -- stored as SHA-256 hash
    credit_limit         DECIMAL(15,2)   NULL,               -- NULL for Debit cards
    outstanding_amount   DECIMAL(15,2)   NOT NULL DEFAULT 0.00,
    card_status          ENUM('Active','Blocked','Expired','Cancelled')  NOT NULL DEFAULT 'Active',
    created_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_cards                 PRIMARY KEY (card_id),
    CONSTRAINT uq_cards_number          UNIQUE (card_number),
    CONSTRAINT fk_cards_account         FOREIGN KEY (account_id)
        REFERENCES Accounts (account_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_cards_expiry         CHECK (expiry_date > issue_date)
) ENGINE = InnoDB;


-- ────────────────────────────────────────────────────────────────
--  TABLE 8 : Loan_Applications
-- ────────────────────────────────────────────────────────────────
CREATE TABLE Loan_Applications (
    loan_application_id  INT             NOT NULL AUTO_INCREMENT,
    customer_id          INT             NOT NULL,
    branch_id            INT             NOT NULL,
    linked_account_id    INT             NOT NULL,
    loan_type            ENUM(
                             'Home',
                             'Personal',
                             'Auto',
                             'Education',
                             'Gold',
                             'Business'
                         )               NOT NULL,
    requested_amount     DECIMAL(15,2)   NOT NULL,
    approved_amount      DECIMAL(15,2)   NULL,
    annual_interest_rate DECIMAL(5,2)    NOT NULL,
    tenure_months        SMALLINT        NOT NULL,
    estimated_emi        DECIMAL(15,2)   NOT NULL,
    purpose              VARCHAR(255)    NOT NULL,
    application_status   ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
    review_notes         VARCHAR(255)    NULL,
    reviewed_by          INT             NULL,
    reviewed_at          DATETIME        NULL,
    created_loan_id      INT             NULL,
    created_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_loan_applications         PRIMARY KEY (loan_application_id),
    CONSTRAINT fk_loan_apps_customer        FOREIGN KEY (customer_id)
        REFERENCES Customers (customer_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_loan_apps_branch          FOREIGN KEY (branch_id)
        REFERENCES Branches  (branch_id)   ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_loan_apps_account         FOREIGN KEY (linked_account_id)
        REFERENCES Accounts  (account_id)  ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_loan_apps_reviewer        FOREIGN KEY (reviewed_by)
        REFERENCES Accountants (accountant_id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_loan_apps_created_loan    FOREIGN KEY (created_loan_id)
        REFERENCES Loans (loan_id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_loan_apps_requested      CHECK (requested_amount > 0),
    CONSTRAINT chk_loan_apps_approved       CHECK (approved_amount IS NULL OR approved_amount > 0),
    CONSTRAINT chk_loan_apps_tenure         CHECK (tenure_months > 0),
    CONSTRAINT chk_loan_apps_estimated_emi  CHECK (estimated_emi > 0)
) ENGINE = InnoDB;


-- ----------------------------------------------------------------
--  TABLE 9 : Loans
-- ----------------------------------------------------------------
CREATE TABLE Loans (
    loan_id              INT             NOT NULL AUTO_INCREMENT,
    customer_id          INT             NOT NULL,
    branch_id            INT             NOT NULL,
    loan_type            ENUM(
                             'Home',
                             'Personal',
                             'Auto',
                             'Education',
                             'Gold',
                             'Business'
                         )               NOT NULL,
    principal_amount     DECIMAL(15,2)   NOT NULL,
    annual_interest_rate DECIMAL(5,2)    NOT NULL,
    tenure_months        SMALLINT        NOT NULL,
    emi_amount           DECIMAL(15,2)   NOT NULL,
    outstanding_amount   DECIMAL(15,2)   NOT NULL,
    disbursement_date    DATE            NOT NULL,
    maturity_date        DATE            NOT NULL,
    loan_status          ENUM('Active','Closed','Defaulted','Under Review') NOT NULL DEFAULT 'Active',
    created_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_loans                 PRIMARY KEY (loan_id),
    CONSTRAINT fk_loans_customer        FOREIGN KEY (customer_id)
        REFERENCES Customers (customer_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_loans_branch          FOREIGN KEY (branch_id)
        REFERENCES Branches  (branch_id)   ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_loans_maturity       CHECK (maturity_date > disbursement_date),
    CONSTRAINT chk_loans_principal      CHECK (principal_amount > 0)
) ENGINE = InnoDB;


-- ────────────────────────────────────────────────────────────────
--  TABLE 9 : Loan_Payments
-- ────────────────────────────────────────────────────────────────
CREATE TABLE Loan_Payments (
    payment_id           INT             NOT NULL AUTO_INCREMENT,
    loan_id              INT             NOT NULL,
    payment_date         DATE            NOT NULL,
    amount_paid          DECIMAL(15,2)   NOT NULL,
    principal_component  DECIMAL(15,2)   NOT NULL,
    interest_component   DECIMAL(15,2)   NOT NULL,
    penalty_amount       DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    payment_method       ENUM(
                             'Online Banking',
                             'Branch Counter',
                             'Auto-Debit',
                             'Cheque'
                         )               NOT NULL,
    reference_number     VARCHAR(30)     NOT NULL,
    payment_status       ENUM('Success','Failed','Pending')              NOT NULL DEFAULT 'Success',
    created_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_loan_payments         PRIMARY KEY (payment_id),
    CONSTRAINT uq_loan_payments_ref     UNIQUE (reference_number),
    CONSTRAINT fk_loan_payments_loan    FOREIGN KEY (loan_id)
        REFERENCES Loans (loan_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_lp_amount            CHECK (amount_paid > 0)
) ENGINE = InnoDB;


-- ────────────────────────────────────────────────────────────────
--  TABLE 10 : Audit_Logs
-- ────────────────────────────────────────────────────────────────
CREATE TABLE Audit_Logs (
    audit_log_id         INT             NOT NULL AUTO_INCREMENT,
    accountant_id        INT             NOT NULL,
    audit_action         VARCHAR(100)    NOT NULL,
    target_table_name    VARCHAR(60)     NOT NULL,
    target_record_id     INT             NOT NULL,
    old_value            TEXT            NULL,
    new_value            TEXT            NULL,
    ip_address           VARCHAR(45)     NULL,               -- supports IPv4 and IPv6
    audit_remarks        VARCHAR(255)    NULL,
    performed_at         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_audit_logs            PRIMARY KEY (audit_log_id),
    CONSTRAINT fk_audit_logs_accountant FOREIGN KEY (accountant_id)
        REFERENCES Accountants (accountant_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB;


-- ────────────────────────────────────────────────────────────────
--  TABLE 11 : Fraud_Logs
--  FIX: TINYINT(1) → TINYINT  (removes Warning 1681)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE Fraud_Logs (
    fraud_log_id         INT              NOT NULL AUTO_INCREMENT,
    transaction_id       INT              NULL,
    transfer_id          INT              NULL,
    account_id           INT              NOT NULL,
    fraud_category       ENUM(
                             'High Value Transaction',
                             'Rapid Transactions',
                             'Suspicious Transfer',
                             'Card Skimming',
                             'Unusual Location',
                             'Multiple Failed Attempts',
                             'Round-Tripping',
                             'Account Takeover'
                         )                NOT NULL,
    risk_score           TINYINT UNSIGNED NOT NULL,          -- 0 – 100
    fraud_severity       ENUM('Low','Medium','High','Critical')          NOT NULL,
    fraud_description    VARCHAR(500)     NOT NULL,
    is_confirmed_fraud   TINYINT          NOT NULL DEFAULT 0,-- FIX: was TINYINT(1)
    action_taken         ENUM(
                             'Flagged',
                             'Blocked',
                             'Under Review',
                             'Cleared',
                             'Reported to RBI'
                         )                NOT NULL DEFAULT 'Flagged',
    detected_at          DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at          DATETIME         NULL,

    CONSTRAINT pk_fraud_logs            PRIMARY KEY (fraud_log_id),
    CONSTRAINT fk_fraud_logs_txn        FOREIGN KEY (transaction_id)
        REFERENCES Transactions (transaction_id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_fraud_logs_transfer   FOREIGN KEY (transfer_id)
        REFERENCES Transfers    (transfer_id)    ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_fraud_logs_account    FOREIGN KEY (account_id)
        REFERENCES Accounts     (account_id)     ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_fraud_risk_score     CHECK (risk_score BETWEEN 0 AND 100)
) ENGINE = InnoDB;


-- ================================================================
--  SECTION 2 — INDEXES
-- ================================================================

-- Transactions
CREATE INDEX idx_transactions_account_id    ON Transactions (account_id);
CREATE INDEX idx_transactions_date          ON Transactions (transaction_date);
CREATE INDEX idx_transactions_status        ON Transactions (transaction_status);

-- Transfers
CREATE INDEX idx_transfers_sender           ON Transfers (sender_account_id);
CREATE INDEX idx_transfers_receiver         ON Transfers (receiver_account_id);
CREATE INDEX idx_transfers_initiated_at     ON Transfers (initiated_at);

-- Fraud_Logs
CREATE INDEX idx_fraud_logs_account_id      ON Fraud_Logs (account_id);
CREATE INDEX idx_fraud_logs_detected_at     ON Fraud_Logs (detected_at);
CREATE INDEX idx_fraud_logs_severity        ON Fraud_Logs (fraud_severity);

-- Loan_Applications
CREATE INDEX idx_loan_apps_customer_id      ON Loan_Applications (customer_id);
CREATE INDEX idx_loan_apps_branch_status    ON Loan_Applications (branch_id, application_status);
CREATE INDEX idx_loan_apps_linked_account   ON Loan_Applications (linked_account_id);

-- Loans
CREATE INDEX idx_loans_customer_id          ON Loans (customer_id);
CREATE INDEX idx_loans_status               ON Loans (loan_status);

-- Accounts
CREATE INDEX idx_accounts_customer_id       ON Accounts (customer_id);
CREATE INDEX idx_accounts_branch_id         ON Accounts (branch_id);

-- Audit_Logs
CREATE INDEX idx_audit_logs_accountant_id   ON Audit_Logs (accountant_id);
CREATE INDEX idx_audit_logs_performed_at    ON Audit_Logs (performed_at);


-- ================================================================
--  SECTION 3 — TRIGGERS
-- ================================================================

DELIMITER $$

-- ────────────────────────────────────────────────────────────────
--  TRIGGER 1 : Auto-flag high-value transactions (> ₹50,000)
--  Fires AFTER INSERT ON Transactions
-- ────────────────────────────────────────────────────────────────
CREATE TRIGGER trg_flag_high_value_transaction
AFTER INSERT ON Transactions
FOR EACH ROW
BEGIN
    -- `NEW` is the row that was just inserted into `Transactions`.
    -- This trigger only logs the event; it does not block the transaction.
    IF NEW.transaction_amount > 50000.00 THEN
        INSERT INTO Fraud_Logs (
            transaction_id,
            transfer_id,
            account_id,
            fraud_category,
            risk_score,
            fraud_severity,
            fraud_description,
            is_confirmed_fraud,
            action_taken,
            detected_at
        ) VALUES (
            NEW.transaction_id,
            NULL,
            NEW.account_id,
            'High Value Transaction',
            80,
            'High',
            CONCAT(
                'Auto-flagged: transaction amount INR ',
                FORMAT(NEW.transaction_amount, 2),
                ' exceeds INR 50,000 threshold on account_id ',
                NEW.account_id,
                ' via ', NEW.transaction_channel,
                ' [ref: ', NEW.reference_number, ']'
            ),
            0,
            'Flagged',
            NOW()
        );
    END IF;
END$$

CREATE TRIGGER trg_flag_rapid_transactions
AFTER INSERT ON Transactions
FOR EACH ROW
BEGIN
    -- Count recent successful transactions on the same account within 10 minutes.
    DECLARE txn_count INT DEFAULT 0;
    DECLARE txn_total DECIMAL(15,2) DEFAULT 0.00;
    -- Prevent duplicate fraud logs for the same short burst window.
    DECLARE recent_log_id INT DEFAULT NULL;

    SELECT
        COUNT(*),
        COALESCE(SUM(t.transaction_amount), 0.00)
    INTO txn_count, txn_total
    FROM Transactions t
    WHERE t.account_id = NEW.account_id
      AND t.transaction_status = 'Success'
      AND t.transaction_date >= DATE_SUB(NEW.transaction_date, INTERVAL 10 MINUTE);

    SELECT fl.fraud_log_id
    INTO recent_log_id
    FROM Fraud_Logs fl
    WHERE fl.account_id = NEW.account_id
      AND fl.fraud_category = 'Rapid Transactions'
      AND fl.detected_at >= DATE_SUB(NEW.transaction_date, INTERVAL 10 MINUTE)
    ORDER BY fl.detected_at DESC
    LIMIT 1;

    -- Fraud is logged only when both count and total amount cross the threshold.
    IF txn_count >= 4 AND txn_total >= 40000.00 AND recent_log_id IS NULL THEN
        INSERT INTO Fraud_Logs (
            transaction_id,
            transfer_id,
            account_id,
            fraud_category,
            risk_score,
            fraud_severity,
            fraud_description,
            is_confirmed_fraud,
            action_taken,
            detected_at
        ) VALUES (
            NEW.transaction_id,
            NULL,
            NEW.account_id,
            'Rapid Transactions',
            78,
            'High',
            CONCAT(
                'Auto-flagged: ',
                txn_count,
                ' successful transactions worth INR ',
                FORMAT(txn_total, 2),
                ' were detected within 10 minutes on account_id ',
                NEW.account_id,
                '.'
            ),
            0,
            'Under Review',
            NOW()
        );
    END IF;
END$$

CREATE TRIGGER trg_flag_card_skimming_pattern
AFTER INSERT ON Transactions
FOR EACH ROW
BEGIN
    -- Look only at debit activity through ATM/POS channels because that best fits skimming patterns.
    DECLARE suspicious_card_count INT DEFAULT 0;
    DECLARE suspicious_card_total DECIMAL(15,2) DEFAULT 0.00;
    DECLARE recent_log_id INT DEFAULT NULL;

    IF NEW.transaction_type = 'Debit'
       AND NEW.transaction_channel IN ('POS Terminal', 'ATM') THEN
        -- Count clustered card-like debits in the last 15 minutes.
        SELECT
            COUNT(*),
            COALESCE(SUM(t.transaction_amount), 0.00)
        INTO suspicious_card_count, suspicious_card_total
        FROM Transactions t
        WHERE t.account_id = NEW.account_id
          AND t.transaction_status = 'Success'
          AND t.transaction_type = 'Debit'
          AND t.transaction_channel IN ('POS Terminal', 'ATM')
          AND t.transaction_date >= DATE_SUB(NEW.transaction_date, INTERVAL 15 MINUTE);

        -- Skip creating another skimming log if one was already raised very recently.
        SELECT fl.fraud_log_id
        INTO recent_log_id
        FROM Fraud_Logs fl
        WHERE fl.account_id = NEW.account_id
          AND fl.fraud_category = 'Card Skimming'
          AND fl.detected_at >= DATE_SUB(NEW.transaction_date, INTERVAL 15 MINUTE)
        ORDER BY fl.detected_at DESC
        LIMIT 1;

        -- If there are at least 3 suspicious debits and the total is large enough, flag it.
        IF suspicious_card_count >= 3
           AND suspicious_card_total >= 20000.00
           AND recent_log_id IS NULL THEN
            INSERT INTO Fraud_Logs (
                transaction_id,
                transfer_id,
                account_id,
                fraud_category,
                risk_score,
                fraud_severity,
                fraud_description,
                is_confirmed_fraud,
                action_taken,
                detected_at
            ) VALUES (
                NEW.transaction_id,
                NULL,
                NEW.account_id,
                'Card Skimming',
                88,
                'Critical',
                CONCAT(
                    'Auto-flagged: ',
                    suspicious_card_count,
                    ' clustered debit transactions worth INR ',
                    FORMAT(suspicious_card_total, 2),
                    ' through ',
                    NEW.transaction_channel,
                    ' indicate possible card skimming on account_id ',
                    NEW.account_id,
                    '.'
                ),
                0,
                'Blocked',
                NOW()
            );
        END IF;
    END IF;
END$$

CREATE TRIGGER trg_flag_unusual_location_transaction
AFTER INSERT ON Transactions
FOR EACH ROW
BEGIN
    -- The current schema has no latitude/longitude or country column,
    -- so this trigger infers location risk from keywords in the transaction description.
    IF LOWER(COALESCE(NEW.transaction_desc, '')) REGEXP 'international|foreign|overseas|dubai|uae|singapore|london|uk|usa|new york|sydney' THEN
        INSERT INTO Fraud_Logs (
            transaction_id,
            transfer_id,
            account_id,
            fraud_category,
            risk_score,
            fraud_severity,
            fraud_description,
            is_confirmed_fraud,
            action_taken,
            detected_at
        ) VALUES (
            NEW.transaction_id,
            NULL,
            NEW.account_id,
            'Unusual Location',
            60,
            'Medium',
            CONCAT(
                'Auto-flagged: transaction description references an unusual or overseas location [',
                NEW.transaction_desc,
                '] for account_id ',
                NEW.account_id,
                '.'
            ),
            0,
            'Flagged',
            NOW()
        );
    END IF;
END$$


-- ────────────────────────────────────────────────────────────────
--  TRIGGER 2 : Prevent self-transfer — BEFORE INSERT
--  FIX for Error 3823: replaces removed CHECK constraint on
--  sender_account_id <> receiver_account_id
-- ────────────────────────────────────────────────────────────────
CREATE TRIGGER trg_transfers_no_self_insert
BEFORE INSERT ON Transfers
FOR EACH ROW
BEGIN
    -- BEFORE trigger stops bad data before it enters the table.
    IF NEW.sender_account_id = NEW.receiver_account_id THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Transfer rejected: sender and receiver account must be different.';
    END IF;
END$$


-- ────────────────────────────────────────────────────────────────
--  TRIGGER 3 : Prevent self-transfer — BEFORE UPDATE
--  Stops any attempt to patch a transfer into a self-transfer
-- ────────────────────────────────────────────────────────────────
CREATE TRIGGER trg_transfers_no_self_update
BEFORE UPDATE ON Transfers
FOR EACH ROW
BEGIN
    -- Same protection during updates so an existing transfer cannot be changed into a self-transfer.
    IF NEW.sender_account_id = NEW.receiver_account_id THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Transfer rejected: sender and receiver account must be different.';
    END IF;
END$$

CREATE TRIGGER trg_flag_suspicious_transfer
AFTER INSERT ON Transfers
FOR EACH ROW
BEGIN
    -- Build the effective event time first because some rows may rely on `initiated_at`
    -- while completed transfers can also use `completed_at`.
    DECLARE event_hour INT DEFAULT 0;
    DECLARE effective_time DATETIME;

    SET effective_time = COALESCE(NEW.completed_at, NEW.initiated_at);
    SET event_hour = HOUR(effective_time);

    -- Flag large transfers, odd-hour transfers, or transfers with no useful remarks.
    IF NEW.transfer_status = 'Success'
       AND (
            NEW.transfer_amount >= 100000.00
            OR event_hour BETWEEN 0 AND 4
            OR CHAR_LENGTH(TRIM(COALESCE(NEW.transfer_remarks, ''))) = 0
       ) THEN
        INSERT INTO Fraud_Logs (
            transaction_id,
            transfer_id,
            account_id,
            fraud_category,
            risk_score,
            fraud_severity,
            fraud_description,
            is_confirmed_fraud,
            action_taken,
            detected_at
        ) VALUES (
            NULL,
            NEW.transfer_id,
            NEW.sender_account_id,
            'Suspicious Transfer',
            82,
            'High',
            CONCAT(
                'Auto-flagged: transfer INR ',
                FORMAT(NEW.transfer_amount, 2),
                ' from account_id ',
                NEW.sender_account_id,
                ' to account_id ',
                NEW.receiver_account_id,
                ' via ',
                NEW.transfer_mode,
                ' matched suspicious-transfer rules.'
            ),
            0,
            'Under Review',
            NOW()
        );
    END IF;
END$$

CREATE TRIGGER trg_flag_round_tripping
AFTER INSERT ON Transfers
FOR EACH ROW
BEGIN
    -- Search for a recent reverse transfer between the same two accounts.
    DECLARE reverse_transfer_id INT DEFAULT NULL;
    DECLARE reverse_amount DECIMAL(15,2) DEFAULT 0.00;

    SELECT
        t.transfer_id,
        t.transfer_amount
    INTO reverse_transfer_id, reverse_amount
    FROM Transfers t
    WHERE t.sender_account_id = NEW.receiver_account_id
      AND t.receiver_account_id = NEW.sender_account_id
      AND t.transfer_status = 'Success'
      AND t.transfer_id <> NEW.transfer_id
      AND COALESCE(t.completed_at, t.initiated_at) >= DATE_SUB(COALESCE(NEW.completed_at, NEW.initiated_at), INTERVAL 30 MINUTE)
      AND COALESCE(t.completed_at, t.initiated_at) <= COALESCE(NEW.completed_at, NEW.initiated_at)
    ORDER BY COALESCE(t.completed_at, t.initiated_at) DESC
    LIMIT 1;

    -- A near-equal reverse transfer within 30 minutes is treated as a round-tripping signal.
    IF reverse_transfer_id IS NOT NULL
       AND NEW.transfer_amount >= reverse_amount * 0.90 THEN
        INSERT INTO Fraud_Logs (
            transaction_id,
            transfer_id,
            account_id,
            fraud_category,
            risk_score,
            fraud_severity,
            fraud_description,
            is_confirmed_fraud,
            action_taken,
            detected_at
        ) VALUES (
            NULL,
            NEW.transfer_id,
            NEW.sender_account_id,
            'Round-Tripping',
            92,
            'Critical',
            CONCAT(
                'Auto-flagged: transfer_id ',
                NEW.transfer_id,
                ' appears to reverse transfer_id ',
                reverse_transfer_id,
                ' within 30 minutes, indicating round-tripping.'
            ),
            0,
            'Reported to RBI',
            NOW()
        );
    END IF;
END$$

DELIMITER ;


-- ================================================================
--  SECTION 4 — SAMPLE DATA  (FK-safe insertion order)
-- ================================================================

-- ────────────────────────────────────────────────────────────────
--  DATA 1 : Branches
-- ────────────────────────────────────────────────────────────────
INSERT INTO Branches
    (branch_name, branch_city, branch_state, branch_address, ifsc_code, branch_phone, branch_email)
VALUES
    ('MG Road Main Branch',       'Bangalore', 'Karnataka',   '12, MG Road, Bangalore 560001',                  'SBIN0001101', '08022001101', 'mgroad.blr@sbi.co.in'),
    ('Bandra West Branch',        'Mumbai',    'Maharashtra', '45, Linking Road, Bandra West, Mumbai 400050',   'HDFC0002202', '02226002202', 'bandrawest.mum@hdfc.co.in'),
    ('Connaught Place Branch',    'Delhi',     'Delhi',       '7, Connaught Place, New Delhi 110001',            'ICIC0003303', '01123003303', 'cp.del@icici.co.in'),
    ('Hitech City Branch',        'Hyderabad', 'Telangana',   '22, Cyber Towers, Hitech City, Hyderabad 500081','AXIS0004404', '04067504404', 'hitechcity.hyd@axis.co.in'),
    ('Anna Nagar Branch',         'Chennai',   'Tamil Nadu',  '5, Anna Nagar East, Chennai 600040',              'KKBK0005505', '04426005505', 'annanagar.che@kotak.co.in'),
    ('Salt Lake Sector V Branch', 'Kolkata',   'West Bengal', '34, Sector V, Salt Lake City, Kolkata 700091',    'PUNB0006606', '03323006606', 'sectorv.kol@pnb.co.in');


-- ────────────────────────────────────────────────────────────────
--  DATA 2 : Customers
-- ────────────────────────────────────────────────────────────────
INSERT INTO Customers
    (first_name, last_name, date_of_birth, gender,
     pan_number, aadhaar_number, customer_phone, customer_email,
     customer_address, customer_city, customer_state, pincode, kyc_status)
VALUES
    ('Rahul',   'Sharma',   '1990-05-14', 'Male',   'AAXPS1234A', '234512348901', '9876543210', 'rahul.sharma@gmail.com',   '101, Indira Nagar',       'Bangalore', 'Karnataka',   '560038', 'Verified'),
    ('Priya',   'Verma',    '1993-08-22', 'Female', 'BBRPV5678B', '345623459012', '9812345678', 'priya.verma@yahoo.com',    '302, Powai Heights',      'Mumbai',    'Maharashtra', '400076', 'Verified'),
    ('Arjun',   'Mehta',    '1988-03-10', 'Male',   'CCQAM9012C', '456734560123', '9845001234', 'arjun.mehta@hotmail.com',  '45, Vasant Kunj',         'Delhi',     'Delhi',       '110070', 'Verified'),
    ('Sneha',   'Reddy',    '1995-11-30', 'Female', 'DDSRE3456D', '567845671234', '9700123456', 'sneha.reddy@gmail.com',    '78, Madhapur Colony',     'Hyderabad', 'Telangana',   '500081', 'Verified'),
    ('Vikram',  'Nair',     '1985-07-19', 'Male',   'EEVKN7890E', '678956782345', '9567890123', 'vikram.nair@gmail.com',    '12, T Nagar',             'Chennai',   'Tamil Nadu',  '600017', 'Verified'),
    ('Ananya',  'Bose',     '1998-02-04', 'Female', 'FFANB2345F', '789067893456', '9432109876', 'ananya.bose@outlook.com',  '56, Lake Town',           'Kolkata',   'West Bengal', '700089', 'Verified'),
    ('Karthik', 'Iyer',     '1991-09-15', 'Male',   'GGKTI6789G', '890178904567', '9380112233', 'karthik.iyer@gmail.com',   '23, Jayanagar 4th Block', 'Bangalore', 'Karnataka',   '560011', 'Verified'),
    ('Meera',   'Pillai',   '1987-12-28', 'Female', 'HHMRP0123H', '901289015678', '9245678901', 'meera.pillai@gmail.com',   '88, Juhu Tara Road',      'Mumbai',    'Maharashtra', '400049', 'Verified'),
    ('Rohan',   'Gupta',    '1996-06-07', 'Male',   'IIROG4567I', '012390126789', '9123456789', 'rohan.gupta@gmail.com',    '33, Rajouri Garden',      'Delhi',     'Delhi',       '110027', 'Verified'),
    ('Divya',   'Krishnan', '1992-04-18', 'Female', 'JJDVK8901J', '123401237890', '9001234567', 'divya.krishnan@yahoo.com', '15, Banjara Hills',       'Hyderabad', 'Telangana',   '500034', 'Verified');


-- ────────────────────────────────────────────────────────────────
--  DATA 3 : Accountants
-- ────────────────────────────────────────────────────────────────
INSERT INTO Accountants
    (branch_id, first_name, last_name, employee_code, employee_role,
     accountant_phone, accountant_email, joining_date)
VALUES
    (1, 'Suresh',  'Rao',        'EMP10001', 'Branch Manager',     '9880001111', 'suresh.rao@sbi.co.in',        '2010-04-01'),
    (1, 'Lakshmi', 'Devi',       'EMP10002', 'Senior Accountant',  '9880002222', 'lakshmi.devi@sbi.co.in',      '2015-06-15'),
    (2, 'Deepak',  'Joshi',      'EMP10003', 'Branch Manager',     '9820003333', 'deepak.joshi@hdfc.co.in',     '2012-08-20'),
    (2, 'Pooja',   'Menon',      'EMP10004', 'Audit Officer',      '9820004444', 'pooja.menon@hdfc.co.in',      '2018-02-10'),
    (3, 'Ashok',   'Malhotra',   'EMP10005', 'Branch Manager',     '9810005555', 'ashok.malhotra@icici.co.in',  '2008-11-05'),
    (3, 'Nisha',   'Chauhan',    'EMP10006', 'Compliance Officer', '9810006666', 'nisha.chauhan@icici.co.in',   '2020-07-01'),
    (4, 'Ravi',    'Shankar',    'EMP10007', 'Senior Accountant',  '9700007777', 'ravi.shankar@axis.co.in',     '2016-03-14'),
    (5, 'Kavitha', 'Srinivasan', 'EMP10008', 'Branch Manager',     '9567008888', 'kavitha.srini@kotak.co.in',   '2013-09-22'),
    (6, 'Amit',    'Das',        'EMP10009', 'Junior Accountant',  '9432009999', 'amit.das@pnb.co.in',          '2022-01-17'),
    (6, 'Sunita',  'Ghosh',      'EMP10010', 'Senior Accountant',  '9432010000', 'sunita.ghosh@pnb.co.in',      '2017-05-30');


-- ────────────────────────────────────────────────────────────────
--  DATA 4 : Accounts
-- ────────────────────────────────────────────────────────────────
INSERT INTO Accounts
    (account_number, customer_id, branch_id, account_type,
     account_balance, opened_date, annual_interest_rate, account_status)
VALUES
    ('SBI10000000001',   1,  1, 'Savings',           185000.00, '2018-04-01', 3.50, 'Active'),
    ('HDFC20000000002',  2,  2, 'Savings',            320000.00, '2019-07-15', 3.50, 'Active'),
    ('ICIC30000000003',  3,  3, 'Current',            750000.00, '2017-11-20', 2.00, 'Active'),
    ('AXIS40000000004',  4,  4, 'Savings',             92000.00, '2020-02-10', 3.50, 'Active'),
    ('KKBK50000000005',  5,  5, 'Savings',            450000.00, '2016-08-05', 4.00, 'Active'),
    ('PUNB60000000006',  6,  6, 'Recurring Deposit',   60000.00, '2021-01-20', 6.50, 'Active'),
    ('SBI10000000007',   7,  1, 'Savings',            230000.00, '2019-03-12', 3.50, 'Active'),
    ('HDFC20000000008',  8,  2, 'Current',            980000.00, '2015-06-30', 2.00, 'Active'),
    ('ICIC30000000009',  9,  3, 'Savings',            125000.00, '2022-09-01', 3.50, 'Active'),
    ('AXIS40000000010', 10,  4, 'Fixed Deposit',      500000.00, '2020-12-15', 7.00, 'Active'),
    ('KKBK50000000011',  1,  5, 'Savings',             45000.00, '2022-03-01', 3.50, 'Active'),  -- Rahul's 2nd account
    ('ICIC30000000012',  3,  3, 'Fixed Deposit',      200000.00, '2021-05-10', 7.00, 'Active');  -- Arjun's 2nd account


-- ────────────────────────────────────────────────────────────────
--  DATA 5 : Transactions
--  Rows with transaction_amount > 50000 automatically trigger
--  trg_flag_high_value_transaction → inserts into Fraud_Logs
-- ────────────────────────────────────────────────────────────────
INSERT INTO Transactions
    (account_id, transaction_type, transaction_amount, balance_after_txn,
     transaction_desc, transaction_channel, reference_number,
     transaction_status, transaction_date)
VALUES
    -- Normal transactions
    (1,  'Credit',  50000.00,  185000.00, 'Salary credit June 2024',                 'Online Banking', 'TXN20240601001', 'Success', '2024-06-01 09:00:00'),
    (1,  'Debit',   12000.00,  173000.00, 'Electricity and rent payment',             'UPI',            'TXN20240601002', 'Success', '2024-06-03 11:30:00'),
    (2,  'Credit',  75000.00,  320000.00, 'Freelance payment received',               'NEFT',           'TXN20240601003', 'Success', '2024-06-04 14:00:00'),
    (3,  'Debit',   30000.00,  720000.00, 'Supplier payment ABC Traders',             'RTGS',           'TXN20240601004', 'Success', '2024-06-05 10:00:00'),
    (4,  'Credit',  22000.00,   92000.00, 'Salary credit June 2024',                 'Online Banking', 'TXN20240601005', 'Success', '2024-06-01 08:45:00'),
    (5,  'Debit',    5000.00,  445000.00, 'Online shopping Flipkart',                 'Online Banking', 'TXN20240601006', 'Success', '2024-06-06 16:20:00'),
    (6,  'Credit',   2000.00,   60000.00, 'RD instalment credit',                     'Online Banking', 'TXN20240601007', 'Success', '2024-06-01 09:10:00'),
    (7,  'Debit',    8000.00,  222000.00, 'ATM cash withdrawal',                      'ATM',            'TXN20240601008', 'Success', '2024-06-07 13:00:00'),
    (8,  'Credit', 150000.00,  980000.00, 'Business revenue client invoice',          'NEFT',           'TXN20240601009', 'Success', '2024-06-05 15:30:00'),  -- triggers fraud flag
    (9,  'Debit',    3500.00,  121500.00, 'Amazon purchase',                          'Online Banking', 'TXN20240601010', 'Success', '2024-06-08 19:00:00'),

    -- ⚠ Fraud Scenario A — HIGH VALUE (trigger auto-inserts into Fraud_Logs)
    (3,  'Debit',  350000.00,  370000.00, 'Large withdrawal to unknown account',      'Online Banking', 'TXN20240601011', 'Success', '2024-06-09 02:15:00'),
    (8,  'Debit',  490000.00,  490000.00, 'Bulk cash transfer unclear origin',        'RTGS',           'TXN20240601012', 'Success', '2024-06-09 02:45:00'),

    -- ⚠ Fraud Scenario B — RAPID TRANSACTIONS (card cloning pattern)
    (2,  'Debit',   15000.00,  305000.00, 'Rapid debit 1 POS terminal Mumbai-1',      'POS Terminal',   'TXN20240601013', 'Success', '2024-06-10 22:01:00'),
    (2,  'Debit',   14500.00,  290500.00, 'Rapid debit 2 POS terminal Mumbai-2',      'POS Terminal',   'TXN20240601014', 'Success', '2024-06-10 22:04:00'),
    (2,  'Debit',   14000.00,  276500.00, 'Rapid debit 3 POS terminal Mumbai-3',      'POS Terminal',   'TXN20240601015', 'Success', '2024-06-10 22:07:00'),
    (2,  'Debit',   13500.00,  263000.00, 'Rapid debit 4 POS terminal Mumbai-4',      'POS Terminal',   'TXN20240601016', 'Success', '2024-06-10 22:09:00'),

    -- Normal continued
    (10, 'Credit', 500000.00,  500000.00, 'FD deposit 1 year tenure',                 'Branch Counter', 'TXN20240601017', 'Success', '2024-06-01 10:00:00'),  -- triggers fraud flag
    (11, 'Debit',    2000.00,   43000.00, 'Swiggy order payment',                     'UPI',            'TXN20240601018', 'Success', '2024-06-09 20:00:00'),
    (12, 'Credit', 200000.00,  200000.00, 'FD deposit 2 year tenure',                 'Branch Counter', 'TXN20240601019', 'Success', '2024-06-01 10:30:00'),  -- triggers fraud flag
    (5,  'Debit',   18000.00,  427000.00, 'Monthly grocery and utilities',            'UPI',            'TXN20240601020', 'Success', '2024-06-11 09:00:00');


-- ────────────────────────────────────────────────────────────────
--  DATA 6 : Transfers
--  trg_transfers_no_self_insert enforces sender ≠ receiver
-- ────────────────────────────────────────────────────────────────
INSERT INTO Transfers
    (sender_account_id, receiver_account_id, transfer_amount, transfer_mode,
     reference_number, transfer_remarks, transfer_status, initiated_at, completed_at)
VALUES
    -- Normal transfers
    (1,  2,   25000.00, 'IMPS',     'TRF20240601001', 'Rent payment June 2024',           'Success', '2024-06-02 10:00:00', '2024-06-02 10:01:00'),
    (3,  4,   50000.00, 'NEFT',     'TRF20240601002', 'Business advance to supplier',     'Success', '2024-06-04 11:00:00', '2024-06-04 11:30:00'),
    (5,  6,    5000.00, 'UPI',      'TRF20240601003', 'Gift Ananya birthday',              'Success', '2024-06-05 18:00:00', '2024-06-05 18:01:00'),
    (7,  8,   10000.00, 'IMPS',     'TRF20240601004', 'Reimbursement for travel',         'Success', '2024-06-06 14:00:00', '2024-06-06 14:01:00'),
    (9,  10,  20000.00, 'NEFT',     'TRF20240601005', 'Loan repayment contribution',      'Success', '2024-06-07 09:00:00', '2024-06-07 09:30:00'),

    -- ⚠ Fraud Scenario C — ROUND-TRIPPING (money laundering pattern)
    (3,  11, 275000.00, 'RTGS',     'TRF20240601006', 'Fund transfer urgent',             'Success', '2024-06-09 03:10:00', '2024-06-09 03:11:00'),
    (11,  1, 270000.00, 'IMPS',     'TRF20240601007', 'Return transfer same night',       'Success', '2024-06-09 03:25:00', '2024-06-09 03:26:00'),
    (8,   2, 400000.00, 'RTGS',     'TRF20240601008', NULL,                               'Success', '2024-06-09 02:50:00', '2024-06-09 02:51:00'),

    -- Normal
    (2,   9,   8000.00, 'UPI',      'TRF20240601009', 'Shared cab expense',               'Success', '2024-06-11 08:00:00', '2024-06-11 08:01:00'),
    (6,   7,   3000.00, 'Internal', 'TRF20240601010', 'Family inter-account transfer',    'Success', '2024-06-11 12:00:00', '2024-06-11 12:01:00');


-- ────────────────────────────────────────────────────────────────
--  DATA 7 : Cards
-- ────────────────────────────────────────────────────────────────
INSERT INTO Cards
    (account_id, card_number, card_type, card_network, card_holder_name,
     issue_date, expiry_date, cvv_hash, credit_limit, outstanding_amount, card_status)
VALUES
    (1,  '4111100010001001', 'Debit',  'Visa',       'Rahul Sharma',   '2022-01-15', '2027-01-31', SHA2('879',256), NULL,       0.00,     'Active'),
    (2,  '5200200020002001', 'Credit', 'MasterCard', 'Priya Verma',    '2021-06-10', '2026-06-30', SHA2('412',256), 200000.00,  45000.00, 'Active'),
    (3,  '6521300030003001', 'Debit',  'RuPay',      'Arjun Mehta',    '2020-11-20', '2025-11-30', SHA2('556',256), NULL,       0.00,     'Active'),
    (4,  '4111400040004001', 'Debit',  'Visa',       'Sneha Reddy',    '2023-02-01', '2028-02-28', SHA2('731',256), NULL,       0.00,     'Active'),
    (5,  '5200500050005001', 'Credit', 'MasterCard', 'Vikram Nair',    '2019-08-15', '2025-08-31', SHA2('290',256), 500000.00, 180000.00, 'Active'),
    (6,  '6521600060006001', 'Debit',  'RuPay',      'Ananya Bose',    '2021-03-22', '2026-03-31', SHA2('623',256), NULL,       0.00,     'Active'),
    (7,  '4111700070007001', 'Debit',  'Visa',       'Karthik Iyer',   '2022-07-10', '2027-07-31', SHA2('187',256), NULL,       0.00,     'Active'),
    (8,  '5200800080008001', 'Credit', 'MasterCard', 'Meera Pillai',   '2020-12-05', '2025-12-31', SHA2('945',256), 750000.00, 320000.00, 'Blocked'),
    (9,  '6521900090009001', 'Debit',  'RuPay',      'Rohan Gupta',    '2023-09-01', '2028-09-30', SHA2('362',256), NULL,       0.00,     'Active'),
    (10, '4111000100010001', 'Credit', 'Amex',       'Divya Krishnan', '2021-01-20', '2026-01-31', SHA2('814',256), 300000.00,  90000.00, 'Active');


-- ────────────────────────────────────────────────────────────────
--  DATA 8 : Loans
-- ────────────────────────────────────────────────────────────────
INSERT INTO Loans
    (customer_id, branch_id, loan_type, principal_amount, annual_interest_rate,
     tenure_months, emi_amount, outstanding_amount, disbursement_date, maturity_date, loan_status)
VALUES
    (1,  1, 'Home',      3500000.00,  8.50, 240,  30406.00, 3200000.00, '2020-03-01', '2040-03-01', 'Active'),
    (2,  2, 'Personal',   500000.00, 12.00,  60,  11122.00,  380000.00, '2022-06-01', '2027-06-01', 'Active'),
    (3,  3, 'Auto',      1200000.00,  9.25,  84,  18650.00,  960000.00, '2021-09-15', '2028-09-15', 'Active'),
    (4,  4, 'Education',  800000.00, 10.50, 120,  10800.00,  720000.00, '2020-07-01', '2030-07-01', 'Active'),
    (5,  5, 'Business', 5000000.00,  11.00,  60, 108690.00, 4100000.00, '2023-01-10', '2028-01-10', 'Active'),
    (6,  6, 'Gold',       150000.00,  8.00,  24,   6785.00,  100000.00, '2023-11-01', '2025-11-01', 'Active'),
    (7,  1, 'Personal',   300000.00, 13.50,  36,  10143.00,  180000.00, '2022-04-01', '2025-04-01', 'Active'),
    (8,  2, 'Home',      6500000.00,  8.25, 300,  54200.00, 6300000.00, '2019-01-01', '2044-01-01', 'Active'),
    (9,  3, 'Auto',       700000.00,  9.75,  60,  14750.00,  490000.00, '2023-05-01', '2028-05-01', 'Active'),
    (10, 4, 'Education',  400000.00, 10.00,  60,   8491.00,  280000.00, '2022-08-01', '2027-08-01', 'Active');


-- ────────────────────────────────────────────────────────────────
--  DATA 9 : Loan_Payments
-- ────────────────────────────────────────────────────────────────
INSERT INTO Loan_Payments
    (loan_id, payment_date, amount_paid, principal_component, interest_component,
     penalty_amount, payment_method, reference_number, payment_status)
VALUES
    (1,  '2024-06-01',  30406.00,  6162.00, 24244.00,   0.00, 'Auto-Debit',     'LP20240601001', 'Success'),
    (1,  '2024-05-01',  30406.00,  6075.00, 24331.00,   0.00, 'Auto-Debit',     'LP20240501001', 'Success'),
    (2,  '2024-06-01',  11122.00,  7122.00,  4000.00,   0.00, 'Online Banking', 'LP20240601002', 'Success'),
    (3,  '2024-06-01',  18650.00, 10000.00,  8650.00,   0.00, 'Auto-Debit',     'LP20240601003', 'Success'),
    (4,  '2024-06-01',  10800.00,  3800.00,  7000.00,   0.00, 'Online Banking', 'LP20240601004', 'Success'),
    (5,  '2024-06-01', 108690.00, 70000.00, 38690.00,   0.00, 'Auto-Debit',     'LP20240601005', 'Success'),
    (6,  '2024-06-01',   6785.00,  4785.00,  2000.00,   0.00, 'Branch Counter', 'LP20240601006', 'Success'),
    (7,  '2024-06-01',  10143.00,  7000.00,  3143.00,   0.00, 'Auto-Debit',     'LP20240601007', 'Success'),
    (8,  '2024-06-01',  54200.00, 10000.00, 44200.00,   0.00, 'Online Banking', 'LP20240601008', 'Success'),
    (9,  '2024-06-01',  14750.00,  8000.00,  6750.00,   0.00, 'Auto-Debit',     'LP20240601009', 'Success'),
    (10, '2024-06-01',   8491.00,  5000.00,  3491.00,   0.00, 'Online Banking', 'LP20240601010', 'Success'),
    (2,  '2024-04-01',  11622.00,  7000.00,  4122.00, 500.00, 'Online Banking', 'LP20240401002', 'Success'),  -- late penalty
    (7,  '2024-05-01',  10393.00,  6900.00,  3243.00, 250.00, 'Branch Counter', 'LP20240501007', 'Success');  -- late penalty


-- ────────────────────────────────────────────────────────────────
--  DATA 10 : Audit_Logs
-- ────────────────────────────────────────────────────────────────
INSERT INTO Audit_Logs
    (accountant_id, audit_action, target_table_name, target_record_id,
     old_value, new_value, ip_address, audit_remarks)
VALUES
    (1, 'Account Opened',         'Accounts',  1,  NULL,                             'account_number: SBI10000000001 type: Savings',     '192.168.1.10', 'New customer onboarding'),
    (3, 'Account Opened',         'Accounts',  2,  NULL,                             'account_number: HDFC20000000002 type: Savings',    '192.168.2.10', 'New customer onboarding'),
    (5, 'Account Opened',         'Accounts',  3,  NULL,                             'account_number: ICIC30000000003 type: Current',    '192.168.3.10', 'Business account setup'),
    (5, 'Loan Approved',          'Loans',     1,  NULL,                             'loan_type: Home amount: 3500000 rate: 8.50%',      '192.168.3.11', 'Home loan sanctioned'),
    (3, 'Loan Approved',          'Loans',     2,  NULL,                             'loan_type: Personal amount: 500000 rate: 12.00%',  '192.168.2.11', 'Personal loan sanctioned'),
    (6, 'Account Status Changed', 'Accounts',  8,  'account_status: Active',         'account_status: Frozen',                           '192.168.3.20', 'Suspicious activity detected'),
    (4, 'Card Blocked',           'Cards',     8,  'card_status: Active',            'card_status: Blocked',                             '192.168.2.20', 'Card blocked due to fraud alert'),
    (6, 'Fraud Review Escalated', 'Fraud_Logs',1,  'action_taken: Flagged',          'action_taken: Under Review',                       '192.168.3.21', 'Escalated to fraud team'),
    (2, 'Customer KYC Verified',  'Customers', 5,  'kyc_status: Pending',            'kyc_status: Verified',                             '192.168.1.15', 'KYC documents verified'),
    (8, 'Interest Rate Updated',  'Accounts',  6,  'annual_interest_rate: 6.00',     'annual_interest_rate: 6.50',                       '192.168.5.10', 'RBI rate revision applied'),
    (5, 'Loan Quarterly Review',  'Loans',     5,  'loan_status: Active',            'loan_status: Active',                              '192.168.3.12', 'Routine review no change'),
    (1, 'Branch Details Updated', 'Branches',  1,  'branch_phone: 08022001100',      'branch_phone: 08022001101',                        '192.168.1.12', 'Contact number corrected');


-- ────────────────────────────────────────────────────────────────
--  DATA 11 : Fraud_Logs  (manual entries)
--  Note: High-value transactions above also auto-insert rows here
--        via trg_flag_high_value_transaction.
--        Rows below cover rapid transactions, round-tripping,
--        account takeover, and unusual location scenarios.
-- ────────────────────────────────────────────────────────────────
INSERT INTO Fraud_Logs
    (transaction_id, transfer_id, account_id, fraud_category, risk_score,
     fraud_severity, fraud_description, is_confirmed_fraud, action_taken, detected_at, resolved_at)
VALUES
    -- Rapid transaction / card cloning
    (13, NULL, 2, 'Rapid Transactions', 72, 'High',
     '4 POS debits within 8 minutes totalling INR 57000 from HDFC20000000002. Possible card cloning.',
     1, 'Blocked', '2024-06-10 22:10:00', '2024-06-11 08:00:00'),

    (14, NULL, 2, 'Card Skimming', 80, 'Critical',
     'Simultaneous POS debits across different Mumbai terminals. Card skimming highly suspected.',
     1, 'Reported to RBI', '2024-06-10 22:12:00', '2024-06-11 09:00:00'),

    -- Round-tripping money laundering
    (NULL, 6, 3, 'Suspicious Transfer', 90, 'Critical',
     'RTGS transfer of INR 275000 from business account at 03:10 AM to rarely used savings account. Round-trip pattern.',
     1, 'Reported to RBI', '2024-06-09 03:11:00', '2024-06-09 12:00:00'),

    (NULL, 7, 11, 'Round-Tripping', 88, 'Critical',
     'INR 270000 returned to originating account within 15 minutes. Classic round-trip money laundering signal.',
     1, 'Reported to RBI', '2024-06-09 03:26:00', '2024-06-09 12:00:00'),

    (NULL, 8, 8, 'Suspicious Transfer', 75, 'High',
     'Outgoing RTGS of INR 400000 from HDFC20000000008 at 02:50 AM with no remarks or known receiver relationship.',
     0, 'Under Review', '2024-06-09 02:52:00', NULL),

    -- Account takeover attempt
    (NULL, NULL, 9, 'Multiple Failed Attempts', 65, 'Medium',
     '5 failed internet banking logins on ICIC30000000009 from foreign IP 45.123.67.89. Account takeover suspected.',
     0, 'Flagged', '2024-06-08 23:45:00', NULL),

    -- Unusual location
    (NULL, NULL, 1, 'Unusual Location', 55, 'Medium',
     'Card swipe at Dubai Mall UAE POS while account holder Rahul Sharma is India-resident. Travel not pre-notified.',
     0, 'Flagged', '2024-06-07 16:30:00', NULL),

    -- Low risk — cleared
    (NULL, NULL, 5, 'High Value Transaction', 40, 'Low',
     'Business loan EMI of INR 108690 triggered threshold alert. Verified as scheduled EMI. No fraud.',
     0, 'Cleared', '2024-06-01 10:05:00', '2024-06-01 10:30:00');


-- ================================================================
--  Re-enable FK checks
-- ================================================================
SET FOREIGN_KEY_CHECKS = 1;


-- ================================================================
--  SECTION 5 — VERIFICATION QUERIES
-- ================================================================

-- 1. Row count across all 11 tables
SELECT 'Branches'      AS table_name, COUNT(*) AS row_count FROM Branches
UNION ALL SELECT 'Customers',      COUNT(*) FROM Customers
UNION ALL SELECT 'Accountants',    COUNT(*) FROM Accountants
UNION ALL SELECT 'Accounts',       COUNT(*) FROM Accounts
UNION ALL SELECT 'Transactions',   COUNT(*) FROM Transactions
UNION ALL SELECT 'Transfers',      COUNT(*) FROM Transfers
UNION ALL SELECT 'Cards',          COUNT(*) FROM Cards
UNION ALL SELECT 'Loans',          COUNT(*) FROM Loans
UNION ALL SELECT 'Loan_Payments',  COUNT(*) FROM Loan_Payments
UNION ALL SELECT 'Audit_Logs',     COUNT(*) FROM Audit_Logs
UNION ALL SELECT 'Fraud_Logs',     COUNT(*) FROM Fraud_Logs;


-- 2. All triggers registered in this schema
SELECT
    TRIGGER_NAME,
    EVENT_MANIPULATION  AS fires_on,
    ACTION_TIMING       AS timing,
    EVENT_OBJECT_TABLE  AS on_table
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA = 'financial_system'
ORDER BY TRIGGER_NAME;


-- 3. All fraud cases — auto-flagged + manual
SELECT
    fl.fraud_log_id,
    a.account_number,
    CONCAT(c.first_name, ' ', c.last_name) AS account_holder,
    fl.fraud_category,
    fl.fraud_severity,
    fl.risk_score,
    CASE WHEN fl.is_confirmed_fraud = 1 THEN 'Yes' ELSE 'No' END AS confirmed,
    fl.action_taken,
    fl.detected_at,
    fl.resolved_at
FROM Fraud_Logs fl
JOIN Accounts  a ON fl.account_id = a.account_id
JOIN Customers c ON a.customer_id = c.customer_id
ORDER BY fl.risk_score DESC;


-- 4. Customer transaction summary
SELECT
    CONCAT(c.first_name, ' ', c.last_name)                                          AS customer_name,
    a.account_number,
    a.account_type,
    SUM(CASE WHEN t.transaction_type = 'Credit' THEN t.transaction_amount ELSE 0 END) AS total_credits_inr,
    SUM(CASE WHEN t.transaction_type = 'Debit'  THEN t.transaction_amount ELSE 0 END) AS total_debits_inr,
    COUNT(t.transaction_id)                                                          AS total_transactions,
    a.account_balance                                                                AS current_balance_inr
FROM Customers    c
JOIN Accounts     a ON c.customer_id = a.customer_id
JOIN Transactions t ON a.account_id  = t.account_id
GROUP BY c.customer_id, a.account_id
ORDER BY total_debits_inr DESC;


-- 5. Loan repayment progress
SELECT
    CONCAT(c.first_name, ' ', c.last_name)                                AS customer_name,
    l.loan_type,
    l.principal_amount,
    l.outstanding_amount,
    ROUND((1 - l.outstanding_amount / l.principal_amount) * 100, 2)       AS repaid_pct,
    l.emi_amount,
    l.maturity_date,
    l.loan_status
FROM Loans     l
JOIN Customers c ON l.customer_id = c.customer_id
ORDER BY l.outstanding_amount DESC;


-- 6. Branch-wise account and loan count
SELECT
    b.branch_name,
    b.branch_city,
    b.ifsc_code,
    COUNT(DISTINCT a.account_id) AS total_accounts,
    COUNT(DISTINCT l.loan_id)    AS total_loans
FROM Branches  b
LEFT JOIN Accounts a ON b.branch_id = a.branch_id
LEFT JOIN Loans    l ON b.branch_id = l.branch_id
GROUP BY b.branch_id
ORDER BY total_accounts DESC;

show tables;
