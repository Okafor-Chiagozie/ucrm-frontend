import { useState, useEffect } from 'react'
import api from '@/lib/api'
import type { Role } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Shield, Key, Check } from 'lucide-react'

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchRoles = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/roles')
      setRoles(data.data)
    } catch {
      toast.error('Failed to load roles')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRoles() }, [])

  const openPermissions = async (role: Role) => {
    try {
      const { data } = await api.get(`/roles/${role.id}`)
      setSelectedRole(data.data)
    } catch {
      toast.error('Failed to load role details')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Roles & Permissions</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Control what each role can access in the system</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground gap-2">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Loading roles...
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {roles.map((role) => (
            <Card
              key={role.id}
              className="group cursor-pointer border hover:border-primary/50 hover:shadow-md transition-all duration-200"
              onClick={() => openPermissions(role)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <Badge variant="secondary" className="font-normal text-xs">
                    <Key className="h-3 w-3 mr-1" />
                    {role.permissions_count}
                  </Badge>
                </div>
                <h3 className="font-semibold text-base">{role.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {role.permissions_count} permission{role.permissions_count !== 1 ? 's' : ''} assigned
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedRole && (
        <PermissionsDialog
          role={selectedRole}
          onClose={() => setSelectedRole(null)}
          onSaved={fetchRoles}
        />
      )}
    </div>
  )
}

function PermissionsDialog({ role, onClose, onSaved }: { role: Role; onClose: () => void; onSaved: () => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(role.permissions || []))
  const [saving, setSaving] = useState(false)
  const allPermissions = role.all_permissions || []

  const grouped = allPermissions.reduce<Record<string, string[]>>((acc, perm) => {
    const [group] = perm.split('.')
    if (!acc[group]) acc[group] = []
    acc[group].push(perm)
    return acc
  }, {})

  const toggle = (perm: string) => {
    const next = new Set(selected)
    if (next.has(perm)) next.delete(perm)
    else next.add(perm)
    setSelected(next)
  }

  const toggleGroup = (group: string) => {
    const perms = grouped[group]
    const allSelected = perms.every((p) => selected.has(p))
    const next = new Set(selected)
    perms.forEach((p) => allSelected ? next.delete(p) : next.add(p))
    setSelected(next)
  }

  const save = async () => {
    setSaving(true)
    try {
      await api.put(`/roles/${role.id}/permissions`, { permissions: Array.from(selected) })
      toast.success(`${role.name} permissions updated`)
      onSaved()
      onClose()
    } catch {
      toast.error('Failed to update permissions')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>{role.name}</DialogTitle>
              <DialogDescription>{selected.size} of {allPermissions.length} permissions selected</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <Separator />
        <div className="flex-1 overflow-y-auto space-y-5 py-2">
          {Object.entries(grouped).map(([group, perms]) => {
            const allSelected = perms.every((p) => selected.has(p))
            const someSelected = perms.some((p) => selected.has(p))
            return (
              <div key={group}>
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    className="text-sm font-semibold capitalize tracking-wide text-foreground hover:text-primary transition-colors"
                    onClick={() => toggleGroup(group)}
                  >
                    {group.replace(/_/g, ' ')}
                  </button>
                  <Badge variant={allSelected ? 'default' : someSelected ? 'secondary' : 'outline'} className="text-xs font-normal">
                    {perms.filter((p) => selected.has(p)).length}/{perms.length}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {perms.map((perm) => {
                    const active = selected.has(perm)
                    return (
                      <button
                        key={perm}
                        type="button"
                        onClick={() => toggle(perm)}
                        className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-all ${
                          active
                            ? 'border-primary/30 bg-primary/5 text-foreground'
                            : 'border-border bg-background text-muted-foreground hover:border-primary/20 hover:bg-muted/50'
                        }`}
                      >
                        <div className={`h-4 w-4 rounded-sm border flex items-center justify-center shrink-0 ${
                          active ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                        }`}>
                          {active && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        <span className="truncate">{perm.split('.')[1]}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
        <Separator />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Permissions'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
