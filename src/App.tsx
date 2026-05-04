import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import AppLayout from '@/components/layout/AppLayout'
import LoginPage from '@/pages/auth/LoginPage'
import ChangePasswordPage from '@/pages/auth/ChangePasswordPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import OrdersPage from '@/pages/orders/OrdersPage'
import BusinessesPage from '@/pages/businesses/BusinessesPage'
import CategoriesPage from '@/pages/categories/CategoriesPage'
import ProductsPage from '@/pages/products/ProductsPage'
import BumpOffersPage from '@/pages/bump-offers/BumpOffersPage'
import InventoryPage from '@/pages/inventory/InventoryPage'
import DeliveryFeesPage from '@/pages/delivery-fees/DeliveryFeesPage'
import CouponsPage from '@/pages/coupons/CouponsPage'
import FlaggedIpsPage from '@/pages/flagged-ips/FlaggedIpsPage'
import PartialOrdersPage from '@/pages/partial-orders/PartialOrdersPage'
import FormSettingsPage from '@/pages/form/FormSettingsPage'
import OrderForm from '@/pages/form/OrderForm'
import UsersPage from '@/pages/users/UsersPage'
import RolesPage from '@/pages/roles/RolesPage'
import ActivityLogPage from '@/pages/activity-log/ActivityLogPage'
import NotificationsPage from '@/pages/notifications/NotificationsPage'
import SettingsPage from '@/pages/settings/SettingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public: embeddable order form (no auth, no layout) */}
          <Route path="/form/:productId" element={<OrderForm />} />

          <Route path="/login" element={<LoginPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/businesses" element={<BusinessesPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/bump-offers" element={<BumpOffersPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/delivery-fees" element={<DeliveryFeesPage />} />
            <Route path="/coupons" element={<CouponsPage />} />
            <Route path="/flagged-ips" element={<FlaggedIpsPage />} />
            <Route path="/partial-orders" element={<PartialOrdersPage />} />
            <Route path="/order-forms" element={<FormSettingsPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/roles" element={<RolesPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/activity-log" element={<ActivityLogPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
