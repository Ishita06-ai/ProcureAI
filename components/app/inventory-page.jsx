'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Search, RefreshCw, AlertTriangle, Package, Warehouse as WhIcon, History, Boxes, TrendingUp, ArrowDown, ArrowUp, ArrowRightLeft, SlidersHorizontal, Sparkles } from 'lucide-react';
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from 'recharts';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context.jsx';
import { toast } from 'sonner';
import { MOVEMENT_STYLES, STOCK_HEALTH, stockHealth, PRODUCT_CATEGORIES } from '@/lib/inventory-utils';
import { fmtCurrency, fmtDate, fmtRelative } from '@/lib/procurement-utils';
import { CreateProductDialog } from '@/components/app/inventory-dialogs';
import { ProductDrawer } from '@/components/app/product-drawer';

const CHART_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

// ========== Overview Tab ==========
function Overview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    api.inventoryDashboard()
      .then(r => { if (!cancel) setData(r.data); })
      .catch(e => toast.error(e.message))
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, []);

  const k = data?.kpis || {};
  const kpis = [
    { label: 'Inventory value',  value: fmtCurrency(k.totalValue),  sub: `${k.totalOnHand?.toLocaleString() ?? 0} units on hand`, accent: 'from-violet-500/40 to-fuchsia-500/10', icon: Boxes },
    { label: 'Active SKUs',      value: k.productCount ?? 0,         sub: `across ${k.warehouseCount ?? 0} warehouses`,            accent: 'from-sky-500/40 to-cyan-500/10', icon: Package },
    { label: 'Low-stock alerts', value: k.lowStockCount ?? 0,        sub: 'SKUs below reorder level',                              accent: 'from-amber-500/40 to-orange-500/10', icon: AlertTriangle },
    { label: 'Movements (24h)',  value: k.movementsToday ?? 0,       sub: 'IN, OUT, transfers, adjustments',                       accent: 'from-emerald-500/40 to-teal-500/10', icon: TrendingUp },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[110px] rounded-2xl" />)
          : kpis.map((kpi, i) => {
              const Ic = kpi.icon;
              return (
                <div key={i} className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5">
                  <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br opacity-60', kpi.accent)} />
                  <div className="relative flex items-start justify-between">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">{kpi.label}</div>
                      <div className="mt-2 text-2xl font-semibold tracking-tight">{kpi.value}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">{kpi.sub}</div>
                    </div>
                    <Ic className="h-5 w-5 text-muted-foreground/60" />
                  </div>
                </div>
              );
            })
        }
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Category value bar */}
        <Card className="border-border/60 xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Inventory value by category</CardTitle>
            <p className="text-xs text-muted-foreground">Aggregated stock valuation (on hand × unit cost).</p>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {loading ? <Skeleton className="h-full w-full" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.byCategory || []} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} width={50} />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                      formatter={(v) => [fmtCurrency(v), 'Value']}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {(data?.byCategory || []).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Warehouse utilization */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Warehouse utilization</CardTitle>
            <p className="text-xs text-muted-foreground">Stock on hand vs. capacity.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
              : (data?.byWarehouse || []).map(w => (
                  <div key={w.id}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{w.code}</span>
                      <span className="text-muted-foreground">{w.onHand.toLocaleString()} / {w.capacity?.toLocaleString() || '∞'}</span>
                    </div>
                    <Progress value={w.utilization} className="h-1.5 mt-1" />
                    <div className="text-[10px] text-muted-foreground mt-0.5">{w.utilization}%</div>
                  </div>
                ))
            }
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Recent movements */}
        <Card className="border-border/60 xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Recent stock movements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
              : (data?.recentMovements || []).slice(0, 6).map(m => {
                  const style = MOVEMENT_STYLES[m.type] || MOVEMENT_STYLES.IN;
                  return (
                    <div key={m._id} className="flex items-center gap-3 rounded-lg border border-border/40 p-3">
                      <Badge variant="outline" className={cn('h-5 text-[10px]', style.cls)}>{style.label}</Badge>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{m.productName}</div>
                        <div className="text-[11px] text-muted-foreground">{m.warehouseCode}{m.counterWarehouseCode ? ` → ${m.counterWarehouseCode}` : ''} · {m.reason || m.refType}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{['OUT','TRANSFER_OUT'].includes(m.type) ? '-' : '+'}{Math.abs(m.qty)}</div>
                        <div className="text-[10px] text-muted-foreground">{fmtRelative(m.at)}</div>
                      </div>
                    </div>
                  );
                })
            }
            {!loading && (data?.recentMovements || []).length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">No movements yet.</div>
            )}
          </CardContent>
        </Card>

        {/* Low stock */}
        <Card className="border-border/60">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Low-stock watchlist</CardTitle>
              <p className="text-xs text-muted-foreground">Items at or below reorder level.</p>
            </div>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="space-y-2">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
              : (data?.lowStock || []).map(p => (
                  <div key={p._id} className="flex items-center justify-between rounded-lg border border-border/40 p-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{p.name}</div>
                      <div className="text-[11px] font-mono text-muted-foreground">{p.sku}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-amber-500">{p.available} / {p.reorderLevel}</div>
                      <div className="text-[10px] text-muted-foreground">deficit {p.deficit}</div>
                    </div>
                  </div>
                ))
            }
            {!loading && (data?.lowStock || []).length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">All stock above reorder level 🎉</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ========== Products Tab ==========
function ProductsTab({ warehouses }) {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('all');
  const [lowOnly, setLowOnly] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const params = { limit: 100, sort: 'name' };
        if (q) params.q = q;
        if (category !== 'all') params.category = category;
        if (lowOnly) params.lowStock = 'true';
        const r = await api.listProducts(params);
        if (!cancel) setItems(r.data);
      } catch (e) { if (!cancel) toast.error(e.message); }
      finally { if (!cancel) setLoading(false); }
    }, 250);
    return () => { cancel = true; clearTimeout(t); };
  }, [q, category, lowOnly, refresh]);

  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search SKU, name, barcode…" className="pl-9 h-9" />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {PRODUCT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant={lowOnly ? 'secondary' : 'outline'} className="h-9 gap-1.5" onClick={() => setLowOnly(x => !x)}>
            <AlertTriangle className="h-3.5 w-3.5" /> Low stock
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setRefresh(x => x + 1)}>
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            {user && ['admin','manager'].includes(user.role) && (
              <CreateProductDialog onCreated={() => setRefresh(x => x + 1)} />
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="pl-6 text-[11px] uppercase tracking-wider">Product</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">Category</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">Health</TableHead>
                <TableHead className="text-right text-[11px] uppercase tracking-wider">On hand</TableHead>
                <TableHead className="text-right text-[11px] uppercase tracking-wider">Reorder</TableHead>
                <TableHead className="text-right text-[11px] uppercase tracking-wider">Locations</TableHead>
                <TableHead className="text-right text-[11px] uppercase tracking-wider pr-6">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`s${i}`} className="border-border/60">
                  <TableCell className="pl-6"><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20 rounded-full" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                  <TableCell className="text-right pr-6"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))}
              {!loading && items.map(p => {
                const h = STOCK_HEALTH[stockHealth(p)];
                return (
                  <TableRow key={p._id} className="border-border/60 hover:bg-accent/30 cursor-pointer" onClick={() => setOpenId(p._id)}>
                    <TableCell className="pl-6">
                      <div className="text-[10px] font-mono text-muted-foreground">{p.sku}</div>
                      <div className="text-sm font-medium truncate max-w-[320px]">{p.name}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.category}</TableCell>
                    <TableCell><Badge variant="outline" className={cn('h-5 text-[10px]', h.cls)}>{h.label}</Badge></TableCell>
                    <TableCell className="text-right font-medium">{p.onHand} <span className="text-[11px] text-muted-foreground">{p.unit}</span></TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">{p.reorderLevel}</TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">{p.locations}</TableCell>
                    <TableCell className="text-right pr-6 font-medium">{fmtCurrency(p.stockValue)}</TableCell>
                  </TableRow>
                );
              })}
              {!loading && items.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-sm text-muted-foreground">No products match your filters.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ProductDrawer
        productId={openId}
        open={!!openId}
        onOpenChange={(o) => !o && setOpenId(null)}
        warehouses={warehouses}
        onMutated={() => setRefresh(x => x + 1)}
      />
    </div>
  );
}

