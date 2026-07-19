import { Navigate, Route, Routes } from 'react-router-dom'
import AdminDashboardPage from './pages/AdminDashboardPage.jsx'
import AdminLoginPage from './pages/AdminLoginPage.jsx'
import AccountsPage from './pages/AccountsPage.jsx'
import CardsPage from './pages/CardsPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import LoansPage from './pages/LoansPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import SignupPage from './pages/SignupPage.jsx'
import TransfersPage from './pages/TransfersPage.jsx'
import TransactionsPage from './pages/TransactionsPage.jsx'
import './styles/global.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/admin-login" element={<AdminLoginPage />} />
      <Route path="/admin-dashboard" element={<AdminDashboardPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/dashboard/accounts" element={<AccountsPage />} />
      <Route path="/dashboard/transactions" element={<TransactionsPage />} />
      <Route path="/dashboard/cards" element={<CardsPage />} />
      <Route path="/dashboard/loans" element={<LoansPage />} />
      <Route path="/dashboard/transfers" element={<TransfersPage />} />
      <Route path="/dashboard/profile" element={<ProfilePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
