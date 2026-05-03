import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'
import type { DeliveryFee, Business, PaginationMeta } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import Pagination from '@/components/Pagination'
import LoadingState from '@/components/LoadingState'
import EmptyState from '@/components/EmptyState'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Truck, ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const NIGERIAN_STATES = ['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara','Abuja']

export default function DeliveryFeesPage() {
  const [fees, setFees] = useState<DeliveryFee[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [businessFilter, setBusinessFilter] = useState('')
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState<string>('state')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editFee, setEditFee] = useState<DeliveryFee | null>(null)
  const [deleteFee, setDeleteFee] = useState<DeliveryFee | null>(null)

  const fetchFees = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), per_page: '50', sort_by: sortField, sort_dir: sortDir })
      if (businessFilter) params.set('business_id', businessFilter)
      const { data } = await api.get(`/delivery-fees?${params}`)
      setFees(data.data.data)
      setMeta(data.meta)
    } catch { toast.error('Failed to load delivery fees') }
    finally { setLoading(false) }
  }, [page, businessFilter, sortField, sortDir])

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/50" />
    return sortDir === 'asc' ? <ArrowUp className="ml-1 h-3.5 w-3.5 text-primary" /> : <ArrowDown className="ml-1 h-3.5 w-3.5 text-primary" />
  }

  useEffect(() => { fetchFees() }, [fetchFees])
  useEffect(() => { api.get('/businesses?per_page=100').then(({ data }) => setBusinesses(data.data.data)).catch(() => {}) }, [])

  const handleDelete = async () => {
    if (!deleteFee) return
    try { await api.delete(`/delivery-fees/${deleteFee.id}`); toast.success('Deleted'); setDeleteFee(null); fetchFees() }
    catch { toast.error('Failed') }
  }

  const formatPrice = (p: string | number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(Number(p))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Delivery Fees</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Set delivery fees per state for each business</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="w-full sm:w-auto h-10"><Plus className="mr-1.5 h-4 w-4" /> Add Fee</Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Business</label>
          <Select value={businessFilter || 'all'} onValueChange={(v) => { setBusinessFilter(v === 'all' ? '' : v ?? ''); setPage(1) }}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue>{businesses.find((b) => b.id === businessFilter)?.name ?? 'All Businesses'}</SelectValue></SelectTrigger>
            <SelectContent><SelectItem value="all">All Businesses</SelectItem>{businesses.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {businessFilter && (
          <Button variant="ghost" className="h-10 text-muted-foreground" onClick={() => { setBusinessFilter(''); setPage(1) }}>
            <X className="mr-1.5 h-4 w-4" /> Clear
          </Button>
        )}
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader><TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('state')}><span className="inline-flex items-center">State <SortIcon field="state" /></span></TableHead>
            <TableHead>Business</TableHead>
            <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('fee')}><span className="inline-flex items-center">Fee <SortIcon field="fee" /></span></TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={4}><LoadingState text="Loading..." /></TableCell></TableRow>
            : fees.length === 0 ? <TableRow><TableCell colSpan={4}><EmptyState icon={Truck} title="No delivery fees" description="Add delivery fees for each state" /></TableCell></TableRow>
            : fees.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.state}</TableCell>
                <TableCell className="text-muted-foreground">{f.business_name}</TableCell>
                <TableCell className="font-medium">{formatPrice(f.fee)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditFee(f)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteFee(f)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {meta && <Pagination meta={meta} page={page} onPageChange={setPage} />}

      <DeliveryFeeDialog open={showCreate} businesses={businesses} states={NIGERIAN_STATES} onClose={() => setShowCreate(false)} onSuccess={fetchFees} />
      {editFee && <DeliveryFeeDialog open fee={editFee} businesses={businesses} states={NIGERIAN_STATES} onClose={() => setEditFee(null)} onSuccess={fetchFees} />}
      <AlertDialog open={!!deleteFee} onOpenChange={(o) => { if (!o) setDeleteFee(null) }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete fee for {deleteFee?.state}?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function DeliveryFeeDialog({ open, fee, businesses, states, onClose, onSuccess }: { open: boolean; fee?: DeliveryFee; businesses: Business[]; states: string[]; onClose: () => void; onSuccess: () => void }) {
  const isEdit = !!fee
  const [businessId, setBusinessId] = useState(fee?.business_id ?? '')
  const [state, setState] = useState(fee?.state ?? '')
  const [feeAmount, setFeeAmount] = useState(fee?.fee ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setError('')
    try {
      if (isEdit) { await api.put(`/delivery-fees/${fee.id}`, { fee: feeAmount }); toast.success('Updated') }
      else { await api.post('/delivery-fees', { business_id: businessId, state, fee: feeAmount }); toast.success('Created') }
      onClose(); onSuccess()
    } catch (err) { setError((err as any).response?.data?.message || 'Failed') }
    finally { setSubmitting(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{isEdit ? 'Edit Fee' : 'Add Delivery Fee'}</DialogTitle><DialogDescription>{isEdit ? `${fee.state} — ${fee.business_name}` : 'Set a delivery fee for a state'}</DialogDescription></DialogHeader><Separator />
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">{error}</div>}
        {!isEdit && (<><div className="space-y-1.5"><Label>Business</Label><Select value={businessId} onValueChange={(v) => setBusinessId(v ?? '')}><SelectTrigger className="h-10 w-full"><SelectValue>{businesses.find((b) => b.id === businessId)?.name ?? 'Select'}</SelectValue></SelectTrigger><SelectContent>{businesses.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5"><Label>State</Label><Select value={state} onValueChange={(v) => setState(v ?? '')}><SelectTrigger className="h-10 w-full"><SelectValue>{state || 'Select state'}</SelectValue></SelectTrigger><SelectContent>{states.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div></>)}
        <div className="space-y-1.5"><Label>Fee (NGN)</Label><Input type="number" value={feeAmount} onChange={(e) => setFeeAmount(e.target.value)} required min="0" step="0.01" className="h-10" /></div>
        <Separator /><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : isEdit ? 'Save' : 'Create'}</Button></div>
      </form></DialogContent></Dialog>
  )
}
