import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'
import type { PartialOrderData, Business, PaginationMeta } from '@/types'
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
import { Search, PhoneMissed, ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react'

export default function PartialOrdersPage() {
  const [partials, setPartials] = useState<PartialOrderData[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [search, setSearch] = useState('')
  const [businessFilter, setBusinessFilter] = useState('')
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState<string>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [loading, setLoading] = useState(true)

  const fetchPartials = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), per_page: '15', sort_by: sortField, sort_dir: sortDir })
      if (search) params.set('search', search)
      if (businessFilter) params.set('business_id', businessFilter)
      const { data } = await api.get(`/partial-orders?${params}`)
      setPartials(data.data.data)
      setMeta(data.meta)
    } catch { toast.error('Failed to load') }
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

  useEffect(() => { fetchPartials() }, [fetchPartials])
  useEffect(() => { api.get('/businesses?per_page=100').then(({ data }) => setBusinesses(data.data.data)).catch(() => {}) }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Partial Orders</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Phone numbers captured from abandoned order forms</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3">
        <div className="flex-1 min-w-0 sm:max-w-sm">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Search</label>
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search phone or name..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-9 h-10" /></div>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Business</label>
          <Select value={businessFilter || 'all'} onValueChange={(v) => { setBusinessFilter(v === 'all' ? '' : v ?? ''); setPage(1) }}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue>{businesses.find((b) => b.id === businessFilter)?.name ?? 'All Businesses'}</SelectValue></SelectTrigger>
            <SelectContent><SelectItem value="all">All Businesses</SelectItem>{businesses.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {(search || businessFilter) && (
          <div>
            <label className="block text-xs font-medium text-transparent mb-1.5">.</label>
            <Button variant="ghost" className="h-10 text-muted-foreground" onClick={() => { setSearch(''); setBusinessFilter(''); setPage(1) }}>
              <X className="mr-1.5 h-4 w-4" /> Clear
            </Button>
          </div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {loading ? <LoadingState text="Loading..." /> : partials.length === 0 ? <EmptyState icon={PhoneMissed} title="No partial orders" description="Partial data is captured when visitors start filling the order form" /> : partials.map((p) => (
          <Card key={p.id}>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-medium">{p.phone}</span>
                <Badge variant="outline" className={`font-normal text-xs ${p.converted ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{p.converted ? 'Yes' : 'No'}</Badge>
              </div>
              <p className="text-sm">{p.name || '—'}</p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{p.business_name}</span>
                <span>{new Date(p.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              {p.ip_address && <p className="font-mono text-xs text-muted-foreground">IP: {p.ip_address}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block rounded-md border bg-card">
        <Table>
          <TableHeader><TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('phone')}><span className="inline-flex items-center">Phone <SortIcon field="phone" /></span></TableHead>
            <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('name')}><span className="inline-flex items-center">Name <SortIcon field="name" /></span></TableHead>
            <TableHead>Business</TableHead>
            <TableHead>IP</TableHead>
            <TableHead>Converted</TableHead>
            <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('created_at')}><span className="inline-flex items-center">Date <SortIcon field="created_at" /></span></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={6}><LoadingState text="Loading..." /></TableCell></TableRow>
            : partials.length === 0 ? <TableRow><TableCell colSpan={6}><EmptyState icon={PhoneMissed} title="No partial orders" description="Partial data is captured when visitors start filling the order form" /></TableCell></TableRow>
            : partials.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono">{p.phone}</TableCell>
                <TableCell>{p.name || '—'}</TableCell>
                <TableCell className="text-muted-foreground">{p.business_name}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{p.ip_address || '—'}</TableCell>
                <TableCell><Badge variant="outline" className={`font-normal ${p.converted ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{p.converted ? 'Yes' : 'No'}</Badge></TableCell>
                <TableCell className="text-muted-foreground text-sm">{new Date(p.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {meta && <Pagination meta={meta} page={page} onPageChange={setPage} />}
    </div>
  )
}
