'use client';

import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context.jsx';
import { AdjustStockDialog, TransferStockDialog } from '@/components/app/inventory-dialogs';
import {
  Package, Warehouse as WhIcon, History, Tag, AlertTriangle, ArrowDown, ArrowUp, ArrowRightLeft, SlidersHorizontal,
} from 'lucide-react';
import { MOVEMENT_STYLES, STOCK_HEALTH, stockHealth } from '@/lib/inventory-utils';
import { fmtCurrency, fmtDate, fmtRelative } from '@/lib/procurement-utils';

function MovementIcon({ type }) {
  if (type === 'IN') return <ArrowDown className="h-3.5 w-3.5 text-emerald-500" />;
  if (type === 'OUT') return <ArrowUp className="h-3.5 w-3.5 text-rose-500" />;
  if (type.startsWith('TRANSFER')) return <ArrowRightLeft className="h-3.5 w-3.5 text-sky-500" />;
  return <SlidersHorizontal className="h-3.5 w-3.5 text-violet-500" />;
}

export function ProductDrawer({ productId, open, onOpenChange, warehouses, onMutated }) {
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!productId || !open) return;
    let cancel = false;
    setLoading(true);
    api.getProduct(productId)
      .then(r => { if (!cancel) setProduct(r.data); })
      .catch(() => {})
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, [productId, open]);

  const refresh = async () => {
    if (!productId) return;
    const r = await api.getProduct(productId);
    setProduct(r.data);
    onMutated?.();
  };

  if (!open) return null;

  const whByCode = (id) => warehouses.find(w => w._id === id);
  const stockMap = {};
  if (product) for (const s of product.stockByWarehouse || []) stockMap[s.warehouseId] = s;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[640px] p-0 flex flex-col">
        {loading || !product ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            <SheetHeader className="px-6 py-5 border-b border-border/60 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-muted-foreground">{product.sku}</span>
                <Badge variant="outline" className="h-5 text-[10px]">{product.category}</Badge>
                <Badge variant="outline" className={cn('h-5 text-[10px]', STOCK_HEALTH[stockHealth(product)].cls)}>
                  {STOCK_HEALTH[stockHealth(product)].label}
                </Badge>
              </div>
              <SheetTitle className="text-lg leading-snug">{product.name}</SheetTitle>
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="rounded-lg border border-border/60 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">On hand</div>
                  <div className="text-xl font-semibold mt-0.5">{product.onHand} <span className="text-xs text-muted-foreground">{product.unit}</span></div>
                </div>
                <div className="rounded-lg border border-border/60 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Available</div>
                  <div className="text-xl font-semibold mt-0.5">{product.available}</div>
                </div>
                <div className="rounded-lg border border-border/60 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Stock value</div>
                  <div className="text-xl font-semibold mt-0.5">{fmtCurrency(product.stockValue)}</div>
                </div>
              </div>
              {user && ['admin','manager','buyer'].includes(user.role) && (
                <div className="flex gap-2 pt-2">
                  <AdjustStockDialog product={product} warehouses={warehouses} onDone={refresh} />
                  <TransferStockDialog product={product} warehouses={warehouses} onDone={refresh} />
                </div>
              )}
            </SheetHeader>

            <ScrollArea className="flex-1">
              <Tabs defaultValue="locations" className="px-6 py-4">
                <TabsList className="grid grid-cols-3 w-full h-9">
                  <TabsTrigger value="locations" className="text-xs gap-1.5"><WhIcon className="h-3 w-3" /> By warehouse</TabsTrigger>
                  <TabsTrigger value="movements" className="text-xs gap-1.5"><History className="h-3 w-3" /> Movements</TabsTrigger>
                  <TabsTrigger value="details" className="text-xs gap-1.5"><Tag className="h-3 w-3" /> Details</TabsTrigger>
                </TabsList>

                <TabsContent value="locations" className="mt-4 space-y-2">
                  {warehouses.map(w => {
                    const s = stockMap[w._id];
                    return (
                      <div key={w._id} className="rounded-lg border border-border/60 p-3 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">{w.code} · {w.name}</div>
                          <div className="text-[11px] text-muted-foreground">{w.city}{w.country ? ', ' + w.country : ''}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-base font-semibold">{s?.onHand ?? 0} {product.unit}</div>
                          {s?.lastMovementAt && <div className="text-[10px] text-muted-foreground">moved {fmtRelative(s.lastMovementAt)}</div>}
                        </div>
                      </div>
                    );
                  })}
                </TabsContent>

                <TabsContent value="movements" className="mt-4">
                  <div className="space-y-2">
                    {(product.recentMovements || []).length === 0 && (
                      <div className="text-center py-6 text-sm text-muted-foreground">No movements yet.</div>
                    )}
                    {(product.recentMovements || []).map(m => {
                      const style = MOVEMENT_STYLES[m.type] || MOVEMENT_STYLES.IN;
                      const sign = ['OUT','TRANSFER_OUT'].includes(m.type) ? '-' : (m.type === 'ADJUSTMENT' && m.qty < 0 ? '' : '+');
                      return (
                        <div key={m._id} className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
                          <div className="h-8 w-8 rounded-lg bg-muted grid place-items-center shrink-0"><MovementIcon type={m.type} /></div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={cn('h-4 text-[9px]', style.cls)}>{style.label}</Badge>
                              <span className="text-[11px] text-muted-foreground">{m.warehouseCode}{m.counterWarehouseCode ? ` → ${m.counterWarehouseCode}` : ''}</span>
                              {m.refNumber && <span className="text-[11px] font-mono text-muted-foreground">{m.refNumber}</span>}
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {m.reason || `${m.refType} — ${m.actorName}`} · {fmtRelative(m.at)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold">{sign}{Math.abs(m.qty)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="details" className="mt-4 space-y-2">
                  <Row k="SKU" v={product.sku} />
                  <Row k="Category" v={product.category} />
                  <Row k="Default vendor" v={product.defaultVendorName || '—'} />
                  <Row k="Unit cost" v={fmtCurrency(product.unitCost)} />
                  <Row k="Unit price" v={fmtCurrency(product.unitPrice)} />
                  <Row k="Reorder level" v={`${product.reorderLevel} ${product.unit}`} />
                  <Row k="Safety stock" v={`${product.safetyStock} ${product.unit}`} />
                  <Row k="Lead time" v={`${product.leadTimeDays} days`} />
                  <Row k="Batch tracking" v={product.batchTrackable ? 'Enabled' : 'Disabled'} />
                  <Row k="Expiry tracking" v={product.expiryTrackable ? 'Enabled' : 'Disabled'} />
                  <Row k="Created" v={fmtDate(product.createdAt)} />
                </TabsContent>
              </Tabs>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/40 last:border-0 text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}
