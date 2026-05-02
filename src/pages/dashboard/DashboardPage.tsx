import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent } from '@/components/ui/card'

export default function DashboardPage() {
  const { user } = useAuth()

  const stats = [
    { label: 'Your Role', value: user?.role ?? '—' },
    { label: 'Permissions', value: String(user?.permissions.length ?? 0) },
    { label: 'Account Status', value: user?.is_active ? 'Active' : 'Inactive' },
    {
      label: 'Member Since',
      value: user?.created_at
        ? new Date(user.created_at).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' })
        : '—',
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
              <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
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
