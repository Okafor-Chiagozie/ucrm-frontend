import { NavLink } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard,
  Users,
  Shield,
  Settings,
  LogOut,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
    <aside className="flex h-screen w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center px-6">
        <h1 className="text-xl font-bold">UCRM</h1>
      </div>
      <Separator />
      <nav className="flex-1 space-y-1 px-3 py-4">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <Separator />
      <div className="p-4">
        <div className="mb-3 text-sm">
          <p className="font-medium">{user?.name}</p>
          <p className="text-xs text-muted-foreground">{user?.role}</p>
        </div>
        <Button variant="outline" size="sm" className="w-full" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  )
}
