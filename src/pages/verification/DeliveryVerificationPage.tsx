import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'
import type { Business, PaginationMeta } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { Search, Truck, CheckCircle, XCircle, RotateCcw } from 'lucide-react'

interface VerificationOrder {
  id: string; order_number: string; business_name: string | null; customer_name: string
  customer_phone: string; customer_state: string; total: string; cs_status: string
  assigned_agent: string | null; logistics_status: string | null; logistics_verified_at: string | null
  created_at: string
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending', scheduled: 'Scheduled', delivered: 'Delivered', not_picking: 'Not Picking', cancelled: 'Cancelled',
}

const formatPrice = (n: string | number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(Number(n))

export default function DeliveryVerificationPage() {
  const [orders, setOrders] = useState<VerificationOrder[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [search, setSearch] = useState('')
  const [businessFilter, setBusinessFilter] = useState('')
  const [logiFilter, setLogiFilter] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const hasFilters = search || businessFilter || logiFilter

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), per_page: '15' })
      if (search) params.set('search', search)
      if (businessFilter) params.set('business_id', businessFilter)
      if (logiFilter) params.set('logistics_status', logiFilter)
      const { data } = await api.get(`/verification/logistics?${params}`)
      setOrders(data.data.data)
      setMeta(data.meta)
    } catch { toast.error('Failed to load orders') }
    finally { setLoading(false) }
  }, [page, search, businessFilter, logiFilter])

  useEffect(() => { fetchOrders() }, [fetchOrders])
  useEffect(() => { api.get('/businesses?per_page=100').then(({ data }) => setBusinesses(data.data.data)).catch(() => {}) }, [])

  const verify = async (orderId: string, status: string) => {
    try {
      await api.put(`/verification/logistics/${orderId}`, { status })
      toast.success(`Marked as ${status.replace('_', ' ')}`)
      fetchOrders()
    } catch { toast.error('Failed to update') }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Delivery Verification</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Verify delivery status of orders independently</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3">
        <div className="flex-1 min-w-0 sm:max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Order #, customer..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-9 h-10" />
          </div>
        </div>
        <Select value={businessFilter || 'all'} onValueChange={(v) => { setBusinessFilter(v === 'all' ? '' : v ?? ''); setPage(1) }}>
          <SelectTrigger className="h-10 w-full sm:w-44">
            <SelectValue>{businesses.find((b) => b.id === businessFilter)?.name ?? 'All Businesses'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Businesses</SelectItem>
            {businesses.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={logiFilter || 'all'} onValueChange={(v) => { setLogiFilter(v === 'all' ? '' : v ?? ''); setPage(1) }}>
          <SelectTrigger className="h-10 w-full sm:w-48">
            <SelectValue>{logiFilter === 'pending' ? 'Not Verified' : logiFilter === 'delivery_verified' ? 'Delivery Verified' : logiFilter === 'delivery_disputed' ? 'Delivery Disputed' : 'All Statuses'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Not Verified</SelectItem>
            <SelectItem value="delivery_verified">Delivery Verified</SelectItem>
            <SelectItem value="delivery_disputed">Delivery Disputed</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-10 text-muted-foreground" onClick={() => { setSearch(''); setBusinessFilter(''); setLogiFilter(''); setPage(1) }}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
          </Button>
        )}
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>CS Status</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead>Delivery Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={8}><LoadingState text="Loading..." /></TableCell></TableRow>
            : orders.length === 0 ? <TableRow><TableCell colSpan={8}><EmptyState icon={Truck} title="No orders" /></TableCell></TableRow>
            : orders.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-sm">{o.order_number}</TableCell>
                <TableCell>
                  <p className="font-medium">{o.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{o.customer_phone}</p>
                </TableCell>
                <TableCell className="text-muted-foreground">{o.customer_state}</TableCell>
                <TableCell className="font-medium">{formatPrice(o.total)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-normal">{STATUS_LABELS[o.cs_status] ?? o.cs_status}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{o.assigned_agent ?? 'Unassigned'}</TableCell>
                <TableCell>
                  {o.logistics_status === 'delivery_verified' ? (
                    <Badge variant="outline" className="font-normal border-emerald-200 bg-emerald-50 text-emerald-700">Verified</Badge>
                  ) : o.logistics_status === 'delivery_disputed' ? (
                    <Badge variant="outline" className="font-normal border-red-200 bg-red-50 text-red-700">Disputed</Badge>
                  ) : (
                    <Badge variant="outline" className="font-normal border-amber-200 bg-amber-50 text-amber-700">Pending</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => verify(o.id, 'delivery_verified')} title="Verify Delivery">
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => verify(o.id, 'delivery_disputed')} title="Dispute Delivery">
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
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
