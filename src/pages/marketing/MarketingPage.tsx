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
import type { PaginationMeta } from '@/types'
import { Megaphone, Send, Users, Mail, MessageSquare, Phone, Plus, Pencil, Trash2, FileText, Search, Filter, X } from 'lucide-react'
import type { Business } from '@/types'

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


export default function MarketingPage() {
  const { user } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [meta, setMeta] = useState<PaginationMeta>({ current_page: 1, last_page: 1, per_page: 20, total: 0 })
  const [loading, setLoading] = useState(true)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [templates, setTemplates] = useState<MarketingTemplate[]>([])

  // Filters
  const [search, setSearch] = useState('')
  const [businessFilter, setBusinessFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  // Selection
  const [selectedCustomers, setSelectedCustomers] = useState<Customer[]>([])
  const [selectAll, setSelectAll] = useState(false)

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

  const [showFilters, setShowFilters] = useState(false)

  const hasFilters = search || businessFilter || statusFilter || stateFilter || dateFrom || dateTo

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { page: String(page), per_page: '20' }
      if (search) params.search = search
      if (businessFilter) params.business_id = businessFilter
      if (statusFilter) params.status = statusFilter
      if (stateFilter) params.state = stateFilter
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
  }, [page, search, businessFilter, statusFilter, stateFilter, dateFrom, dateTo])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  useEffect(() => {
    api.get('/businesses').then(r => setBusinesses(r.data.data?.data ?? r.data.data ?? [])).catch(() => {})
    api.get('/marketing/templates').then(r => setTemplates(r.data.data ?? [])).catch(() => {})
  }, [])

  const toggleCustomer = (c: Customer) => {
    setSelectedCustomers(prev => {
      const exists = prev.some(s => s.phone === c.phone)
      return exists ? prev.filter(s => s.phone !== c.phone) : [...prev, c]
    })
  }

  const toggleAll = () => {
    if (selectAll) {
      setSelectedCustomers([])
    } else {
      setSelectedCustomers([...customers])
    }
    setSelectAll(!selectAll)
  }

  const clearFilters = () => {
    setSearch('')
    setBusinessFilter('')
    setStatusFilter('')
    setStateFilter('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const openCompose = () => {
    if (selectedCustomers.length === 0) {
      toast.error('Select at least one customer')
      return
    }
    setComposeOpen(true)
  }

  const loadTemplate = (t: MarketingTemplate) => {
    setChannel(t.channel)
    setMessage(t.message)
    if (t.email_subject) setSubject(t.email_subject)
  }

  const sendCampaign = async () => {
    if (!message.trim()) {
      toast.error('Message is required')
      return
    }
    if (channel === 'email' && !subject.trim()) {
      toast.error('Subject is required for email')
      return
    }

    setSending(true)
    try {
      const recipients = selectedCustomers.map(c => ({
        name: c.name,
        phone: c.phone,
        email: c.email,
        whatsapp: c.whatsapp || c.phone,
      }))

      const { data } = await api.post('/marketing/send', {
        channel,
        message,
        subject: channel === 'email' ? subject : null,
        recipients,
      })

      toast.success(data.message)
      setComposeOpen(false)
      setSelectedCustomers([])
      setSelectAll(false)
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
      setEditingTemplate(template)
      setTemplateName(template.name)
      setTemplateMessage(template.message)
      setTemplateChannel(template.channel)
      setTemplateSubject(template.email_subject ?? '')
    } else {
      setEditingTemplate(null)
      setTemplateName('')
      setTemplateMessage('')
      setTemplateChannel('whatsapp')
      setTemplateSubject('')
    }
    setTemplateDialogOpen(true)
  }

  const saveTemplate = async () => {
    if (!templateName.trim() || !templateMessage.trim()) {
      toast.error('Name and message are required')
      return
    }
    setSavingTemplate(true)
    try {
      const payload = {
        name: templateName,
        message: templateMessage,
        channel: templateChannel,
        email_subject: templateChannel === 'email' ? templateSubject : null,
      }

      if (editingTemplate) {
        await api.put(`/marketing/templates/${editingTemplate.id}`, payload)
        toast.success('Template updated')
      } else {
        await api.post('/marketing/templates', payload)
        toast.success('Template created')
      }

      const { data } = await api.get('/marketing/templates')
      setTemplates(data.data ?? [])
      setTemplateDialogOpen(false)
    } catch {
      toast.error('Failed to save template')
    } finally {
      setSavingTemplate(false)
    }
  }

  const deleteTemplate = async (id: string) => {
    try {
      await api.delete(`/marketing/templates/${id}`)
      setTemplates(prev => prev.filter(t => t.id !== id))
      toast.success('Template deleted')
    } catch {
      toast.error('Failed to delete template')
    }
  }

  const nigerianStates = ['Lagos', 'Abuja', 'Rivers', 'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara']

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
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => openTemplateDialog()}>
            <Plus className="w-4 h-4 mr-1" /> Template
          </Button>
          <Button size="sm" onClick={openCompose} disabled={selectedCustomers.length === 0}>
            <Send className="w-4 h-4 mr-1" /> Send to {selectedCustomers.length > 0 ? `${selectedCustomers.length} selected` : 'selected'}
          </Button>
        </div>
      </div>

      {/* Search + Filter toggle */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name, phone, email..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="pl-9" />
        </div>
        <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="w-4 h-4 mr-1" /> Filters
        </Button>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
            <X className="w-4 h-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-4 bg-muted/30 rounded-md border">
          <Select value={businessFilter} onValueChange={v => { setBusinessFilter(v === 'all' ? '' : v); setPage(1) }}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Business" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Businesses</SelectItem>
              {businesses.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v === 'all' ? '' : v); setPage(1) }}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Order Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="not_picking">Not Picking</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={stateFilter} onValueChange={v => { setStateFilter(v === 'all' ? '' : v); setPage(1) }}>
            <SelectTrigger className="w-full"><SelectValue placeholder="State" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              {nigerianStates.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>

          <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }} placeholder="From" />
          <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }} placeholder="To" />
        </div>
      )}

      {/* Stats bar */}
      <div className="flex gap-4 text-sm">
        <span className="flex items-center gap-1 text-muted-foreground"><Users className="w-4 h-4" /> {meta.total} customers</span>
        <span className="flex items-center gap-1 text-blue-600 font-medium">{selectedCustomers.length} selected</span>
      </div>

      {/* Templates section */}
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

      {/* Customer table */}
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input type="checkbox" checked={selectAll} onChange={toggleAll} className="rounded" />
              </TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden sm:table-cell">Phone</TableHead>
              <TableHead className="hidden md:table-cell">State</TableHead>
              <TableHead className="hidden lg:table-cell">Orders</TableHead>
              <TableHead className="hidden lg:table-cell">Total Spent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : customers.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground"><Users className="w-8 h-8 mx-auto mb-2 opacity-40" />No customers found</TableCell></TableRow>
            ) : (
              customers.map((c, i) => {
                const isSelected = selectedCustomers.some(s => s.phone === c.phone)
                return (
                  <TableRow key={i} className={isSelected ? 'bg-blue-50/50' : ''}>
                    <TableCell>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleCustomer(c)} className="rounded" />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{c.name}</div>
                      {c.email && <div className="text-xs text-muted-foreground">{c.email}</div>}
                      <div className="text-xs text-muted-foreground sm:hidden">{c.phone}</div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">{c.phone}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{c.state}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{c.total_orders}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm font-medium">₦{Number(c.total_spent).toLocaleString()}</TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination meta={meta} page={page} onPageChange={setPage} />

      {/* Compose Dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">Send Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Sending to <span className="font-medium text-foreground">{selectedCustomers.length}</span> customers
            </div>

            <div className="space-y-1.5">
              <Label>Channel</Label>
              <Select value={channel} onValueChange={v => setChannel(v as 'email' | 'sms' | 'whatsapp')}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email"><span className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> Email</span></SelectItem>
                  <SelectItem value="sms"><span className="flex items-center gap-1.5"><Phone className="w-4 h-4" /> SMS</span></SelectItem>
                  <SelectItem value="whatsapp"><span className="flex items-center gap-1.5"><MessageSquare className="w-4 h-4" /> WhatsApp</span></SelectItem>
                </SelectContent>
              </Select>
            </div>

            {channel === 'email' && (
              <div className="space-y-1.5">
                <Label>Subject</Label>
                <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject line" />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Message</Label>
              <p className="text-xs text-muted-foreground">Use {'{customer_name}'} to personalize</p>
              <textarea
                className="w-full border rounded-md p-3 text-sm min-h-[120px] resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Type your message here..."
              />
            </div>

            {/* Quick load from templates */}
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
              <Button onClick={sendCampaign} disabled={sending || !message.trim()}>
                {sending ? 'Sending...' : 'Send Campaign'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-md">
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
              <Select value={templateChannel} onValueChange={v => setTemplateChannel(v as 'email' | 'sms' | 'whatsapp')}>
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
              <p className="text-xs text-muted-foreground">Use {'{customer_name}'} to personalize</p>
              <textarea
                className="w-full border rounded-md p-3 text-sm min-h-[100px] resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                value={templateMessage}
                onChange={e => setTemplateMessage(e.target.value)}
                placeholder="Type your message template..."
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
