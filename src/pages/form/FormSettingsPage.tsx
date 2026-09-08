import { useState, useEffect } from 'react'
import api from '@/lib/api'
import type { Product, Business, FormSettings, ProductForm, User } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Separator } from '@/components/ui/separator'
import LoadingState from '@/components/LoadingState'
import EmptyState from '@/components/EmptyState'
import { toast } from 'sonner'
import {
  Copy, ExternalLink, Code, Pencil, ToggleLeft, ToggleRight, Plus, Trash2, Files,
} from 'lucide-react'
import type { CustomFormField, CustomFieldType } from '@/types'
import { useAuth } from '@/contexts/AuthContext'

export default function FormSettingsPage() {
  const { user } = useAuth()
  // Marketers always own what they build; everyone else can assign an owner.
  const canAssignOwner = user?.role !== 'Marketer'
  const [products, setProducts] = useState<Product[]>([])
  const [owners, setOwners] = useState<User[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [businessFilter, setBusinessFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<{ product: Product; form: ProductForm } | null>(null)
  const [embedding, setEmbedding] = useState<{ product: Product; form: ProductForm } | null>(null)
  const [creatingFor, setCreatingFor] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState<{ product: Product; form: ProductForm } | null>(null)

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

  // Forms are assigned to marketers, so only they are offered. Marketers
  // themselves never see this list — they always own what they build.
  useEffect(() => {
    if (!canAssignOwner) return
    api.get('/users?per_page=100&is_active=true&role=Marketer')
      .then(({ data }) => setOwners(data.data.data))
      .catch(() => {})
  }, [canAssignOwner])

  const filtered = businessFilter ? products.filter((p) => p.business_id === businessFilter) : products

  const errorMessage = (err: unknown, fallback: string) =>
    (err as { response?: { data?: { message?: string } } }).response?.data?.message || fallback

  /**
   * Apply a change to one product's forms in place. Every write endpoint returns
   * the affected form, so nothing needs re-fetching — the list keeps its scroll
   * position and only the row that changed re-renders.
   */
  const patchForms = (productId: string, update: (forms: ProductForm[]) => ProductForm[]) => {
    setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, forms: update(p.forms) } : p)))
  }

  const replaceForm = (productId: string, form: ProductForm) =>
    patchForms(productId, (forms) => forms.map((f) => (f.id === form.id ? form : f)))

  const addForm = (productId: string, form: ProductForm) =>
    patchForms(productId, (forms) => [...forms, form])

  const toggleActive = async (product: Product, form: ProductForm) => {
    try {
      const { data } = await api.put(`/product-forms/${form.id}`, { is_active: !form.is_active })
      replaceForm(product.id, data.data)
      toast.success(form.is_active ? 'Form deactivated' : 'Form activated')
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to update form'))
    }
  }

  const duplicateForm = async (product: Product, form: ProductForm) => {
    try {
      const { data } = await api.post(`/product-forms/${form.id}/duplicate`)
      addForm(product.id, data.data)
      toast.success('Form duplicated')
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to duplicate form'))
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    const { product, form } = deleting
    try {
      await api.delete(`/product-forms/${form.id}`)
      patchForms(product.id, (forms) => forms.filter((f) => f.id !== form.id))
      setDeleting(null)
      toast.success('Form deleted')
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to delete form'))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Order Forms</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Build as many order forms as you need per product — each with its own fields and embed code
        </p>
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
              <CardContent className="p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{product.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {product.business_name} &middot; {product.variations.length} variation{product.variations.length !== 1 ? 's' : ''}
                      &middot; {product.forms.length} form{product.forms.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs sm:text-sm w-fit" onClick={() => setCreatingFor(product)}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add Form
                  </Button>
                </div>

                <div className="space-y-2">
                  {product.forms.map((form) => (
                    <div
                      key={form.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-md border p-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate">{form.name}</span>
                          {!form.is_active && <Badge variant="outline" className="text-[10px] text-muted-foreground">Inactive</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Button: "{form.settings.button_text}"
                          {(form.settings.custom_fields?.length ?? 0) > 0 && (
                            <> &middot; {form.settings.custom_fields.length} custom field{form.settings.custom_fields.length !== 1 ? 's' : ''}</>
                          )}
                          {form.creator_name && <> &middot; Built by {form.creator_name}</>}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1.5 shrink-0">
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => setEditing({ product, form })}>
                          <Pencil className="mr-1 h-3.5 w-3.5" /> Customize
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => window.open(`/form/${form.id}`, '_blank')}>
                          <ExternalLink className="mr-1 h-3.5 w-3.5" /> Preview
                        </Button>
                        <Button size="sm" className="text-xs" onClick={() => setEmbedding({ product, form })}>
                          <Code className="mr-1 h-3.5 w-3.5" /> Embed
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Duplicate" onClick={() => duplicateForm(product, form)}>
                          <Files className="h-3.5 w-3.5" />
                        </Button>
                        <button
                          type="button"
                          className="cursor-pointer px-1"
                          title={form.is_active ? 'Deactivate' : 'Activate'}
                          onClick={() => toggleActive(product, form)}
                        >
                          {form.is_active
                            ? <ToggleRight className="h-6 w-6 text-emerald-600" />
                            : <ToggleLeft className="h-6 w-6 text-muted-foreground" />}
                        </button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          title="Delete"
                          onClick={() => setDeleting({ product, form })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {creatingFor && (
        <AddFormDialog
          product={creatingFor}
          owners={owners}
          canAssign={canAssignOwner}
          onClose={() => setCreatingFor(null)}
          onCreated={(form) => { addForm(creatingFor.id, form); setCreatingFor(null) }}
        />
      )}

      {editing && (
        <FormBuilderDialog
          product={editing.product}
          form={editing.form}
          owners={owners}
          canAssign={canAssignOwner}
          onClose={() => setEditing(null)}
          onSaved={(form) => { replaceForm(editing.product.id, form); setEditing(null) }}
        />
      )}

      {embedding && <EmbedDialog product={embedding.product} form={embedding.form} onClose={() => setEmbedding(null)} />}

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleting?.form.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Its link stops working and orders placed through it lose their "ordered via" label. To take the
              form offline but keep that history, deactivate it instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function AddFormDialog({ product, owners, canAssign, onClose, onCreated }: {
  product: Product
  owners: User[]
  canAssign: boolean
  onClose: () => void
  onCreated: (form: ProductForm) => void
}) {
  const [name, setName] = useState('')
  const [copyFrom, setCopyFrom] = useState('')
  const [ownerId, setOwnerId] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Give the form a name')
      return
    }
    setSaving(true)
    try {
      const { data } = await api.post(`/products/${product.id}/forms`, {
        name: name.trim(),
        copy_from: copyFrom || undefined,
        created_by: ownerId || undefined,
      })
      toast.success('Form created')
      onCreated(data.data)
    } catch (err) {
      toast.error((err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to create form')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Order Form</DialogTitle>
          <DialogDescription>{product.name} — a new form with its own fields and embed code</DialogDescription>
        </DialogHeader>
        <Separator />
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Form Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Facebook Ad Form"
              className="h-10"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">Only you see this — it labels the form in this list and on orders.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Start From</Label>
            <Select value={copyFrom || 'blank'} onValueChange={(v) => setCopyFrom(v === 'blank' ? '' : v ?? '')}>
              <SelectTrigger className="w-full h-10">
                <SelectValue>
                  {product.forms.find((f) => f.id === copyFrom)?.name ?? 'Blank form'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blank">Blank form</SelectItem>
                {product.forms.map((f) => <SelectItem key={f.id} value={f.id}>Copy of "{f.name}"</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {canAssign && (
            <div className="space-y-1.5">
              <Label>Assign To</Label>
              <Select value={ownerId || 'me'} onValueChange={(v) => setOwnerId(v === 'me' ? '' : v ?? '')}>
                <SelectTrigger className="w-full h-10">
                  <SelectValue>{owners.find((o) => o.id === ownerId)?.name ?? 'Me'}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="me">Me</SelectItem>
                  {owners.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {owners.length > 0
                  ? "Orders from this form count towards the marketer it's assigned to, on Form Performance."
                  : 'No marketers yet — this form will be assigned to you, and you can hand it over later.'}
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Creating...' : 'Create Form'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EmbedDialog({ product, form, onClose }: { product: Product; form: ProductForm; onClose: () => void }) {
  const formUrl = `${window.location.origin}/form/${form.id}`

  const embedCode = `<div style="width:100%;max-width:560px;margin:0 auto;">
  <iframe
    src="${formUrl}"
    frameborder="0"
    scrolling="no"
    width="100%"
    style="min-height:800px;border:none;"
    id="ucrm-form-${form.id}"
  ></iframe>
</div>
<script>
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'ucrm-form-height') {
      var frame = document.getElementById('ucrm-form-${form.id}');
      if (frame) frame.style.height = e.data.height + 'px';
    }
  });
</script>`

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Embed Code</DialogTitle>
          <DialogDescription>
            {product.name} — "{form.name}" — paste this into your sales page HTML
          </DialogDescription>
        </DialogHeader>
        <Separator />
        {!form.is_active && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
            This form is inactive, so the embed will not load for customers. Activate it first.
          </div>
        )}
        <div className="space-y-1.5">
          <Label className="text-xs">Direct link</Label>
          <div className="flex gap-2">
            <Input readOnly value={formUrl} className="h-9 font-mono text-xs" />
            <Button size="sm" variant="outline" onClick={() => copyToClipboard(formUrl, 'Link')}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="relative">
          <pre className="bg-muted rounded-md p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all max-h-60 overflow-y-auto custom-scrollbar">{embedCode}</pre>
          <Button size="sm" className="absolute top-2 right-2" onClick={() => copyToClipboard(embedCode, 'Embed code')}>
            <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function FormBuilderDialog({ product, form, owners, canAssign, onClose, onSaved }: {
  product: Product
  form: ProductForm
  owners: User[]
  canAssign: boolean
  onClose: () => void
  onSaved: (form: ProductForm) => void
}) {
  const { hasFeature } = useAuth()
  const couponsEnabled = hasFeature('coupons')
  const [name, setName] = useState(form.name)
  const [ownerId, setOwnerId] = useState(form.created_by ?? '')
  const [settings, setSettings] = useState<FormSettings>({ ...form.settings })
  const [saving, setSaving] = useState(false)

  // Marketers are the assignable set, but a form migrated from before ownership
  // existed sits with an admin — keep that owner selectable so opening the form
  // doesn't silently reassign it.
  const ownerOptions = [
    ...owners.map((o) => ({ id: o.id, name: o.name, suffix: '' })),
    ...(form.created_by && !owners.some((o) => o.id === form.created_by)
      ? [{ id: form.created_by, name: form.creator_name ?? 'Current owner', suffix: ' — current owner' }]
      : []),
  ]

  const set = (key: keyof FormSettings, value: string | boolean) => {
    setSettings({ ...settings, [key]: value })
  }

  const customFields = settings.custom_fields ?? []

  const setCustomFields = (fields: CustomFormField[]) => {
    setSettings({ ...settings, custom_fields: fields })
  }

  const addCustomField = () => {
    setCustomFields([
      ...customFields,
      { key: crypto.randomUUID(), label: '', type: 'text', required: false, options: [] },
    ])
  }

  const updateCustomField = (index: number, patch: Partial<CustomFormField>) => {
    setCustomFields(customFields.map((f, i) => (i === index ? { ...f, ...patch } : f)))
  }

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Give the form a name')
      return
    }

    // Drop fields with no label; require options for select fields.
    const cleanedFields = customFields
      .map((f) => ({ ...f, label: f.label.trim(), options: (f.options ?? []).map((o) => o.trim()).filter(Boolean) }))
      .filter((f) => f.label)

    if (cleanedFields.some((f) => f.type === 'select' && f.options.length === 0)) {
      toast.error('Dropdown fields need at least one option')
      return
    }

    setSaving(true)
    try {
      const { data } = await api.put(`/product-forms/${form.id}`, {
        ...settings,
        name: name.trim(),
        custom_fields: cleanedFields,
        // Only sent when this user is allowed to reassign ownership.
        ...(canAssign && ownerId ? { created_by: ownerId } : {}),
      })
      toast.success('Form saved')
      onSaved(data.data)
    } catch (err) {
      toast.error((err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to save form')
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
            <Label>Form Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-10" />
            <p className="text-xs text-muted-foreground">
              Internal label — shown in this list and against orders placed through this form.
            </p>
          </div>

          {canAssign && (
            <div className="space-y-1.5">
              <Label>Assigned To</Label>
              <Select value={ownerId} onValueChange={(v) => setOwnerId(v ?? ownerId)}>
                <SelectTrigger className="w-full h-10">
                  <SelectValue>{ownerOptions.find((o) => o.id === ownerId)?.name ?? 'Select a marketer'}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ownerOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.name}{o.suffix}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Orders from this form count towards this marketer on Form Performance, and they can edit it.
              </p>
            </div>
          )}

          <Separator />

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
            <Label>Thank You URL</Label>
            <Input
              type="url"
              value={settings.thank_you_url ?? ''}
              onChange={(e) => set('thank_you_url', e.target.value)}
              placeholder="https://yoursite.com/thank-you"
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">Customers are redirected here after placing an order.</p>
          </div>

          <Separator />
          <h4 className="text-sm font-semibold">Field Visibility</h4>

          <div className="space-y-3">
            {([
              { key: 'show_whatsapp' as const, label: 'WhatsApp Number', description: 'Show WhatsApp number field on the form' },
              { key: 'show_email' as const, label: 'Email Address', description: 'Show email field on the form' },
              ...(couponsEnabled ? [{ key: 'show_coupon' as const, label: 'Coupon Code', description: 'Allow customers to enter discount codes' }] : []),
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
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold">Custom Fields</h4>
              <p className="text-xs text-muted-foreground">Extra questions that appear on this form only</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addCustomField}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Field
            </Button>
          </div>

          {customFields.length > 0 && (
            <div className="space-y-3">
              {customFields.map((field, i) => (
                <div key={field.key} className="rounded-md border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Field {i + 1}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeCustomField(i)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Field Label</Label>
                      <Input value={field.label} onChange={(e) => updateCustomField(i, { label: e.target.value })} placeholder="e.g. Preferred delivery time" className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Field Type</Label>
                      <Select value={field.type} onValueChange={(v) => updateCustomField(i, { type: v as CustomFieldType })}>
                        <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Short text</SelectItem>
                          <SelectItem value="textarea">Long text</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="select">Dropdown</SelectItem>
                          <SelectItem value="checkbox">Checkbox</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {field.type === 'select' && (
                    <div className="space-y-1">
                      <Label className="text-xs">Options (comma separated)</Label>
                      <Input
                        value={(field.options ?? []).join(', ')}
                        onChange={(e) => updateCustomField(i, { options: e.target.value.split(',').map((o) => o.trimStart()) })}
                        placeholder="e.g. Morning, Afternoon, Evening"
                        className="h-9"
                      />
                    </div>
                  )}
                  <label className="flex items-center gap-2 text-sm cursor-pointer w-fit">
                    <input type="checkbox" checked={field.required} onChange={(e) => updateCustomField(i, { required: e.target.checked })} />
                    Required field
                  </label>
                </div>
              ))}
            </div>
          )}

          <Separator />
          <h4 className="text-sm font-semibold">Live Preview</h4>
          <div className="rounded-md border p-5 bg-white text-sm" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
            <div className="text-center mb-4">
              <p className="text-lg font-bold text-gray-900">{settings.heading}</p>
              <p className="text-xs text-gray-500 mt-1">{settings.subheading}</p>
            </div>
            <div className="space-y-3">
              <PreviewField label="Full Name *" />
              <PreviewField label="Phone Number *" />
              {settings.show_whatsapp && <PreviewField label="WhatsApp Number" optional />}
              <PreviewField label="Delivery Address *" />
              <PreviewField label="State *" />
              {settings.show_email && <PreviewField label="Email" optional />}
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">Select Your Package *</p>
                <div className="space-y-2">
                  {product.variations.slice(0, 3).map((v, i) => (
                    <div key={v.id} className={`flex items-center justify-between rounded-md border-2 px-3 py-2 ${i === 0 ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                      <span className="text-xs font-medium text-gray-800">{v.name}</span>
                      <span className="text-xs font-bold">₦{Number(v.price).toLocaleString()}</span>
                    </div>
                  ))}
                  {product.variations.length > 3 && <p className="text-xs text-gray-400">+{product.variations.length - 3} more</p>}
                </div>
              </div>
              {couponsEnabled && settings.show_coupon && <PreviewField label="Coupon Code" optional />}
              {customFields.filter((f) => f.label.trim()).map((f) => (
                <PreviewField key={f.key} label={`${f.label}${f.required ? ' *' : ''}`} optional={!f.required} />
              ))}
              <button className="w-full h-11 rounded-md text-white font-bold text-sm mt-2" style={{ background: settings.button_color }} disabled>
                {settings.button_text}
              </button>
            </div>
          </div>
        </div>
        <Separator />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Form'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function PreviewField({ label, optional }: { label: string; optional?: boolean }) {
  return (
    <div>
      <p className={`text-xs font-semibold mb-1 ${optional ? 'text-gray-400' : 'text-gray-700'}`}>{label}</p>
      <div className={`h-10 rounded-md border bg-gray-50 ${optional ? 'border-dashed' : ''}`} />
    </div>
  )
}
