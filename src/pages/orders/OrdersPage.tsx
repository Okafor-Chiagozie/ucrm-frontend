import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import type { Order, Business, PaginationMeta } from '@/types'
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
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Eye, ShoppingCart, Download, FileText } from 'lucide-react'

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned']

const statusColors: Record<string, string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  confirmed: 'border-blue-200 bg-blue-50 text-blue-700',
  processing: 'border-violet-200 bg-violet-50 text-violet-700',
  shipped: 'border-sky-200 bg-sky-50 text-sky-700',
  delivered: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  cancelled: 'border-red-200 bg-red-50 text-red-700',
  returned: 'border-orange-200 bg-orange-50 text-orange-700',
}

type SortField = 'order_number' | 'customer_name' | 'total' | 'created_at'
type SortDir = 'asc' | 'desc'

export default function OrdersPage() {
  const { hasPermission } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [search, setSearch] = useState('')
  const [businessFilter, setBusinessFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState('')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [loading, setLoading] = useState(true)
  const [viewOrder, setViewOrder] = useState<Order | null>(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), per_page: '15', sort_by: sortField, sort_dir: sortDir })
      if (search) params.set('search', search)
      if (businessFilter) params.set('business_id', businessFilter)
      if (statusFilter) params.set('status', statusFilter)
      const { data } = await api.get(`/orders?${params}`)
      setOrders(data.data.data)
      setMeta(data.meta)
    } catch {
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [page, search, businessFilter, statusFilter, sortField, sortDir])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  useEffect(() => {
    api.get('/businesses?per_page=100').then(({ data }) => setBusinesses(data.data.data)).catch(() => {})
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

  return (
    <div className="space-y-6">
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

      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3">
        <div className="flex-1 min-w-0 sm:max-w-sm">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Order #, name, phone..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-9 h-10" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Business</label>
          <Select value={businessFilter || 'all'} onValueChange={(v) => { setBusinessFilter(v === 'all' ? '' : v ?? ''); setPage(1) }}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue>{businesses.find((b) => b.id === businessFilter)?.name ?? 'All Businesses'}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Businesses</SelectItem>
              {businesses.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
          <Select value={statusFilter || 'all'} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v ?? ''); setPage(1) }}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue>{statusFilter ? statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1) : 'All Status'}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && hasPermission('orders.update_status') && (
        <div className="flex items-center gap-3 rounded-md border bg-primary/5 border-primary/20 p-3">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Select value={bulkStatus} onValueChange={(v) => setBulkStatus(v ?? '')}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue>{bulkStatus ? bulkStatus.charAt(0).toUpperCase() + bulkStatus.slice(1) : 'Change status to...'}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" disabled={!bulkStatus} onClick={async () => {
            try {
              await api.put('/orders-bulk-status', { order_ids: Array.from(selectedIds), status: bulkStatus })
              toast.success(`${selectedIds.size} order(s) updated`)
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
              <Badge variant="outline" className={`font-normal text-xs ${statusColors[o.status] ?? ''}`}>{o.status}</Badge>
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
              <TableHead>Items</TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('total')}>
                <span className="inline-flex items-center">Total <SortIcon field="total" /></span>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('created_at')}>
                <span className="inline-flex items-center">Date <SortIcon field="created_at" /></span>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9}><LoadingState text="Loading orders..." /></TableCell></TableRow>
            ) : orders.length === 0 ? (
              <TableRow><TableCell colSpan={9}><EmptyState icon={ShoppingCart} title="No orders found" /></TableCell></TableRow>
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
                <TableCell><Badge variant="outline" className="font-normal border-blue-200 bg-blue-50 text-blue-700">{o.items_count}</Badge></TableCell>
                <TableCell className="font-medium">{formatPrice(o.total)}</TableCell>
                <TableCell>
                  {hasPermission('orders.update_status') ? (
                    <Select value={o.status} onValueChange={async (v) => {
                      if (!v || v === o.status) return
                      try {
                        await api.put(`/orders/${o.id}/status`, { status: v })
                        toast.success(`${o.order_number} → ${v}`)
                        fetchOrders()
                      } catch { toast.error('Failed to update status') }
                    }}>
                      <SelectTrigger className="h-7 w-28 text-xs border-0 bg-transparent p-0">
                        <Badge variant="outline" className={`font-normal cursor-pointer ${statusColors[o.status] ?? ''}`}>{o.status}</Badge>
                      </SelectTrigger>
                      <SelectContent>
                        {ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className={`font-normal ${statusColors[o.status] ?? ''}`}>{o.status}</Badge>
                  )}
                </TableCell>
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
        setAgents(data.data.filter((s: any) => s.role === 'Agent').map((s: any) => ({ id: s.id, name: s.name })))
      }).catch(() => {})
    }
  }, [order.business_id])

  const formatPrice = (price: string | number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(Number(price))

  const handleStatusUpdate = async () => {
    setSaving(true)
    try {
      await api.put(`/orders/${order.id}/status`, { status })
      toast.success('Status updated')
      onUpdated()
      onClose()
    } catch {
      toast.error('Failed to update status')
    } finally {
      setSaving(false)
    }
  }

  const handleAssignAgent = async () => {
    setSaving(true)
    try {
      await api.put(`/orders/${order.id}/assign`, { agent_id: agentId })
      toast.success('Agent assigned')
      onUpdated()
      onClose()
    } catch {
      toast.error('Failed to assign agent')
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
              <div className="flex gap-2">
                <Select value={status} onValueChange={(v) => setStatus(v ?? status)} disabled={!canUpdateStatus}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue>{status.charAt(0).toUpperCase() + status.slice(1)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
                {canUpdateStatus && status !== order.status && (
                  <Button onClick={handleStatusUpdate} disabled={saving} className="h-10">Save</Button>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Assigned Agent</Label>
              <div className="flex gap-2">
                <Select value={agentId || 'none'} onValueChange={(v) => setAgentId(v === 'none' ? '' : v ?? '')} disabled={!canAssignAgent}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue>{agents.find((a) => a.id === agentId)?.name ?? 'Unassigned'}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {canAssignAgent && agentId !== (order.assigned_agent?.id ?? '') && (
                  <Button onClick={handleAssignAgent} disabled={saving} className="h-10">Save</Button>
                )}
              </div>
            </div>
          </div>

          {order.notes && (
            <div>
              <Label>Notes</Label>
              <p className="text-sm text-muted-foreground mt-1">{order.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
