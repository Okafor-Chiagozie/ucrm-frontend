import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard,
  Users,
  Shield,
  Settings,
  LogOut,
  Lock,
  ChevronRight,
  Store,
  Tag,
  Package,
  ShoppingCart,
  Truck,
  Ticket,
  ShieldBan,
  PhoneMissed,
  Code,
  Boxes,
  Gift,
  ScrollText,
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
  { to: '/orders', label: 'Orders', icon: ShoppingCart, permission: 'orders.view' },
  { to: '/businesses', label: 'Businesses', icon: Store, permission: 'businesses.view' },
  { to: '/categories', label: 'Categories', icon: Tag, permission: 'categories.view' },
  { to: '/products', label: 'Products', icon: Package, permission: 'products.view' },
  { to: '/bump-offers', label: 'Bump Offers', icon: Gift, permission: 'products.view' },
  { to: '/inventory', label: 'Inventory', icon: Boxes, permission: 'inventory.view' },
  { to: '/delivery-fees', label: 'Delivery Fees', icon: Truck, permission: 'delivery_fees.view' },
  { to: '/coupons', label: 'Coupons', icon: Ticket, permission: 'coupons.view' },
  { to: '/flagged-ips', label: 'Flagged IPs', icon: ShieldBan, permission: 'flagged_ips.view' },
  { to: '/partial-orders', label: 'Partial Orders', icon: PhoneMissed, permission: 'partial_orders.view' },
  { to: '/order-forms', label: 'Order Forms', icon: Code, permission: 'form_settings.manage' },
  { to: '/users', label: 'Users', icon: Users, permission: 'users.view' },
  { to: '/roles', label: 'Roles & Permissions', icon: Shield, permission: 'roles.manage' },
  { to: '/activity-log', label: 'Activity Log', icon: ScrollText, permission: 'settings.view' },
  { to: '/settings', label: 'Settings', icon: Settings, permission: 'settings.view' },
]

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout, hasPermission } = useAuth()
  const visibleItems = navItems.filter((item) => hasPermission(item.permission))
  const location = useLocation()

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-5 shrink-0">
        <div className="w-8 h-8 rounded-md bg-sidebar-primary flex items-center justify-center shadow-md">
          <Lock className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-white">UCRM</h1>
          <p className="text-[10px] text-sidebar-foreground/50 -mt-0.5 leading-none">Business Management</p>
        </div>
      </div>

      <div className="px-4"><Separator className="bg-sidebar-border/50" /></div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto custom-scrollbar">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
          Menu
        </p>
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/')
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-sidebar-accent text-white'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white'
              }`}
            >
              <div className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                isActive ? 'bg-sidebar-primary text-white' : 'bg-sidebar-border/30 text-sidebar-foreground/60 group-hover:text-white'
              }`}>
                <item.icon className="h-3.5 w-3.5" />
              </div>
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
            </NavLink>
          )
        })}
      </nav>

      <div className="px-4"><Separator className="bg-sidebar-border/50" /></div>

      {/* User section */}
      <div className="p-3 shrink-0">
        <div className="flex items-center gap-2.5 rounded-md bg-sidebar-accent/30 p-2.5 mb-2">
          <div className="w-9 h-9 rounded-full bg-sidebar-primary flex items-center justify-center text-white font-bold text-xs shadow-md shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
            <p className="text-[11px] text-sidebar-foreground/50 truncate">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={() => { onNavigate?.(); logout() }}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/60 hover:bg-red-500/10 hover:text-red-400 transition-all duration-150"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  )
}

export default function Sidebar() {
  return (
    <aside className="hidden lg:flex h-screen w-64 flex-col shadow-xl shrink-0">
      <SidebarContent />
    </aside>
  )
}
