import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Bell } from 'lucide-react'

interface Notification {
  id: string
  type: string
  data: { title: string; message: string }
  read_at: string | null
  created_at: string
}

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const fetchCount = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications/unread-count')
      setUnreadCount(data.count)
    } catch { /* ignore */ }
  }, [])

  const fetchRecent = async () => {
    try {
      const { data } = await api.get('/notifications/recent')
      setNotifications(data.data)
      setUnreadCount(data.unread_count)
    } catch { /* ignore */ }
  }

  useEffect(() => {
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [fetchCount])

  const handleOpen = () => {
    setOpen(!open)
    if (!open) fetchRecent()
  }

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read-all')
      setUnreadCount(0)
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })))
    } catch { /* ignore */ }
  }

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" className="h-9 w-9 relative" onClick={handleOpen}>
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-md border bg-card shadow-lg">
            <div className="flex items-center justify-between p-3 border-b">
              <span className="text-sm font-semibold">Notifications</span>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-primary hover:underline">Mark all read</button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">No notifications</p>
              ) : notifications.map((n) => (
                <div key={n.id} className={`p-3 border-b last:border-b-0 ${n.read_at ? '' : 'bg-primary/5'}`}>
                  <p className="text-sm font-medium">{n.data.title || n.data.message}</p>
                  {n.data.title && n.data.message && (
                    <p className="text-xs text-muted-foreground mt-0.5">{n.data.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              ))}
            </div>
            <div className="p-2 border-t">
              <button
                onClick={() => { setOpen(false); navigate('/notifications') }}
                className="w-full text-center text-sm text-primary hover:underline py-1"
              >
                View all notifications
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
