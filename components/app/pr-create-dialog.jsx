'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Loader2, Trash2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { fmtCurrency } from '@/lib/procurement-utils';

const DEPARTMENTS = ['Operations', 'IT', 'Manufacturing', 'Marketing', 'Facilities', 'Finance', 'R&D'];
const CATEGORIES = ['Electronics', 'Logistics', 'Raw Materials', 'Packaging', 'IT Services', 'Office Supplies', 'Machinery', 'Other'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

const emptyItem = () => ({ name: '', qty: 1, unit: 'pcs', estimatedUnitPrice: 0, category: 'Other' });

export function PrCreateDialog({ onCreated, trigger }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', department: 'Operations', priority: 'normal', neededBy: '',
    items: [emptyItem()],
  });

  const total = form.items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.estimatedUnitPrice) || 0), 0);

  const updateItem = (i, k, v) => setForm(f => ({
    ...f, items: f.items.map((it, idx) => idx === i ? { ...it, [k]: v } : it),
  }));
  const addRow = () => setForm(f => ({ ...f, items: [...f.items, emptyItem()] }));
  const removeRow = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const items = form.items.filter(it => it.name.trim()).map(it => ({
        name: it.name, category: it.category, qty: Number(it.qty), unit: it.unit,
        estimatedUnitPrice: Number(it.estimatedUnitPrice),
      }));
      if (!items.length) throw new Error('Add at least one item with a name');
      const payload = {
        title: form.title, description: form.description,
        department: form.department, priority: form.priority, items,
        ...(form.neededBy ? { neededBy: form.neededBy } : {}),
      };
      const res = await api.createPR(payload);
      toast.success(`Purchase request ${res.data.number} created as Draft`);
      setOpen(false);
      setForm({ title: '', description: '', department: 'Operations', priority: 'normal', neededBy: '', items: [emptyItem()] });
      onCreated?.(res.data);
    } catch (err) {
      toast.error(err.message || 'Failed to create request');
    } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm" className="h-9 gap-1.5"><Plus className="h-4 w-4" /> New request</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New purchase request</DialogTitle>
          <DialogDescription>Create a draft request. Submit it when ready for approval.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="pr-title">Title</Label>
              <Input id="pr-title" required value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Q4 office furniture refresh" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="pr-desc">Description</Label>
              <Textarea id="pr-desc" rows={2} value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Business justification, context, links…" />
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select value={form.department} onValueChange={(v) => setForm(f => ({ ...f, department: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="pr-needed">Needed by</Label>
              <Input id="pr-needed" type="date" value={form.neededBy} onChange={(e) => setForm(f => ({ ...f, neededBy: e.target.value }))} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Line items</Label>
              <Button type="button" variant="outline" size="sm" className="h-7 gap-1.5" onClick={addRow}>
                <Plus className="h-3.5 w-3.5" /> Add line
              </Button>
            </div>
            <div className="space-y-2">
              {form.items.map((it, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg border border-border/60 bg-muted/20">
                  <div className="col-span-5 space-y-1">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Item</Label>
                    <Input value={it.name} onChange={(e) => updateItem(i, 'name', e.target.value)} placeholder="Item name" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Category</Label>
                    <Select value={it.category} onValueChange={(v) => updateItem(i, 'category', v)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1 space-y-1">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Qty</Label>
                    <Input type="number" min={0} value={it.qty} onChange={(e) => updateItem(i, 'qty', e.target.value)} />
                  </div>
                  <div className="col-span-1 space-y-1">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Unit</Label>
                    <Input value={it.unit} onChange={(e) => updateItem(i, 'unit', e.target.value)} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Unit $</Label>
                    <Input type="number" min={0} step="0.01" value={it.estimatedUnitPrice} onChange={(e) => updateItem(i, 'estimatedUnitPrice', e.target.value)} />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive"
                      onClick={() => removeRow(i)} disabled={form.items.length === 1}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-end gap-2 text-sm">
              <span className="text-muted-foreground">Estimated total</span>
              <span className="font-semibold text-base">{fmtCurrency(total)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting} className="gap-1.5">
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Create draft
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
