import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'
import type { FlaggedIp, PaginationMeta } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
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
import { Plus, Search, Trash2, ShieldBan, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

export default function FlaggedIpsPage() {
  const [ips, setIps] = useState<FlaggedIp[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState<string>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [deleteIp, setDeleteIp] = useState<FlaggedIp | null>(null)

  const fetchIps = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), per_page: '15', sort_by: sortField, sort_dir: sortDir })
      if (search) params.set('search', search)
      const { data } = await api.get(`/flagged-ips?${params}`)
      setIps(data.data.data)
      setMeta(data.meta)
    } catch { toast.error('Failed to load flagged IPs') }
    finally { setLoading(false) }
  }, [page, search, sortField, sortDir])

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/50" />
    return sortDir === 'asc' ? <ArrowUp className="ml-1 h-3.5 w-3.5 text-primary" /> : <ArrowDown className="ml-1 h-3.5 w-3.5 text-primary" />
  }

  useEffect(() => { fetchIps() }, [fetchIps])

  const handleDelete = async () => {
    if (!deleteIp) return
    try { await api.delete(`/flagged-ips/${deleteIp.id}`); toast.success('IP removed'); setDeleteIp(null); fetchIps() }
    catch { toast.error('Failed') }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Flagged IPs</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Block IP addresses from placing orders</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="w-full sm:w-auto h-10"><Plus className="mr-1.5 h-4 w-4" /> Flag IP</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search IP address..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-9 h-10" />
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader><TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('ip_address')}><span className="inline-flex items-center">IP Address <SortIcon field="ip_address" /></span></TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Flagged By</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('created_at')}><span className="inline-flex items-center">Date <SortIcon field="created_at" /></span></TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={6}><LoadingState text="Loading..." /></TableCell></TableRow>
            : ips.length === 0 ? <TableRow><TableCell colSpan={6}><EmptyState icon={ShieldBan} title="No flagged IPs" description="Flag an IP to block it from placing orders" /></TableCell></TableRow>
            : ips.map((ip) => (
              <TableRow key={ip.id}>
                <TableCell className="font-mono">{ip.ip_address}</TableCell>
                <TableCell className="text-muted-foreground">{ip.reason || '—'}</TableCell>
                <TableCell className="text-muted-foreground">{ip.flagged_by || '—'}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`font-normal cursor-pointer ${ip.is_active ? 'border-red-200 bg-red-50 text-red-700' : 'border-muted bg-muted text-muted-foreground'}`}
                    onClick={async () => {
                      try {
                        await api.put(`/flagged-ips/${ip.id}`, { is_active: !ip.is_active })
                        toast.success(ip.is_active ? 'IP unblocked' : 'IP blocked')
                        fetchIps()
                      } catch { toast.error('Failed') }
                    }}
                  >{ip.is_active ? 'Blocked' : 'Inactive'}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{new Date(ip.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</TableCell>
                <TableCell className="text-right"><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteIp(ip)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {meta && <Pagination meta={meta} page={page} onPageChange={setPage} />}

      <FlagIpDialog open={showCreate} onClose={() => setShowCreate(false)} onSuccess={fetchIps} />
      <AlertDialog open={!!deleteIp} onOpenChange={(o) => { if (!o) setDeleteIp(null) }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove {deleteIp?.ip_address}?</AlertDialogTitle><AlertDialogDescription>This IP will be unblocked and can place orders again.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function FlagIpDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [ipAddress, setIpAddress] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setError('')
    try { await api.post('/flagged-ips', { ip_address: ipAddress, reason }); toast.success('IP flagged'); setIpAddress(''); setReason(''); onClose(); onSuccess() }
    catch (err) { setError((err as any).response?.data?.message || 'Failed') }
    finally { setSubmitting(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Flag IP Address</DialogTitle><DialogDescription>Block an IP from placing orders via the form</DialogDescription></DialogHeader><Separator />
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">{error}</div>}
        <div className="space-y-1.5"><Label>IP Address</Label><Input value={ipAddress} onChange={(e) => setIpAddress(e.target.value)} placeholder="e.g. 192.168.1.1" required className="h-10 font-mono" /></div>
        <div className="space-y-1.5"><Label>Reason</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Fake orders" className="h-10" /></div>
        <Separator /><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting ? 'Flagging...' : 'Flag IP'}</Button></div>
      </form></DialogContent></Dialog>
  )
}
