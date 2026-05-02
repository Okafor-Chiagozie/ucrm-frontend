import { useState, useEffect } from 'react'
import api from '@/lib/api'
import type { Role } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

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
        <h2 className="text-3xl font-bold tracking-tight">Roles & Permissions</h2>
        <p className="text-muted-foreground">Manage what each role can access</p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <Card key={role.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => openPermissions(role)}>
              <CardHeader>
                <CardTitle className="text-lg">{role.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{role.permissions_count} permissions</p>
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
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{role.name} — Permissions</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {Object.entries(grouped).map(([group, perms]) => (
            <div key={group}>
              <button type="button" className="mb-2 text-sm font-semibold capitalize cursor-pointer hover:underline" onClick={() => toggleGroup(group)}>
                {group.replace('_', ' ')}
              </button>
              <div className="flex flex-wrap gap-2">
                {perms.map((perm) => (
                  <Badge
                    key={perm}
                    variant={selected.has(perm) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggle(perm)}
                  >
                    {perm.split('.')[1]}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
