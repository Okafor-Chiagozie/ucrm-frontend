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
import VariableTextarea from '@/components/VariableTextarea'

const NOTIFICATION_VARIABLES: Record<string, { key: string; label: string }[]> = {
  sms_new_order_template: [
    { key: '{order_number}', label: 'Order #' }, { key: '{customer_name}', label: 'Name' },
    { key: '{customer_phone}', label: 'Phone' }, { key: '{customer_state}', label: 'State' },
    { key: '{total}', label: 'Total' }, { key: '{business_name}', label: 'Business' },
  ],
  sms_order_status_template: [
    { key: '{order_number}', label: 'Order #' }, { key: '{customer_name}', label: 'Name' },
    { key: '{status}', label: 'Status' }, { key: '{total}', label: 'Total' },
  ],
  whatsapp_new_order_template: [
    { key: '{order_number}', label: 'Order #' }, { key: '{customer_name}', label: 'Name' },
    { key: '{customer_phone}', label: 'Phone' }, { key: '{customer_state}', label: 'State' },
    { key: '{total}', label: 'Total' }, { key: '{business_name}', label: 'Business' }, { key: '\\n', label: 'New Line' },
  ],
  whatsapp_order_status_template: [
    { key: '{order_number}', label: 'Order #' }, { key: '{customer_name}', label: 'Name' },
    { key: '{status}', label: 'Status' }, { key: '{total}', label: 'Total' }, { key: '\\n', label: 'New Line' },
  ],
}

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
  sms_sender_id: {
    label: 'SMS Sender ID',
    description: 'The sender name/number that appears on SMS messages (e.g. UCRM)',
    type: 'text',
    group: 'SMS Notifications',
  },
  sms_new_order_enabled: {
    label: 'SMS — New Order',
    description: 'Send SMS to customer when a new order is placed',
    type: 'toggle',
    group: 'SMS Notifications',
  },
  sms_new_order_template: {
    label: 'SMS — New Order Template',
    description: 'Variables: {order_number}, {customer_name}, {customer_phone}, {customer_state}, {total}, {business_name}',
    type: 'textarea',
    group: 'SMS Notifications',
  },
  sms_order_status_enabled: {
    label: 'SMS — Order Status Update',
    description: 'Send SMS to customer when order status changes',
    type: 'toggle',
    group: 'SMS Notifications',
  },
  sms_order_status_template: {
    label: 'SMS — Order Status Template',
    description: 'Variables: {order_number}, {customer_name}, {status}, {total}',
    type: 'textarea',
    group: 'SMS Notifications',
  },
  whatsapp_sender_number: {
    label: 'WhatsApp Sender Number',
    description: 'The WhatsApp number used to send messages (e.g. +2347084613518)',
    type: 'text',
    group: 'WhatsApp Notifications',
  },
  whatsapp_new_order_enabled: {
    label: 'WhatsApp — New Order',
    description: 'Send WhatsApp message to customer when a new order is placed',
    type: 'toggle',
    group: 'WhatsApp Notifications',
  },
  whatsapp_new_order_template: {
    label: 'WhatsApp — New Order Template',
    description: 'Variables: {order_number}, {customer_name}, {customer_phone}, {customer_state}, {total}, {business_name}. Use \\n for line breaks.',
    type: 'textarea',
    group: 'WhatsApp Notifications',
  },
  whatsapp_order_status_enabled: {
    label: 'WhatsApp — Order Status Update',
    description: 'Send WhatsApp message to customer when order status changes',
    type: 'toggle',
    group: 'WhatsApp Notifications',
  },
  whatsapp_order_status_template: {
    label: 'WhatsApp — Order Status Template',
    description: 'Variables: {order_number}, {customer_name}, {status}, {total}. Use \\n for line breaks.',
    type: 'textarea',
    group: 'WhatsApp Notifications',
  },
}

export default function SettingsPage() {
  const { hasPermission } = useAuth()
  const [settings, setSettings] = useState<Setting>({})
  const [savedSettings, setSavedSettings] = useState<Setting>({})
  const [loading, setLoading] = useState(true)
  const canEdit = hasPermission('settings.edit')

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await api.get('/settings')
        setSettings(data.data)
        setSavedSettings(data.data)
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
      setSavedSettings((prev) => ({ ...prev, [key]: value }))
      toast.success('Setting updated')
    } catch {
      toast.error('Failed to update setting')
    }
  }

  const previewTemplate = (template: string) => {
    const sample: Record<string, string> = {
      '{order_number}': 'ORD-00042',
      '{customer_name}': 'John Doe',
      '{customer_phone}': '+2348012345678',
      '{customer_state}': 'Lagos',
      '{customer_address}': '15 Admiralty Way, Lekki',
      '{total}': '29,500',
      '{subtotal}': '27,000',
      '{delivery_fee}': '2,500',
      '{status}': 'Confirmed',
      '{business_name}': 'Skincare Empire',
    }
    let result = template
    for (const [key, val] of Object.entries(sample)) {
      result = result.replaceAll(key, val)
    }
    return result.replaceAll('\\n', '\n')
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
                            <VariableTextarea
                              value={value.replaceAll('\\n', '\n')}
                              onChange={(v) => setSettings((prev) => ({ ...prev, [key]: v.replaceAll('\n', '\\n') }))}
                              variables={NOTIFICATION_VARIABLES[key] ?? []}
                              rows={3}
                            />
                            <div className="rounded-md bg-muted/50 border border-dashed p-3">
                              <p className="text-[10px] font-medium text-muted-foreground mb-1">Preview:</p>
                              {value.includes('<') ? (
                                <div className="text-xs" dangerouslySetInnerHTML={{ __html: previewTemplate(value) }} />
                              ) : (
                                <p className="text-xs whitespace-pre-wrap">{previewTemplate(value)}</p>
                              )}
                            </div>
                            {canEdit && (
                              <div className="flex justify-end">
                                <Button size="sm" className="h-9" disabled={value === savedSettings[key]} onClick={() => updateSetting(key, value)}>Save</Button>
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
                              <Button size="sm" className="h-10" disabled={value === savedSettings[key]} onClick={() => updateSetting(key, value)}>Save</Button>
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
