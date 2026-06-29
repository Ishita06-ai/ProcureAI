'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, ArrowRightLeft, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { PRODUCT_CATEGORIES } from '@/lib/inventory-utils';

// =========== Create Product ===========
export function CreateProductDialog({ onCreated, trigger }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    sku: '', name: '', category: 'Electronics', unit: 'pcs',
    unitCost: 0, unitPrice: 0, reorderLevel: 0, safetyStock: 0, leadTimeDays: 7,
  });
  const u = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        sku: form.sku.toUpperCase(),
        unitCost: Number(form.unitCost), unitPrice: Number(form.unitPrice),
        reorderLevel: Number(form.reorderLevel), safetyStock: Number(form.safetyStock),
        leadTimeDays: Number(form.leadTimeDays),
      };
      const res = await api.createProduct(payload);
      toast.success(`Product ${res.data.sku} created`);
      setOpen(false);
      setForm({ sku: '', name: '', category: 'Electronics', unit: 'pcs', unitCost: 0, unitPrice: 0, reorderLevel: 0, safetyStock: 0, leadTimeDays: 7 });
      onCreated?.(res.data);
    } catch (err) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm" className="h-9 gap-1.5"><Plus className="h-4 w-4" /> New product</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>New product</DialogTitle>
          <DialogDescription>Add a SKU to the catalog. Set reorder thresholds to enable low-stock alerts.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>SKU</Label><Input required value={form.sku} onChange={e => u('sku', e.target.value)} placeholder="ABC-123" /></div>
            <div className="space-y-1.5"><Label>Unit</Label><Input value={form.unit} onChange={e => u('unit', e.target.value)} /></div>
            <div className="col-span-2 space-y-1.5"><Label>Name</Label><Input required value={form.name} onChange={e => u('name', e.target.value)} placeholder="Premium widget v2" /></div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => u('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRODUCT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Lead time (days)</Label><Input type="number" min={0} value={form.leadTimeDays} onChange={e => u('leadTimeDays', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Unit cost ($)</Label><Input type="number" step="0.01" min={0} value={form.unitCost} onChange={e => u('unitCost', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Unit price ($)</Label><Input type="number" step="0.01" min={0} value={form.unitPrice} onChange={e => u('unitPrice', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Reorder level</Label><Input type="number" min={0} value={form.reorderLevel} onChange={e => u('reorderLevel', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Safety stock</Label><Input type="number" min={0} value={form.safetyStock} onChange={e => u('safetyStock', e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting} className="gap-1.5">
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =========== Adjust Stock ===========
export function AdjustStockDialog({ product, warehouses, onDone, trigger }) {
  const [open, setOpen] = useState(false);
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?._id || '');
  const [qty, setQty] = useState(0);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!warehouseId || !qty) return toast.error('Warehouse and qty are required');
    setSubmitting(true);
    try {
      await api.adjustStock({ productId: product._id, warehouseId, qty: Number(qty), reason });
      toast.success(`Stock adjusted by ${qty > 0 ? '+' : ''}${qty}`);
      setOpen(false); setQty(0); setReason('');
      onDone?.();
    } catch (err) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm" variant="outline" className="h-8 gap-1.5"><SlidersHorizontal className="h-3.5 w-3.5" /> Adjust</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>{product.sku} · {product.name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Warehouse</Label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{warehouses.map(w => <SelectItem key={w._id} value={w._id}>{w.code} · {w.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Quantity (positive = add, negative = remove)</Label>
            <Input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="e.g. +10 or -3" />
          </div>
          <div className="space-y-1.5">
            <Label>Reason (optional)</Label>
            <Textarea rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="Damaged units / cycle count / write-off…" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting} className="gap-1.5">
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Apply
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =========== Transfer Stock ===========
export function TransferStockDialog({ product, warehouses, onDone, trigger }) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(warehouses[0]?._id || '');
  const [to, setTo]     = useState(warehouses[1]?._id || '');
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (from === to) return toast.error('Source and destination must differ');
    if (qty <= 0) return toast.error('Quantity must be positive');
    setSubmitting(true);
    try {
      await api.transferStock({ productId: product._id, fromWarehouseId: from, toWarehouseId: to, qty: Number(qty), reason });
      toast.success(`Transferred ${qty}`);
      setOpen(false); setQty(1); setReason('');
      onDone?.();
    } catch (err) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm" variant="outline" className="h-8 gap-1.5"><ArrowRightLeft className="h-3.5 w-3.5" /> Transfer</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Transfer stock</DialogTitle>
          <DialogDescription>{product.sku} · {product.name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>From</Label>
              <Select value={from} onValueChange={setFrom}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{warehouses.map(w => <SelectItem key={w._id} value={w._id}>{w.code}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>To</Label>
              <Select value={to} onValueChange={setTo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{warehouses.map(w => <SelectItem key={w._id} value={w._id}>{w.code}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Quantity</Label>
            <Input type="number" min={1} value={qty} onChange={e => setQty(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Reason (optional)</Label>
            <Textarea rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="Rebalancing / order fulfillment…" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting} className="gap-1.5">
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Transfer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