// ========== Warehouses Tab ==========
function WarehousesTab({ warehouses, loading }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {loading
        ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[180px] rounded-2xl" />)
        : warehouses.map(w => (
            <Card key={w._id} className="border-border/60">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 grid place-items-center">
                      <WhIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-[10px] font-mono text-muted-foreground">{w.code}</div>
                      <div className="text-sm font-semibold">{w.name}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="h-5 text-[10px] capitalize">{w.type}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">{w.city}{w.country ? ', ' + w.country : ''} · mgr {w.managerName}</div>
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Utilization</span>
                    <span className="font-medium">{w.onHand?.toLocaleString()} / {w.capacityUnits?.toLocaleString() || '∞'}</span>
                  </div>
                  <Progress value={w.utilization} className="h-1.5 mt-1" />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <div className="text-[11px] text-muted-foreground">{w.productCount} products</div>
                  <div className="text-[11px] text-muted-foreground">{w.utilization}% full</div>
                </div>
              </CardContent>
            </Card>
          ))
      }
    </div>
  );
}

// ========== Movements Tab ==========
function MovementsTab() {
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const params = { limit: 100, sort: '-at' };
        if (q) params.q = q;
        if (type !== 'all') params.type = type;
        const r = await api.listMovements(params);
        if (!cancel) setItems(r.data);
      } catch (e) { if (!cancel) toast.error(e.message); }
      finally { if (!cancel) setLoading(false); }
    }, 250);
    return () => { cancel = true; clearTimeout(t); };
  }, [q, type]);

  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by product, SKU, reference…" className="pl-9 h-9" />
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {Object.entries(MOVEMENT_STYLES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="pl-6 text-[11px] uppercase tracking-wider">When</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">Type</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">Product</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">Warehouse</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">Reference</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">Reason / By</TableHead>
                <TableHead className="text-right text-[11px] uppercase tracking-wider pr-6">Qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={`s${i}`} className="border-border/60">
                  <TableCell className="pl-6"><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell className="text-right pr-6"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                </TableRow>
              ))}
              {!loading && items.map(m => {
                const style = MOVEMENT_STYLES[m.type] || MOVEMENT_STYLES.IN;
                const sign = ['OUT','TRANSFER_OUT'].includes(m.type) ? '-' : '+';
                return (
                  <TableRow key={m._id} className="border-border/60 hover:bg-accent/30">
                    <TableCell className="pl-6 text-xs text-muted-foreground whitespace-nowrap">{fmtRelative(m.at)}</TableCell>
                    <TableCell><Badge variant="outline" className={cn('h-5 text-[10px]', style.cls)}>{style.label}</Badge></TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{m.productName}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">{m.productSku}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {m.warehouseCode}
                      {m.counterWarehouseCode && <span className="text-muted-foreground"> → {m.counterWarehouseCode}</span>}
                    </TableCell>
                    <TableCell className="text-[11px] font-mono text-muted-foreground">{m.refNumber || m.refType}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{m.reason || m.actorName}</TableCell>
                    <TableCell className="text-right pr-6 font-semibold">{sign}{Math.abs(m.qty)}</TableCell>
                  </TableRow>
                );
              })}
              {!loading && items.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-sm text-muted-foreground">No movements found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export function InventoryPage() {
  const [warehouses, setWarehouses] = useState([]);
  const [whLoading, setWhLoading] = useState(true);

  useEffect(() => {
    api.listWarehouses().then(r => setWarehouses(r.data)).catch(() => {}).finally(() => setWhLoading(false));
  }, []);

  return (
    <div className="px-4 lg:px-8 py-6 lg:py-8 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Inventory</h2>
        <p className="text-sm text-muted-foreground mt-1">Multi-warehouse stock intelligence, valuation and replenishment.</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="h-9">
          <TabsTrigger value="overview"  className="gap-1.5 text-xs h-7"><Boxes className="h-3.5 w-3.5" /> Overview</TabsTrigger>
          <TabsTrigger value="products"  className="gap-1.5 text-xs h-7"><Package className="h-3.5 w-3.5" /> Products</TabsTrigger>
          <TabsTrigger value="warehouses"className="gap-1.5 text-xs h-7"><WhIcon className="h-3.5 w-3.5" /> Warehouses</TabsTrigger>
          <TabsTrigger value="movements" className="gap-1.5 text-xs h-7"><History className="h-3.5 w-3.5" /> Movements</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><Overview /></TabsContent>
        <TabsContent value="products"><ProductsTab warehouses={warehouses} /></TabsContent>
        <TabsContent value="warehouses"><WarehousesTab warehouses={warehouses} loading={whLoading} /></TabsContent>
        <TabsContent value="movements"><MovementsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
