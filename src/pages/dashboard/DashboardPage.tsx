import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Shield, Key, UserCheck, CalendarDays } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuth()

  const stats: { label: string; value: string; icon: LucideIcon; iconColor: string; accent: string }[] = [
    { label: 'Your Role', value: user?.role ?? '—', icon: Shield, iconColor: 'text-blue-600', accent: 'border-l-blue-500' },
    { label: 'Permissions', value: String(user?.permissions.length ?? 0), icon: Key, iconColor: 'text-emerald-600', accent: 'border-l-emerald-500' },
    { label: 'Account Status', value: user?.is_active ? 'Active' : 'Inactive', icon: UserCheck, iconColor: 'text-violet-600', accent: 'border-l-violet-500' },
    {
      label: 'Member Since',
      value: user?.created_at
        ? new Date(user.created_at).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' })
        : '—',
      icon: CalendarDays,
      iconColor: 'text-amber-600',
      accent: 'border-l-amber-500',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Good {getGreeting()}, {user?.name?.split(' ')[0]}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Here's an overview of your account.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className={`border border-l-3 ${stat.accent}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
              <p className="text-xl font-semibold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}
