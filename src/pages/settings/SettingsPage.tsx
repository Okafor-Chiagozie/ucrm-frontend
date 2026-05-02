import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import type { Setting } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

const settingLabels: Record<string, { label: string; type: 'toggle' | 'text' }> = {
  super_admin_registration_enabled: { label: 'Super Admin Registration', type: 'toggle' },
  staff_business_assignment_enabled: { label: 'Staff Business Assignment', type: 'toggle' },
  default_low_stock_threshold: { label: 'Low Stock Threshold', type: 'text' },
  order_number_prefix: { label: 'Order Number Prefix', type: 'text' },
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

  if (loading) return <p className="text-muted-foreground">Loading...</p>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">System configuration</p>
      </div>

      <div className="grid gap-4 max-w-2xl">
        {Object.entries(settings).map(([key, value]) => {
          const config = settingLabels[key] || { label: key, type: 'text' }
          return (
            <Card key={key}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{config.label}</CardTitle>
              </CardHeader>
              <CardContent>
                {config.type === 'toggle' ? (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={!canEdit}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        value === 'true' ? 'bg-primary' : 'bg-muted'
                      } ${!canEdit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      onClick={() => updateSetting(key, value === 'true' ? 'false' : 'true')}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          value === 'true' ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className="text-sm text-muted-foreground">{value === 'true' ? 'Enabled' : 'Disabled'}</span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={value}
                      onChange={(e) => setSettings((prev) => ({ ...prev, [key]: e.target.value }))}
                      disabled={!canEdit}
                    />
                    {canEdit && (
                      <Button size="sm" onClick={() => updateSetting(key, value)}>
                        Save
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
