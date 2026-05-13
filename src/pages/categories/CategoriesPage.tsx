import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import type { Category, Business, PaginationMeta } from '@/types'
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
import { toast } from 'sonner'
import { Plus, Search, Pencil, XCircle, ArrowUpDown, ArrowUp, ArrowDown, Tag, X } from 'lucide-react'
import LoadingState from '@/components/LoadingState'
import EmptyState from '@/components/EmptyState'

type SortField = 'name' | 'created_at'
type SortDir = 'asc' | 'desc'

export default function CategoriesPage() {
  const { hasPermission } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [search, setSearch] = useState('')
  const [businessFilter, setBusinessFilter] = useState('')
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editCat, setEditCat] = useState<Category | null>(null)
  const [deactivateCat, setDeactivateCat] = useState<Category | null>(null)

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), per_page: '15', sort_by: sortField, sort_dir: sortDir })
      if (search) params.set('search', search)
      if (businessFilter) params.set('business_id', businessFilter)
      const { data } = await api.get(`/categories?${params}`)
      setCategories(data.data.data)
      setMeta(data.meta)
    } catch {
      toast.error('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }, [page, search, businessFilter, sortField, sortDir])

  const fetchBusinesses = useCallback(async () => {
    try {
      const { data } = await api.get('/businesses?per_page=100')
      setBusinesses(data.data.data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchCategories() }, [fetchCategories])
  useEffect(() => { fetchBusinesses() }, [fetchBusinesses])

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/50" />
    return sortDir === 'asc' ? <ArrowUp className="ml-1 h-3.5 w-3.5 text-primary" /> : <ArrowDown className="ml-1 h-3.5 w-3.5 text-primary" />
  }

  const handleDeactivate = async () => {
    if (!deactivateCat) return
    try {
      await api.delete(`/categories/${deactivateCat.id}`)
      toast.success('Category deactivated')
      setDeactivateCat(null)
      fetchCategories()
    } catch {
      toast.error('Failed to deactivate category')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Categories</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Organize products into categories per business</p>
        </div>
        {hasPermission('categories.create') && (
          <Button onClick={() => setShowCreate(true)} className="w-full sm:w-auto h-10">
            <Plus className="mr-1.5 h-4 w-4" /> Add Category
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3">
        <div className="flex-1 min-w-0 sm:max-w-sm">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search categories..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-9 h-10" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Business</label>
          <Select value={businessFilter || 'all'} onValueChange={(v) => { setBusinessFilter(v === 'all' ? '' : v ?? ''); setPage(1) }}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Businesses">
                {businesses.find((b) => b.id === businessFilter)?.name ?? 'All Businesses'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Businesses</SelectItem>
              {businesses.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
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
      <div className="md:hidden space-y-3">
        {loading ? (
          <LoadingState text="Loading categories..." />
        ) : categories.length === 0 ? (
          <EmptyState icon={Tag} title="No categories found" description="Create a category to organize your products" />
        ) : categories.map((c) => (
          <div key={c.id} className="rounded-md border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.business_name}</p>
              </div>
              <div className="flex gap-1">
                {hasPermission('categories.edit') && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditCat(c)}><Pencil className="h-3.5 w-3.5" /></Button>}
                {hasPermission('categories.delete') && c.is_active && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeactivateCat(c)}><XCircle className="h-3.5 w-3.5" /></Button>}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="font-normal border-blue-200 bg-blue-50 text-blue-700">{c.products_count} products</Badge>
                <Badge variant="outline" className={`font-normal cursor-pointer ${c.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`} onClick={async (e) => { e.stopPropagation(); try { await api.put(`/categories/${c.id}`, { is_active: !c.is_active }); toast.success(c.is_active ? 'Deactivated' : 'Activated'); fetchCategories() } catch { toast.error('Failed') } }}>{c.is_active ? 'Active' : 'Inactive'}</Badge>
              </div>
              <span className="text-muted-foreground">{new Date(c.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('name')}>
                <span className="inline-flex items-center">Name <SortIcon field="name" /></span>
              </TableHead>
              <TableHead>Business</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('created_at')}>
                <span className="inline-flex items-center">Created <SortIcon field="created_at" /></span>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6}><LoadingState text="Loading categories..." /></TableCell></TableRow>
            ) : categories.length === 0 ? (
              <TableRow><TableCell colSpan={6}><EmptyState icon={Tag} title="No categories found" description="Create a category to organize your products" /></TableCell></TableRow>
            ) : categories.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-muted-foreground">{c.business_name}</TableCell>
                <TableCell><Badge variant="outline" className="font-normal border-blue-200 bg-blue-50 text-blue-700">{c.products_count}</Badge></TableCell>
                <TableCell>
                  <Badge variant="outline" className={`font-normal cursor-pointer ${c.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`} onClick={async (e) => { e.stopPropagation(); try { await api.put(`/categories/${c.id}`, { is_active: !c.is_active }); toast.success(c.is_active ? 'Deactivated' : 'Activated'); fetchCategories() } catch { toast.error('Failed') } }}>{c.is_active ? 'Active' : 'Inactive'}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{new Date(c.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {hasPermission('categories.edit') && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditCat(c)}><Pencil className="h-3.5 w-3.5" /></Button>}
                    {hasPermission('categories.delete') && c.is_active && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeactivateCat(c)}><XCircle className="h-3.5 w-3.5" /></Button>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {meta && <Pagination meta={meta} page={page} onPageChange={setPage} />}

      <CategoryDialog open={showCreate} businesses={businesses} onClose={() => setShowCreate(false)} onSuccess={fetchCategories} />
      {editCat && <CategoryDialog open category={editCat} businesses={businesses} onClose={() => setEditCat(null)} onSuccess={fetchCategories} />}

      <AlertDialog open={!!deactivateCat} onOpenChange={(open) => { if (!open) setDeactivateCat(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate {deactivateCat?.name}?</AlertDialogTitle>
            <AlertDialogDescription>Products in this category will remain but will be uncategorized.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function CategoryDialog({ open, category, businesses, onClose, onSuccess }: { open: boolean; category?: Category; businesses: Business[]; onClose: () => void; onSuccess: () => void }) {
  const isEdit = !!category
  const [name, setName] = useState(category?.name ?? '')
  const [description, setDescription] = useState(category?.description ?? '')
  const [businessId, setBusinessId] = useState(category?.business_id ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      if (isEdit) {
        await api.put(`/categories/${category.id}`, { name, description })
        toast.success('Category updated')
      } else {
        await api.post('/categories', { name, description, business_id: businessId })
        toast.success('Category created')
      }
      onClose()
      onSuccess()
    } catch (err) {
      const data = (err as any).response?.data
      setError(data?.errors ? Object.values(data.errors as Record<string, string[]>).flat().join(' ') : data?.message || 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Category' : 'Create Category'}</DialogTitle>
          <DialogDescription>{isEdit ? `Editing ${category.name}` : 'Add a new category to a business'}</DialogDescription>
        </DialogHeader>
        <Separator />
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">{error}</div>}
          <div className="space-y-1.5">
            <Label>Category Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Skincare" required className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              className="flex min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          {!isEdit && (
            <div className="space-y-1.5">
              <Label>Business</Label>
              <Select value={businessId} onValueChange={(v) => setBusinessId(v ?? '')}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Select business">
                    {businesses.find((b) => b.id === businessId)?.name ?? 'Select business'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {businesses.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <Separator />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Category'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
