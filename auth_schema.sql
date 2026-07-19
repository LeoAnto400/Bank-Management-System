CREATE TABLE Customer_Login (
    customer_login_id   INT AUTO_INCREMENT PRIMARY KEY,

    customer_id         INT NOT NULL,

    password_hash       VARCHAR(255) NOT NULL,

    is_active           TINYINT NOT NULL DEFAULT 1,
    last_login          DATETIME NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_customer_login_customer
        FOREIGN KEY (customer_id)
        REFERENCES Customers(customer_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT uq_customer_login_customer
        UNIQUE (customer_id)
) ENGINE = InnoDB;


CREATE TABLE Admin_Login (
    admin_login_id      INT AUTO_INCREMENT PRIMARY KEY,

    accountant_id       INT NOT NULL,

    password_hash       VARCHAR(255) NOT NULL,

    is_active           TINYINT NOT NULL DEFAULT 1,
    last_login          DATETIME NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_admin_login_accountant
        FOREIGN KEY (accountant_id)
        REFERENCES Accountants(accountant_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT uq_admin_login_accountant
        UNIQUE (accountant_id)
) ENGINE = InnoDB;


CREATE TABLE Login_Attempts (
    login_attempt_id    INT AUTO_INCREMENT PRIMARY KEY,

    customer_id         INT NULL,
    accountant_id       INT NULL,

    login_role          ENUM('customer','admin') NOT NULL,
    login_identifier    VARCHAR(120) NOT NULL,
    ip_address          VARCHAR(45) NULL,
    attempt_status      ENUM('Success','Failed') NOT NULL,
    failure_reason      VARCHAR(255) NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_login_attempts_customer
        FOREIGN KEY (customer_id)
        REFERENCES Customers(customer_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_login_attempts_accountant
        FOREIGN KEY (accountant_id)
        REFERENCES Accountants(accountant_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE = InnoDB;

CREATE INDEX idx_login_attempts_customer_status_time
    ON Login_Attempts (customer_id, attempt_status, created_at);

CREATE INDEX idx_login_attempts_admin_status_time
    ON Login_Attempts (accountant_id, attempt_status, created_at);


INSERT INTO Customer_Login (customer_id, password_hash)
SELECT customer_id,
       SHA2(CONCAT('Cust@', customer_id), 256)
FROM Customers;

INSERT INTO Admin_Login (accountant_id, password_hash)
SELECT accountant_id,
       SHA2(CONCAT('Admin@', accountant_id), 256)
FROM Accountants;


DELIMITER $$

CREATE TRIGGER trg_flag_multiple_failed_logins
AFTER INSERT ON Login_Attempts
FOR EACH ROW
BEGIN
    DECLARE fail_count INT DEFAULT 0;
    DECLARE recent_log_id INT DEFAULT NULL;
    DECLARE primary_account_id INT DEFAULT NULL;

    IF NEW.login_role = 'customer'
       AND NEW.attempt_status = 'Failed'
       AND NEW.customer_id IS NOT NULL THEN
        SELECT COUNT(*)
        INTO fail_count
        FROM Login_Attempts la
        WHERE la.customer_id = NEW.customer_id
          AND la.login_role = 'customer'
          AND la.attempt_status = 'Failed'
          AND la.created_at >= DATE_SUB(NEW.created_at, INTERVAL 30 MINUTE);

        SELECT a.account_id
        INTO primary_account_id
        FROM Accounts a
        WHERE a.customer_id = NEW.customer_id
        ORDER BY a.opened_date DESC, a.account_id DESC
        LIMIT 1;

        SELECT fl.fraud_log_id
        INTO recent_log_id
        FROM Fraud_Logs fl
        WHERE fl.account_id = primary_account_id
          AND fl.fraud_category = 'Multiple Failed Attempts'
          AND fl.detected_at >= DATE_SUB(NEW.created_at, INTERVAL 30 MINUTE)
        ORDER BY fl.detected_at DESC
        LIMIT 1;

        IF fail_count >= 3
           AND primary_account_id IS NOT NULL
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
                NULL,
                NULL,
                primary_account_id,
                'Multiple Failed Attempts',
                72,
                'High',
                CONCAT(
                    'Auto-flagged: ',
                    fail_count,
                    ' failed customer login attempts were detected within 30 minutes for customer_id ',
                    NEW.customer_id,
                    ' from identifier ',
                    NEW.login_identifier,
                    '.'
                ),
                0,
                'Flagged',
                NOW()
            );
        END IF;
    END IF;
END$$

CREATE TRIGGER trg_flag_account_takeover_after_success
AFTER INSERT ON Login_Attempts
FOR EACH ROW
BEGIN
    DECLARE fail_count INT DEFAULT 0;
    DECLARE recent_log_id INT DEFAULT NULL;
    DECLARE primary_account_id INT DEFAULT NULL;

    IF NEW.login_role = 'customer'
       AND NEW.attempt_status = 'Success'
       AND NEW.customer_id IS NOT NULL THEN
        SELECT COUNT(*)
        INTO fail_count
        FROM Login_Attempts la
        WHERE la.customer_id = NEW.customer_id
          AND la.login_role = 'customer'
          AND la.attempt_status = 'Failed'
          AND la.created_at >= DATE_SUB(NEW.created_at, INTERVAL 30 MINUTE);

        SELECT a.account_id
        INTO primary_account_id
        FROM Accounts a
        WHERE a.customer_id = NEW.customer_id
        ORDER BY a.opened_date DESC, a.account_id DESC
        LIMIT 1;

        SELECT fl.fraud_log_id
        INTO recent_log_id
        FROM Fraud_Logs fl
        WHERE fl.account_id = primary_account_id
          AND fl.fraud_category = 'Account Takeover'
          AND fl.detected_at >= DATE_SUB(NEW.created_at, INTERVAL 30 MINUTE)
        ORDER BY fl.detected_at DESC
        LIMIT 1;

        IF fail_count >= 3
           AND primary_account_id IS NOT NULL
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
                NULL,
                NULL,
                primary_account_id,
                'Account Takeover',
                85,
                'Critical',
                CONCAT(
                    'Auto-flagged: successful customer login after ',
                    fail_count,
                    ' recent failed attempts for customer_id ',
                    NEW.customer_id,
                    '. Possible account takeover.'
                ),
                0,
                'Blocked',
                NOW()
            );
        END IF;
    END IF;
END$$

DELIMITER ;

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
