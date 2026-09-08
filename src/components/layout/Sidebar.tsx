import { useState, useMemo } from 'react'
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
  Bell,
  ScrollText,
  BarChart3,
  TrendingUp,
  ClipboardCheck,
  ShieldCheck,
  Megaphone,
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  permission: string
}

interface NavGroup {
  /** null renders the items at the top level, outside any collapsible group. */
  label: string | null
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: null,
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
      { to: '/notifications', label: 'Notifications', icon: Bell, permission: 'notifications.view' },
    ],
  },
  {
    label: 'Sales',
    items: [
      { to: '/orders', label: 'Orders', icon: ShoppingCart, permission: 'orders.view' },
      { to: '/partial-orders', label: 'Partial Orders', icon: PhoneMissed, permission: 'partial_orders.view' },
      { to: '/order-forms', label: 'Order Forms', icon: Code, permission: 'form_settings.manage' },
    ],
  },
  {
    label: 'Verification',
    items: [
      { to: '/verify-payments', label: 'Verify Payments', icon: ClipboardCheck, permission: 'orders.verify_payment' },
      { to: '/verify-deliveries', label: 'Verify Deliveries', icon: Truck, permission: 'orders.verify_delivery' },
      { to: '/verification-report', label: 'Verification Report', icon: ShieldCheck, permission: 'verification_report.view' },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { to: '/products', label: 'Products', icon: Package, permission: 'products.view' },
      { to: '/categories', label: 'Categories', icon: Tag, permission: 'categories.view' },
      { to: '/bump-offers', label: 'Bump Offers', icon: Gift, permission: 'products.view' },
      { to: '/inventory', label: 'Inventory', icon: Boxes, permission: 'inventory.view' },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { to: '/marketing', label: 'Marketing', icon: Megaphone, permission: 'notifications.send' },
      { to: '/coupons', label: 'Coupons', icon: Ticket, permission: 'coupons.view' },
      { to: '/form-performance', label: 'Form Performance', icon: TrendingUp, permission: 'form_performance.view' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { to: '/performance', label: 'Performance', icon: BarChart3, permission: 'reports.view' },
      { to: '/activity-log', label: 'Activity Log', icon: ScrollText, permission: 'settings.view' },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { to: '/businesses', label: 'Businesses', icon: Store, permission: 'businesses.view' },
      { to: '/delivery-fees', label: 'Delivery Fees', icon: Truck, permission: 'delivery_fees.view' },
      { to: '/flagged-ips', label: 'Flagged IPs', icon: ShieldBan, permission: 'flagged_ips.view' },
      { to: '/users', label: 'Users', icon: Users, permission: 'users.view' },
      { to: '/roles', label: 'Roles & Permissions', icon: Shield, permission: 'roles.manage' },
      { to: '/settings', label: 'Settings', icon: Settings, permission: 'settings.view' },
    ],
  },
]

const OPEN_GROUPS_KEY = 'ucrm-sidebar-open-groups'

/**
 * Groups the user has explicitly opened or closed. A group with no entry here
 * is open, which is the default state.
 */
type GroupOverrides = Record<string, boolean>

function readGroupOverrides(): GroupOverrides {
  try {
    const raw = localStorage.getItem(OPEN_GROUPS_KEY)
    return raw ? (JSON.parse(raw) as GroupOverrides) : {}
  } catch {
    return {}
  }
}

function writeGroupOverrides(overrides: GroupOverrides) {
  try {
    localStorage.setItem(OPEN_GROUPS_KEY, JSON.stringify(overrides))
  } catch {
    // Private browsing or blocked storage — the sidebar still works, it just
    // won't remember which groups were left open.
  }
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout, hasPermission, hasFeature } = useAuth()
  const location = useLocation()

  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(to + '/')

  // Drop items this role cannot reach, then drop any group left empty so a
  // Marketer never sees a "Verification" heading with nothing under it.
  const visibleGroups = useMemo(() => (
    navGroups
      .map((group) => ({
        ...group,
        items: group.items
          .filter((item) => hasPermission(item.permission))
          .filter((item) => item.to !== '/coupons' || hasFeature('coupons')),
      }))
      .filter((group) => group.items.length > 0)
  ), [hasPermission, hasFeature])

  const [overrides, setOverrides] = useState<GroupOverrides>(readGroupOverrides)

  // Groups start open. Once someone collapses one, that choice is remembered
  // and wins from then on.
  const isGroupOpen = (label: string) => overrides[label] ?? true

  const toggleGroup = (label: string) => {
    setOverrides((prev) => {
      const next = { ...prev, [label]: !isGroupOpen(label) }
      writeGroupOverrides(next)
      return next
    })
  }

  const renderLink = (item: NavItem, nested: boolean) => {
    const active = isActive(item.to)
    return (
      <NavLink
        key={item.to}
        to={item.to}
        onClick={onNavigate}
        className={`group flex items-center gap-3 rounded-md py-2 text-sm font-medium transition-all duration-150 ${nested ? 'pl-4 pr-3' : 'px-3'} ${
          active
            ? 'bg-sidebar-accent text-white'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white'
        }`}
      >
        <div className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors shrink-0 ${
          active ? 'bg-sidebar-primary text-white' : 'bg-sidebar-border/30 text-sidebar-foreground/60 group-hover:text-white'
        }`}>
          <item.icon className="h-3.5 w-3.5" />
        </div>
        <span className="flex-1 truncate">{item.label}</span>
        {active && <ChevronRight className="w-3.5 h-3.5 opacity-50 shrink-0" />}
      </NavLink>
    )
  }

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
        {visibleGroups.map((group) => {
          // A group holding a single item saves no space and costs a click, so
          // for roles that can only reach one page in a section, show it plainly.
          if (!group.label || group.items.length === 1) {
            return (
              <div key={group.label ?? 'top'} className="space-y-0.5 mb-1">
                {group.items.map((i) => renderLink(i, false))}
              </div>
            )
          }

          const open = isGroupOpen(group.label)
          const hasActive = group.items.some((i) => isActive(i.to))

          return (
            <div key={group.label} className="pt-1">
              <button
                type="button"
                onClick={() => toggleGroup(group.label as string)}
                aria-expanded={open}
                className={`flex w-full items-center gap-1.5 rounded-md px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest transition-colors ${
                  hasActive ? 'text-sidebar-foreground/70' : 'text-sidebar-foreground/40 hover:text-sidebar-foreground/70'
                }`}
              >
                <ChevronRight className={`h-3 w-3 transition-transform duration-150 ${open ? 'rotate-90' : ''}`} />
                <span className="flex-1 text-left">{group.label}</span>
                {!open && hasActive && <span className="h-1.5 w-1.5 rounded-full bg-sidebar-primary" />}
              </button>
              {open && <div className="mt-0.5 space-y-0.5">{group.items.map((i) => renderLink(i, true))}</div>}
            </div>
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
