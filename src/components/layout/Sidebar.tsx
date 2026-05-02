import { NavLink } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard,
  Users,
  Shield,
  Settings,
  LogOut,
  Lock,
  ChevronRight,
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
  { to: '/users', label: 'Users', icon: Users, permission: 'users.view' },
  { to: '/roles', label: 'Roles & Permissions', icon: Shield, permission: 'roles.manage' },
  { to: '/settings', label: 'Settings', icon: Settings, permission: 'settings.view' },
]

export default function Sidebar() {
  const { user, logout, hasPermission } = useAuth()
  const visibleItems = navItems.filter((item) => hasPermission(item.permission))

  return (
    <aside className="flex h-screen w-[272px] flex-col bg-sidebar text-sidebar-foreground shadow-2xl">
      {/* Logo */}
      <div className="flex h-20 items-center gap-3 px-6">
        <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center shadow-md">
          <Lock className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white">UCRM</h1>
          <p className="text-[11px] text-sidebar-foreground/50 -mt-0.5">Business Management</p>
        </div>
      </div>

      <div className="px-4"><Separator className="bg-sidebar-border/50" /></div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-1">
        <p className="px-3 mb-3 text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
          Menu
        </p>
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-sidebar-accent text-white shadow-md'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  isActive ? 'bg-sidebar-primary text-white' : 'bg-sidebar-border/30 text-sidebar-foreground/60 group-hover:text-white'
                }`}>
                  <item.icon className="h-4 w-4" />
                </div>
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight className="w-4 h-4 opacity-50" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-4"><Separator className="bg-sidebar-border/50" /></div>

      {/* User section */}
      <div className="p-4">
        <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent/30 p-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-sidebar-primary flex items-center justify-center text-white font-bold text-sm shadow-md">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
            <p className="text-xs text-sidebar-foreground/50 truncate">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/60 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
