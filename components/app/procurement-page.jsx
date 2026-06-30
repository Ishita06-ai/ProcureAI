'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Search, LayoutGrid, List, RefreshCw, Download, ShoppingCart, ClipboardList, PackageCheck, ChevronDown, MoreHorizontal, Truck, CheckCircle2, XCircle,
} from 'lucide-react';
import { cn, hasRole } from '@/lib/utils';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context.jsx';
import { toast } from 'sonner';
import { PrKanban } from '@/components/app/pr-kanban';
import { PrTable } from '@/components/app/pr-table';
import { PrDrawer } from '@/components/app/pr-drawer';
import { PrCreateDialog } from '@/components/app/pr-create-dialog';
import { PR_STATUS, PRIORITY, PO_STATUS, GRN_STATUS, fmtCurrency, fmtDate, fmtRelative } from '@/lib/procurement-utils';

function useVendors() {
  const [vendors, setVendors] = useState([]);
  useEffect(() => { api.listVendors({ limit: 100 }).then(r => setVendors(r.data)).catch(() => {}); }, []);
  return vendors;
}

// ============ Purchase Requests ============
function PurchaseRequestsTab() {
  const { user } = useAuth();
  const vendors = useVendors();
  const [view, setView] = useState('kanban');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [board, setBoard] = useState(null);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (view === 'kanban') {
        const r = await api.prBoard();
        setBoard(r.data);
      } else {
        const params = { limit: 100 };
        if (q) params.q = q;
        if (status !== 'all') params.status = status;
        if (priority !== 'all') params.priority = priority;
        const r = await api.listPRs(params);
        setList(r.data);
      }
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [view, q, status, priority]);

  useEffect(() => {
    const t = setTimeout(load, view === 'kanban' ? 0 : 250);
    return () => clearTimeout(t);
  }, [load, refresh]);

  const totalPRs = useMemo(() => {
    if (view === 'kanban' && board) return Object.values(board).reduce((s, a) => s + a.length, 0);
    return list.length;
  }, [view, board, list]);

  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Search PR by number, title or requester…" className="pl-9 h-9" />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {Object.entries(PR_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="h-9 w-[130px]"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                {Object.entries(PRIORITY).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="ml-auto flex items-center gap-2">
              <div className="hidden md:flex items-center gap-1 rounded-md border border-border/60 p-0.5">
                <Button size="sm" variant={view === 'kanban' ? 'secondary' : 'ghost'} className="h-7 w-7 p-0" onClick={() => setView('kanban')} aria-label="Kanban view">
                  <LayoutGrid className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant={view === 'list' ? 'secondary' : 'ghost'} className="h-7 w-7 p-0" onClick={() => setView('list')} aria-label="List view">
                  <List className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setRefresh(x => x + 1)}>
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </Button>
              {hasRole(user, 'admin', 'manager', 'buyer') && <PrCreateDialog onCreated={() => setRefresh(x => x + 1)} />}
            </div>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">{loading ? 'Loading…' : `${totalPRs} requests`}</div>
        </CardContent>
      </Card>

      {view === 'kanban'
        ? <PrKanban board={board} loading={loading} onOpen={(pr) => setOpenId(pr._id)} />
        : <PrTable items={list} loading={loading} onOpen={(pr) => setOpenId(pr._id)} />
      }

      <PrDrawer
        prId={openId}
        open={!!openId}
        onOpenChange={(o) => !o && setOpenId(null)}
        vendors={vendors}
        onMutated={() => setRefresh(x => x + 1)}
      />
    </div>
  );
}

