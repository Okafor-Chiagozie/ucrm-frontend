import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

export type VerifiableOrder = {
  id: string
  order_number: string
  customer_name: string
  total: string | number
  delivery_agent_id?: string | null
  amount?: string | number | null
}

const formatPrice = (n: string | number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(Number(n))

/**
 * Captures the two things a verifier records when confirming an order: which
 * rider handled it, and the delivery fee they are signing off. Used by both the
 * payment and the delivery pages — each stores its own pair, so the
 * verification report can show where the two disagree.
 */
export default function VerifyOrderDialog({ order, amountLabel, onClose, onConfirm }: {
  order: VerifiableOrder
  /** What the fee field is called on this page. */
  amountLabel: string
  onClose: () => void
  onConfirm: (deliveryAgentId: string, amount: string) => Promise<void>
}) {
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([])
  const [agentId, setAgentId] = useState(order.delivery_agent_id ?? '')
  const [amount, setAmount] = useState(order.amount != null ? String(order.amount) : '')
  const [loadingAgents, setLoadingAgents] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/users?role=Delivery Agent&per_page=100&is_active=1')
      .then(({ data }) => setAgents((data.data?.data ?? []).map((u: any) => ({ id: u.id, name: u.name }))))
      .catch(() => toast.error('Failed to load delivery agents'))
      .finally(() => setLoadingAgents(false))
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agentId) { toast.error('Choose the delivery agent'); return }
    if (amount === '' || Number(amount) < 0) { toast.error('Enter the amount'); return }
    setSaving(true)
    try {
      await onConfirm(agentId, amount)
    } finally {
      setSaving(false)
    }
  }


  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Verify {order.order_number}</DialogTitle>
          <DialogDescription>
            {order.customer_name} — order total {formatPrice(order.total)}
          </DialogDescription>
        </DialogHeader>
        <Separator />
        <form onSubmit={submit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label className="text-sm">Delivery Agent</Label>
            <Select value={agentId} onValueChange={(v) => setAgentId(v ?? '')} disabled={loadingAgents}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder={loadingAgents ? 'Loading...' : 'Choose delivery agent'}>
                  {agents.find((a) => a.id === agentId)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {!loadingAgents && agents.length === 0 && (
              <p className="text-xs text-amber-600">
                No delivery agents yet. Add one from the Users page, then come back.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">{amountLabel}</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="h-10"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">What the delivery actually cost, as you are signing it off.</p>
          </div>

          <Separator />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving || loadingAgents}>
              {saving ? 'Verifying...' : 'Confirm'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
