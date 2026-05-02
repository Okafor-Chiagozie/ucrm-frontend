import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Shield, Key, UserCheck, Clock } from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuth()

  const stats = [
    {
      label: 'Your Role',
      value: user?.role ?? '—',
      icon: Shield,
      color: 'bg-blue-500/10 text-blue-600',
    },
    {
      label: 'Permissions',
      value: String(user?.permissions.length ?? 0),
      icon: Key,
      color: 'bg-emerald-500/10 text-emerald-600',
    },
    {
      label: 'Account Status',
      value: user?.is_active ? 'Active' : 'Inactive',
      icon: UserCheck,
      color: 'bg-violet-500/10 text-violet-600',
    },
    {
      label: 'Member Since',
      value: user?.created_at ? new Date(user.created_at).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' }) : '—',
      icon: Clock,
      color: 'bg-amber-500/10 text-amber-600',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Good {getGreeting()}, {user?.name?.split(' ')[0]}
        </h2>
        <p className="text-base text-muted-foreground mt-1">
          Here's what's happening with your account today.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
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
