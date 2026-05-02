import { useState, useEffect } from 'react'
import api from '@/lib/api'
import type { Product, Business } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import LoadingState from '@/components/LoadingState'
import EmptyState from '@/components/EmptyState'
import { toast } from 'sonner'
import { Copy, ExternalLink, Code } from 'lucide-react'

export default function FormSettingsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [businessFilter, setBusinessFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  useEffect(() => {
    Promise.all([
      api.get('/products?per_page=100&is_active=true'),
      api.get('/businesses?per_page=100'),
    ]).then(([prodRes, bizRes]) => {
      setProducts(prodRes.data.data.data)
      setBusinesses(bizRes.data.data.data)
    }).catch(() => toast.error('Failed to load'))
    .finally(() => setLoading(false))
  }, [])

  const filtered = businessFilter ? products.filter((p) => p.business_id === businessFilter) : products
  const frontendUrl = window.location.origin

  const getEmbedCode = (product: Product) => {
    const formUrl = `${frontendUrl}/form/${product.id}`
    return `<div style="width:100%;max-width:560px;margin:0 auto;">
  <iframe
    src="${formUrl}"
    frameborder="0"
    scrolling="no"
    width="100%"
    style="min-height:800px;border:none;"
    id="ucrm-form-${product.id}"
  ></iframe>
</div>
<script>
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'ucrm-form-height') {
      var frame = document.getElementById('ucrm-form-${product.id}');
      if (frame) frame.style.height = e.data.height + 'px';
    }
  });
</script>`
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Embed code copied to clipboard')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Order Forms</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Get embed codes for your product order forms</p>
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Business</label>
        <Select value={businessFilter || 'all'} onValueChange={(v) => setBusinessFilter(v === 'all' ? '' : v ?? '')}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue>{businesses.find((b) => b.id === businessFilter)?.name ?? 'All Businesses'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Businesses</SelectItem>
            {businesses.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? <LoadingState text="Loading products..." /> : filtered.length === 0 ? (
        <EmptyState icon={Code} title="No active products" description="Create a product first to generate an order form" />
      ) : (
        <div className="space-y-4">
          {filtered.map((product) => (
            <Card key={product.id} className="border">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{product.name}</h3>
                    <p className="text-xs text-muted-foreground">{product.business_name} &middot; {product.variations.length} variation{product.variations.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => window.open(`/form/${product.id}`, '_blank')}>
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Preview
                    </Button>
                    <Button size="sm" onClick={() => setSelectedProduct(product)}>
                      <Code className="mr-1.5 h-3.5 w-3.5" /> Get Code
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-sm p-4" onClick={() => setSelectedProduct(null)}>
          <div className="bg-card rounded-md border shadow-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Embed Code</h3>
                <p className="text-sm text-muted-foreground">{selectedProduct.name}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedProduct(null)}>Close</Button>
            </div>
            <Separator className="mb-4" />
            <p className="text-sm text-muted-foreground mb-3">Copy this code and paste it into your sales page HTML:</p>
            <div className="relative">
              <pre className="bg-muted rounded-md p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">{getEmbedCode(selectedProduct)}</pre>
              <Button size="sm" className="absolute top-2 right-2" onClick={() => copyToClipboard(getEmbedCode(selectedProduct))}>
                <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
