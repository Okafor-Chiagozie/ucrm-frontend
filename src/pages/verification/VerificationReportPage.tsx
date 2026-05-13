import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'
import type { Business, PaginationMeta } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import Pagination from '@/components/Pagination'
import LoadingState from '@/components/LoadingState'
import EmptyState from '@/components/EmptyState'
import { toast } from 'sonner'
import { ShieldCheck, AlertTriangle, CheckCircle, Clock, RotateCcw, Package, DollarSign, Truck, Ban, CalendarClock } from 'lucide-react'

interface ReportOrder {
  id: string; order_number: string; business_name: string | null; customer_name: string
  total: string; cs_status: string; assigned_agent: string | null
  accountant_status: string | null; accountant_verified_by: string | null; accountant_verified_at: string | null
  logistics_status: string | null; logistics_verified_by: string | null; logistics_verified_at: string | null
  has_mismatch: boolean; created_at: string
}

interface Summary {
  total: number; cs_delivered: number; cs_pending: number; cs_scheduled: number; cs_cancelled: number
  payment_verified: number; payment_disputed: number; payment_pending: number
  delivery_verified: number; delivery_disputed: number; delivery_pending: number
  mismatches: number; all_verified: number
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending', scheduled: 'Scheduled', delivered: 'Delivered', not_picking: 'Not Picking', cancelled: 'Cancelled',
}

const formatPrice = (n: string | number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(Number(n))

const DATE_PRESETS = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'Custom Range', value: 'custom' },
]

