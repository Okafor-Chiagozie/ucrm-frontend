import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import Pagination from '@/components/Pagination'
import LoadingState from '@/components/LoadingState'
import EmptyState from '@/components/EmptyState'
import type { PaginationMeta, Business, Product, User as UserType } from '@/types'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import VariableTextarea from '@/components/VariableTextarea'
import { Card, CardContent } from '@/components/ui/card'
import { Megaphone, Send, Users, Mail, MessageSquare, Phone, Plus, Pencil, Trash2, FileText, Search, RotateCcw } from 'lucide-react'

const MARKETING_VARIABLES = [
  { key: '{customer_name}', label: 'Customer Name' },
  { key: '{customer_phone}', label: 'Phone' },
  { key: '{customer_email}', label: 'Email' },
  { key: '{customer_state}', label: 'State' },
  { key: '{business_name}', label: 'Business' },
  { key: '{order_number}', label: 'Order #' },
  { key: '{total}', label: 'Total' },
  { key: '{status}', label: 'Status' },
]

interface Customer {
  name: string
  email: string | null
  phone: string
  whatsapp: string | null
  state: string
  total_orders: number
  total_spent: string
  last_order_date: string
}

interface MarketingTemplate {
  id: string
  name: string
  message: string
  channel: 'email' | 'sms' | 'whatsapp'
  email_subject: string | null
}

const ORDER_STATUSES = ['pending', 'scheduled', 'delivered', 'not_picking', 'cancelled']
const STATUS_LABELS: Record<string, string> = { pending: 'Pending', scheduled: 'Scheduled', delivered: 'Delivered', not_picking: 'Not Picking', cancelled: 'Cancelled' }
const statusTabColors: Record<string, string> = { pending: 'bg-amber-400', scheduled: 'bg-blue-400', delivered: 'bg-emerald-400', not_picking: 'bg-orange-400', cancelled: 'bg-red-400' }
const NIGERIAN_STATES = ['Lagos', 'Abuja', 'Rivers', 'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara']

const today = () => new Date().toISOString().slice(0, 10)
const DATE_PRESETS = [
  { label: 'Today', from: today, to: today },
  { label: 'This Week', from: () => { const d = new Date(); const day = d.getDay(); d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); return d.toISOString().slice(0, 10) }, to: today },
  { label: 'This Month', from: () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10), to: today },
  { label: 'Last 30 Days', from: () => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10) }, to: today },
]

