import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import type { Order, Business, Product, PaginationMeta, User } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import Pagination from '@/components/Pagination'
import LoadingState from '@/components/LoadingState'
import EmptyState from '@/components/EmptyState'
import { toast } from 'sonner'
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Eye, ShoppingCart, Download, FileText, RotateCcw } from 'lucide-react'

const ORDER_STATUSES = ['pending', 'scheduled', 'delivered', 'not_picking', 'cancelled']

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  scheduled: 'Scheduled',
  delivered: 'Delivered',
  not_picking: 'Not Picking',
  cancelled: 'Cancelled',
}

const statusColors: Record<string, string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  scheduled: 'border-blue-200 bg-blue-50 text-blue-700',
  delivered: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  not_picking: 'border-orange-200 bg-orange-50 text-orange-700',
  cancelled: 'border-red-200 bg-red-50 text-red-700',
}

const statusTabColors: Record<string, string> = {
  pending: 'bg-amber-500',
  scheduled: 'bg-blue-500',
  delivered: 'bg-emerald-500',
  not_picking: 'bg-orange-500',
  cancelled: 'bg-red-500',
}

const NIGERIAN_STATES = [
  'Lagos', 'Abuja', 'Rivers', 'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa',
  'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Gombe', 'Imo',
  'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Nasarawa', 'Niger', 'Ogun',
  'Ondo', 'Osun', 'Oyo', 'Plateau', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
]

type SortField = 'order_number' | 'customer_name' | 'total' | 'created_at'
type SortDir = 'asc' | 'desc'

const today = () => new Date().toISOString().slice(0, 10)
const DATE_PRESETS = [
  { label: 'Today', from: today, to: today },
  { label: 'This Week', from: () => { const d = new Date(); const day = d.getDay(); d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); return d.toISOString().slice(0, 10) }, to: today },
  { label: 'This Month', from: () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10), to: today },
  { label: 'Last 7 Days', from: () => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10) }, to: today },
  { label: 'Last 30 Days', from: () => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10) }, to: today },
]

