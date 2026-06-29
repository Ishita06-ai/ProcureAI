export const MOVEMENT_STYLES = {
  IN:           { label: 'In',           cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  OUT:          { label: 'Out',          cls: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
  TRANSFER_OUT: { label: 'Transfer out', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  TRANSFER_IN:  { label: 'Transfer in',  cls: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
  ADJUSTMENT:   { label: 'Adjustment',   cls: 'bg-violet-500/15 text-violet-400 border-violet-500/30' },
};

export const STOCK_HEALTH = {
  ok:   { label: 'In stock',     cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  low:  { label: 'Low stock',    cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  out:  { label: 'Out of stock', cls: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
};

export const PRODUCT_CATEGORIES = ['Electronics', 'Raw Materials', 'Packaging', 'Machinery', 'Office Supplies', 'IT Services', 'Logistics', 'Other'];

export function stockHealth(p) {
  if (p.outOfStock) return 'out';
  if (p.lowStock) return 'low';
  return 'ok';
}