export default function MarketingPage() {
  const { user } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [meta, setMeta] = useState<PaginationMeta>({ current_page: 1, last_page: 1, per_page: 20, total: 0 })
  const [loading, setLoading] = useState(true)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [agents, setAgents] = useState<UserType[]>([])
  const [templates, setTemplates] = useState<MarketingTemplate[]>([])

  // Filters
  const [search, setSearch] = useState('')
  const [businessFilter, setBusinessFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [agentFilter, setAgentFilter] = useState('')
  const [productFilter, setProductFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [page, setPage] = useState(1)

  // Excluded customers (deselected individually)
  const [excludedPhones, setExcludedPhones] = useState<Set<string>>(new Set())

  // Compose dialog
  const [composeOpen, setComposeOpen] = useState(false)
  const [channel, setChannel] = useState<'email' | 'sms' | 'whatsapp'>('whatsapp')
  const [message, setMessage] = useState('')
  const [subject, setSubject] = useState('')
  const [sending, setSending] = useState(false)

  // Template dialog
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<MarketingTemplate | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [templateMessage, setTemplateMessage] = useState('')
  const [templateChannel, setTemplateChannel] = useState<'email' | 'sms' | 'whatsapp'>('whatsapp')
  const [templateSubject, setTemplateSubject] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)

  const hasFilters = search || businessFilter || statusFilter || stateFilter || agentFilter || productFilter || dateFrom || dateTo

  const dateLabel = () => {
    if (showDatePicker) return 'Custom Range'
    if (!dateFrom && !dateTo) return 'All Time'
    const match = DATE_PRESETS.find(p => dateFrom === p.from() && dateTo === p.to())
    if (match) return match.label
    return `${dateFrom || '...'} — ${dateTo || '...'}`
  }

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { page: String(page), per_page: '20' }
      if (search) params.search = search
      if (businessFilter) params.business_id = businessFilter
      if (statusFilter) params.status = statusFilter
      if (stateFilter) params.state = stateFilter
      if (agentFilter) params.agent_id = agentFilter
      if (productFilter) params.product_id = productFilter
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      const { data } = await api.get('/marketing/customers', { params })
      setCustomers(data.data.data ?? data.data)
      if (data.meta) setMeta(data.meta)
    } catch {
      toast.error('Failed to load customers')
    } finally {
      setLoading(false)
    }
  }, [page, search, businessFilter, statusFilter, stateFilter, agentFilter, productFilter, dateFrom, dateTo])

  useEffect(() => { fetchCustomers() }, [fetchCustomers])

  useEffect(() => {
    api.get('/businesses').then(r => setBusinesses(r.data.data?.data ?? r.data.data ?? [])).catch(() => {})
    api.get('/products?per_page=100').then(r => setProducts(r.data.data?.data ?? r.data.data ?? [])).catch(() => {})
    api.get('/users?role=Customer Support&per_page=100').then(r => setAgents(r.data.data?.data ?? r.data.data ?? [])).catch(() => {})
    api.get('/marketing/templates').then(r => setTemplates(r.data.data ?? [])).catch(() => {})
  }, [])

  const toggleExclude = (phone: string) => {
    setExcludedPhones(prev => {
      const next = new Set(prev)
      if (next.has(phone)) next.delete(phone)
      else next.add(phone)
      return next
    })
  }

  const clearFilters = () => {
    setSearch(''); setBusinessFilter(''); setStatusFilter(''); setStateFilter('')
    setAgentFilter(''); setProductFilter(''); setDateFrom(''); setDateTo('')
    setShowDatePicker(false); setExcludedPhones(new Set()); setPage(1)
  }

  const recipientCount = meta.total - excludedPhones.size
  const loadTemplate = (t: MarketingTemplate) => {
    setChannel(t.channel)
    setMessage(t.message)
    if (t.email_subject) setSubject(t.email_subject)
  }

  const sendCampaign = async () => {
    if (!message.trim()) { toast.error('Message is required'); return }
    if (channel === 'email' && !subject.trim()) { toast.error('Subject is required for email'); return }
    if (recipientCount <= 0) { toast.error('No customers to send to'); return }

    setSending(true)
    try {
      // Pass the same filters to backend so it fetches ALL matching customers
      const payload: Record<string, unknown> = {
        channel, message,
        subject: channel === 'email' ? subject : null,
        excluded_phones: Array.from(excludedPhones),
      }
      if (businessFilter) payload.business_id = businessFilter
      if (statusFilter) payload.status = statusFilter
      if (stateFilter) payload.state = stateFilter
      if (agentFilter) payload.agent_id = agentFilter
      if (productFilter) payload.product_id = productFilter
      if (dateFrom) payload.date_from = dateFrom
      if (dateTo) payload.date_to = dateTo
      if (search) payload.search = search

      const { data } = await api.post('/marketing/send', payload)
      toast.success(data.message)
      setComposeOpen(false)
      setMessage('')
      setSubject('')
    } catch {
      toast.error('Failed to send campaign')
    } finally {
      setSending(false)
    }
  }

  const openTemplateDialog = (template?: MarketingTemplate) => {
    if (template) {
      setEditingTemplate(template); setTemplateName(template.name); setTemplateMessage(template.message)
      setTemplateChannel(template.channel); setTemplateSubject(template.email_subject ?? '')
    } else {
      setEditingTemplate(null); setTemplateName(''); setTemplateMessage('')
      setTemplateChannel('whatsapp'); setTemplateSubject('')
    }
    setTemplateDialogOpen(true)
  }

  const saveTemplate = async () => {
    if (!templateName.trim() || !templateMessage.trim()) { toast.error('Name and message are required'); return }
    setSavingTemplate(true)
    try {
      const payload = { name: templateName, message: templateMessage, channel: templateChannel, email_subject: templateChannel === 'email' ? templateSubject : null }
      if (editingTemplate) { await api.put(`/marketing/templates/${editingTemplate.id}`, payload); toast.success('Template updated') }
      else { await api.post('/marketing/templates', payload); toast.success('Template created') }
      const { data } = await api.get('/marketing/templates')
      setTemplates(data.data ?? []); setTemplateDialogOpen(false)
    } catch { toast.error('Failed to save template') }
    finally { setSavingTemplate(false) }
  }

  const deleteTemplate = async (id: string) => {
    try { await api.delete(`/marketing/templates/${id}`); setTemplates(prev => prev.filter(t => t.id !== id)); toast.success('Template deleted') }
    catch { toast.error('Failed to delete template') }
  }

  if (!user?.permissions?.includes('notifications.send')) {
    return <div className="p-6 text-center text-muted-foreground">You do not have permission to access this page.</div>
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><Megaphone className="w-5 h-5 text-blue-600" /> Marketing</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Send campaigns to your customers via Email, SMS, or WhatsApp</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" className="h-10 flex-1 sm:flex-none" onClick={() => openTemplateDialog()}>
            <Plus className="mr-1.5 h-4 w-4" /> Template
          </Button>
          <Button className="h-10 flex-1 sm:flex-none" onClick={() => setComposeOpen(true)} disabled={recipientCount <= 0}>
            <Send className="mr-1.5 h-4 w-4" /> <span className="hidden sm:inline">Send to </span>{recipientCount}<span className="hidden sm:inline"> customer{recipientCount !== 1 ? 's' : ''}</span>
          </Button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        <button
          className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${!statusFilter ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          onClick={() => { setStatusFilter(''); setPage(1) }}
        >All</button>
        {ORDER_STATUSES.map(s => (
          <button
            key={s}
            className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors inline-flex items-center gap-1 sm:gap-1.5 ${statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            onClick={() => { setStatusFilter(statusFilter === s ? '' : s); setPage(1) }}
          >
            <span className={`inline-block h-2 w-2 rounded-full ${statusTabColors[s]}`} />
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Filters grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search name, phone, email..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="pl-9 h-10" />
        </div>
        <Select value={businessFilter || 'all'} onValueChange={(v) => { setBusinessFilter(v === 'all' ? '' : v ?? ''); setPage(1) }}>
          <SelectTrigger className="h-10 w-full">
            <SelectValue>{businesses.find(b => b.id === businessFilter)?.name ?? 'All Businesses'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Businesses</SelectItem>
            {businesses.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={stateFilter || 'all'} onValueChange={(v) => { setStateFilter(v === 'all' ? '' : v ?? ''); setPage(1) }}>
          <SelectTrigger className="h-10 w-full">
            <SelectValue>{stateFilter || 'All States'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All States</SelectItem>
            {NIGERIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={agentFilter || 'all'} onValueChange={(v) => { setAgentFilter(v === 'all' ? '' : v ?? ''); setPage(1) }}>
          <SelectTrigger className="h-10 w-full">
            <SelectValue>{agents.find(a => a.id === agentFilter)?.name ?? 'All Staff'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Staff</SelectItem>
            {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={productFilter || 'all'} onValueChange={(v) => { setProductFilter(v === 'all' ? '' : v ?? ''); setPage(1) }}>
          <SelectTrigger className="h-10 w-full">
            <SelectValue>{products.find(p => p.id === productFilter)?.name ?? 'All Products'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" className="h-10 flex-1" />}>
              {dateLabel()}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {DATE_PRESETS.map(preset => (
                <DropdownMenuItem key={preset.label} onClick={() => { setDateFrom(preset.from()); setDateTo(preset.to()); setShowDatePicker(false); setPage(1) }}>
                  {preset.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem onClick={() => { setShowDatePicker(true); setDateFrom(''); setDateTo(''); setPage(1) }}>Custom Range</DropdownMenuItem>
              {(dateFrom || dateTo) && <DropdownMenuItem onClick={() => { setDateFrom(''); setDateTo(''); setShowDatePicker(false); setPage(1) }}>All Time</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {showDatePicker && (
          <>
            <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }} className="h-10" />
            <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }} className="h-10" />
          </>
        )}
      </div>

      {/* Clear filters */}
      {hasFilters && (
        <div className="flex items-center">
          <Button variant="ghost" className="h-10 text-muted-foreground" onClick={clearFilters}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Clear all filters
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="flex flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm">
        <span className="flex items-center gap-1 text-muted-foreground"><Users className="w-4 h-4" /> {meta.total} match</span>
        {excludedPhones.size > 0 && (
          <span className="flex items-center gap-1 text-amber-600">{excludedPhones.size} excluded</span>
        )}
        <span className="flex items-center gap-1 text-blue-600 font-medium">{recipientCount} will receive</span>
      </div>

      {/* Templates */}
      {templates.length > 0 && (
        <div className="border rounded-md p-3">
          <h3 className="text-sm font-medium mb-2 flex items-center gap-1"><FileText className="w-4 h-4" /> Saved Templates</h3>
          <div className="flex flex-wrap gap-2">
            {templates.map(t => (
              <div key={t.id} className="flex items-center gap-1 border rounded-md px-3 py-1.5 text-sm bg-card hover:bg-muted/50">
                <button onClick={() => { loadTemplate(t); setComposeOpen(true) }} className="flex items-center gap-1.5">
                  {t.channel === 'email' && <Mail className="w-3.5 h-3.5 text-blue-500" />}
                  {t.channel === 'sms' && <Phone className="w-3.5 h-3.5 text-green-500" />}
                  {t.channel === 'whatsapp' && <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />}
                  {t.name}
                </button>
                <button onClick={() => openTemplateDialog(t)} className="text-muted-foreground hover:text-foreground ml-1"><Pencil className="w-3 h-3" /></button>
                <button onClick={() => deleteTemplate(t.id)} className="text-muted-foreground hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customer table (desktop) */}
      <div className="hidden md:block border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="hidden sm:table-cell">Email</TableHead>
              <TableHead className="hidden md:table-cell">WhatsApp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="p-0"><LoadingState text="Loading customers..." /></TableCell></TableRow>
            ) : customers.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="p-0"><EmptyState icon={Users} title="No customers found" description="Adjust your filters to find customers" /></TableCell></TableRow>
            ) : (
              customers.map((c, i) => {
                const isExcluded = excludedPhones.has(c.phone)
                return (
                  <TableRow key={i} className={isExcluded ? 'opacity-40' : ''}>
                    <TableCell>
                      <input type="checkbox" checked={!isExcluded} onChange={() => toggleExclude(c.phone)} className="rounded" />
                    </TableCell>
                    <TableCell className="font-medium text-sm">{c.name}</TableCell>
                    <TableCell className="text-sm">{c.phone}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{c.email || '—'}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{c.whatsapp || '—'}</TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Customer cards (mobile) */}
      <div className="md:hidden space-y-3">
        {loading ? <LoadingState text="Loading customers..." /> : customers.length === 0 ? <EmptyState icon={Users} title="No customers found" description="Adjust your filters to find customers" /> : customers.map((c, i) => {
          const isExcluded = excludedPhones.has(c.phone)
          return (
            <Card key={i} className={isExcluded ? 'opacity-40' : ''}>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={!isExcluded} onChange={() => toggleExclude(c.phone)} className="rounded" />
                  <span className="font-medium text-sm">{c.name}</span>
                </div>
                <div className="grid grid-cols-1 gap-1 text-sm pl-7">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" /> {c.phone}
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" /> {c.email || '—'}
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MessageSquare className="h-3.5 w-3.5" /> {c.whatsapp || '—'}
                  </div>
                  {c.state && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="text-xs">State:</span> <span className="text-xs">{c.state}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-0.5">
                    <span>Orders: <span className="font-medium text-foreground">{c.total_orders}</span></span>
                    <span>Spent: <span className="font-medium text-foreground">₦{Number(c.total_spent).toLocaleString()}</span></span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Pagination meta={meta} page={page} onPageChange={setPage} />

      {/* Compose Dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">Send Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Channel</Label>
              <Select value={channel} onValueChange={(v: string | null) => v && setChannel(v as 'email' | 'sms' | 'whatsapp')}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email"><span className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> Email</span></SelectItem>
                  <SelectItem value="sms"><span className="flex items-center gap-1.5"><Phone className="w-4 h-4" /> SMS</span></SelectItem>
                  <SelectItem value="whatsapp"><span className="flex items-center gap-1.5"><MessageSquare className="w-4 h-4" /> WhatsApp</span></SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm p-3 bg-muted/30 rounded-md">
              <p>Sending to <span className="font-medium text-blue-600">{recipientCount}</span> customers via {channel}</p>
              <p className="text-xs text-muted-foreground mt-1">Customers without {channel === 'email' ? 'an email' : channel === 'whatsapp' ? 'a WhatsApp number' : 'a phone number'} will be automatically skipped</p>
            </div>

            {channel === 'email' && (
              <div className="space-y-1.5">
                <Label>Subject</Label>
                <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject line" />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Message</Label>
              <VariableTextarea
                value={message}
                onChange={setMessage}
                variables={MARKETING_VARIABLES}
                placeholder="Type your message here..."
                rows={5}
              />
              {message && (
                <div className="rounded-md bg-muted/50 border border-dashed p-3 mt-2">
                  <p className="text-[10px] font-medium text-muted-foreground mb-1">Preview:</p>
                  <p className="text-sm whitespace-pre-wrap">{message
                    .replace(/\{customer_name\}/g, 'John Doe')
                    .replace(/\{customer_phone\}/g, '+2348012345678')
                    .replace(/\{customer_email\}/g, 'john@example.com')
                    .replace(/\{customer_state\}/g, 'Lagos')
                    .replace(/\{business_name\}/g, 'My Business')
                    .replace(/\{order_number\}/g, 'ORD-00042')
                    .replace(/\{total\}/g, '₦25,000')
                    .replace(/\{status\}/g, 'Delivered')
                    .replace(/\\n/g, '\n')
                  }</p>
                </div>
              )}
            </div>

            {templates.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Load from template</Label>
                <div className="flex flex-wrap gap-1.5">
                  {templates.map(t => (
                    <button key={t.id} onClick={() => loadTemplate(t)} className="text-xs border rounded px-2 py-1 hover:bg-muted">{t.name}</button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setComposeOpen(false)}>Cancel</Button>
              <Button onClick={sendCampaign} disabled={sending || !message.trim() || recipientCount <= 0}>
                {sending ? 'Sending...' : `Send to ${recipientCount} customer${recipientCount !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">{editingTemplate ? 'Edit Template' : 'New Template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Template Name</Label>
              <Input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="e.g. Flash Sale" />
            </div>
            <div className="space-y-1.5">
              <Label>Channel</Label>
              <Select value={templateChannel} onValueChange={(v: string | null) => v && setTemplateChannel(v as 'email' | 'sms' | 'whatsapp')}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {templateChannel === 'email' && (
              <div className="space-y-1.5">
                <Label>Email Subject</Label>
                <Input value={templateSubject} onChange={e => setTemplateSubject(e.target.value)} placeholder="Subject line" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Message</Label>
              <VariableTextarea
                value={templateMessage}
                onChange={setTemplateMessage}
                variables={MARKETING_VARIABLES}
                placeholder="Type your message template..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
              <Button onClick={saveTemplate} disabled={savingTemplate || !templateName.trim() || !templateMessage.trim()}>
                {savingTemplate ? 'Saving...' : 'Save Template'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
