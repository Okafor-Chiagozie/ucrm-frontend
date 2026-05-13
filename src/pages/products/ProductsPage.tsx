import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import type { Product, Business, Category, PaginationMeta } from '@/types'
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
import { Plus, Search, Pencil, XCircle, ArrowUpDown, ArrowUp, ArrowDown, Trash2, Package, X } from 'lucide-react'
import LoadingState from '@/components/LoadingState'
import EmptyState from '@/components/EmptyState'

type SortField = 'name' | 'created_at'
type SortDir = 'asc' | 'desc'

export default function ProductsPage() {
  const { hasPermission } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [search, setSearch] = useState('')
  const [businessFilter, setBusinessFilter] = useState('')
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [deactivateProduct, setDeactivateProduct] = useState<Product | null>(null)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), per_page: '15', sort_by: sortField, sort_dir: sortDir })
      if (search) params.set('search', search)
      if (businessFilter) params.set('business_id', businessFilter)
      const { data } = await api.get(`/products?${params}`)
      setProducts(data.data.data)
      setMeta(data.meta)
    } catch {
      toast.error('Failed to load products')
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

  useEffect(() => { fetchProducts() }, [fetchProducts])
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
    if (!deactivateProduct) return
    try {
      await api.delete(`/products/${deactivateProduct.id}`)
      toast.success('Product deactivated')
      setDeactivateProduct(null)
      fetchProducts()
    } catch {
      toast.error('Failed to deactivate product')
    }
  }

  const formatPrice = (price: string | number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(Number(price))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Products</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage products and their pricing variations</p>
        </div>
        {hasPermission('products.create') && (
          <Button onClick={() => setShowCreate(true)} className="w-full sm:w-auto h-10">
            <Plus className="mr-1.5 h-4 w-4" /> Add Product
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3">
        <div className="flex-1 min-w-0 sm:max-w-sm">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search products..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-9 h-10" />
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
          <LoadingState text="Loading products..." />
        ) : products.length === 0 ? (
          <EmptyState icon={Package} title="No products found" description="Add a product to start managing your inventory" />
        ) : products.map((p) => (
          <div key={p.id} className="rounded-md border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.business_name} {p.category_name && `· ${p.category_name}`}</p>
              </div>
              <div className="flex gap-1">
                {hasPermission('products.edit') && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditProduct(p)}><Pencil className="h-3.5 w-3.5" /></Button>}
                {hasPermission('products.delete') && p.is_active && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeactivateProduct(p)}><XCircle className="h-3.5 w-3.5" /></Button>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline" className="font-normal border-blue-200 bg-blue-50 text-blue-700">{p.variations.length} variation{p.variations.length !== 1 ? 's' : ''}</Badge>
              <span className="text-muted-foreground">Stock: {p.stock}</span>
              {p.low_stock && <Badge variant="outline" className="font-normal border-amber-200 bg-amber-50 text-amber-700">Low stock</Badge>}
              <Badge variant="outline" className={`font-normal cursor-pointer ${p.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`} onClick={async (e) => { e.stopPropagation(); try { const fd = new FormData(); fd.append('is_active', p.is_active ? '0' : '1'); fd.append('name', p.name); await api.post(`/products/${p.id}`, fd); toast.success(p.is_active ? 'Deactivated' : 'Activated'); fetchProducts() } catch { toast.error('Failed') } }}>{p.is_active ? 'Active' : 'Inactive'}</Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {p.variations.slice(0, 3).map((v) => `${v.name}: ${formatPrice(v.price)}`).join(' · ')}
              {p.variations.length > 3 && ` +${p.variations.length - 3} more`}
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
                <span className="inline-flex items-center">Product <SortIcon field="name" /></span>
              </TableHead>
              <TableHead>Business</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Variations</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7}><LoadingState text="Loading products..." /></TableCell></TableRow>
            ) : products.length === 0 ? (
              <TableRow><TableCell colSpan={7}><EmptyState icon={Package} title="No products found" description="Add a product to start managing your inventory" /></TableCell></TableRow>
            ) : products.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-muted-foreground">{p.business_name}</TableCell>
                <TableCell className="text-muted-foreground">{p.category_name || '—'}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-normal border-blue-200 bg-blue-50 text-blue-700">{p.variations.length}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span>{p.stock}</span>
                    {p.low_stock && <Badge variant="outline" className="font-normal border-amber-200 bg-amber-50 text-amber-700 text-xs">Low</Badge>}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`font-normal cursor-pointer ${p.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`} onClick={async () => { try { const fd = new FormData(); fd.append('is_active', p.is_active ? '0' : '1'); fd.append('name', p.name); await api.post(`/products/${p.id}`, fd); toast.success(p.is_active ? 'Deactivated' : 'Activated'); fetchProducts() } catch { toast.error('Failed') } }}>{p.is_active ? 'Active' : 'Inactive'}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {hasPermission('products.edit') && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditProduct(p)}><Pencil className="h-3.5 w-3.5" /></Button>}
                    {hasPermission('products.delete') && p.is_active && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeactivateProduct(p)}><XCircle className="h-3.5 w-3.5" /></Button>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {meta && <Pagination meta={meta} page={page} onPageChange={setPage} />}

      <ProductDialog open={showCreate} businesses={businesses} onClose={() => setShowCreate(false)} onSuccess={fetchProducts} />
      {editProduct && <ProductDialog open product={editProduct} businesses={businesses} onClose={() => setEditProduct(null)} onSuccess={fetchProducts} />}

      <AlertDialog open={!!deactivateProduct} onOpenChange={(open) => { if (!open) setDeactivateProduct(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate {deactivateProduct?.name}?</AlertDialogTitle>
            <AlertDialogDescription>This product will no longer appear in order forms. Data will be preserved.</AlertDialogDescription>
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

interface VariationForm {
  id?: string
  name: string
  description: string
  price: string
  quantity: string
}

function ProductDialog({ open, product, businesses, onClose, onSuccess }: { open: boolean; product?: Product; businesses: Business[]; onClose: () => void; onSuccess: () => void }) {
  const isEdit = !!product
  const [name, setName] = useState(product?.name ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [businessId, setBusinessId] = useState(product?.business_id ?? '')
  const [categoryId, setCategoryId] = useState(product?.category_id ?? '')
  const [image, setImage] = useState<File | null>(null)
  const [stock, setStock] = useState(String(product?.stock ?? 0))
  const [lowStockThreshold, setLowStockThreshold] = useState(String(product?.low_stock_threshold ?? 5))
  const [categories, setCategories] = useState<Category[]>([])
  const [variations, setVariations] = useState<VariationForm[]>(
    product?.variations?.map((v) => ({
      id: v.id,
      name: v.name,
      description: v.description ?? '',
      price: String(v.price),
      quantity: String(v.quantity ?? 1),
    })) ?? [{ name: '', description: '', price: '', quantity: '1' }]
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!businessId) return
    api.get(`/categories?business_id=${businessId}&per_page=100`).then(({ data }) => {
      setCategories(data.data.data)
    }).catch(() => {})
  }, [businessId])

  const addVariation = () => {
    setVariations([...variations, { name: '', description: '', price: '', quantity: '1' }])
  }

  const removeVariation = (index: number) => {
    if (variations.length <= 1) return
    setVariations(variations.filter((_, i) => i !== index))
  }

  const updateVariation = (index: number, field: keyof VariationForm, value: string) => {
    const updated = [...variations]
    updated[index] = { ...updated[index], [field]: value }
    setVariations(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const formData = new FormData()
    formData.append('name', name)
    formData.append('description', description)
    if (!isEdit) formData.append('business_id', businessId)
    if (categoryId) formData.append('category_id', categoryId)
    if (image) formData.append('image', image)
    formData.append('stock', stock)
    formData.append('low_stock_threshold', lowStockThreshold)

    variations.forEach((v, i) => {
      if (v.id) formData.append(`variations[${i}][id]`, v.id)
      formData.append(`variations[${i}][name]`, v.name)
      formData.append(`variations[${i}][description]`, v.description)
      formData.append(`variations[${i}][price]`, v.price)
      formData.append(`variations[${i}][quantity]`, v.quantity)
    })

    try {
      if (isEdit) {
        await api.post(`/products/${product.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
        toast.success('Product updated')
      } else {
        await api.post('/products', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
        toast.success('Product created')
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Product' : 'Create Product'}</DialogTitle>
          <DialogDescription>{isEdit ? `Editing ${product.name}` : 'Add a new product with pricing variations'}</DialogDescription>
        </DialogHeader>
        <Separator />
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 py-2 custom-scrollbar">
          {error && <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Product Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Collagen Serum" required className="h-10" />
            </div>
            {!isEdit && (
              <div className="space-y-1.5">
                <Label>Business</Label>
                <Select value={businessId} onValueChange={(v) => { setBusinessId(v ?? ''); setCategoryId('') }}>
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
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={categoryId || 'none'} onValueChange={(v) => setCategoryId(v === 'none' ? '' : v ?? '')}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Select category">
                    {categories.find((c) => c.id === categoryId)?.name ?? 'No category'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Image</Label>
              <Input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] ?? null)} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label>Stock</Label>
              <Input type="number" value={stock} onChange={(e) => setStock(e.target.value)} min="0" required className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label>Low Stock Alert</Label>
              <Input type="number" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} min="0" className="h-10" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Product description..."
              className="flex min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <Separator />

          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-semibold">Pricing Variations</Label>
              <Button type="button" variant="outline" size="sm" onClick={addVariation}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Variation
              </Button>
            </div>
            <div className="space-y-3">
              {variations.map((v, i) => (
                <div key={i} className="rounded-md border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Variation {i + 1}</span>
                    {variations.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeVariation(i)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Name</Label>
                      <Input value={v.name} onChange={(e) => updateVariation(i, 'name', e.target.value)} placeholder="e.g. 1 Pack" required className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Price (NGN)</Label>
                      <Input type="number" value={v.price} onChange={(e) => updateVariation(i, 'price', e.target.value)} placeholder="0" required min="0" step="0.01" className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Quantity</Label>
                      <Input type="number" value={v.quantity} onChange={(e) => updateVariation(i, 'quantity', e.target.value)} placeholder="1" required min="1" className="h-9" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Product'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
