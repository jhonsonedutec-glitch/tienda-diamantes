import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import OrderPage from './pages/OrderPage';
import LoginPage from './pages/admin/LoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import MetricsPage from './pages/admin/MetricsPage';
import SiteLayout from './layouts/SiteLayout';

function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/order/:id" element={<OrderPage />} />
        <Route path="/admin/login" element={<LoginPage />} />
        <Route path="/admin/dashboard" element={<MetricsPage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
