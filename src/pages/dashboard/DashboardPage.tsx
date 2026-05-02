import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Shield, Key, UserCheck, CalendarDays } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuth()

  const stats: { label: string; value: string; icon: LucideIcon }[] = [
    { label: 'Your Role', value: user?.role ?? '—', icon: Shield },
    { label: 'Permissions', value: String(user?.permissions.length ?? 0), icon: Key },
    { label: 'Account Status', value: user?.is_active ? 'Active' : 'Inactive', icon: UserCheck },
    {
      label: 'Member Since',
      value: user?.created_at
        ? new Date(user.created_at).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' })
        : '—',
      icon: CalendarDays,
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
          <Card key={stat.label} className="border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <stat.icon className="h-5 w-5 text-muted-foreground/60" />
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
