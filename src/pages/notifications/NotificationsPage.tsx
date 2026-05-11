import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import Pagination from '@/components/Pagination'
import { Bell, BellOff, CheckCheck, Mail, MailOpen } from 'lucide-react'

interface Notification {
  id: string
  type: string
  data: { title?: string; message: string; type?: string }
  read_at: string | null
  created_at: string
}

interface Meta {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [meta, setMeta] = useState<Meta>({ current_page: 1, last_page: 1, per_page: 20, total: 0 })
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [loading, setLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page, per_page: 20 }
      if (filter === 'unread') params.unread = 1
      if (filter === 'read') params.read = 1
      const { data } = await api.get('/notifications', { params })
      setNotifications(data.data.data || data.data)
      if (data.meta) setMeta(data.meta)
    } catch { /* ignore */ }
    setLoading(false)
  }, [page, filter])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  const markAsRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    } catch { /* ignore */ }
  }

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })))
    } catch { /* ignore */ }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const unreadCount = notifications.filter(n => !n.read_at).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">{meta.total} total notifications</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all as read
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        {(['all', 'unread', 'read'] as const).map(f => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setFilter(f); setPage(1) }}
          >
            {f === 'all' ? 'All' : f === 'unread' ? 'Unread' : 'Read'}
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Bell className="h-10 w-10 mb-3 animate-pulse" />
            <p className="text-sm">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <BellOff className="h-10 w-10 mb-3" />
            <p className="text-sm">
              {filter === 'unread' ? 'No unread notifications' : filter === 'read' ? 'No read notifications' : 'No notifications yet'}
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 p-4 rounded-md border transition-colors ${
                n.read_at ? 'bg-card' : 'bg-primary/5 border-primary/20'
              }`}
            >
              <div className="mt-0.5">
                {n.read_at ? (
                  <MailOpen className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Mail className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${n.read_at ? 'text-foreground' : 'font-semibold text-foreground'}`}>
                  {n.data.title || n.data.message}
                </p>
                {n.data.title && n.data.message && (
                  <p className="text-sm text-muted-foreground mt-0.5">{n.data.message}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">{formatDate(n.created_at)}</p>
              </div>
              {!n.read_at && (
                <button className="shrink-0 text-primary cursor-pointer" onClick={() => markAsRead(n.id)} title="Mark as read">
                  <span className="hidden sm:inline text-xs hover:underline">Mark as read</span>
                  <CheckCheck className="h-4 w-4 sm:hidden" />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {meta.last_page > 1 && (
        <Pagination meta={meta} page={page} onPageChange={setPage} />
      )}
    </div>
  )
}
