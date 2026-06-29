'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Loader2 } from 'lucide-react';
import { api } from '@/lib/api-client';

const CATEGORIES = ['Electronics', 'Logistics', 'Raw Materials', 'Packaging', 'IT Services', 'Office Supplies', 'Machinery', 'Other'];

export function VendorDialog({ onCreated, trigger }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '', category: 'Electronics', country: '', risk: 'low', status: 'Active',
    score: 75, spend: 0, contactEmail: '',
  });

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form, score: Number(form.score), spend: Number(form.spend) };
      if (!payload.contactEmail) delete payload.contactEmail;
      const res = await api.createVendor(payload);
      toast.success(`Vendor “${res.data.name}” created`);
      setOpen(false);
      setForm({ name: '', category: 'Electronics', country: '', risk: 'low', status: 'Active', score: 75, spend: 0, contactEmail: '' });
      onCreated?.(res.data);
    } catch (err) {
      toast.error(err.message || 'Failed to create vendor');
    } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="h-9 gap-1.5"><Plus className="h-4 w-4" /> Add vendor</Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>New vendor</DialogTitle>
          <DialogDescription>Add a supplier to your network. You can refine scorecards later.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="v-name">Vendor name</Label>
              <Input id="v-name" value={form.name} onChange={(e) => update('name', e.target.value)} required placeholder="Acme Industrial Co." />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => update('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v-country">Country</Label>
              <Input id="v-country" value={form.country} onChange={(e) => update('country', e.target.value)} placeholder="Germany" />
            </div>
            <div className="space-y-1.5">
              <Label>Risk</Label>
              <Select value={form.risk} onValueChange={(v) => update('risk', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => update('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Preferred">Preferred</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Watchlist">Watchlist</SelectItem>
                  <SelectItem value="At Risk">At Risk</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v-score">Score (0-100)</Label>
              <Input id="v-score" type="number" min={0} max={100} value={form.score} onChange={(e) => update('score', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v-spend">YTD spend ($)</Label>
              <Input id="v-spend" type="number" min={0} value={form.spend} onChange={(e) => update('spend', e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="v-email">Contact email (optional)</Label>
              <Input id="v-email" type="email" value={form.contactEmail} onChange={(e) => update('contactEmail', e.target.value)} placeholder="sales@acme.com" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting} className="gap-1.5">
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Create vendor
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
