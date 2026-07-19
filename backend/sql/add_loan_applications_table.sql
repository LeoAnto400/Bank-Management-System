CREATE TABLE IF NOT EXISTS Loan_Applications (
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

CREATE INDEX idx_loan_apps_customer_id ON Loan_Applications (customer_id);
CREATE INDEX idx_loan_apps_branch_status ON Loan_Applications (branch_id, application_status);
CREATE INDEX idx_loan_apps_linked_account ON Loan_Applications (linked_account_id);
