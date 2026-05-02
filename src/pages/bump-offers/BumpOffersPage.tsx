import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'
import type { BumpOffer, Product, PaginationMeta } from '@/types'
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
import { Plus, Pencil, Trash2, Gift } from 'lucide-react'

export default function BumpOffersPage() {
  const [offers, setOffers] = useState<BumpOffer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [productFilter, setProductFilter] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editOffer, setEditOffer] = useState<BumpOffer | null>(null)
  const [deleteOffer, setDeleteOffer] = useState<BumpOffer | null>(null)

  const fetchOffers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), per_page: '15' })
      if (productFilter) params.set('product_id', productFilter)
      const { data } = await api.get(`/bump-offers?${params}`)
      setOffers(data.data.data)
      setMeta(data.meta)
    } catch { toast.error('Failed to load bump offers') }
    finally { setLoading(false) }
  }, [page, productFilter])

  useEffect(() => { fetchOffers() }, [fetchOffers])
  useEffect(() => { api.get('/products?per_page=100&is_active=true').then(({ data }) => setProducts(data.data.data)).catch(() => {}) }, [])

  const handleDelete = async () => {
    if (!deleteOffer) return
    try { await api.delete(`/bump-offers/${deleteOffer.id}`); toast.success('Deleted'); setDeleteOffer(null); fetchOffers() }
    catch { toast.error('Failed') }
  }

  const formatPrice = (p: string | number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(Number(p))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Bump Offers</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Upsell products on order forms</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="w-full sm:w-auto h-10">
          <Plus className="mr-1.5 h-4 w-4" /> Add Bump Offer
        </Button>
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Filter by Product</label>
        <Select value={productFilter || 'all'} onValueChange={(v) => { setProductFilter(v === 'all' ? '' : v ?? ''); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue>{products.find((p) => p.id === productFilter)?.name ?? 'All Products'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.business_name})</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Main Product</TableHead>
              <TableHead>Bump Product</TableHead>
              <TableHead>Headline</TableHead>
              <TableHead>Special Price</TableHead>
              <TableHead>Original Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={7}><LoadingState text="Loading..." /></TableCell></TableRow>
            : offers.length === 0 ? <TableRow><TableCell colSpan={7}><EmptyState icon={Gift} title="No bump offers" description="Add upsell offers to boost order value" /></TableCell></TableRow>
            : offers.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-medium">{o.product_name}</TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{o.bump_product_name}</p>
                    <p className="text-xs text-muted-foreground">{o.bump_variation_name}</p>
                  </div>
                </TableCell>
                <TableCell className="max-w-48 truncate">{o.headline}</TableCell>
                <TableCell><span className="font-medium text-emerald-700">{formatPrice(o.special_price)}</span></TableCell>
                <TableCell><span className="text-muted-foreground line-through">{formatPrice(o.original_price)}</span></TableCell>
                <TableCell>
                  <Badge variant="outline" className={`font-normal ${o.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                    {o.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditOffer(o)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteOffer(o)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {meta && <Pagination meta={meta} page={page} onPageChange={setPage} />}

      <BumpOfferDialog open={showCreate} products={products} onClose={() => setShowCreate(false)} onSuccess={fetchOffers} />
      {editOffer && <BumpOfferDialog open offer={editOffer} products={products} onClose={() => setEditOffer(null)} onSuccess={fetchOffers} />}

      <AlertDialog open={!!deleteOffer} onOpenChange={(o) => { if (!o) setDeleteOffer(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this bump offer?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function BumpOfferDialog({ open, offer, products, onClose, onSuccess }: { open: boolean; offer?: BumpOffer; products: Product[]; onClose: () => void; onSuccess: () => void }) {
  const isEdit = !!offer
  const [productId, setProductId] = useState(offer?.product_id ?? '')
  const [bumpProductId, setBumpProductId] = useState(offer?.bump_product_id ?? '')
  const [bumpVariationId, setBumpVariationId] = useState(offer?.bump_variation_id ?? '')
  const [headline, setHeadline] = useState(offer?.headline ?? '')
  const [description, setDescription] = useState(offer?.description ?? '')
  const [specialPrice, setSpecialPrice] = useState(offer?.special_price ?? '')
  const [originalPrice, setOriginalPrice] = useState(offer?.original_price ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const bumpProduct = products.find((p) => p.id === bumpProductId)
  const variations = bumpProduct?.variations ?? []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setError('')
    const payload = { product_id: productId, bump_product_id: bumpProductId, bump_variation_id: bumpVariationId, headline, description, special_price: specialPrice, original_price: originalPrice }
    try {
      if (isEdit) { await api.put(`/bump-offers/${offer.id}`, { headline, description, special_price: specialPrice, original_price: originalPrice }); toast.success('Updated') }
      else { await api.post('/bump-offers', payload); toast.success('Created') }
      onClose(); onSuccess()
    } catch (err) { setError((err as any).response?.data?.message || 'Failed') }
    finally { setSubmitting(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Bump Offer' : 'Create Bump Offer'}</DialogTitle>
          <DialogDescription>{isEdit ? `Editing offer for ${offer.product_name}` : 'Add an upsell offer that appears on the order form'}</DialogDescription>
        </DialogHeader>
        <Separator />
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">{error}</div>}

          {!isEdit && (
            <>
              <div className="space-y-1.5">
                <Label>Main Product (form this appears on)</Label>
                <Select value={productId} onValueChange={(v) => setProductId(v ?? '')}>
                  <SelectTrigger className="h-10 w-full"><SelectValue>{products.find((p) => p.id === productId)?.name ?? 'Select product'}</SelectValue></SelectTrigger>
                  <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.business_name})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Bump Product (product being upsold)</Label>
                <Select value={bumpProductId} onValueChange={(v) => { setBumpProductId(v ?? ''); setBumpVariationId('') }}>
                  <SelectTrigger className="h-10 w-full"><SelectValue>{products.find((p) => p.id === bumpProductId)?.name ?? 'Select product'}</SelectValue></SelectTrigger>
                  <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.business_name})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {variations.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Bump Variation</Label>
                  <Select value={bumpVariationId} onValueChange={(v) => {
                    setBumpVariationId(v ?? '')
                    const vr = variations.find((x) => x.id === v)
                    if (vr) setOriginalPrice(vr.price)
                  }}>
                    <SelectTrigger className="h-10 w-full"><SelectValue>{variations.find((v) => v.id === bumpVariationId)?.name ?? 'Select variation'}</SelectValue></SelectTrigger>
                    <SelectContent>{variations.map((v) => <SelectItem key={v.id} value={v.id}>{v.name} — ₦{Number(v.price).toLocaleString()}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          <div className="space-y-1.5">
            <Label>Headline</Label>
            <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. Would You Like To Add This?" required className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of the upsell..." className="flex min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Special Price (NGN)</Label>
              <Input type="number" value={specialPrice} onChange={(e) => setSpecialPrice(e.target.value)} required min="0" step="0.01" className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label>Original Price (NGN)</Label>
              <Input type="number" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} required min="0" step="0.01" className="h-10" />
            </div>
          </div>
          <Separator />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Offer'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
