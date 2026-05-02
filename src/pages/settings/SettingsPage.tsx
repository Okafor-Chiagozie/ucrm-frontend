import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import type { Setting } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { ToggleLeft, ToggleRight } from 'lucide-react'

const settingsMeta: Record<string, { label: string; description: string; type: 'toggle' | 'text' }> = {
  super_admin_registration_enabled: {
    label: 'Super Admin Registration',
    description: 'Allow new Super Admin accounts to be created via the registration endpoint',
    type: 'toggle',
  },
  staff_business_assignment_enabled: {
    label: 'Staff Business Assignment',
    description: 'Restrict staff members to only see businesses they are assigned to',
    type: 'toggle',
  },
  default_low_stock_threshold: {
    label: 'Low Stock Threshold',
    description: 'Number of units below which a product is flagged as low stock',
    type: 'text',
  },
  order_number_prefix: {
    label: 'Order Number Prefix',
    description: 'Prefix added to all generated order numbers (e.g. ORD-00001)',
    type: 'text',
  },
}

export default function SettingsPage() {
  const { hasPermission } = useAuth()
  const [settings, setSettings] = useState<Setting>({})
  const [loading, setLoading] = useState(true)
  const canEdit = hasPermission('settings.edit')

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await api.get('/settings')
        setSettings(data.data)
      } catch {
        toast.error('Failed to load settings')
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  const updateSetting = async (key: string, value: string) => {
    try {
      await api.put(`/settings/${key}`, { value })
      setSettings((prev) => ({ ...prev, [key]: value }))
      toast.success('Setting updated')
    } catch {
      toast.error('Failed to update setting')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Manage system configuration</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground gap-2">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Loading settings...
        </div>
      ) : (
      <div className="max-w-2xl rounded-md border bg-card">
        {Object.entries(settings).map(([key, value], index) => {
          const meta = settingsMeta[key] || { label: key, description: '', type: 'text' }
          return (
            <div key={key}>
              {index > 0 && <Separator />}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{meta.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
                </div>
                <div className="shrink-0">
                  {meta.type === 'toggle' ? (
                    <button
                      type="button"
                      disabled={!canEdit}
                      className={`transition-colors ${!canEdit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      onClick={() => updateSetting(key, value === 'true' ? 'false' : 'true')}
                    >
                      {value === 'true' ? (
                        <ToggleRight className="h-7 w-7 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="h-7 w-7 text-muted-foreground" />
                      )}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        value={value}
                        onChange={(e) => setSettings((prev) => ({ ...prev, [key]: e.target.value }))}
                        disabled={!canEdit}
                        className="h-10 w-32 text-sm"
                      />
                      {canEdit && (
                        <Button size="sm" className="h-10" onClick={() => updateSetting(key, value)}>
                          Save
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      )}
    </div>
  )
}