// ============ Purchase Orders Tab ============
function PoTab() {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const params = { limit: 100 };
        if (q) params.q = q;
        if (status !== 'all') params.status = status;
        const r = await api.listPOs(params);
        if (!cancel) setItems(r.data);
      } catch (e) { if (!cancel) toast.error(e.message); }
      finally { if (!cancel) setLoading(false); }
    }, 250);
    return () => { cancel = true; clearTimeout(t); };
  }, [q, status, refresh]);

  const advance = async (po, newStatus) => {
    if (newStatus === 'Cancelled' && !window.confirm(`Cancel PO ${po.number}? This can't be undone.`)) return;
    try {
      await api.updatePOStatus(po._id, newStatus);
      toast.success(`PO ${po.number} → ${newStatus}`);
      setRefresh(x => x + 1);
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by PO, vendor, owner…" className="pl-9 h-9" />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {Object.keys(PO_STATUS).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setRefresh(x => x + 1)}>
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </Button>
              <Button variant="outline" size="sm" className="h-9 gap-1.5"><Download className="h-3.5 w-3.5" /> Export</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="pl-6 text-[11px] uppercase tracking-wider">PO</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">Vendor</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">From PR</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">Delivery</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">Created</TableHead>
                <TableHead className="text-right text-[11px] uppercase tracking-wider pr-6">Amount</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={`s${i}`} className="border-border/60">
                  <TableCell className="pl-6"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell className="text-right pr-6"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell></TableCell>
                </TableRow>
              ))}
              {!loading && items.map((po) => {
                const meta = PO_STATUS[po.status] || PO_STATUS.Pending;
                return (
                  <TableRow key={po._id} className="border-border/60 hover:bg-accent/30">
                    <TableCell className="pl-6 font-medium font-mono text-xs">{po.number}</TableCell>
                    <TableCell className="text-sm">{po.vendorName}</TableCell>
                    <TableCell className="text-[11px] font-mono text-muted-foreground">{po.requestNumber || '—'}</TableCell>
                    <TableCell><Badge variant="outline" className={cn('h-5 text-[10px]', meta.cls)}>{po.status}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {po.deliveryStatus === 'Received' && <span className="text-emerald-500">Received</span>}
                      {po.deliveryStatus === 'Shipped' && <span className="text-sky-500">In transit · {po.eta}</span>}
                      {po.deliveryStatus === 'PartiallyReceived' && <span className="text-amber-500">Partial</span>}
                      {po.deliveryStatus === 'NotShipped' && <span>Not shipped</span>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtRelative(po.createdAt)}</TableCell>
                    <TableCell className="text-right font-medium pr-6">{fmtCurrency(po.amount)}</TableCell>
                    <TableCell>
                      {user && ['admin', 'manager'].includes(user.role) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Advance status</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {po.status === 'Pending' && <DropdownMenuItem onClick={() => advance(po, 'Approved')}><CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Approve</DropdownMenuItem>}
                            {(po.status === 'Approved' || po.status === 'Pending') && <DropdownMenuItem onClick={() => advance(po, 'In Transit')}><Truck className="h-3.5 w-3.5 mr-2" /> Mark in transit</DropdownMenuItem>}
                            {po.status === 'In Transit' && <DropdownMenuItem onClick={() => advance(po, 'Delivered')}><PackageCheck className="h-3.5 w-3.5 mr-2" /> Mark delivered</DropdownMenuItem>}
                            {!['Delivered', 'Cancelled'].includes(po.status) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => advance(po, 'Cancelled')} className="text-destructive focus:text-destructive">
                                  <XCircle className="h-3.5 w-3.5 mr-2" /> Cancel PO
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {!loading && items.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-sm text-muted-foreground">No purchase orders.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ============ GRN Tab ============
function GrnTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    api.listGRNs({ limit: 50 })
      .then(r => { if (!cancel) setItems(r.data); })
      .catch(e => { if (!cancel) toast.error(e.message); })
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, [refresh]);

  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Goods received notes</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Acknowledge deliveries against your purchase orders.</p>
          </div>
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setRefresh(x => x + 1)}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="pl-6 text-[11px] uppercase tracking-wider">GRN</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">PO</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">Vendor</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">Received by</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider pr-6">Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && Array.from({ length: 2 }).map((_, i) => (
                <TableRow key={`s${i}`} className="border-border/60">
                  <TableCell className="pl-6"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20 rounded-full" /></TableCell>
                  <TableCell className="pr-6"><Skeleton className="h-4 w-20" /></TableCell>
                </TableRow>
              ))}
              {!loading && items.map((grn) => {
                const meta = GRN_STATUS[grn.status] || GRN_STATUS.Received;
                return (
                  <TableRow key={grn._id} className="border-border/60 hover:bg-accent/30">
                    <TableCell className="pl-6 font-medium font-mono text-xs">{grn.number}</TableCell>
                    <TableCell className="text-[11px] font-mono text-muted-foreground">{grn.poNumber}</TableCell>
                    <TableCell className="text-sm">{grn.vendorName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{grn.receivedByName}</TableCell>
                    <TableCell><Badge variant="outline" className={cn('h-5 text-[10px]', meta.cls)}>{grn.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground pr-6">{fmtDate(grn.receivedAt)}</TableCell>
                  </TableRow>
                );
              })}
              {!loading && items.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-sm text-muted-foreground">No goods received yet. Mark a PO as delivered to generate one.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export function ProcurementPage() {
  return (
    <div className="px-4 lg:px-8 py-6 lg:py-8 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Procurement</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage the full source-to-pay lifecycle — requests, approvals, orders and receipts.</p>
      </div>

      <Tabs defaultValue="prs" className="space-y-4">
        <TabsList className="h-9">
          <TabsTrigger value="prs" className="gap-1.5 text-xs h-7"><ClipboardList className="h-3.5 w-3.5" /> Purchase Requests</TabsTrigger>
          <TabsTrigger value="pos" className="gap-1.5 text-xs h-7"><ShoppingCart className="h-3.5 w-3.5" /> Purchase Orders</TabsTrigger>
          <TabsTrigger value="grn" className="gap-1.5 text-xs h-7"><PackageCheck className="h-3.5 w-3.5" /> Goods Received</TabsTrigger>
        </TabsList>

        <TabsContent value="prs"><PurchaseRequestsTab /></TabsContent>
        <TabsContent value="pos"><PoTab /></TabsContent>
        <TabsContent value="grn"><GrnTab /></TabsContent>
      </Tabs>
    </div>
  );
}