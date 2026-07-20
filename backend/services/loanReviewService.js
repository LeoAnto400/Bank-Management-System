const db = require('../config/db');
const { addMonthsToDate, calculateEmi } = require('../utils/loanUtils');
const { generateUniqueReference } = require('../utils/dbHelpers');

const dbPromise = db.promise();

const rejectLoanApplication = async ({ applicationId, accountantId, reviewNotes, loanType }) => {
    await dbPromise.query(
        `
            UPDATE Loan_Applications
            SET
                application_status = 'Rejected',
                review_notes = ?,
                reviewed_by = ?,
                reviewed_at = NOW()
            WHERE loan_application_id = ?
        `,
        [reviewNotes || 'Rejected during accountant review.', accountantId, applicationId]
    );

    await dbPromise.query(
        `
            INSERT INTO Audit_Logs (
                accountant_id,
                audit_action,
                target_table_name,
                target_record_id,
                old_value,
                new_value,
                audit_remarks
            )
            VALUES (?, 'Loan Rejected', 'Loan_Applications', ?, ?, ?, ?)
        `,
        [
            accountantId,
            applicationId,
            'application_status: Pending',
            'application_status: Rejected',
            reviewNotes || `Rejected ${loanType} loan request`,
        ]
    );
};

// Approves a pending application: creates the Loan, credits the linked
// account, records the disbursal transaction, and closes out the
// application + audit trail. Runs inside the caller's transaction.
const approveLoanApplication = async ({
    application,
    applicationId,
    accountantId,
    sanctionAmount,
    sanctionRate,
    reviewNotes,
}) => {
    const emiAmount = calculateEmi(sanctionAmount, sanctionRate, Number(application.tenure_months || 0));
    const disbursementDate = new Date().toISOString().slice(0, 10);
    const maturityDate = addMonthsToDate(disbursementDate, application.tenure_months);
    const nextBalance = Number(application.account_balance || 0) + sanctionAmount;
    const transactionReference = await generateUniqueReference('Transactions', 'reference_number', 'LCR');

    const [loanInsert] = await dbPromise.query(
        `
            INSERT INTO Loans (
                customer_id,
                branch_id,
                loan_type,
                principal_amount,
                annual_interest_rate,
                tenure_months,
                emi_amount,
                outstanding_amount,
                disbursement_date,
                maturity_date,
                loan_status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')
        `,
        [
            application.customer_id,
            application.branch_id,
            application.loan_type,
            sanctionAmount,
            sanctionRate,
            application.tenure_months,
            emiAmount,
            sanctionAmount,
            disbursementDate,
            maturityDate,
        ]
    );

    await dbPromise.query(
        `
            UPDATE Accounts
            SET account_balance = ?
            WHERE account_id = ?
        `,
        [nextBalance, application.linked_account_id]
    );

    await dbPromise.query(
        `
            INSERT INTO Transactions (
                account_id,
                transaction_type,
                transaction_amount,
                balance_after_txn,
                transaction_desc,
                transaction_channel,
                reference_number,
                transaction_status
            )
            VALUES (?, 'Credit', ?, ?, ?, 'Branch Counter', ?, 'Success')
        `,
        [
            application.linked_account_id,
            sanctionAmount,
            nextBalance,
            `${application.loan_type} loan disbursal`,
            transactionReference,
        ]
    );

    await dbPromise.query(
        `
            UPDATE Loan_Applications
            SET
                application_status = 'Approved',
                approved_amount = ?,
                annual_interest_rate = ?,
                estimated_emi = ?,
                review_notes = ?,
                reviewed_by = ?,
                reviewed_at = NOW(),
                created_loan_id = ?
            WHERE loan_application_id = ?
        `,
        [
            sanctionAmount,
            sanctionRate,
            emiAmount,
            reviewNotes || 'Approved by branch accountant.',
            accountantId,
            loanInsert.insertId,
            applicationId,
        ]
    );

    await dbPromise.query(
        `
            INSERT INTO Audit_Logs (
                accountant_id,
                audit_action,
                target_table_name,
                target_record_id,
                old_value,
                new_value,
                audit_remarks
            )
            VALUES (?, 'Loan Approved', 'Loans', ?, ?, ?, ?)
        `,
        [
            accountantId,
            loanInsert.insertId,
            'application_status: Pending',
            `loan_type: ${application.loan_type} amount: ${sanctionAmount.toFixed(2)} rate: ${sanctionRate.toFixed(2)}%`,
            reviewNotes || `Approved ${application.loan_type} loan application ${applicationId}`,
        ]
    );

    return {
        loanId: loanInsert.insertId,
        creditedAccountId: application.linked_account_id,
        creditedBalance: nextBalance,
    };
};

module.exports = { rejectLoanApplication, approveLoanApplication };
