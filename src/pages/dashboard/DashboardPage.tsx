import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import LoadingState from '@/components/LoadingState'
import { ShoppingCart, Package, AlertTriangle, PhoneMissed, Store, TrendingUp, Clock, CheckCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface DashboardStats {
  total_orders: number
  pending_orders: number
  delivered_orders: number
  total_revenue: string
  total_businesses: number
  total_products: number
  low_stock_count: number
  abandoned_forms: number
  recent_orders: { id: string; order_number: string; customer_name: string; business_name: string | null; total: string; status: string; created_at: string }[]
  orders_by_status: Record<string, number>
}

const statusColors: Record<string, string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  confirmed: 'border-blue-200 bg-blue-50 text-blue-700',
  processing: 'border-violet-200 bg-violet-50 text-violet-700',
  shipped: 'border-sky-200 bg-sky-50 text-sky-700',
  delivered: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  cancelled: 'border-red-200 bg-red-50 text-red-700',
  returned: 'border-orange-200 bg-orange-50 text-orange-700',
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard/stats').then(({ data }) => setStats(data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const formatPrice = (n: string | number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(Number(n))

  const cards: { label: string; value: string; icon: LucideIcon; iconColor: string }[] = stats ? [
    { label: 'Total Orders', value: String(stats.total_orders), icon: ShoppingCart, iconColor: 'text-blue-600' },
    { label: 'Pending Orders', value: String(stats.pending_orders), icon: Clock, iconColor: 'text-amber-600' },
    { label: 'Revenue (Delivered)', value: formatPrice(stats.total_revenue), icon: TrendingUp, iconColor: 'text-emerald-600' },
    { label: 'Businesses', value: String(stats.total_businesses), icon: Store, iconColor: 'text-violet-600' },
    { label: 'Products', value: String(stats.total_products), icon: Package, iconColor: 'text-blue-600' },
    { label: 'Delivered', value: String(stats.delivered_orders), icon: CheckCircle, iconColor: 'text-emerald-600' },
    { label: 'Low Stock Items', value: String(stats.low_stock_count), icon: AlertTriangle, iconColor: 'text-red-600' },
    { label: 'Abandoned Forms', value: String(stats.abandoned_forms), icon: PhoneMissed, iconColor: 'text-amber-600' },
  ] : []

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Good {getGreeting()}, {user?.name?.split(' ')[0]}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Here's an overview of your business.</p>
      </div>

      {loading ? <LoadingState text="Loading dashboard..." /> : stats && (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => (
              <Card key={card.label} className="border">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                    <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                  </div>
                  <p className="text-xl font-semibold">{card.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            {/* Recent Orders */}
            <Card className="border">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold mb-4">Recent Orders</h3>
                {stats.recent_orders.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No orders yet</p>
                ) : (
                  <div className="space-y-3">
                    {stats.recent_orders.map((o) => (
                      <div key={o.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{o.customer_name}</p>
                          <p className="text-xs text-muted-foreground">{o.order_number} &middot; {o.business_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{formatPrice(o.total)}</p>
                          <Badge variant="outline" className={`text-xs font-normal ${statusColors[o.status] ?? ''}`}>{o.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Orders by Status */}
            <Card className="border">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold mb-4">Orders by Status</h3>
                <div className="space-y-3">
                  {Object.entries(stats.orders_by_status).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`font-normal ${statusColors[status] ?? ''}`}>{status}</Badge>
                      </div>
                      <span className="text-sm font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}
