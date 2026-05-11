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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Pagination from '@/components/Pagination'
import LoadingState from '@/components/LoadingState'
import EmptyState from '@/components/EmptyState'
import { toast } from 'sonner'
import { ShieldCheck, AlertTriangle, CheckCircle, Clock, RotateCcw } from 'lucide-react'

interface ReportOrder {
  id: string; order_number: string; business_name: string | null; customer_name: string
  total: string; cs_status: string; assigned_agent: string | null
  accountant_status: string | null; accountant_verified_by: string | null; accountant_verified_at: string | null
  logistics_status: string | null; logistics_verified_by: string | null; logistics_verified_at: string | null
  has_mismatch: boolean; created_at: string
}

interface Summary {
  total: number; payment_verified: number; payment_disputed: number; payment_pending: number
  delivery_verified: number; delivery_disputed: number; delivery_pending: number; mismatches: number
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending', scheduled: 'Scheduled', delivered: 'Delivered', not_picking: 'Not Picking', cancelled: 'Cancelled',
}

const formatPrice = (n: string | number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(Number(n))

const today = () => new Date().toISOString().slice(0, 10)
const DATE_PRESETS = [
  { label: 'Today', from: today, to: today },
  { label: 'This Week', from: () => { const d = new Date(); const day = d.getDay(); d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); return d.toISOString().slice(0, 10) }, to: today },
  { label: 'This Month', from: () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10), to: today },
  { label: 'Last 30 Days', from: () => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10) }, to: today },
]

export default function VerificationReportPage() {
  const [orders, setOrders] = useState<ReportOrder[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [businessFilter, setBusinessFilter] = useState('')
  const [reportFilter, setReportFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const hasFilters = businessFilter || reportFilter || dateFrom || dateTo

  const dateLabel = () => {
    if (showDatePicker) return 'Custom Range'
    if (!dateFrom && !dateTo) return 'All Time'
    const match = DATE_PRESETS.find((p) => dateFrom === p.from() && dateTo === p.to())
    if (match) return match.label
    return `${dateFrom || '...'} — ${dateTo || '...'}`
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
  useEffect(() => { api.get('/businesses?per_page=100').then(({ data }) => setBusinesses(data.data.data)).catch(() => {}) }, [])

  const VBadge = ({ status, type }: { status: string | null; type: 'payment' | 'delivery' }) => {
    const verified = type === 'payment' ? 'payment_verified' : 'delivery_verified'
    const disputed = type === 'payment' ? 'payment_disputed' : 'delivery_disputed'
    if (status === verified) return <Badge variant="outline" className="font-normal border-emerald-200 bg-emerald-50 text-emerald-700">Verified</Badge>
    if (status === disputed) return <Badge variant="outline" className="font-normal border-red-200 bg-red-50 text-red-700">Disputed</Badge>
    return <Badge variant="outline" className="font-normal border-gray-200 bg-gray-50 text-gray-500">Pending</Badge>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Verification Report</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Cross-reference Customer Support, Accountant, and Logistics Manager verifications</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-md bg-blue-100 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-4.5 w-4.5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Orders</p>
                <p className="text-lg font-bold">{summary.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border cursor-pointer" onClick={() => { setReportFilter('mismatches'); setPage(1) }}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-md bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-4.5 w-4.5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mismatches</p>
                <p className="text-lg font-bold text-red-600">{summary.mismatches}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-md bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle className="h-4.5 w-4.5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Payment Verified</p>
                <p className="text-lg font-bold">{summary.payment_verified}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-md bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle className="h-4.5 w-4.5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Delivery Verified</p>
                <p className="text-lg font-bold">{summary.delivery_verified}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3">
        <Select value={businessFilter || 'all'} onValueChange={(v) => { setBusinessFilter(v === 'all' ? '' : v ?? ''); setPage(1) }}>
          <SelectTrigger className="h-10 w-full sm:w-44">
            <SelectValue>{businesses.find((b) => b.id === businessFilter)?.name ?? 'All Businesses'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Businesses</SelectItem>
            {businesses.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={reportFilter || 'all'} onValueChange={(v) => { setReportFilter(v === 'all' ? '' : v ?? ''); setPage(1) }}>
          <SelectTrigger className="h-10 w-full sm:w-44">
            <SelectValue>{reportFilter === 'mismatches' ? 'Mismatches Only' : reportFilter === 'unverified' ? 'Unverified' : reportFilter === 'all_verified' ? 'All Verified' : 'All Orders'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            <SelectItem value="mismatches">Mismatches Only</SelectItem>
            <SelectItem value="unverified">Unverified</SelectItem>
            <SelectItem value="all_verified">All Verified</SelectItem>
          </SelectContent>
        </Select>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" className="h-10 w-full sm:w-44" />}>
            {dateLabel()}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {DATE_PRESETS.map((preset) => (
              <DropdownMenuItem key={preset.label} onClick={() => { setDateFrom(preset.from()); setDateTo(preset.to()); setShowDatePicker(false); setPage(1) }}>
                {preset.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onClick={() => { setShowDatePicker(true); setDateFrom(''); setDateTo(''); setPage(1) }}>Custom Range</DropdownMenuItem>
            {(dateFrom || dateTo) && <DropdownMenuItem onClick={() => { setDateFrom(''); setDateTo(''); setShowDatePicker(false); setPage(1) }}>All Time</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
        {showDatePicker && (
          <>
            <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }} className="h-10 w-full sm:w-36" />
            <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1) }} className="h-10 w-full sm:w-36" />
          </>
        )}
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-10 text-muted-foreground" onClick={() => { setBusinessFilter(''); setReportFilter(''); setDateFrom(''); setDateTo(''); setShowDatePicker(false); setPage(1) }}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
          </Button>
        )}
      </div>

      {/* Report Table */}
      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="text-center">CS Status</TableHead>
              <TableHead className="text-center">Accountant</TableHead>
              <TableHead className="text-center">Logistics</TableHead>
              <TableHead className="text-center">Match</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={7}><LoadingState text="Loading..." /></TableCell></TableRow>
            : orders.length === 0 ? <TableRow><TableCell colSpan={7}><EmptyState icon={ShieldCheck} title="No orders" /></TableCell></TableRow>
            : orders.map((o) => (
              <TableRow key={o.id} className={o.has_mismatch ? 'bg-red-50/50' : ''}>
                <TableCell>
                  <span className="font-mono text-sm">{o.order_number}</span>
                  <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</p>
                </TableCell>
                <TableCell>
                  <p className="font-medium">{o.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{o.business_name}</p>
                </TableCell>
                <TableCell className="font-medium">{formatPrice(o.total)}</TableCell>
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
                  {o.has_mismatch ? (
                    <AlertTriangle className="h-4 w-4 text-red-500 mx-auto" />
                  ) : !o.accountant_status || !o.logistics_status ? (
                    <Clock className="h-4 w-4 text-amber-500 mx-auto" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-emerald-500 mx-auto" />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {meta && <Pagination meta={meta} page={page} onPageChange={setPage} />}
    </div>
  )
}
