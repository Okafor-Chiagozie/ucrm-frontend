import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'
import type { Business } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import LoadingState from '@/components/LoadingState'
import EmptyState from '@/components/EmptyState'
import { toast } from 'sonner'
import { BarChart3, TrendingUp, Users, Package, DollarSign, Clock, RotateCcw } from 'lucide-react'

interface StaffPerformance {
  id: string
  name: string
  email: string
  phone: string | null
  available_from: string | null
  available_to: string | null
  total_orders: number
  delivered: number
  cancelled: number
  not_picking: number
  scheduled: number
  pending: number
  delivery_rate: number
  revenue: number
  avg_delivery_hours: number | null
}

interface Totals {
  total_orders: number
  delivered: number
  cancelled: number
  not_picking: number
  revenue: number
  delivery_rate: number
}

const today = () => new Date().toISOString().slice(0, 10)
const DATE_PRESETS = [
  { label: 'Today', from: today, to: today },
  { label: 'This Week', from: () => { const d = new Date(); const day = d.getDay(); d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); return d.toISOString().slice(0, 10) }, to: today },
  { label: 'This Month', from: () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10), to: today },
  { label: 'Last 30 Days', from: () => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10) }, to: today },
]

const formatPrice = (n: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(n)

export default function PerformancePage() {
  const [staff, setStaff] = useState<StaffPerformance[]>([])
  const [totals, setTotals] = useState<Totals | null>(null)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [businessFilter, setBusinessFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isPersonal, setIsPersonal] = useState(false)

  const hasFilters = businessFilter || dateFrom || dateTo

  const dateLabel = () => {
    if (showDatePicker) return 'Custom Range'
    if (!dateFrom && !dateTo) return 'All Time'
    const match = DATE_PRESETS.find((p) => dateFrom === p.from() && dateTo === p.to())
    if (match) return match.label
    return `${dateFrom || '...'} — ${dateTo || '...'}`
  }

  const fetchPerformance = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (businessFilter) params.set('business_id', businessFilter)
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      const { data } = await api.get(`/performance?${params}`)
      setStaff(data.data)
      setTotals(data.totals)
      setIsPersonal(data.is_personal ?? false)
    } catch {
      toast.error('Failed to load performance data')
    } finally {
      setLoading(false)
    }
  }, [businessFilter, dateFrom, dateTo])

  useEffect(() => { fetchPerformance() }, [fetchPerformance])
  useEffect(() => { api.get('/businesses?per_page=100').then(({ data }) => setBusinesses(data.data.data)).catch(() => {}) }, [])

  const rateColor = (rate: number) => {
    if (rate >= 70) return 'text-emerald-600'
    if (rate >= 40) return 'text-amber-600'
    return 'text-red-600'
  }

  const rateBadge = (rate: number) => {
    if (rate >= 70) return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    if (rate >= 40) return 'border-amber-200 bg-amber-50 text-amber-700'
    return 'border-red-200 bg-red-50 text-red-700'
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{isPersonal ? 'My Performance' : 'Staff Performance'}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{isPersonal ? 'Your delivery performance and metrics' : 'Track Customer Support staff delivery performance and metrics'}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3">
        <Select value={businessFilter || 'all'} onValueChange={(v) => setBusinessFilter(v === 'all' ? '' : v ?? '')}>
          <SelectTrigger className="h-10 w-full sm:w-48">
            <SelectValue>{businesses.find((b) => b.id === businessFilter)?.name ?? 'All Businesses'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Businesses</SelectItem>
            {businesses.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" className="h-10 w-full sm:w-44" />}>
            {dateLabel()}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {DATE_PRESETS.map((preset) => (
              <DropdownMenuItem key={preset.label} onClick={() => { setDateFrom(preset.from()); setDateTo(preset.to()); setShowDatePicker(false) }}>
                {preset.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onClick={() => { setShowDatePicker(true); setDateFrom(''); setDateTo('') }}>Custom Range</DropdownMenuItem>
            {(dateFrom || dateTo) && <DropdownMenuItem onClick={() => { setDateFrom(''); setDateTo(''); setShowDatePicker(false) }}>All Time</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
        {showDatePicker && (
          <>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-10 w-full sm:w-36" />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-10 w-full sm:w-36" />
          </>
        )}
        {hasFilters && (
          <Button variant="ghost" size="sm" className="text-muted-foreground h-10" onClick={() => { setBusinessFilter(''); setDateFrom(''); setDateTo(''); setShowDatePicker(false) }}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
          </Button>
        )}
      </div>

      {loading ? <LoadingState text="Loading performance data..." /> : (
        <>
          {/* Summary Cards */}
          {totals && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Card className="border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-md bg-blue-100 flex items-center justify-center shrink-0">
                    <Package className="h-4.5 w-4.5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Orders</p>
                    <p className="text-lg font-bold">{totals.total_orders}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-md bg-emerald-100 flex items-center justify-center shrink-0">
                    <TrendingUp className="h-4.5 w-4.5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Delivered</p>
                    <p className="text-lg font-bold">{totals.delivered}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-md bg-red-100 flex items-center justify-center shrink-0">
                    <Package className="h-4.5 w-4.5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cancelled</p>
                    <p className="text-lg font-bold">{totals.cancelled}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-md bg-orange-100 flex items-center justify-center shrink-0">
                    <Users className="h-4.5 w-4.5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Not Picking</p>
                    <p className="text-lg font-bold">{totals.not_picking}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-md bg-violet-100 flex items-center justify-center shrink-0">
                    <BarChart3 className="h-4.5 w-4.5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Delivery Rate</p>
                    <p className={`text-lg font-bold ${rateColor(totals.delivery_rate)}`}>{totals.delivery_rate}%</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-md bg-green-100 flex items-center justify-center shrink-0">
                    <DollarSign className="h-4.5 w-4.5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                    <p className="text-lg font-bold">{formatPrice(totals.revenue)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Personal detail view for Customer Support */}
          {isPersonal && staff.length > 0 && (() => {
            const s = staff[0]
            return (
              <Card className="border">
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold">
                      {s.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{s.name}</h3>
                      <p className="text-sm text-muted-foreground">{s.email}</p>
                      {s.available_from && s.available_to ? (
                        <p className="text-xs text-muted-foreground mt-0.5">Available: {s.available_from.slice(0, 5)} – {s.available_to.slice(0, 5)}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-0.5">Available: Always</p>
                      )}
                    </div>
                    <div className="ml-auto text-right">
                      <Badge variant="outline" className={`text-lg px-3 py-1 font-semibold ${rateBadge(s.delivery_rate)}`}>
                        {s.delivery_rate}%
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">Delivery Rate</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div className="rounded-md border p-3 text-center">
                      <p className="text-2xl font-bold">{s.total_orders}</p>
                      <p className="text-xs text-muted-foreground mt-1">Total Orders</p>
                    </div>
                    <div className="rounded-md border p-3 text-center">
                      <p className="text-2xl font-bold text-emerald-600">{s.delivered}</p>
                      <p className="text-xs text-muted-foreground mt-1">Delivered</p>
                    </div>
                    <div className="rounded-md border p-3 text-center">
                      <p className="text-2xl font-bold text-blue-600">{s.pending + s.scheduled}</p>
                      <p className="text-xs text-muted-foreground mt-1">In Progress</p>
                    </div>
                    <div className="rounded-md border p-3 text-center">
                      <p className="text-2xl font-bold text-orange-600">{s.not_picking}</p>
                      <p className="text-xs text-muted-foreground mt-1">Not Picking</p>
                    </div>
                    <div className="rounded-md border p-3 text-center">
                      <p className="text-2xl font-bold text-red-600">{s.cancelled}</p>
                      <p className="text-xs text-muted-foreground mt-1">Cancelled</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-md border p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <p className="text-sm text-muted-foreground">Total Revenue Generated</p>
                      </div>
                      <p className="text-2xl font-bold">{formatPrice(s.revenue)}</p>
                    </div>
                    <div className="rounded-md border p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <p className="text-sm text-muted-foreground">Avg Delivery Time</p>
                      </div>
                      <p className="text-2xl font-bold">{s.avg_delivery_hours !== null ? `${s.avg_delivery_hours} hours` : 'N/A'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })()}

          {/* Staff Table — managers only */}
          {!isPersonal && (
            <div className="rounded-md border bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead>Staff</TableHead>
                    <TableHead className="text-center">Orders</TableHead>
                    <TableHead className="text-center">Delivered</TableHead>
                    <TableHead className="text-center">Cancelled</TableHead>
                    <TableHead className="text-center">Not Picking</TableHead>
                    <TableHead className="text-center">Pending</TableHead>
                    <TableHead className="text-center">Rate</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-center">Avg Hours</TableHead>
                    <TableHead>Availability</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.length === 0 ? (
                    <TableRow><TableCell colSpan={10}><EmptyState icon={Users} title="No staff data" description="No Customer Support staff found" /></TableCell></TableRow>
                  ) : staff.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium">{s.total_orders}</TableCell>
                      <TableCell className="text-center">
                        <span className="text-emerald-600 font-medium">{s.delivered}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-red-600 font-medium">{s.cancelled}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-orange-600 font-medium">{s.not_picking}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-blue-600 font-medium">{s.pending + s.scheduled}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={`font-normal ${rateBadge(s.delivery_rate)}`}>
                          {s.delivery_rate}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatPrice(s.revenue)}</TableCell>
                      <TableCell className="text-center">
                        {s.avg_delivery_hours !== null ? (
                          <span className="inline-flex items-center gap-1 text-sm">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {s.avg_delivery_hours}h
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {s.available_from && s.available_to ? (
                          <span className="text-xs text-muted-foreground">{s.available_from.slice(0, 5)} – {s.available_to.slice(0, 5)}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Always</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Mobile cards — managers only */}
          {!isPersonal && <div className="md:hidden space-y-3">
            {staff.map((s) => (
              <Card key={s.id} className="border">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.email}</p>
                    </div>
                    <Badge variant="outline" className={`font-normal ${rateBadge(s.delivery_rate)}`}>
                      {s.delivery_rate}%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Orders</p>
                      <p className="font-medium">{s.total_orders}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Delivered</p>
                      <p className="font-medium text-emerald-600">{s.delivered}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Revenue</p>
                      <p className="font-medium">{formatPrice(s.revenue)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>}
        </>
      )}
    </div>
  )
}
