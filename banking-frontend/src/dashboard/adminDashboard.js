import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiBaseUrl } from '../config/api'

export const adminTransactionTypeOptions = ['Credit', 'Debit']
export const adminTabs = [
  { id: 'cash', label: 'Dep / Withdraw' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'loans', label: 'Loans' },
  { id: 'audit', label: 'Audit Logs' },
  { id: 'customers', label: 'Customers' },
]
export const adminAccountTypeOptions = ['Savings', 'Current', 'Fixed Deposit', 'Recurring Deposit']
export const adminAccountStatusOptions = ['Active', 'Inactive', 'Frozen', 'Closed']
export const adminKycStatusOptions = ['Pending', 'Verified', 'Rejected']

const initialPasswordModalState = {
  isOpen: false,
  title: '',
  description: '',
  confirmLabel: 'Confirm',
  password: '',
  onConfirm: null,
}

export function useAdminDashboard() {
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState(null)
  const [activeTab, setActiveTab] = useState(adminTabs[0].id)
  const [transactionForm, setTransactionForm] = useState({
    account_id: '',
    transaction_type: adminTransactionTypeOptions[0],
    transaction_amount: '',
    transaction_desc: '',
  })
  const [loanReviewForms, setLoanReviewForms] = useState({})
  const [accountEditForms, setAccountEditForms] = useState({})
  const [customerEditForms, setCustomerEditForms] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmittingTransaction, setIsSubmittingTransaction] = useState(false)
  const [isReviewingLoanId, setIsReviewingLoanId] = useState(null)
  const [isUpdatingAccountId, setIsUpdatingAccountId] = useState(null)
  const [isUpdatingCustomerId, setIsUpdatingCustomerId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [passwordModal, setPasswordModal] = useState(initialPasswordModalState)

  const storedUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('bank_user') || '{}')
    } catch {
      return {}
    }
  }, [])

  const token = localStorage.getItem('token')

  const syncTransactionForm = (accounts) => {
    setTransactionForm((current) => ({
      ...current,
      account_id:
        accounts?.some((account) => String(account.account_id) === String(current.account_id))
          ? current.account_id
          : String(
              accounts?.find((account) => account.account_status === 'Active')?.account_id ||
                accounts?.[0]?.account_id ||
                ''
            ),
    }))
  }

  const syncLoanReviewForms = (applications) => {
    setLoanReviewForms((current) => {
      const next = {}

      applications?.forEach((application) => {
        const currentForm = current[String(application.loan_application_id)] || {}
        next[String(application.loan_application_id)] = {
          approved_amount:
            currentForm.approved_amount !== undefined
              ? currentForm.approved_amount
              : String(application.requested_amount || ''),
          annual_interest_rate:
            currentForm.annual_interest_rate !== undefined
              ? currentForm.annual_interest_rate
              : String(application.annual_interest_rate || ''),
          review_notes: currentForm.review_notes || '',
        }
      })

      return next
    })
  }

  const syncAccountEditForms = (accounts) => {
    setAccountEditForms((current) => {
      const next = {}

      accounts?.forEach((account) => {
        const currentForm = current[String(account.account_id)] || {}
        next[String(account.account_id)] = {
          account_type: currentForm.account_type || account.account_type || adminAccountTypeOptions[0],
          account_status:
            currentForm.account_status || account.account_status || adminAccountStatusOptions[0],
          annual_interest_rate:
            currentForm.annual_interest_rate !== undefined
              ? currentForm.annual_interest_rate
              : String(account.annual_interest_rate ?? ''),
        }
      })

      return next
    })
  }

  const syncCustomerEditForms = (customers) => {
    setCustomerEditForms((current) => {
      const next = {}

      customers?.forEach((customer) => {
        const currentForm = current[String(customer.customer_id)] || {}
        next[String(customer.customer_id)] = {
          first_name: currentForm.first_name || customer.first_name || '',
          last_name: currentForm.last_name || customer.last_name || '',
          customer_phone: currentForm.customer_phone || customer.customer_phone || '',
          customer_email: currentForm.customer_email || customer.customer_email || '',
          customer_address: currentForm.customer_address || customer.customer_address || '',
          customer_city: currentForm.customer_city || customer.customer_city || '',
          customer_state: currentForm.customer_state || customer.customer_state || '',
          pincode: currentForm.pincode || customer.pincode || '',
          kyc_status: currentForm.kyc_status || customer.kyc_status || adminKycStatusOptions[0],
        }
      })

      return next
    })
  }

  const loadDashboard = async () => {
    if (!token) {
      navigate('/admin-login')
      return
    }

    if (storedUser?.user_role && storedUser.user_role !== 'admin') {
      setIsLoading(false)
      setError('This dashboard is restricted to admin logins. Please sign in as an accountant.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`${apiBaseUrl}/admin/me/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || 'Failed to load the admin dashboard.')
      }

      setDashboard(data)
      syncTransactionForm(data.accounts)
      syncLoanReviewForms(data.pending_loan_applications)
      syncAccountEditForms(data.accounts)
      syncCustomerEditForms(data.customers)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Something went wrong while loading the admin dashboard.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('bank_user')
    navigate('/admin-login')
  }

  const openPasswordModal = ({ title, description, confirmLabel, onConfirm }) => {
    setPasswordModal({
      isOpen: true,
      title,
      description,
      confirmLabel,
      password: '',
      onConfirm,
    })
  }

  const closePasswordModal = () => {
    setPasswordModal(initialPasswordModalState)
  }

  const handlePasswordChange = (value) => {
    setPasswordModal((current) => ({
      ...current,
      password: value,
    }))
  }

  const handlePasswordModalConfirm = async () => {
    if (!passwordModal.password.trim()) {
      setError('Password confirmation is required to continue.')
      return
    }

    const submitAction = passwordModal.onConfirm

    if (!submitAction) {
      return
    }

    const didSucceed = await submitAction(passwordModal.password)

    if (didSucceed) {
      closePasswordModal()
    }
  }

  const handleTransactionFormChange = (event) => {
    const { name, value } = event.target
    setTransactionForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const submitCounterTransaction = async (confirmPassword) => {
    setIsSubmittingTransaction(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(
        `${apiBaseUrl}/admin/accounts/${Number(transactionForm.account_id)}/counter-transaction`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            transaction_type: transactionForm.transaction_type,
            transaction_amount:
              transactionForm.transaction_amount === ''
                ? 0
                : Number(transactionForm.transaction_amount),
            transaction_desc: transactionForm.transaction_desc,
            confirm_password: confirmPassword,
          }),
        }
      )

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || 'Failed to record the counter transaction.')
      }

      setSuccess(data.message || 'Counter transaction recorded successfully.')
      setTransactionForm((current) => ({
        ...current,
        transaction_amount: '',
        transaction_desc: '',
      }))
      await loadDashboard()
      return true
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Something went wrong while recording the counter transaction.'
      )
      return false
    } finally {
      setIsSubmittingTransaction(false)
    }
  }

  const handleTransactionSubmit = async (event) => {
    event.preventDefault()
    setError('')
    openPasswordModal({
      title:
        transactionForm.transaction_type === 'Credit'
          ? 'Confirm cash deposit'
          : 'Confirm cash withdrawal',
      description: 'Enter your accountant password to complete this branch counter transaction.',
      confirmLabel:
        transactionForm.transaction_type === 'Credit' ? 'Confirm Deposit' : 'Confirm Withdrawal',
      onConfirm: submitCounterTransaction,
    })
  }

  const handleLoanReviewFieldChange = (applicationId, event) => {
    const { name, value } = event.target

    setLoanReviewForms((current) => ({
      ...current,
      [String(applicationId)]: {
        ...current[String(applicationId)],
        [name]: value,
      },
    }))
  }

  const submitLoanReview = async (applicationId, action, confirmPassword) => {
    const form = loanReviewForms[String(applicationId)] || {}

    setIsReviewingLoanId(applicationId)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${apiBaseUrl}/admin/loan-applications/${applicationId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          approved_amount:
            form.approved_amount === '' || form.approved_amount === undefined
              ? ''
              : Number(form.approved_amount),
          annual_interest_rate:
            form.annual_interest_rate === '' || form.annual_interest_rate === undefined
              ? ''
              : Number(form.annual_interest_rate),
          review_notes: form.review_notes || '',
          confirm_password: confirmPassword,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || 'Failed to review the loan application.')
      }

      setSuccess(data.message || 'Loan application reviewed successfully.')
      await loadDashboard()
      return true
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Something went wrong while reviewing the loan application.'
      )
      return false
    } finally {
      setIsReviewingLoanId(null)
    }
  }

  const handleLoanReviewAction = async (applicationId, action) => {
    setError('')
    openPasswordModal({
      title: action === 'approve' ? 'Approve loan request' : 'Reject loan request',
      description: `Enter your accountant password to ${action === 'approve' ? 'approve' : 'reject'} this loan application.`,
      confirmLabel: action === 'approve' ? 'Approve Loan' : 'Reject Loan',
      onConfirm: (confirmPassword) => submitLoanReview(applicationId, action, confirmPassword),
    })
  }

  const handleAccountEditFieldChange = (accountId, event) => {
    const { name, value } = event.target

    setAccountEditForms((current) => ({
      ...current,
      [String(accountId)]: {
        ...current[String(accountId)],
        [name]: value,
      },
    }))
  }

  const handleCustomerEditFieldChange = (customerId, event) => {
    const { name, value } = event.target

    setCustomerEditForms((current) => ({
      ...current,
      [String(customerId)]: {
        ...current[String(customerId)],
        [name]: value,
      },
    }))
  }

  const submitAccountUpdate = async (accountId, confirmPassword) => {
    const form = accountEditForms[String(accountId)] || {}

    setIsUpdatingAccountId(accountId)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${apiBaseUrl}/admin/accounts/${accountId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          account_type: form.account_type,
          account_status: form.account_status,
          annual_interest_rate:
            form.annual_interest_rate === '' || form.annual_interest_rate === undefined
              ? ''
              : Number(form.annual_interest_rate),
          confirm_password: confirmPassword,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update the account.')
      }

      setSuccess(data.message || 'Account details updated successfully.')
      await loadDashboard()
      return true
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Something went wrong while updating the account.'
      )
      return false
    } finally {
      setIsUpdatingAccountId(null)
    }
  }

  const handleAccountUpdate = async (accountId) => {
    setError('')
    openPasswordModal({
      title: 'Save account changes',
      description: 'Enter your accountant password to update this branch account.',
      confirmLabel: 'Save Account',
      onConfirm: (confirmPassword) => submitAccountUpdate(accountId, confirmPassword),
    })
  }

  const submitCustomerUpdate = async (customerId, confirmPassword) => {
    const form = customerEditForms[String(customerId)] || {}

    setIsUpdatingCustomerId(customerId)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${apiBaseUrl}/admin/customers/${customerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          confirm_password: confirmPassword,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update the customer.')
      }

      setSuccess(data.message || 'Customer details updated successfully.')
      await loadDashboard()
      return true
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Something went wrong while updating the customer.'
      )
      return false
    } finally {
      setIsUpdatingCustomerId(null)
    }
  }

  const handleCustomerUpdate = async (customerId) => {
    setError('')
    openPasswordModal({
      title: 'Save customer changes',
      description: 'Enter your accountant password to update this customer record.',
      confirmLabel: 'Save Customer',
      onConfirm: (confirmPassword) => submitCustomerUpdate(customerId, confirmPassword),
    })
  }

  return {
    activeTab,
    dashboard,
    transactionForm,
    loanReviewForms,
    accountEditForms,
    customerEditForms,
    isLoading,
    isSubmittingTransaction,
    isReviewingLoanId,
    isUpdatingAccountId,
    isUpdatingCustomerId,
    passwordModal,
    error,
    success,
    storedUser,
    setActiveTab,
    handleLogout,
    handleTransactionFormChange,
    handleTransactionSubmit,
    handleLoanReviewFieldChange,
    handleLoanReviewAction,
    handleAccountEditFieldChange,
    handleCustomerEditFieldChange,
    handleAccountUpdate,
    handleCustomerUpdate,
    handlePasswordChange,
    handlePasswordModalConfirm,
    closePasswordModal,
  }
}
