import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'
import type { PaginationMeta } from '@/types'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import Pagination from '@/components/Pagination'
import LoadingState from '@/components/LoadingState'
import EmptyState from '@/components/EmptyState'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { Search, ScrollText } from 'lucide-react'

interface LogEntry {
  id: string
  user_name: string
  action: string
  description: string
  subject_type: string | null
  subject_id: string | null
  ip_address: string | null
  created_at: string
}

const actionColors: Record<string, string> = {
  login: 'border-blue-200 bg-blue-50 text-blue-700',
  'user.created': 'border-emerald-200 bg-emerald-50 text-emerald-700',
  'user.deactivated': 'border-red-200 bg-red-50 text-red-700',
  'order.status_changed': 'border-violet-200 bg-violet-50 text-violet-700',
}

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), per_page: '20' })
      if (search) params.set('search', search)
      const { data } = await api.get(`/activity-logs?${params}`)
      setLogs(data.data.data)
      setMeta(data.meta)
    } catch { toast.error('Failed to load activity logs') }
    finally { setLoading(false) }
  }, [page, search])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Activity Log</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Track who did what and when</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search activity..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-9 h-10" />
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading ? <LoadingState text="Loading..." /> : logs.length === 0 ? <EmptyState icon={ScrollText} title="No activity yet" description="Actions will be logged here" /> : logs.map((log) => (
          <Card key={log.id}>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className={`font-normal text-xs ${actionColors[log.action] ?? 'border-muted bg-muted/50 text-muted-foreground'}`}>
                  {log.action}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(log.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{log.description}</p>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{log.user_name}</p>
                {log.ip_address && <span className="font-mono text-xs text-muted-foreground">{log.ip_address}</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={5}><LoadingState text="Loading..." /></TableCell></TableRow>
            : logs.length === 0 ? <TableRow><TableCell colSpan={5}><EmptyState icon={ScrollText} title="No activity yet" description="Actions will be logged here" /></TableCell></TableRow>
            : logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-medium">{log.user_name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`font-normal text-xs ${actionColors[log.action] ?? 'border-muted bg-muted/50 text-muted-foreground'}`}>
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground max-w-xs truncate">{log.description}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{log.ip_address ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                  {new Date(log.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {meta && <Pagination meta={meta} page={page} onPageChange={setPage} />}
    </div>
  )
}
