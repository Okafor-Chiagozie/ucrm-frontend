import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import LoadingState from '@/components/LoadingState'
import { ShoppingCart, Package, AlertTriangle, PhoneMissed, Store, TrendingUp, Clock, CheckCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

interface DashboardStats {
  total_orders: number
  pending_orders: number
  delivered_orders: number
  total_revenue: string
  total_businesses?: number
  total_products?: number
  low_stock_count?: number
  abandoned_forms?: number
  recent_orders: { id: string; order_number: string; customer_name: string; business_name: string | null; total: string; status: string; created_at: string }[]
  orders_by_status: Record<string, number>
  chart_data?: { date: string; orders: number; revenue: number }[]
}

const statusColors: Record<string, string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  scheduled: 'border-blue-200 bg-blue-50 text-blue-700',
  delivered: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  not_picking: 'border-orange-200 bg-orange-50 text-orange-700',
  cancelled: 'border-red-200 bg-red-50 text-red-700',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending', scheduled: 'Scheduled', delivered: 'Delivered',
  not_picking: 'Not Picking', cancelled: 'Cancelled',
}

const today = () => new Date().toISOString().slice(0, 10)
const DATE_PRESETS = [
  { label: 'Today', from: today, to: today },
  { label: 'This Week', from: () => { const d = new Date(); const day = d.getDay(); d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); return d.toISOString().slice(0, 10) }, to: today },
  { label: 'This Month', from: () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10), to: today },
  { label: 'Last 7 Days', from: () => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10) }, to: today },
  { label: 'Last 30 Days', from: () => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10) }, to: today },
]

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      const { data } = await api.get(`/dashboard/stats?${params}`)
      setStats(data.data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [dateFrom, dateTo])

  useEffect(() => { fetchStats() }, [fetchStats])

  const dateLabel = () => {
    if (showDatePicker) return 'Custom Range'
    if (!dateFrom && !dateTo) return 'All Time'
    const match = DATE_PRESETS.find((p) => dateFrom === p.from() && dateTo === p.to())
    if (match) return match.label
    return `${dateFrom || '...'} — ${dateTo || '...'}`
  }

  const formatPrice = (n: string | number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(Number(n))

  const isAgent = user?.role === 'Agent'

  const cards: { label: string; value: string; icon: LucideIcon; iconColor: string }[] = stats ? [
    { label: isAgent ? 'My Orders' : 'Total Orders', value: String(stats.total_orders), icon: ShoppingCart, iconColor: 'text-blue-600' },
    { label: 'Pending', value: String(stats.pending_orders), icon: Clock, iconColor: 'text-amber-600' },
    { label: 'Delivered', value: String(stats.delivered_orders), icon: CheckCircle, iconColor: 'text-emerald-600' },
    { label: isAgent ? 'My Revenue' : 'Revenue (Delivered)', value: formatPrice(stats.total_revenue), icon: TrendingUp, iconColor: 'text-emerald-600' },
    ...(stats.total_businesses !== undefined ? [
      { label: 'Businesses', value: String(stats.total_businesses), icon: Store, iconColor: 'text-violet-600' },
      { label: 'Products', value: String(stats.total_products ?? 0), icon: Package, iconColor: 'text-blue-600' },
      { label: 'Low Stock', value: String(stats.low_stock_count ?? 0), icon: AlertTriangle, iconColor: 'text-red-600' },
      { label: 'Abandoned Forms', value: String(stats.abandoned_forms ?? 0), icon: PhoneMissed, iconColor: 'text-amber-600' },
    ] : []),
  ] : []

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Good {getGreeting()}, {user?.name?.split(' ')[0]}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{isAgent ? 'Here\'s an overview of your assigned orders.' : 'Here\'s an overview of your business.'}</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" className="h-10 w-full sm:w-44" />}>
              {dateLabel()}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {DATE_PRESETS.map((preset) => (
                <DropdownMenuItem key={preset.label} onClick={() => { setDateFrom(preset.from()); setDateTo(preset.to()); setShowDatePicker(false) }}>
                  {preset.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem onClick={() => { setShowDatePicker(true); setDateFrom(''); setDateTo('') }}>Custom Range</DropdownMenuItem>
              {(dateFrom || dateTo) && <DropdownMenuItem onClick={() => { setDateFrom(''); setDateTo(''); setShowDatePicker(false) }}>All Time</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {showDatePicker && (
        <div className="flex gap-2 items-end">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">From</label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-10 w-full sm:w-40" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">To</label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-10 w-full sm:w-40" />
          </div>
        </div>
      )}

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

          {stats.chart_data && stats.chart_data.length > 0 && (
            <Card className="border">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold mb-4">Orders Overview</h3>
                <div className="h-64 sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.chart_data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="orderGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(217, 91%, 50%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(217, 91%, 50%)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(152, 69%, 40%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(152, 69%, 40%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(v: string) => new Date(v).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                        tick={{ fontSize: 11 }}
                        stroke="hsl(var(--muted-foreground))"
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        yAxisId="orders"
                        tick={{ fontSize: 11 }}
                        stroke="hsl(var(--muted-foreground))"
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <YAxis
                        yAxisId="revenue"
                        orientation="right"
                        tick={{ fontSize: 11 }}
                        stroke="hsl(var(--muted-foreground))"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v: number) => v >= 1000 ? `₦${(v / 1000).toFixed(0)}k` : `₦${v}`}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: '6px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', fontSize: '13px' }}
                        labelFormatter={(v) => new Date(String(v)).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
                        formatter={(value, name) => [name === 'revenue' ? formatPrice(Number(value)) : value, name === 'revenue' ? 'Revenue' : 'Orders']}
                      />
                      <Area yAxisId="orders" type="monotone" dataKey="orders" stroke="hsl(217, 91%, 50%)" fill="url(#orderGrad)" strokeWidth={2} dot={false} />
                      <Area yAxisId="revenue" type="monotone" dataKey="revenue" stroke="hsl(152, 69%, 40%)" fill="url(#revenueGrad)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            <Card className="border">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold mb-4">Recent Orders</h3>
                {stats.recent_orders.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No orders in this period</p>
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
                          <Badge variant="outline" className={`text-xs font-normal ${statusColors[o.status] ?? ''}`}>{STATUS_LABELS[o.status] ?? o.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold mb-4">Orders by Status</h3>
                {Object.keys(stats.orders_by_status).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No orders in this period</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(stats.orders_by_status).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between">
                        <Badge variant="outline" className={`font-normal ${statusColors[status] ?? ''}`}>{STATUS_LABELS[status] ?? status}</Badge>
                        <span className="text-sm font-semibold">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
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
