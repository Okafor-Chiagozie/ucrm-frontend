import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import type { Business, PaginationMeta } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Separator } from '@/components/ui/separator'
import Pagination from '@/components/Pagination'
import { toast } from 'sonner'
import { Plus, Search, Pencil, XCircle, Store } from 'lucide-react'
import LoadingState from '@/components/LoadingState'
import EmptyState from '@/components/EmptyState'

export default function BusinessesPage() {
  const { hasPermission } = useAuth()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editBiz, setEditBiz] = useState<Business | null>(null)
  const [deactivateBiz, setDeactivateBiz] = useState<Business | null>(null)
  const [staffBiz, setStaffBiz] = useState<Business | null>(null)

  const fetchBusinesses = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), per_page: '15' })
      if (search) params.set('search', search)
      const { data } = await api.get(`/businesses?${params}`)
      setBusinesses(data.data.data)
      setMeta(data.meta)
    } catch {
      toast.error('Failed to load businesses')
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { fetchBusinesses() }, [fetchBusinesses])

  const handleDeactivate = async () => {
    if (!deactivateBiz) return
    try {
      await api.delete(`/businesses/${deactivateBiz.id}`)
      toast.success('Business deactivated')
      setDeactivateBiz(null)
      fetchBusinesses()
    } catch {
      toast.error('Failed to deactivate business')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Businesses</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your businesses and their products</p>
        </div>
        {hasPermission('businesses.create') && (
          <Button onClick={() => setShowCreate(true)} className="w-full sm:w-auto h-10">
            <Plus className="mr-1.5 h-4 w-4" /> Add Business
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search businesses..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="pl-9 h-10"
        />
      </div>

      {loading ? (
        <LoadingState text="Loading businesses..." />
      ) : businesses.length === 0 ? (
        <EmptyState icon={Store} title="No businesses found" description="Create your first business to get started" />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((b) => (
            <Card key={b.id} className="border">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {b.logo ? (
                      <img src={b.logo} alt="" className="h-10 w-10 rounded-md object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                        {b.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold">{b.name}</h3>
                      <Badge variant="outline" className={`text-xs font-normal mt-0.5 ${b.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                        {b.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {hasPermission('businesses.edit') && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditBiz(b)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {hasPermission('businesses.delete') && b.is_active && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeactivateBiz(b)}>
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                {b.description && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{b.description}</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <div>
                    <span className="text-muted-foreground">Categories: </span>
                    <span className="font-medium">{b.categories_count}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Products: </span>
                    <span className="font-medium">{b.products_count}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Staff: </span>
                    <span className="font-medium">{b.staff_count}</span>
                  </div>
                </div>
                {hasPermission('businesses.edit') && (
                  <Button variant="outline" size="sm" className="mt-3 w-full" onClick={(e) => { e.stopPropagation(); setStaffBiz(b) }}>
                    Manage Staff
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {meta && <Pagination meta={meta} page={page} onPageChange={setPage} />}

      <BusinessDialog open={showCreate} onClose={() => setShowCreate(false)} onSuccess={fetchBusinesses} />
      {editBiz && <BusinessDialog open business={editBiz} onClose={() => setEditBiz(null)} onSuccess={fetchBusinesses} />}

      <AlertDialog open={!!deactivateBiz} onOpenChange={(open) => { if (!open) setDeactivateBiz(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate {deactivateBiz?.name}?</AlertDialogTitle>
            <AlertDialogDescription>This will hide the business and its products from active use. Data will be preserved.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {staffBiz && <StaffDialog business={staffBiz} onClose={() => { setStaffBiz(null); fetchBusinesses() }} />}
    </div>
  )
}

function StaffDialog({ business, onClose }: { business: Business; onClose: () => void }) {
  const [currentStaff, setCurrentStaff] = useState<{ id: string; name: string; email: string; role: string | null }[]>([])
  const [allUsers, setAllUsers] = useState<{ id: string; name: string; email: string; role: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get(`/businesses/${business.id}/staff`),
      api.get('/users?per_page=100'),
    ]).then(([staffRes, usersRes]) => {
      setCurrentStaff(staffRes.data.data)
      setAllUsers(usersRes.data.data.data.map((u: any) => ({ id: u.id, name: u.name, email: u.email, role: u.role })))
    }).catch(() => toast.error('Failed to load staff'))
    .finally(() => setLoading(false))
  }, [business.id])

  const staffIds = new Set(currentStaff.map((s) => s.id))
  const availableUsers = allUsers.filter((u) => !staffIds.has(u.id))

  const addStaff = async (userId: string) => {
    setSaving(true)
    try {
      await api.post(`/businesses/${business.id}/staff`, { user_ids: [userId] })
      const user = allUsers.find((u) => u.id === userId)
      if (user) setCurrentStaff([...currentStaff, user])
      toast.success('Staff assigned')
    } catch { toast.error('Failed') }
    finally { setSaving(false) }
  }

  const removeStaff = async (userId: string) => {
    setSaving(true)
    try {
      await api.delete(`/businesses/${business.id}/staff`, { data: { user_ids: [userId] } })
      setCurrentStaff(currentStaff.filter((s) => s.id !== userId))
      toast.success('Staff removed')
    } catch { toast.error('Failed') }
    finally { setSaving(false) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Staff</DialogTitle>
          <DialogDescription>{business.name} — assign or remove staff members</DialogDescription>
        </DialogHeader>
        <Separator />
        {loading ? (
          <LoadingState text="Loading staff..." />
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 py-2 custom-scrollbar">
            <div>
              <h4 className="text-sm font-semibold mb-2">Assigned Staff ({currentStaff.length})</h4>
              {currentStaff.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No staff assigned</p>
              ) : (
                <div className="space-y-2">
                  {currentStaff.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <p className="text-sm font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.email} {s.role && `· ${s.role}`}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => removeStaff(s.id)} disabled={saving}>Remove</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Separator />
            <div>
              <h4 className="text-sm font-semibold mb-2">Available Staff ({availableUsers.length})</h4>
              {availableUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">All users are already assigned</p>
              ) : (
                <div className="space-y-2">
                  {availableUsers.map((u) => (
                    <div key={u.id} className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <p className="text-sm font-medium">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email} {u.role && `· ${u.role}`}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => addStaff(u.id)} disabled={saving}>Assign</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function BusinessDialog({ open, business, onClose, onSuccess }: { open: boolean; business?: Business; onClose: () => void; onSuccess: () => void }) {
  const isEdit = !!business
  const [name, setName] = useState(business?.name ?? '')
  const [description, setDescription] = useState(business?.description ?? '')
  const [logo, setLogo] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const formData = new FormData()
    formData.append('name', name)
    formData.append('description', description)
    if (logo) formData.append('logo', logo)

    try {
      if (isEdit) {
        await api.post(`/businesses/${business.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
        toast.success('Business updated')
      } else {
        await api.post('/businesses', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
        toast.success('Business created')
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
          <DialogTitle>{isEdit ? 'Edit Business' : 'Create Business'}</DialogTitle>
          <DialogDescription>{isEdit ? `Editing ${business.name}` : 'Add a new business to the system'}</DialogDescription>
        </DialogHeader>
        <Separator />
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">{error}</div>}
          <div className="space-y-1.5">
            <Label>Business Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Skincare Empire" required className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the business..."
              className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Logo</Label>
            <Input type="file" accept="image/*" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} className="h-10" />
          </div>
          <Separator />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Business'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
