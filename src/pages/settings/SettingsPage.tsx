import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import type { Setting } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { ToggleLeft, ToggleRight } from 'lucide-react'
import LoadingState from '@/components/LoadingState'

const settingsMeta: Record<string, { label: string; description: string; type: 'toggle' | 'text' | 'textarea'; group?: string }> = {
  super_admin_registration_enabled: {
    label: 'Super Admin Registration',
    description: 'Allow new Super Admin accounts to be created via the registration endpoint',
    type: 'toggle',
    group: 'General',
  },
  staff_business_assignment_enabled: {
    label: 'Staff Business Assignment',
    description: 'Restrict staff members to only see businesses they are assigned to',
    type: 'toggle',
    group: 'General',
  },
  default_low_stock_threshold: {
    label: 'Low Stock Threshold',
    description: 'Number of units below which a product is flagged as low stock',
    type: 'text',
    group: 'General',
  },
  order_number_prefix: {
    label: 'Order Number Prefix',
    description: 'Prefix added to all generated order numbers (e.g. ORD-00001)',
    type: 'text',
    group: 'General',
  },
  sms_enabled: {
    label: 'SMS Notifications',
    description: 'Send SMS notifications via Twilio when orders are placed or updated',
    type: 'toggle',
    group: 'Notifications',
  },
  whatsapp_enabled: {
    label: 'WhatsApp Notifications',
    description: 'Send WhatsApp messages via Twilio when orders are placed or updated',
    type: 'toggle',
    group: 'Notifications',
  },
  sms_new_order_template: {
    label: 'SMS — New Order Template',
    description: 'Variables: {order_number}, {customer_name}, {customer_phone}, {customer_state}, {total}, {business_name}',
    type: 'textarea',
    group: 'Notifications',
  },
  sms_order_status_template: {
    label: 'SMS — Order Status Template',
    description: 'Variables: {order_number}, {customer_name}, {status}, {total}',
    type: 'textarea',
    group: 'Notifications',
  },
  whatsapp_new_order_template: {
    label: 'WhatsApp — New Order Template',
    description: 'Variables: {order_number}, {customer_name}, {customer_phone}, {customer_state}, {total}, {business_name}. Use \\n for line breaks.',
    type: 'textarea',
    group: 'Notifications',
  },
  whatsapp_order_status_template: {
    label: 'WhatsApp — Order Status Template',
    description: 'Variables: {order_number}, {customer_name}, {status}, {total}. Use \\n for line breaks.',
    type: 'textarea',
    group: 'Notifications',
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

  const groupedSettings = (() => {
    const groups: Record<string, [string, string][]> = {}
    Object.entries(settings).forEach(([key, value]) => {
      const meta = settingsMeta[key]
      const group = meta?.group || 'Other'
      if (!groups[group]) groups[group] = []
      groups[group].push([key, value])
    })
    return groups
  })()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Manage system configuration</p>
      </div>

      {loading ? (
        <LoadingState text="Loading settings..." />
      ) : (
      <div className="space-y-6">
        {Object.entries(groupedSettings).map(([group, entries]) => (
          <div key={group} className="max-w-2xl">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">{group}</h3>
            <div className="rounded-md border bg-card">
              {entries.map(([key, value], index) => {
                const meta = settingsMeta[key] || { label: key, description: '', type: 'text' }
                return (
                  <div key={key}>
                    {index > 0 && <Separator />}
                    <div className={`p-5 ${meta.type === 'textarea' ? 'space-y-2' : 'flex flex-col sm:flex-row sm:items-center justify-between gap-3'}`}>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{meta.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
                      </div>
                      <div className={meta.type === 'textarea' ? '' : 'shrink-0'}>
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
                        ) : meta.type === 'textarea' ? (
                          <div className="space-y-2">
                            <textarea
                              value={value}
                              onChange={(e) => setSettings((prev) => ({ ...prev, [key]: e.target.value }))}
                              disabled={!canEdit}
                              rows={3}
                              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                            />
                            {canEdit && (
                              <div className="flex justify-end">
                                <Button size="sm" className="h-9" onClick={() => updateSetting(key, value)}>Save</Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Input
                              value={value}
                              onChange={(e) => setSettings((prev) => ({ ...prev, [key]: e.target.value }))}
                              disabled={!canEdit}
                              className="h-10 w-32 text-sm"
                            />
                            {canEdit && (
                              <Button size="sm" className="h-10" onClick={() => updateSetting(key, value)}>Save</Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  )
}
