import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'
import type { Business, User, FormPerformance, FormPerformanceByCreator, FormPerformanceTotals } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import LoadingState from '@/components/LoadingState'
import EmptyState from '@/components/EmptyState'
import { toast } from 'sonner'
import { Code, TrendingUp, Package, DollarSign, RotateCcw, UserRound, ShoppingCart } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const today = () => new Date().toISOString().slice(0, 10)
const DATE_PRESETS = [
  { label: 'Today', from: today, to: today },
  { label: 'This Week', from: () => { const d = new Date(); const day = d.getDay(); d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); return d.toISOString().slice(0, 10) }, to: today },
  { label: 'This Month', from: () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10), to: today },
  { label: 'Last 30 Days', from: () => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10) }, to: today },
]

const formatPrice = (n: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(n)

export default function FormPerformancePage() {
  const { hasPermission } = useAuth()
  const [forms, setForms] = useState<FormPerformance[]>([])
  const [byCreator, setByCreator] = useState<FormPerformanceByCreator[]>([])
  const [totals, setTotals] = useState<FormPerformanceTotals | null>(null)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [marketers, setMarketers] = useState<User[]>([])
  const [businessFilter, setBusinessFilter] = useState('')
  const [creatorFilter, setCreatorFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isPersonal, setIsPersonal] = useState(false)

  const hasFilters = businessFilter || creatorFilter || dateFrom || dateTo

  const dateLabel = () => {
    if (showDatePicker) return 'Custom Range'
    if (!dateFrom && !dateTo) return 'All Time'
    const match = DATE_PRESETS.find((p) => dateFrom === p.from() && dateTo === p.to())
    if (match) return match.label
    return `${dateFrom || '...'} — ${dateTo || '...'}`
  }

  const fetchPerformance = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (businessFilter) params.set('business_id', businessFilter)
      if (creatorFilter) params.set('created_by', creatorFilter)
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      const { data } = await api.get(`/form-performance?${params}`)
      setForms(data.data)
      setByCreator(data.by_creator)
      setTotals(data.totals)
      setIsPersonal(data.is_personal ?? false)
    } catch {
      toast.error('Failed to load form performance')
    } finally {
      setLoading(false)
    }
  }, [businessFilter, creatorFilter, dateFrom, dateTo])

  useEffect(() => { fetchPerformance() }, [fetchPerformance])

  useEffect(() => {
    api.get('/businesses?per_page=100').then(({ data }) => setBusinesses(data.data.data)).catch(() => {})
    // Only managers can filter by marketer; a marketer only ever sees their own.
    if (hasPermission('users.view')) {
      api.get('/users?per_page=100&role=Marketer').then(({ data }) => setMarketers(data.data.data)).catch(() => {})
    }
  }, [hasPermission])

  const rateBadge = (rate: number) => {
    if (rate >= 70) return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    if (rate >= 40) return 'border-amber-200 bg-amber-50 text-amber-700'
    return 'border-red-200 bg-red-50 text-red-700'
  }

  const resetFilters = () => {
    setBusinessFilter(''); setCreatorFilter(''); setDateFrom(''); setDateTo(''); setShowDatePicker(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{isPersonal ? 'My Form Performance' : 'Form Performance'}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isPersonal
            ? 'Orders and revenue from the order forms assigned to you'
            : 'Track which order form brought in each order, and who it is assigned to'}
        </p>
        <p className="text-xs text-muted-foreground mt-1.5">
          <span className="font-medium">Conversion</span> is the share of orders that were actually delivered.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3">
        <Select value={businessFilter || 'all'} onValueChange={(v) => setBusinessFilter(v === 'all' ? '' : v ?? '')}>
          <SelectTrigger className="h-10 w-full sm:w-48">
            <SelectValue>{businesses.find((b) => b.id === businessFilter)?.name ?? 'All Businesses'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Businesses</SelectItem>
            {businesses.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>

        {!isPersonal && marketers.length > 0 && (
          <Select value={creatorFilter || 'all'} onValueChange={(v) => setCreatorFilter(v === 'all' ? '' : v ?? '')}>
            <SelectTrigger className="h-10 w-full sm:w-48">
              <SelectValue>{marketers.find((m) => m.id === creatorFilter)?.name ?? 'All Marketers'}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Marketers</SelectItem>
              {marketers.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" className="h-10 w-full sm:w-44" />}>
            {dateLabel()}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {DATE_PRESETS.map((preset) => (
              <DropdownMenuItem key={preset.label} onClick={() => { setDateFrom(preset.from()); setDateTo(preset.to()); setShowDatePicker(false) }}>
                {preset.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onClick={() => { setShowDatePicker(true); setDateFrom(''); setDateTo('') }}>Custom Range</DropdownMenuItem>
            {(dateFrom || dateTo) && <DropdownMenuItem onClick={() => { setDateFrom(''); setDateTo(''); setShowDatePicker(false) }}>All Time</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>

        {showDatePicker && (
          <>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-10 w-full sm:w-36" />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-10 w-full sm:w-36" />
          </>
        )}

        {hasFilters && (
          <Button variant="ghost" size="sm" className="text-muted-foreground h-10" onClick={resetFilters}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
          </Button>
        )}
      </div>

      {loading ? <LoadingState text="Loading form performance..." /> : (
        <>
          {/* Summary */}
          {totals && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Card className="border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-md bg-blue-100 flex items-center justify-center shrink-0">
                    <ShoppingCart className="h-4.5 w-4.5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Orders from Forms</p>
                    <p className="text-lg font-bold">{totals.total_orders}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-md bg-green-100 flex items-center justify-center shrink-0">
                    <DollarSign className="h-4.5 w-4.5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                    <p className="text-lg font-bold">{formatPrice(totals.revenue)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-md bg-orange-100 flex items-center justify-center shrink-0">
                    <Package className="h-4.5 w-4.5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Abandoned</p>
                    <p className="text-lg font-bold">{totals.abandoned}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-md bg-violet-100 flex items-center justify-center shrink-0">
                    <TrendingUp className="h-4.5 w-4.5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Conversion (delivered)</p>
                    <p className="text-lg font-bold">{totals.conversion_rate}%</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Per marketer — the headline question this page answers */}
          {!isPersonal && byCreator.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <UserRound className="h-4 w-4 text-muted-foreground" /> By Marketer
              </h3>
              <div className="rounded-md border bg-card overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead>Marketer</TableHead>
                      <TableHead className="text-center">Forms</TableHead>
                      <TableHead className="text-center">Orders</TableHead>
                      <TableHead className="text-center">Delivered</TableHead>
                      <TableHead className="text-center">Abandoned</TableHead>
                      <TableHead className="text-center">Conversion</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byCreator.map((c) => (
                      <TableRow key={c.created_by ?? 'unknown'}>
                        <TableCell className="font-medium">{c.creator_name}</TableCell>
                        <TableCell className="text-center">{c.forms_count}</TableCell>
                        <TableCell className="text-center font-medium">{c.total_orders}</TableCell>
                        <TableCell className="text-center text-emerald-600 font-medium">{c.delivered}</TableCell>
                        <TableCell className="text-center text-orange-600 font-medium">{c.abandoned}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={`font-normal ${rateBadge(c.conversion_rate)}`}>{c.conversion_rate}%</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatPrice(c.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Per form */}
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
              <Code className="h-4 w-4 text-muted-foreground" /> By Form
            </h3>

            {forms.length === 0 ? (
              <EmptyState
                icon={Code}
                title="No order forms yet"
                description={isPersonal ? 'Build a form on the Order Forms page to start tracking it' : 'No forms match these filters'}
              />
            ) : (
              <>
                <div className="hidden md:block rounded-md border bg-card overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead>Form</TableHead>
                        {!isPersonal && <TableHead>Assigned to</TableHead>}
                        <TableHead className="text-center">Orders</TableHead>
                        <TableHead className="text-center">Delivered</TableHead>
                        <TableHead className="text-center">Pending</TableHead>
                        <TableHead className="text-center">Abandoned</TableHead>
                          <TableHead className="text-center">Conversion</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {forms.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div>
                                <p className="font-medium">{f.name}</p>
                                <p className="text-xs text-muted-foreground">{f.product_name} &middot; {f.business_name}</p>
                              </div>
                              {!f.is_active && <Badge variant="outline" className="text-[10px] text-muted-foreground">Inactive</Badge>}
                            </div>
                          </TableCell>
                          {!isPersonal && <TableCell className="text-sm">{f.creator_name}</TableCell>}
                          <TableCell className="text-center font-medium">{f.total_orders}</TableCell>
                          <TableCell className="text-center text-emerald-600 font-medium">{f.delivered}</TableCell>
                          <TableCell className="text-center text-blue-600 font-medium">{f.pending}</TableCell>
                          <TableCell className="text-center text-orange-600 font-medium">{f.abandoned}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={`font-normal ${rateBadge(f.conversion_rate)}`}>{f.conversion_rate}%</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatPrice(f.revenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile */}
                <div className="md:hidden space-y-3">
                  {forms.map((f) => (
                    <Card key={f.id} className="border">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{f.name}</p>
                            <p className="text-xs text-muted-foreground">{f.product_name}</p>
                            {!isPersonal && <p className="text-xs text-muted-foreground mt-0.5">Assigned to {f.creator_name}</p>}
                          </div>
                          <Badge variant="outline" className={`font-normal shrink-0 ${rateBadge(f.conversion_rate)}`}>{f.conversion_rate}%</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">Orders</p>
                            <p className="font-medium">{f.total_orders}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Delivered</p>
                            <p className="font-medium text-emerald-600">{f.delivered}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Abandoned</p>
                            <p className="font-medium text-orange-600">{f.abandoned}</p>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground pt-1 border-t">
                          Revenue: <span className="font-medium text-foreground">{formatPrice(f.revenue)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
