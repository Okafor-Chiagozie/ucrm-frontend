import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import type { Product, Business, PaginationMeta } from '@/types'
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
import { Separator } from '@/components/ui/separator'
import Pagination from '@/components/Pagination'
import LoadingState from '@/components/LoadingState'
import EmptyState from '@/components/EmptyState'
import { toast } from 'sonner'
import { Search, Pencil, Package } from 'lucide-react'

export default function InventoryPage() {
  const { hasPermission } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [search, setSearch] = useState('')
  const [businessFilter, setBusinessFilter] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [editProduct, setEditProduct] = useState<Product | null>(null)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), per_page: '15' })
      if (search) params.set('search', search)
      if (businessFilter) params.set('business_id', businessFilter)
      const { data } = await api.get(`/products?${params}`)
      setProducts(data.data.data)
      setMeta(data.meta)
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }, [page, search, businessFilter])

  useEffect(() => { fetchProducts() }, [fetchProducts])
  useEffect(() => { api.get('/businesses?per_page=100').then(({ data }) => setBusinesses(data.data.data)).catch(() => {}) }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Inventory</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Monitor and update stock levels across all products</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3">
        <div className="flex-1 min-w-0 sm:max-w-sm">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Search</label>
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search products..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-9 h-10" /></div>
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
          <TableHeader><TableRow className="bg-muted/50 hover:bg-muted/50"><TableHead>Product</TableHead><TableHead>Business</TableHead><TableHead>Variations</TableHead><TableHead>Total Stock</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={6}><LoadingState text="Loading..." /></TableCell></TableRow>
            : products.length === 0 ? <TableRow><TableCell colSpan={6}><EmptyState icon={Package} title="No products" /></TableCell></TableRow>
            : products.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-muted-foreground">{p.business_name}</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {p.variations.map((v) => (
                      <div key={v.id} className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">{v.name}:</span>
                        <span className={`font-medium ${v.stock <= v.low_stock_threshold ? 'text-red-600' : ''}`}>{v.stock}</span>
                        {v.stock <= v.low_stock_threshold && <Badge variant="outline" className="text-xs font-normal border-amber-200 bg-amber-50 text-amber-700">Low</Badge>}
                      </div>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="font-medium">{p.total_stock}</TableCell>
                <TableCell>
                  {p.low_stock ? (
                    <Badge variant="outline" className="font-normal border-amber-200 bg-amber-50 text-amber-700">Low Stock</Badge>
                  ) : (
                    <Badge variant="outline" className="font-normal border-emerald-200 bg-emerald-50 text-emerald-700">In Stock</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {hasPermission('inventory.edit') && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditProduct(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {meta && <Pagination meta={meta} page={page} onPageChange={setPage} />}

      {editProduct && <StockDialog product={editProduct} onClose={() => setEditProduct(null)} onSuccess={fetchProducts} />}
    </div>
  )
}

function StockDialog({ product, onClose, onSuccess }: { product: Product; onClose: () => void; onSuccess: () => void }) {
  const [stocks, setStocks] = useState(product.variations.map((v) => ({ id: v.id, name: v.name, stock: v.stock, low_stock_threshold: v.low_stock_threshold })))
  const [saving, setSaving] = useState(false)

  const updateStock = (id: string, field: 'stock' | 'low_stock_threshold', val: number) => {
    setStocks(stocks.map((s) => s.id === id ? { ...s, [field]: val } : s))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.post(`/products/${product.id}`, {
        name: product.name,
        variations: stocks.map((s) => ({
          id: s.id,
          name: s.name,
          price: product.variations.find((v) => v.id === s.id)?.price ?? 0,
          stock: s.stock,
          low_stock_threshold: s.low_stock_threshold,
        })),
      }, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success('Stock updated')
      onClose()
      onSuccess()
    } catch { toast.error('Failed to update stock') }
    finally { setSaving(false) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Stock</DialogTitle>
          <DialogDescription>{product.name}</DialogDescription>
        </DialogHeader>
        <Separator />
        <div className="space-y-4 pt-2">
          {stocks.map((s) => (
            <div key={s.id} className="rounded-md border p-3">
              <p className="text-sm font-medium mb-2">{s.name}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Stock</Label>
                  <Input type="number" value={s.stock} onChange={(e) => updateStock(s.id, 'stock', Number(e.target.value))} min="0" className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Low Stock Alert</Label>
                  <Input type="number" value={s.low_stock_threshold} onChange={(e) => updateStock(s.id, 'low_stock_threshold', Number(e.target.value))} min="0" className="h-9" />
                </div>
              </div>
            </div>
          ))}
          <Separator />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Update Stock'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