export default function OrdersPage() {
  const { hasPermission } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [agents, setAgents] = useState<User[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})

  // Filters
  const [search, setSearch] = useState('')
  const [businessFilter, setBusinessFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [agentFilter, setAgentFilter] = useState('')
  const [productFilter, setProductFilter] = useState('')
  const [hasCoupon, setHasCoupon] = useState('')
  const [unassigned, setUnassigned] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)

  const dateLabel = () => {
    if (showDatePicker) return 'Custom Range'
    if (!dateFrom && !dateTo) return 'All Time'
    const match = DATE_PRESETS.find((p) => dateFrom === p.from() && dateTo === p.to())
    if (match) return match.label
    return `${dateFrom || '...'} — ${dateTo || '...'}`
  }
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState('')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [loading, setLoading] = useState(true)
  const [viewOrder, setViewOrder] = useState<Order | null>(null)

  const hasActiveFilters = search || businessFilter || statusFilter || stateFilter || agentFilter || productFilter || hasCoupon || unassigned || dateFrom || dateTo

  const clearFilters = () => {
    setSearch(''); setBusinessFilter(''); setStatusFilter(''); setStateFilter('');
    setAgentFilter(''); setProductFilter('');
    setHasCoupon(''); setUnassigned(false); setDateFrom(''); setDateTo('');
    setShowDatePicker(false); setPage(1)
  }

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), per_page: '15', sort_by: sortField, sort_dir: sortDir })
      if (search) params.set('search', search)
      if (businessFilter) params.set('business_id', businessFilter)
      if (statusFilter) params.set('status', statusFilter)
      if (stateFilter) params.set('state', stateFilter)
      if (agentFilter) params.set('assigned_agent_id', agentFilter)
      if (productFilter) params.set('product_id', productFilter)
      if (hasCoupon) params.set('has_coupon', hasCoupon)
      if (unassigned) params.set('unassigned', '1')
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      const { data } = await api.get(`/orders?${params}`)
      setOrders(data.data.data)
      setMeta(data.meta)
      if (data.status_counts) setStatusCounts(data.status_counts)
    } catch {
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [page, search, businessFilter, statusFilter, stateFilter, agentFilter, productFilter, hasCoupon, unassigned, dateFrom, dateTo, sortField, sortDir])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  useEffect(() => {
    Promise.all([
      api.get('/businesses?per_page=100'),
      api.get('/products?per_page=200'),
      api.get('/users?role=Customer Support&per_page=100'),
    ]).then(([biz, prod, ag]) => {
      setBusinesses(biz.data.data.data)
      setProducts(prod.data.data.data)
      setAgents(ag.data.data.data)
    }).catch(() => {})
  }, [])

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/50" />
    return sortDir === 'asc' ? <ArrowUp className="ml-1 h-3.5 w-3.5 text-primary" /> : <ArrowDown className="ml-1 h-3.5 w-3.5 text-primary" />
  }

  const formatPrice = (price: string | number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(Number(price))

  const totalAll = Object.values(statusCounts).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Orders</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Track and manage customer orders</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" className="w-full sm:w-auto h-10" />}>
            <Download className="mr-1.5 h-4 w-4" /> Export
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={async () => {
              try {
                const params = new URLSearchParams()
                if (businessFilter) params.set('business_id', businessFilter)
                if (statusFilter) params.set('status', statusFilter)
                if (dateFrom) params.set('date_from', dateFrom)
                if (dateTo) params.set('date_to', dateTo)
                const { data } = await api.get(`/orders-export?${params}`, { responseType: 'blob' })
                const url = URL.createObjectURL(data)
                const a = document.createElement('a')
                a.href = url
                a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`
                a.click()
                URL.revokeObjectURL(url)
                toast.success('CSV downloaded')
              } catch { toast.error('Failed to export') }
            }}>
              <FileText className="mr-2 h-4 w-4" /> Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={async () => {
              try {
                const params = new URLSearchParams()
                if (businessFilter) params.set('business_id', businessFilter)
                if (statusFilter) params.set('status', statusFilter)
                if (dateFrom) params.set('date_from', dateFrom)
                if (dateTo) params.set('date_to', dateTo)
                const { data } = await api.get(`/orders-export-pdf?${params}`, { responseType: 'blob' })
                const url = URL.createObjectURL(data)
                const a = document.createElement('a')
                a.href = url
                a.download = `orders-${new Date().toISOString().slice(0, 10)}.pdf`
                a.click()
                URL.revokeObjectURL(url)
                toast.success('PDF downloaded')
              } catch { toast.error('Failed to export PDF') }
            }}>
              <FileText className="mr-2 h-4 w-4" /> Export as PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${!statusFilter ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          onClick={() => { setStatusFilter(''); setPage(1) }}
        >
          All ({totalAll})
        </button>
        {ORDER_STATUSES.map((s) => (
          <button
            key={s}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors inline-flex items-center gap-1.5 ${statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            onClick={() => { setStatusFilter(statusFilter === s ? '' : s); setPage(1) }}
          >
            <span className={`inline-block h-2 w-2 rounded-full ${statusTabColors[s]}`} />
            {STATUS_LABELS[s]} ({statusCounts[s] ?? 0})
          </button>
        ))}
      </div>

      {/* Filters grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Order #, name, phone..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-9 h-10" />
        </div>
        <Select value={businessFilter || 'all'} onValueChange={(v) => { setBusinessFilter(v === 'all' ? '' : v ?? ''); setPage(1) }}>
          <SelectTrigger className="h-10 w-full">
            <SelectValue>{businesses.find((b) => b.id === businessFilter)?.name ?? 'All Businesses'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Businesses</SelectItem>
            {businesses.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={stateFilter || 'all'} onValueChange={(v) => { setStateFilter(v === 'all' ? '' : v ?? ''); setPage(1) }}>
          <SelectTrigger className="h-10 w-full">
            <SelectValue>{stateFilter || 'All States'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All States</SelectItem>
            {NIGERIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={agentFilter || 'all'} onValueChange={(v) => { setAgentFilter(v === 'all' ? '' : v ?? ''); setPage(1) }}>
          <SelectTrigger className="h-10 w-full">
            <SelectValue>{agents.find((a) => a.id === agentFilter)?.name ?? 'All Staff'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Staff</SelectItem>
            {agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={productFilter || 'all'} onValueChange={(v) => { setProductFilter(v === 'all' ? '' : v ?? ''); setPage(1) }}>
          <SelectTrigger className="h-10 w-full">
            <SelectValue>{products.find((p) => p.id === productFilter)?.name ?? 'All Products'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={hasCoupon || 'all'} onValueChange={(v) => { setHasCoupon(v === 'all' ? '' : v ?? ''); setPage(1) }}>
          <SelectTrigger className="h-10 w-full">
            <SelectValue>{hasCoupon === '1' ? 'With Coupon' : hasCoupon === '0' ? 'Without Coupon' : 'Coupon: Any'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Coupon: Any</SelectItem>
            <SelectItem value="1">With Coupon</SelectItem>
            <SelectItem value="0">Without Coupon</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" className="h-10 flex-1" />}>
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
        </div>
        {showDatePicker && (
          <>
            <Input type="date" placeholder="From" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }} className="h-10" />
            <Input type="date" placeholder="To" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1) }} className="h-10" />
          </>
        )}
      </div>

      {/* Unassigned toggle + Clear */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={unassigned} onChange={(e) => { setUnassigned(e.target.checked); setPage(1) }} className="rounded" />
          Unassigned only
        </label>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={clearFilters}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset Filters
          </Button>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && hasPermission('orders.update_status') && (
        <div className="flex items-center gap-3 rounded-md border bg-primary/5 border-primary/20 p-3">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Select value={bulkStatus} onValueChange={(v) => setBulkStatus(v ?? '')}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue>{bulkStatus ? STATUS_LABELS[bulkStatus] : 'Change status to...'}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" disabled={!bulkStatus} onClick={async () => {
            try {
              const { data } = await api.put('/orders-bulk-status', { order_ids: Array.from(selectedIds), status: bulkStatus })
              toast.success(data.message)
              setSelectedIds(new Set())
              setBulkStatus('')
              fetchOrders()
            } catch { toast.error('Failed to update') }
          }}>Apply</Button>
          <Button variant="ghost" size="sm" onClick={() => { setSelectedIds(new Set()); setBulkStatus('') }}>Cancel</Button>
        </div>
      )}

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading ? <LoadingState text="Loading orders..." /> : orders.length === 0 ? <EmptyState icon={ShoppingCart} title="No orders found" description="Orders will appear here when customers place them" /> : orders.map((o) => (
          <div key={o.id} className="rounded-md border bg-card p-4 space-y-2 cursor-pointer" onClick={() => setViewOrder(o)}>
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-medium">{o.order_number}</span>
              <Badge variant="outline" className={`font-normal text-xs ${statusColors[o.status] ?? ''}`}>{STATUS_LABELS[o.status] ?? o.status}</Badge>
            </div>
            <p className="text-sm">{o.customer_name}</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{o.business_name}</span>
              <span className="font-medium text-foreground">{formatPrice(o.total)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {hasPermission('orders.update_status') && (
                <TableHead className="w-10">
                  <input type="checkbox" checked={orders.length > 0 && selectedIds.size === orders.length} onChange={(e) => setSelectedIds(e.target.checked ? new Set(orders.map((o) => o.id)) : new Set())} />
                </TableHead>
              )}
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('order_number')}>
                <span className="inline-flex items-center">Order # <SortIcon field="order_number" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('customer_name')}>
                <span className="inline-flex items-center">Customer <SortIcon field="customer_name" /></span>
              </TableHead>
              <TableHead>Business</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('total')}>
                <span className="inline-flex items-center">Total <SortIcon field="total" /></span>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('created_at')}>
                <span className="inline-flex items-center">Date <SortIcon field="created_at" /></span>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={11}><LoadingState text="Loading orders..." /></TableCell></TableRow>
            ) : orders.length === 0 ? (
              <TableRow><TableCell colSpan={11}><EmptyState icon={ShoppingCart} title="No orders found" /></TableCell></TableRow>
            ) : orders.map((o) => (
              <TableRow key={o.id}>
                {hasPermission('orders.update_status') && (
                  <TableCell>
                    <input type="checkbox" checked={selectedIds.has(o.id)} onChange={(e) => {
                      const next = new Set(selectedIds)
                      e.target.checked ? next.add(o.id) : next.delete(o.id)
                      setSelectedIds(next)
                    }} />
                  </TableCell>
                )}
                <TableCell className="font-mono text-sm">{o.order_number}</TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{o.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{o.customer_phone}</p>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{o.business_name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{o.customer_state}</TableCell>
                <TableCell><Badge variant="outline" className="font-normal border-blue-200 bg-blue-50 text-blue-700">{o.items_count}</Badge></TableCell>
                <TableCell className="font-medium">{formatPrice(o.total)}</TableCell>
                <TableCell><Badge variant="outline" className={`font-normal ${statusColors[o.status] ?? ''}`}>{STATUS_LABELS[o.status] ?? o.status}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{o.assigned_agent?.name ?? <span className="text-orange-500 text-xs">Unassigned</span>}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{new Date(o.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewOrder(o)}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {meta && <Pagination meta={meta} page={page} onPageChange={setPage} />}

      {viewOrder && (
        <OrderDetailDialog
          order={viewOrder}
          canUpdateStatus={hasPermission('orders.update_status')}
          canAssignAgent={hasPermission('orders.assign_agent')}
          onClose={() => setViewOrder(null)}
          onUpdated={fetchOrders}
        />
      )}
    </div>
  )
}

function OrderDetailDialog({ order, canUpdateStatus, canAssignAgent, onClose, onUpdated }: {
  order: Order; canUpdateStatus: boolean; canAssignAgent: boolean; onClose: () => void; onUpdated: () => void
}) {
  const [status, setStatus] = useState(order.status)
  const [agentId, setAgentId] = useState(order.assigned_agent?.id ?? '')
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (order.business_id) {
      api.get(`/businesses/${order.business_id}/staff`).then(({ data }) => {
        setAgents(data.data.filter((s: any) => s.role === 'Customer Support').map((s: any) => ({ id: s.id, name: s.name })))
      }).catch(() => {})
    }
  }, [order.business_id])

  const formatPrice = (price: string | number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(Number(price))

  const statusChanged = status !== order.status
  const agentChanged = agentId !== (order.assigned_agent?.id ?? '')
  const hasChanges = statusChanged || agentChanged

  const handleSave = async () => {
    setSaving(true)
    try {
      if (agentChanged && agentId) {
        await api.put(`/orders/${order.id}/assign`, { agent_id: agentId })
      }
      if (statusChanged) {
        await api.put(`/orders/${order.id}/status`, { status })
      }
      toast.success('Order updated')
      onUpdated()
      onClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to update order')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Order {order.order_number}</DialogTitle>
          <DialogDescription>{order.business_name} &middot; {new Date(order.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}</DialogDescription>
        </DialogHeader>
        <Separator />
        <div className="flex-1 overflow-y-auto space-y-5 py-2 custom-scrollbar">
          {/* Customer */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Customer Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Name:</span> {order.customer_name}</div>
              <div><span className="text-muted-foreground">Phone:</span> {order.customer_phone}</div>
              {order.customer_whatsapp && <div><span className="text-muted-foreground">WhatsApp:</span> {order.customer_whatsapp}</div>}
              {order.customer_email && <div><span className="text-muted-foreground">Email:</span> {order.customer_email}</div>}
              <div className="sm:col-span-2"><span className="text-muted-foreground">Address:</span> {order.customer_address}</div>
              <div><span className="text-muted-foreground">State:</span> {order.customer_state}</div>
              {order.ip_address && <div><span className="text-muted-foreground">IP:</span> <span className="font-mono text-xs">{order.ip_address}</span></div>}
            </div>
          </div>

          <Separator />

          {/* Items */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Order Items</h4>
            <div className="rounded-md border">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border-b last:border-b-0">
                  <div>
                    <p className="text-sm font-medium">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">{item.variation_name} {item.is_bump && <Badge variant="outline" className="ml-1 text-xs border-violet-200 bg-violet-50 text-violet-700">Bump</Badge>}</p>
                  </div>
                  <p className="text-sm font-medium">{formatPrice(item.total)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="rounded-md border p-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Delivery Fee</span><span>{formatPrice(order.delivery_fee)}</span></div>
            {Number(order.discount) > 0 && <div className="flex justify-between text-emerald-600"><span>Discount {order.coupon_code && `(${order.coupon_code})`}</span><span>-{formatPrice(order.discount)}</span></div>}
            <Separator />
            <div className="flex justify-between font-semibold text-base"><span>Total</span><span>{formatPrice(order.total)}</span></div>
          </div>

          <Separator />

          {/* Status + Agent */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v ?? status)} disabled={!canUpdateStatus || order.allowed_statuses.length === 0}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue>{STATUS_LABELS[status] ?? status}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={order.status}>{STATUS_LABELS[order.status]} (current)</SelectItem>
                  {order.allowed_statuses.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s] ?? s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Assigned Staff</Label>
              <Select value={agentId || 'none'} onValueChange={(v) => setAgentId(v === 'none' ? '' : v ?? '')} disabled={!canAssignAgent}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue>{agents.find((a) => a.id === agentId)?.name ?? 'Unassigned'}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {order.requires_agent && order.allowed_statuses.length > 0 && (
            <p className="text-xs text-amber-600">Assign a staff member before moving to scheduled, delivered, or not picking.</p>
          )}

          {order.allowed_statuses.length === 0 && (
            <p className="text-xs text-muted-foreground">This order is in a terminal status and cannot be changed.</p>
          )}

          {/* Timestamps */}
          {(order.scheduled_at || order.delivered_at) && (
            <div className="text-xs text-muted-foreground space-y-0.5">
              {order.scheduled_at && <p>Scheduled: {new Date(order.scheduled_at).toLocaleString('en-NG')}</p>}
              {order.delivered_at && <p>Delivered: {new Date(order.delivered_at).toLocaleString('en-NG')}</p>}
            </div>
          )}

          {order.notes && (
            <div>
              <Label>Notes</Label>
              <p className="text-sm text-muted-foreground mt-1">{order.notes}</p>
            </div>
          )}
        </div>
        {(canUpdateStatus || canAssignAgent) && (
          <>
            <Separator />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>Close</Button>
              <Button onClick={handleSave} disabled={saving || !hasChanges}>{saving ? 'Saving...' : 'Save Changes'}</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
