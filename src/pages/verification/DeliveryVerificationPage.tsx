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
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { Search, Truck, CheckCircle, XCircle, Clock, RotateCcw } from 'lucide-react'

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
  useEffect(() => { api.get('/businesses?per_page=100').then(({ data }) => setBusinesses(data.data.data ?? data.data ?? [])).catch(() => {}) }, [])

  const verify = async (orderId: string, status: string) => {
    try {
      await api.put(`/verification/logistics/${orderId}`, { status })
      const label = status === 'delivery_verified' ? 'Verified' : status === 'delivery_disputed' ? 'Disputed' : 'Pending'
      toast.success(`Marked as ${label}`)
      fetchOrders()
    } catch { toast.error('Failed to update') }
  }

  const ActionButtons = ({ order }: { order: VerificationOrder }) => {
    const status = order.logistics_status

    if (status === 'delivery_verified') {
      return (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50" onClick={() => verify(order.id, 'pending')}>
            <Clock className="h-3.5 w-3.5 mr-1" /> Pending
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => verify(order.id, 'delivery_disputed')}>
            <XCircle className="h-3.5 w-3.5 mr-1" /> Dispute
          </Button>
        </div>
      )
    }

    if (status === 'delivery_disputed') {
      return (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => verify(order.id, 'delivery_verified')}>
            <CheckCircle className="h-3.5 w-3.5 mr-1" /> Verify
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50" onClick={() => verify(order.id, 'pending')}>
            <Clock className="h-3.5 w-3.5 mr-1" /> Pending
          </Button>
        </div>
      )
    }

    // Pending / null
    return (
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="sm" className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => verify(order.id, 'delivery_verified')}>
          <CheckCircle className="h-3.5 w-3.5 mr-1" /> Verify
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => verify(order.id, 'delivery_disputed')}>
          <XCircle className="h-3.5 w-3.5 mr-1" /> Dispute
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2"><Truck className="w-5 h-5 text-blue-600" /> Delivery Verification</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Verify delivery status of orders independently</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Order #, customer..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-9" />
        </div>
        <Select value={businessFilter} onValueChange={(v: string | null) => { setBusinessFilter(!v || v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Business" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Businesses</SelectItem>
            {businesses.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={logiFilter} onValueChange={(v: string | null) => { setLogiFilter(!v || v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Not Verified</SelectItem>
            <SelectItem value="delivery_verified">Verified</SelectItem>
            <SelectItem value="delivery_disputed">Disputed</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setBusinessFilter(''); setLogiFilter(''); setPage(1) }} className="text-muted-foreground">
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </div>

      <div className="hidden sm:block rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>CS Status</TableHead>
              <TableHead>Delivery</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={6} className="p-0"><LoadingState text="Loading..." /></TableCell></TableRow>
            : orders.length === 0 ? <TableRow><TableCell colSpan={6} className="p-0"><EmptyState icon={Truck} title="No orders" /></TableCell></TableRow>
            : orders.map(o => (
              <TableRow key={o.id}>
                <TableCell>
                  <span className="font-mono text-sm">{o.order_number}</span>
                  <p className="text-xs text-muted-foreground">{o.business_name}</p>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-sm">{o.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{o.customer_phone}</p>
                </TableCell>
                <TableCell className="font-medium text-sm">{formatPrice(o.total)}</TableCell>
                <TableCell><Badge variant="outline" className="font-normal">{STATUS_LABELS[o.cs_status] ?? o.cs_status}</Badge></TableCell>
                <TableCell>
                  {o.logistics_status === 'delivery_verified' ? (
                    <Badge variant="outline" className="font-normal border-emerald-200 bg-emerald-50 text-emerald-700">Verified</Badge>
                  ) : o.logistics_status === 'delivery_disputed' ? (
                    <Badge variant="outline" className="font-normal border-red-200 bg-red-50 text-red-700">Disputed</Badge>
                  ) : (
                    <Badge variant="outline" className="font-normal border-amber-200 bg-amber-50 text-amber-600">Pending</Badge>
                  )}
                </TableCell>
                <TableCell><ActionButtons order={o} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card view */}
      <div className="sm:hidden space-y-3">
        {loading ? (
          <LoadingState text="Loading..." />
        ) : orders.length === 0 ? (
          <EmptyState icon={Truck} title="No orders" />
        ) : (
          orders.map(o => (
            <Card key={o.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-sm font-medium">{o.order_number}</span>
                    <p className="text-xs text-muted-foreground">{o.business_name}</p>
                  </div>
                  {o.logistics_status === 'delivery_verified' ? (
                    <Badge variant="outline" className="font-normal border-emerald-200 bg-emerald-50 text-emerald-700">Verified</Badge>
                  ) : o.logistics_status === 'delivery_disputed' ? (
                    <Badge variant="outline" className="font-normal border-red-200 bg-red-50 text-red-700">Disputed</Badge>
                  ) : (
                    <Badge variant="outline" className="font-normal border-amber-200 bg-amber-50 text-amber-600">Pending</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{o.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{o.customer_phone}</p>
                  </div>
                  <span className="font-medium">{formatPrice(o.total)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="font-normal">{STATUS_LABELS[o.cs_status] ?? o.cs_status}</Badge>
                  <ActionButtons order={o} />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      {meta && <Pagination meta={meta} page={page} onPageChange={setPage} />}
    </div>
  )
}
