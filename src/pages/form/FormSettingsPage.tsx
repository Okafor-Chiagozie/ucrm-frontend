import { useState, useEffect } from 'react'
import api from '@/lib/api'
import type { Product, Business, FormSettings } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import LoadingState from '@/components/LoadingState'
import EmptyState from '@/components/EmptyState'
import { toast } from 'sonner'
import { Copy, ExternalLink, Code, Pencil, ToggleLeft, ToggleRight } from 'lucide-react'

export default function FormSettingsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [businessFilter, setBusinessFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [embedProduct, setEmbedProduct] = useState<Product | null>(null)

  const fetchData = () => {
    setLoading(true)
    Promise.all([
      api.get('/products?per_page=100&is_active=true'),
      api.get('/businesses?per_page=100'),
    ]).then(([prodRes, bizRes]) => {
      setProducts(prodRes.data.data.data)
      setBusinesses(bizRes.data.data.data)
    }).catch(() => toast.error('Failed to load'))
    .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

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
        <p className="text-sm text-muted-foreground mt-0.5">Customize and get embed codes for your product order forms</p>
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
        <EmptyState icon={Code} title="No active products" description="Create a product first to set up an order form" />
      ) : (
        <div className="space-y-3">
          {filtered.map((product) => (
            <Card key={product.id} className="border">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{product.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {product.business_name} &middot; {product.variations.length} variation{product.variations.length !== 1 ? 's' : ''}
                      &middot; Button: "{product.form_settings.button_text}"
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditProduct(product)}>
                      <Pencil className="mr-1.5 h-3.5 w-3.5" /> Customize
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => window.open(`/form/${product.id}`, '_blank')}>
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Preview
                    </Button>
                    <Button size="sm" onClick={() => setEmbedProduct(product)}>
                      <Code className="mr-1.5 h-3.5 w-3.5" /> Embed Code
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editProduct && (
        <FormBuilderDialog
          product={editProduct}
          onClose={() => setEditProduct(null)}
          onSaved={() => { setEditProduct(null); fetchData() }}
        />
      )}

      {embedProduct && (
        <Dialog open onOpenChange={() => setEmbedProduct(null)}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Embed Code</DialogTitle>
              <DialogDescription>{embedProduct.name} — paste this into your sales page HTML</DialogDescription>
            </DialogHeader>
            <Separator />
            <div className="relative">
              <pre className="bg-muted rounded-md p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all max-h-60 overflow-y-auto custom-scrollbar">{getEmbedCode(embedProduct)}</pre>
              <Button size="sm" className="absolute top-2 right-2" onClick={() => copyToClipboard(getEmbedCode(embedProduct))}>
                <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function FormBuilderDialog({ product, onClose, onSaved }: { product: Product; onClose: () => void; onSaved: () => void }) {
  const [settings, setSettings] = useState<FormSettings>({ ...product.form_settings })
  const [saving, setSaving] = useState(false)

  const set = (key: keyof FormSettings, value: string | boolean) => {
    setSettings({ ...settings, [key]: value })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put(`/products/${product.id}/form-settings`, settings)
      toast.success('Form settings saved')
      onSaved()
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Customize Order Form</DialogTitle>
          <DialogDescription>{product.name} — {product.business_name}</DialogDescription>
        </DialogHeader>
        <Separator />
        <div className="flex-1 overflow-y-auto space-y-5 py-2 custom-scrollbar">
          <div className="space-y-1.5">
            <Label>Form Heading</Label>
            <Input value={settings.heading} onChange={(e) => set('heading', e.target.value)} className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label>Sub-heading</Label>
            <textarea
              value={settings.subheading}
              onChange={(e) => set('subheading', e.target.value)}
              className="flex min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Button Text</Label>
              <Input value={settings.button_text} onChange={(e) => set('button_text', e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label>Button Color</Label>
              <div className="flex gap-2 items-center">
                <input type="color" value={settings.button_color} onChange={(e) => set('button_color', e.target.value)} className="h-10 w-14 rounded-md border cursor-pointer" />
                <Input value={settings.button_color} onChange={(e) => set('button_color', e.target.value)} className="h-10 font-mono" />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Success Message</Label>
            <textarea
              value={settings.success_message}
              onChange={(e) => set('success_message', e.target.value)}
              className="flex min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <Separator />
          <h4 className="text-sm font-semibold">Field Visibility</h4>

          <div className="space-y-3">
            {([
              { key: 'show_whatsapp' as const, label: 'WhatsApp Number', description: 'Show WhatsApp number field on the form' },
              { key: 'show_email' as const, label: 'Email Address', description: 'Show email field on the form' },
              { key: 'show_coupon' as const, label: 'Coupon Code', description: 'Allow customers to enter discount codes' },
            ]).map(({ key, label, description }) => (
              <div key={key} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <button type="button" className="cursor-pointer" onClick={() => set(key, !settings[key])}>
                  {settings[key] ? (
                    <ToggleRight className="h-7 w-7 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="h-7 w-7 text-muted-foreground" />
                  )}
                </button>
              </div>
            ))}
          </div>

          <Separator />
          <h4 className="text-sm font-semibold">Preview</h4>
          <div className="rounded-md border p-6 bg-white">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">{settings.heading}</h3>
              <p className="text-xs text-gray-500 mt-1">{settings.subheading}</p>
            </div>
            <div className="space-y-3">
              <div className="h-10 rounded-md border bg-gray-50" />
              <div className="h-10 rounded-md border bg-gray-50" />
              {settings.show_whatsapp && <div className="h-10 rounded-md border bg-gray-50 border-dashed" />}
              <div className="h-10 rounded-md border bg-gray-50" />
              <div className="h-10 rounded-md border bg-gray-50" />
              {settings.show_email && <div className="h-10 rounded-md border bg-gray-50 border-dashed" />}
              <div className="rounded-md border p-3 bg-gray-50">
                <div className="h-3 w-28 bg-gray-200 rounded mb-2" />
                <div className="space-y-2">
                  <div className="h-10 rounded-md border bg-white" />
                  <div className="h-10 rounded-md border bg-white" />
                </div>
              </div>
              {settings.show_coupon && <div className="h-10 rounded-md border bg-gray-50 border-dashed" />}
              <button className="w-full h-12 rounded-md text-white font-bold text-sm" style={{ background: settings.button_color }} disabled>
                {settings.button_text}
              </button>
            </div>
          </div>
        </div>
        <Separator />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
