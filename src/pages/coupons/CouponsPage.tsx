import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'
import type { Coupon, Business, PaginationMeta } from '@/types'
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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Separator } from '@/components/ui/separator'
import Pagination from '@/components/Pagination'
import LoadingState from '@/components/LoadingState'
import EmptyState from '@/components/EmptyState'
import { toast } from 'sonner'
import { Plus, Search, Pencil, Trash2, Ticket, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [search, setSearch] = useState('')
  const [businessFilter, setBusinessFilter] = useState('')
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState<string>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editCoupon, setEditCoupon] = useState<Coupon | null>(null)
  const [deleteCoupon, setDeleteCoupon] = useState<Coupon | null>(null)

  const fetchCoupons = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), per_page: '15', sort_by: sortField, sort_dir: sortDir })
      if (search) params.set('search', search)
      if (businessFilter) params.set('business_id', businessFilter)
      const { data } = await api.get(`/coupons?${params}`)
      setCoupons(data.data.data)
      setMeta(data.meta)
    } catch { toast.error('Failed to load coupons') }
    finally { setLoading(false) }
  }, [page, search, businessFilter, sortField, sortDir])

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/50" />
    return sortDir === 'asc' ? <ArrowUp className="ml-1 h-3.5 w-3.5 text-primary" /> : <ArrowDown className="ml-1 h-3.5 w-3.5 text-primary" />
  }

  useEffect(() => { fetchCoupons() }, [fetchCoupons])
  useEffect(() => { api.get('/businesses?per_page=100').then(({ data }) => setBusinesses(data.data.data)).catch(() => {}) }, [])

  const handleDelete = async () => {
    if (!deleteCoupon) return
    try { await api.delete(`/coupons/${deleteCoupon.id}`); toast.success('Deleted'); setDeleteCoupon(null); fetchCoupons() }
    catch { toast.error('Failed') }
  }

  const formatValue = (c: Coupon) => c.type === 'fixed' ? `₦${Number(c.value).toLocaleString()}` : `${c.value}%`

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Coupons</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage discount codes for your businesses</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="w-full sm:w-auto h-10"><Plus className="mr-1.5 h-4 w-4" /> Add Coupon</Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3">
        <div className="flex-1 min-w-0 sm:max-w-sm">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Search</label>
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search by code..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-9 h-10" /></div>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Business</label>
          <Select value={businessFilter || 'all'} onValueChange={(v) => { setBusinessFilter(v === 'all' ? '' : v ?? ''); setPage(1) }}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue>{businesses.find((b) => b.id === businessFilter)?.name ?? 'All Businesses'}</SelectValue></SelectTrigger>
            <SelectContent><SelectItem value="all">All Businesses</SelectItem>{businesses.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader><TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('code')}><span className="inline-flex items-center">Code <SortIcon field="code" /></span></TableHead>
            <TableHead>Business</TableHead>
            <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('value')}><span className="inline-flex items-center">Discount <SortIcon field="value" /></span></TableHead>
            <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('times_used')}><span className="inline-flex items-center">Used <SortIcon field="times_used" /></span></TableHead>
            <TableHead>Expires</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={7}><LoadingState text="Loading..." /></TableCell></TableRow>
            : coupons.length === 0 ? <TableRow><TableCell colSpan={7}><EmptyState icon={Ticket} title="No coupons" description="Create a coupon to offer discounts" /></TableCell></TableRow>
            : coupons.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono font-medium">{c.code}</TableCell>
                <TableCell className="text-muted-foreground">{c.business_name}</TableCell>
                <TableCell><Badge variant="outline" className="font-normal border-blue-200 bg-blue-50 text-blue-700">{formatValue(c)}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{c.times_used}{c.max_uses ? `/${c.max_uses}` : ''}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{c.expires_at ? new Date(c.expires_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`font-normal cursor-pointer ${c.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}
                    onClick={async () => {
                      try {
                        await api.put(`/coupons/${c.id}`, { is_active: !c.is_active })
                        toast.success(c.is_active ? 'Coupon deactivated' : 'Coupon activated')
                        fetchCoupons()
                      } catch { toast.error('Failed') }
                    }}
                  >{c.is_active ? 'Active' : 'Inactive'}</Badge>
                </TableCell>
                <TableCell className="text-right"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditCoupon(c)}><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteCoupon(c)}><Trash2 className="h-3.5 w-3.5" /></Button></div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {meta && <Pagination meta={meta} page={page} onPageChange={setPage} />}

      <CouponDialog open={showCreate} businesses={businesses} onClose={() => setShowCreate(false)} onSuccess={fetchCoupons} />
      {editCoupon && <CouponDialog open coupon={editCoupon} businesses={businesses} onClose={() => setEditCoupon(null)} onSuccess={fetchCoupons} />}
      <AlertDialog open={!!deleteCoupon} onOpenChange={(o) => { if (!o) setDeleteCoupon(null) }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete coupon {deleteCoupon?.code}?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function CouponDialog({ open, coupon, businesses, onClose, onSuccess }: { open: boolean; coupon?: Coupon; businesses: Business[]; onClose: () => void; onSuccess: () => void }) {
  const isEdit = !!coupon
  const [form, setForm] = useState({ business_id: coupon?.business_id ?? '', code: coupon?.code ?? '', type: coupon?.type ?? 'fixed', value: coupon?.value ?? '', max_uses: coupon?.max_uses?.toString() ?? '', expires_at: coupon?.expires_at ?? '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const set = (k: string, v: string) => setForm({ ...form, [k]: v })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setError('')
    const payload = { ...form, max_uses: form.max_uses ? Number(form.max_uses) : null, expires_at: form.expires_at || null }
    try {
      if (isEdit) { await api.put(`/coupons/${coupon.id}`, payload); toast.success('Updated') }
      else { await api.post('/coupons', payload); toast.success('Created') }
      onClose(); onSuccess()
    } catch (err) { setError((err as any).response?.data?.message || 'Failed') }
    finally { setSubmitting(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{isEdit ? 'Edit Coupon' : 'Create Coupon'}</DialogTitle><DialogDescription>{isEdit ? `Editing ${coupon.code}` : 'Create a new discount code'}</DialogDescription></DialogHeader><Separator />
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">{error}</div>}
        {!isEdit && <div className="space-y-1.5"><Label>Business</Label><Select value={form.business_id} onValueChange={(v) => set('business_id', v ?? '')}><SelectTrigger className="h-10 w-full"><SelectValue>{businesses.find((b) => b.id === form.business_id)?.name ?? 'Select'}</SelectValue></SelectTrigger><SelectContent>{businesses.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label>Code</Label><Input value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} required className="h-10 font-mono" /></div>
          <div className="space-y-1.5"><Label>Type</Label><Select value={form.type} onValueChange={(v) => set('type', v ?? 'fixed')}><SelectTrigger className="h-10 w-full"><SelectValue>{form.type === 'fixed' ? 'Fixed (₦)' : 'Percentage (%)'}</SelectValue></SelectTrigger><SelectContent><SelectItem value="fixed">Fixed (₦)</SelectItem><SelectItem value="percentage">Percentage (%)</SelectItem></SelectContent></Select></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label>Value</Label><Input type="number" value={form.value} onChange={(e) => set('value', e.target.value)} required min="0" step="0.01" className="h-10" /></div>
          <div className="space-y-1.5"><Label>Max Uses</Label><Input type="number" value={form.max_uses} onChange={(e) => set('max_uses', e.target.value)} placeholder="Unlimited" min="1" className="h-10" /></div>
        </div>
        <div className="space-y-1.5"><Label>Expires At</Label><Input type="date" value={form.expires_at} onChange={(e) => set('expires_at', e.target.value)} className="h-10" /></div>
        <Separator /><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : isEdit ? 'Save' : 'Create'}</Button></div>
      </form></DialogContent></Dialog>
  )
}
