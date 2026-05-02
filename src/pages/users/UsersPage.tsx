import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import type { User, PaginationMeta, Role } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Plus, Search, ArrowUpDown, ArrowUp, ArrowDown, Pencil, UserX, Eye, EyeOff } from 'lucide-react'

type SortField = 'name' | 'email' | 'created_at'
type SortDir = 'asc' | 'desc'

export default function UsersPage() {
  const { hasPermission } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [deactivateUser, setDeactivateUser] = useState<User | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), per_page: '15' })
      if (search) params.set('search', search)
      if (roleFilter) params.set('role', roleFilter)
      if (statusFilter) params.set('is_active', statusFilter)
      params.set('sort_by', sortField)
      params.set('sort_dir', sortDir)
      const { data } = await api.get(`/users?${params}`)
      setUsers(data.data.data)
      setMeta(data.meta)
    } catch {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [page, search, roleFilter, statusFilter, sortField, sortDir])

  const fetchRoles = useCallback(async () => {
    try {
      const { data } = await api.get('/roles')
      setRoles(data.data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])
  useEffect(() => { fetchRoles() }, [fetchRoles])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/50" />
    return sortDir === 'asc'
      ? <ArrowUp className="ml-1 h-3.5 w-3.5 text-primary" />
      : <ArrowDown className="ml-1 h-3.5 w-3.5 text-primary" />
  }

  const handleDeactivate = async () => {
    if (!deactivateUser) return
    try {
      await api.delete(`/users/${deactivateUser.id}`)
      toast.success('User deactivated')
      setDeactivateUser(null)
      fetchUsers()
    } catch {
      toast.error('Failed to deactivate user')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Users</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage staff accounts and permissions</p>
        </div>
        {hasPermission('users.create') && (
          <Button onClick={() => setShowCreate(true)} className="w-full sm:w-auto h-10">
            <Plus className="mr-1.5 h-4 w-4" /> Add User
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3">
        <div className="flex-1 min-w-0 sm:max-w-sm">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, email, phone..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-9 h-10"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Role</label>
          <Select value={roleFilter || 'all'} onValueChange={(v) => { setRoleFilter(v === 'all' ? '' : v ?? ''); setPage(1) }}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="All Roles" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {roles.map((r) => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
          <Select value={statusFilter || 'all'} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v ?? ''); setPage(1) }}>
            <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      {/* Sort bar (mobile) */}
      <div className="flex md:hidden items-center gap-2">
        <span className="text-xs text-muted-foreground">Sort:</span>
        {(['name', 'email', 'created_at'] as SortField[]).map((f) => (
          <button key={f} onClick={() => toggleSort(f)} className={`inline-flex items-center text-xs px-2 py-1 rounded-md border transition-colors ${sortField === f ? 'bg-primary/10 border-primary/30 text-primary' : 'text-muted-foreground'}`}>
            {f === 'created_at' ? 'Joined' : f.charAt(0).toUpperCase() + f.slice(1)}
            <SortIcon field={f} />
          </button>
        ))}
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground gap-2">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Loading...
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No users found</div>
        ) : (
          users.map((u) => (
            <div key={u.id} className="rounded-md border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {hasPermission('users.edit') && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditUser(u); setShowEdit(true) }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {hasPermission('users.delete') && u.is_active && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeactivateUser(u)}>
                      <UserX className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline" className="font-normal border-blue-200 bg-blue-50 text-blue-700">{u.role}</Badge>
                <Badge variant="outline" className={`font-normal ${u.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{u.is_active ? 'Active' : 'Inactive'}</Badge>
                {u.phone && <span className="text-muted-foreground">{u.phone}</span>}
                <span className="text-muted-foreground ml-auto">{new Date(u.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('name')}>
                <span className="inline-flex items-center">Name <SortIcon field="name" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('email')}>
                <span className="inline-flex items-center">Email <SortIcon field="email" /></span>
              </TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('created_at')}>
                <span className="inline-flex items-center">Joined <SortIcon field="created_at" /></span>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Loading users...
                  </div>
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">{u.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell className="text-muted-foreground">{u.phone || '—'}</TableCell>
                  <TableCell><Badge variant="outline" className="font-normal border-blue-200 bg-blue-50 text-blue-700">{u.role}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={u.is_active ? 'default' : 'destructive'} className="font-normal">
                      {u.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(u.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {hasPermission('users.edit') && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditUser(u); setShowEdit(true) }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {hasPermission('users.delete') && u.is_active && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeactivateUser(u)}>
                          <UserX className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {meta && <Pagination meta={meta} page={page} onPageChange={setPage} />}

      <CreateUserDialog open={showCreate} onClose={() => setShowCreate(false)} roles={roles} onSuccess={fetchUsers} />
      {editUser && <EditUserDialog open={showEdit} onClose={() => { setShowEdit(false); setEditUser(null) }} user={editUser} roles={roles} onSuccess={fetchUsers} />}

      <AlertDialog open={!!deactivateUser} onOpenChange={(open) => { if (!open) setDeactivateUser(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate {deactivateUser?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will prevent the user from logging in. Their account data will be preserved and can be reactivated later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* ─── Create User Dialog ─── */

function CreateUserDialog({ open, onClose, roles, onSuccess }: { open: boolean; onClose: () => void; roles: Role[]; onSuccess: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const reset = () => { setForm({ name: '', email: '', phone: '', password: '', role: '' }); setError(''); setShowPassword(false) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await api.post('/users', form)
      toast.success('User created successfully')
      reset()
      onClose()
      onSuccess()
    } catch (err) {
      const data = (err as any).response?.data
      if (data?.errors) {
        setError(Object.values(data.errors as Record<string, string[]>).flat().join(' '))
      } else {
        setError(data?.message || 'Failed to create user')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => { reset(); onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>Add a new staff member. They will be required to change their password on first login.</DialogDescription>
        </DialogHeader>
        <Separator />
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">{error}</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Full Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Doe" required className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@company.com" required className="h-10" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="08012345678" className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v ?? '' })}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {roles.map((r) => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Temporary Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Min. 8 characters"
                required
                minLength={8}
                className="h-10 pr-10"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">User will be required to change this on first login</p>
          </div>
          <Separator />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { reset(); onClose() }}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Create User'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ─── Edit User Dialog ─── */

function EditUserDialog({ open, onClose, user, roles, onSuccess }: { open: boolean; onClose: () => void; user: User; roles: Role[]; onSuccess: () => void }) {
  const [form, setForm] = useState({ name: user.name, email: user.email, phone: user.phone || '', role: user.role || '', is_active: user.is_active })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await api.put(`/users/${user.id}`, form)
      toast.success('User updated successfully')
      onClose()
      onSuccess()
    } catch (err) {
      const data = (err as any).response?.data
      if (data?.errors) {
        setError(Object.values(data.errors as Record<string, string[]>).flat().join(' '))
      } else {
        setError(data?.message || 'Failed to update user')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>Editing {user.name} ({user.email})</DialogDescription>
        </DialogHeader>
        <Separator />
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">{error}</div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Full Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="h-10" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v ?? '' })}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {roles.map((r) => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Account Status</p>
              <p className="text-xs text-muted-foreground">Inactive users cannot log in</p>
            </div>
            <button
              type="button"
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? 'bg-primary' : 'bg-muted'}`}
              onClick={() => setForm({ ...form, is_active: !form.is_active })}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <Separator />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