export default function VerificationReportPage() {
  const [orders, setOrders] = useState<ReportOrder[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [businessFilter, setBusinessFilter] = useState('')
  const [reportFilter, setReportFilter] = useState('')
  const [datePreset, setDatePreset] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const hasFilters = businessFilter || reportFilter || dateFrom || dateTo

  const applyDatePreset = (preset: string) => {
    setDatePreset(preset)
    const today = new Date()
    const fmt = (d: Date) => d.toISOString().split('T')[0]

    if (preset === 'custom') return

    if (preset === 'today') {
      setDateFrom(fmt(today)); setDateTo(fmt(today))
    } else if (preset === 'week') {
      const day = today.getDay()
      const monday = new Date(today)
      monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1))
      setDateFrom(fmt(monday)); setDateTo(fmt(today))
    } else if (preset === 'month') {
      setDateFrom(fmt(new Date(today.getFullYear(), today.getMonth(), 1))); setDateTo(fmt(today))
    } else if (preset === '30d') {
      const d = new Date(today); d.setDate(today.getDate() - 30)
      setDateFrom(fmt(d)); setDateTo(fmt(today))
    }
    setPage(1)
  }

  const fetchReport = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), per_page: '15' })
      if (businessFilter) params.set('business_id', businessFilter)
      if (reportFilter) params.set('filter', reportFilter)
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      const { data } = await api.get(`/verification/report?${params}`)
      setOrders(data.data.data)
      setMeta(data.meta)
      setSummary(data.summary)
    } catch { toast.error('Failed to load report') }
    finally { setLoading(false) }
  }, [page, businessFilter, reportFilter, dateFrom, dateTo])

  useEffect(() => { fetchReport() }, [fetchReport])
  useEffect(() => { api.get('/businesses?per_page=100').then(({ data }) => setBusinesses(data.data.data ?? data.data ?? [])).catch(() => {}) }, [])

  const VBadge = ({ status, type }: { status: string | null; type: 'payment' | 'delivery' }) => {
    const verified = type === 'payment' ? 'payment_verified' : 'delivery_verified'
    const disputed = type === 'payment' ? 'payment_disputed' : 'delivery_disputed'
    if (status === verified) return <Badge variant="outline" className="font-normal border-emerald-200 bg-emerald-50 text-emerald-700">Verified</Badge>
    if (status === disputed) return <Badge variant="outline" className="font-normal border-red-200 bg-red-50 text-red-700">Disputed</Badge>
    return <Badge variant="outline" className="font-normal border-amber-200 bg-amber-50 text-amber-600">Pending</Badge>
  }

  const MatchIcon = ({ order }: { order: ReportOrder }) => {
    if (order.has_mismatch) return <div className="flex items-center gap-1 text-red-600"><AlertTriangle className="h-4 w-4" /><span className="text-xs font-medium">Mismatch</span></div>
    if (!order.accountant_status || !order.logistics_status) return <div className="flex items-center gap-1 text-amber-500"><Clock className="h-4 w-4" /><span className="text-xs">Awaiting</span></div>
    return <div className="flex items-center gap-1 text-emerald-600"><CheckCircle className="h-4 w-4" /><span className="text-xs font-medium">Match</span></div>
  }

  const clearFilters = () => {
    setBusinessFilter(''); setReportFilter(''); setDatePreset(''); setDateFrom(''); setDateTo(''); setPage(1)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-blue-600" /> Verification Report</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Cross-reference what Customer Support, Accountant, and Logistics Manager report</p>
      </div>

      {/* Summary Cards — 3 rows */}
      {summary && (
        <div className="space-y-3">
          {/* Row 1: Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-md bg-blue-100 flex items-center justify-center shrink-0"><Package className="h-4.5 w-4.5 text-blue-600" /></div>
                <div><p className="text-xs text-muted-foreground">Total Orders</p><p className="text-lg font-bold">{summary.total}</p></div>
              </CardContent>
            </Card>
            <Card className="border cursor-pointer hover:border-red-300" onClick={() => { setReportFilter('mismatches'); setPage(1) }}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-md bg-red-100 flex items-center justify-center shrink-0"><AlertTriangle className="h-4.5 w-4.5 text-red-600" /></div>
                <div><p className="text-xs text-muted-foreground">Mismatches</p><p className="text-lg font-bold text-red-600">{summary.mismatches}</p></div>
              </CardContent>
            </Card>
            <Card className="border cursor-pointer hover:border-emerald-300" onClick={() => { setReportFilter('all_verified'); setPage(1) }}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-md bg-emerald-100 flex items-center justify-center shrink-0"><CheckCircle className="h-4.5 w-4.5 text-emerald-600" /></div>
                <div><p className="text-xs text-muted-foreground">Fully Verified</p><p className="text-lg font-bold text-emerald-600">{summary.all_verified}</p></div>
              </CardContent>
            </Card>
            <Card className="border cursor-pointer hover:border-amber-300" onClick={() => { setReportFilter('unverified'); setPage(1) }}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-md bg-amber-100 flex items-center justify-center shrink-0"><Clock className="h-4.5 w-4.5 text-amber-600" /></div>
                <div><p className="text-xs text-muted-foreground">Awaiting Verification</p><p className="text-lg font-bold text-amber-600">{summary.payment_pending + summary.delivery_pending}</p></div>
              </CardContent>
            </Card>
          </div>

          {/* Row 2: CS Status breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="border">
              <CardContent className="p-3 flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-amber-500 shrink-0" />
                <div><p className="text-xs text-muted-foreground">CS Pending</p><p className="font-bold">{summary.cs_pending}</p></div>
              </CardContent>
            </Card>
            <Card className="border">
              <CardContent className="p-3 flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-blue-500 shrink-0" />
                <div><p className="text-xs text-muted-foreground">CS Scheduled</p><p className="font-bold">{summary.cs_scheduled}</p></div>
              </CardContent>
            </Card>
            <Card className="border">
              <CardContent className="p-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                <div><p className="text-xs text-muted-foreground">CS Delivered</p><p className="font-bold">{summary.cs_delivered}</p></div>
              </CardContent>
            </Card>
            <Card className="border">
              <CardContent className="p-3 flex items-center gap-2">
                <Ban className="h-4 w-4 text-red-500 shrink-0" />
                <div><p className="text-xs text-muted-foreground">CS Cancelled</p><p className="font-bold">{summary.cs_cancelled}</p></div>
              </CardContent>
            </Card>
          </div>

          {/* Row 3: Accountant vs Logistics side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card className="border">
              <CardContent className="p-4">
                <p className="text-sm font-medium flex items-center gap-1.5 mb-3"><DollarSign className="w-4 h-4 text-blue-600" /> Accountant (Payment)</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded bg-emerald-50"><p className="text-xs text-muted-foreground">Verified</p><p className="font-bold text-emerald-600">{summary.payment_verified}</p></div>
                  <div className="p-2 rounded bg-red-50"><p className="text-xs text-muted-foreground">Disputed</p><p className="font-bold text-red-600">{summary.payment_disputed}</p></div>
                  <div className="p-2 rounded bg-amber-50"><p className="text-xs text-muted-foreground">Pending</p><p className="font-bold text-amber-600">{summary.payment_pending}</p></div>
                </div>
              </CardContent>
            </Card>
            <Card className="border">
              <CardContent className="p-4">
                <p className="text-sm font-medium flex items-center gap-1.5 mb-3"><Truck className="w-4 h-4 text-blue-600" /> Logistics (Delivery)</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded bg-emerald-50"><p className="text-xs text-muted-foreground">Verified</p><p className="font-bold text-emerald-600">{summary.delivery_verified}</p></div>
                  <div className="p-2 rounded bg-red-50"><p className="text-xs text-muted-foreground">Disputed</p><p className="font-bold text-red-600">{summary.delivery_disputed}</p></div>
                  <div className="p-2 rounded bg-amber-50"><p className="text-xs text-muted-foreground">Pending</p><p className="font-bold text-amber-600">{summary.delivery_pending}</p></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={businessFilter} onValueChange={(v: string | null) => { setBusinessFilter(!v || v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Business" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Businesses</SelectItem>
            {businesses.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={reportFilter} onValueChange={(v: string | null) => { setReportFilter(!v || v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Filter" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            <SelectItem value="mismatches">Mismatches Only</SelectItem>
            <SelectItem value="unverified">Unverified</SelectItem>
            <SelectItem value="all_verified">Fully Verified</SelectItem>
          </SelectContent>
        </Select>
        <Select value={datePreset} onValueChange={(v: string | null) => v && applyDatePreset(v)}>
          <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Date Range" /></SelectTrigger>
          <SelectContent>
            {DATE_PRESETS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {datePreset === 'custom' && (
          <>
            <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }} className="w-full sm:w-[140px]" />
            <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }} className="w-full sm:w-[140px]" />
          </>
        )}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="hidden md:block rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden sm:table-cell">Total</TableHead>
              <TableHead className="text-center">CS Status</TableHead>
              <TableHead className="text-center">Accountant</TableHead>
              <TableHead className="text-center">Logistics</TableHead>
              <TableHead className="text-center">Result</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={7} className="p-0"><LoadingState text="Loading..." /></TableCell></TableRow>
            : orders.length === 0 ? <TableRow><TableCell colSpan={7} className="p-0"><EmptyState icon={ShieldCheck} title="No orders found" description="Adjust your filters" /></TableCell></TableRow>
            : orders.map(o => (
              <TableRow key={o.id} className={o.has_mismatch ? 'bg-red-50/50' : ''}>
                <TableCell>
                  <span className="font-mono text-sm">{o.order_number}</span>
                  <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</p>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-sm">{o.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{o.business_name}</p>
                </TableCell>
                <TableCell className="hidden sm:table-cell font-medium text-sm">{formatPrice(o.total)}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="font-normal">{STATUS_LABELS[o.cs_status] ?? o.cs_status}</Badge>
                  {o.assigned_agent && <p className="text-xs text-muted-foreground mt-0.5">{o.assigned_agent}</p>}
                </TableCell>
                <TableCell className="text-center">
                  <VBadge status={o.accountant_status} type="payment" />
                  {o.accountant_verified_by && <p className="text-xs text-muted-foreground mt-0.5">{o.accountant_verified_by}</p>}
                </TableCell>
                <TableCell className="text-center">
                  <VBadge status={o.logistics_status} type="delivery" />
                  {o.logistics_verified_by && <p className="text-xs text-muted-foreground mt-0.5">{o.logistics_verified_by}</p>}
                </TableCell>
                <TableCell className="text-center">
                  <MatchIcon order={o} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {meta && <Pagination meta={meta} page={page} onPageChange={setPage} />}

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading ? <LoadingState text="Loading..." /> : orders.length === 0 ? <EmptyState icon={ShieldCheck} title="No orders found" description="Adjust your filters" /> : orders.map(o => (
          <Card key={o.id} className={`border ${o.has_mismatch ? 'border-red-200 bg-red-50/30' : ''}`}>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-mono text-sm font-medium">{o.order_number}</p>
                  <p className="text-sm">{o.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{o.business_name} — {formatPrice(o.total)}</p>
                </div>
                <MatchIcon order={o} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded border">
                  <p className="text-muted-foreground mb-1">CS</p>
                  <Badge variant="outline" className="font-normal text-xs">{STATUS_LABELS[o.cs_status] ?? o.cs_status}</Badge>
                </div>
                <div className="p-2 rounded border">
                  <p className="text-muted-foreground mb-1">Accountant</p>
                  <VBadge status={o.accountant_status} type="payment" />
                </div>
                <div className="p-2 rounded border">
                  <p className="text-muted-foreground mb-1">Logistics</p>
                  <VBadge status={o.logistics_status} type="delivery" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
