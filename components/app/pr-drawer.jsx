'use client';

import { useEffect, useState } from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context.jsx';
import { toast } from 'sonner';
import {
  Check, X, Send, ArrowRight, Calendar, Building2, User as UserIcon,
  CheckCircle2, XCircle, Clock, Sparkles, Plus, MessageSquare, FileText,
  Activity, Files, Briefcase, AlertCircle, Award,
} from 'lucide-react';
import { PR_STATUS, PRIORITY, fmtCurrency, fmtDate, fmtRelative, initials } from '@/lib/procurement-utils';

function ApprovalTimeline({ chain, currentLevel, status }) {
  return (
    <div className="space-y-3">
      {chain.map((step, i) => {
        const active = i === currentLevel - 1 && ['Submitted', 'UnderReview'].includes(status);
        const Icon = step.status === 'approved' ? CheckCircle2 : step.status === 'rejected' ? XCircle : Clock;
        const cls =
          step.status === 'approved' ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' :
          step.status === 'rejected' ? 'bg-rose-500/15 text-rose-500 border-rose-500/30' :
          active ? 'bg-amber-500/15 text-amber-500 border-amber-500/30 ring-2 ring-amber-500/20' :
          'bg-muted text-muted-foreground border-border';
        return (
          <div key={i} className="flex gap-3">
            <div className={cn('h-8 w-8 rounded-full border grid place-items-center shrink-0', cls)}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 pb-3 border-b border-border/40 last:border-0">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium">Level {step.level} · {step.requiredRole}</div>
                <Badge variant="outline" className="text-[10px] capitalize">{step.status}</Badge>
              </div>
              {step.approverName && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {step.approverName} · {fmtRelative(step.actedAt)}
                </div>
              )}
              {step.comment && (
                <div className="mt-2 text-xs bg-muted/40 border border-border/40 rounded-md p-2 text-muted-foreground">
                  “{step.comment}”
                </div>
              )}
              {active && !step.approverName && (
                <div className="text-xs text-amber-500 mt-1">Awaiting your decision</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function VendorCompare({ pr, vendors, onAddQuote, onSelect, canManageQuotes }) {
  const [vendorId, setVendorId] = useState('');
  const [amount, setAmount] = useState('');
  const [leadTime, setLeadTime] = useState('');
  const [notes, setNotes] = useState('');
  const [adding, setAdding] = useState(false);

  const submit = async () => {
    if (!vendorId || !amount) return toast.error('Vendor and amount are required');
    setAdding(true);
    try {
      await onAddQuote({ vendorId, amount: Number(amount), leadTimeDays: leadTime ? Number(leadTime) : undefined, notes });
      setVendorId(''); setAmount(''); setLeadTime(''); setNotes('');
    } finally { setAdding(false); }
  };

  const best = pr.vendorQuotes.length > 0
    ? pr.vendorQuotes.reduce((a, b) => (a.amount <= b.amount ? a : b))
    : null;

  return (
    <div className="space-y-4">
      {pr.vendorQuotes.length > 0 ? (
        <div className="space-y-2">
          {pr.vendorQuotes.map((q) => {
            const isBest = best && q.vendorId === best.vendorId && pr.vendorQuotes.length > 1;
            const isSelected = pr.selectedVendorId === q.vendorId;
            return (
              <div key={q._id || q.vendorId}
                className={cn('rounded-lg border p-3 transition-colors',
                  isSelected ? 'border-primary/50 bg-primary/5' : 'border-border/60 bg-card'
                )}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-[10px] bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20">
                        {initials(q.vendorName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium flex items-center gap-1.5">
                        {q.vendorName}
                        {isBest && <Badge variant="outline" className="h-5 text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/30"><Award className="h-2.5 w-2.5 mr-1" />Best price</Badge>}
                        {isSelected && <Badge variant="outline" className="h-5 text-[10px] bg-primary/15 text-primary border-primary/30">Selected</Badge>}
                      </div>
                      {q.leadTimeDays && <div className="text-[11px] text-muted-foreground">Lead time: {q.leadTimeDays} days</div>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-semibold">{fmtCurrency(q.amount)}</div>
                    {!isSelected && canManageQuotes && (
                      <Button size="sm" variant="ghost" className="h-6 text-[11px] mt-0.5" onClick={() => onSelect(q.vendorId, q.amount)}>
                        Select <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
                {q.notes && <p className="mt-2 text-xs text-muted-foreground">{q.notes}</p>}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6 rounded-lg border border-dashed border-border/60 text-sm text-muted-foreground">
          No vendor quotes yet. Add the first one below.
        </div>
      )}

      {canManageQuotes && (
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Add quote</div>
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-5">
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Vendor" /></SelectTrigger>
                <SelectContent>
                  {vendors.map(v => <SelectItem key={v._id} value={v._id}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Input className="col-span-3 h-9" type="number" min={0} placeholder="Amount $" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Input className="col-span-2 h-9" type="number" min={0} placeholder="Lead (d)" value={leadTime} onChange={(e) => setLeadTime(e.target.value)} />
            <Button onClick={submit} disabled={adding} className="col-span-2 h-9 gap-1.5"><Plus className="h-3.5 w-3.5" /> Add</Button>
          </div>
          <Input className="h-9" placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      )}
    </div>
  );
}

function CommentsTab({ pr, onSend }) {
  const [text, setText] = useState('');
  const [internal, setInternal] = useState(false);
  const send = async () => {
    if (!text.trim()) return;
    await onSend(text.trim(), internal);
    setText('');
  };
  return (
    <div className="space-y-3">
      <div className="space-y-3">
        {(pr.comments || []).length === 0 && (
          <div className="text-center py-6 text-sm text-muted-foreground">No comments yet.</div>
        )}
        {(pr.comments || []).map((c) => (
          <div key={c._id} className="flex gap-3">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="text-[10px] bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20">{initials(c.userName || 'U')}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{c.userName || 'User'}</span>
                <span className="text-[11px] text-muted-foreground">{fmtRelative(c.at)}</span>
                {c.internal && <Badge variant="outline" className="h-4 text-[9px] bg-amber-500/10 text-amber-500 border-amber-500/30">Internal</Badge>}
              </div>
              <p className="text-sm text-foreground/90 mt-0.5">{c.text}</p>
            </div>
          </div>
        ))}
      </div>
      <Separator />
      <div className="space-y-2">
        <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a comment…" />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} className="rounded" />
            Internal only
          </label>
          <Button size="sm" onClick={send} disabled={!text.trim()} className="gap-1.5">
            <Send className="h-3 w-3" /> Post
          </Button>
        </div>
      </div>
    </div>
  );
}

function ActivityTab({ pr }) {
  const log = (pr.activityLog || []).slice().reverse();
  return (
    <div className="space-y-3">
      {log.length === 0 && <div className="text-center py-6 text-sm text-muted-foreground">No activity yet.</div>}
      {log.map((a) => (
        <div key={a._id} className="flex gap-3 pb-3 border-b border-border/40 last:border-0">
          <div className="h-7 w-7 rounded-full bg-muted grid place-items-center shrink-0">
            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm">
              <span className="font-medium">{a.actorName}</span>{' '}
              <span className="text-muted-foreground">{a.action}</span>
              {a.meta && Object.keys(a.meta).length > 0 && (
                <span className="text-muted-foreground"> · {Object.entries(a.meta).map(([k, v]) => `${k}=${v}`).join(', ')}</span>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground">{fmtRelative(a.at)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PrDrawer({ prId, open, onOpenChange, vendors, onMutated }) {
  const { user } = useAuth();
  const [pr, setPr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');

  useEffect(() => {
    if (!prId || !open) return;
    let cancel = false;
    setLoading(true);
    api.getPR(prId).then((res) => { if (!cancel) setPr(res.data); })
      .catch((e) => toast.error(e.message))
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, [prId, open]);

  const refresh = async () => {
    if (!prId) return;
    const res = await api.getPR(prId);
    setPr(res.data);
    onMutated?.();
  };

  const doAction = async (fn, label) => {
    setActing(true);
    try { await fn(); toast.success(label); await refresh(); }
    catch (e) { toast.error(e.message); }
    finally { setActing(false); }
  };

  if (!open) return null;

  const meta = pr ? PR_STATUS[pr.status] : null;
  const prio = pr ? (PRIORITY[pr.priority] || PRIORITY.normal) : null;
  const isAdminOrManager = user && ['admin', 'manager'].includes(user.role);
  const canApprove = isAdminOrManager && pr && ['Submitted', 'UnderReview'].includes(pr.status);
  const canSubmit = pr && pr.status === 'Draft' && user && ['admin', 'manager', 'buyer'].includes(user.role);
  const canConvert = isAdminOrManager && pr && pr.status === 'Approved' && !pr.poId && pr.selectedVendorId;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[640px] p-0 flex flex-col">
        {loading || !pr ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            <SheetHeader className="px-6 py-5 border-b border-border/60 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-muted-foreground">{pr.number}</span>
                <Badge variant="outline" className={cn('h-5 text-[10px] font-medium', meta.cls)}>{meta.label}</Badge>
                <Badge variant="outline" className={cn('h-5 text-[10px] capitalize border-0', prio.cls)}>
                  {pr.priority === 'urgent' && <AlertCircle className="h-2.5 w-2.5 mr-1" />}{prio.label}
                </Badge>
                {pr.poNumber && (
                  <Badge variant="outline" className="h-5 text-[10px] bg-violet-500/10 text-violet-400 border-violet-500/30">
                    → {pr.poNumber}
                  </Badge>
                )}
              </div>
              <SheetTitle className="text-lg leading-snug">{pr.title}</SheetTitle>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><UserIcon className="h-3 w-3" /> {pr.requesterName}</span>
                <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {pr.department}</span>
                {pr.neededBy && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> by {fmtDate(pr.neededBy)}</span>}
              </div>
              <div className="flex items-baseline justify-between pt-2">
                <div className="text-[11px] text-muted-foreground">Estimated total</div>
                <div className="text-2xl font-semibold tracking-tight">{fmtCurrency(pr.estimatedTotal)}</div>
              </div>
            </SheetHeader>

            <ScrollArea className="flex-1">
              <Tabs defaultValue="overview" className="px-6 py-4">
                <TabsList className="grid grid-cols-5 w-full h-9">
                  <TabsTrigger value="overview" className="text-xs gap-1.5"><FileText className="h-3 w-3" /> Overview</TabsTrigger>
                  <TabsTrigger value="approvals" className="text-xs gap-1.5"><CheckCircle2 className="h-3 w-3" /> Approvals</TabsTrigger>
                  <TabsTrigger value="vendors" className="text-xs gap-1.5"><Briefcase className="h-3 w-3" /> Vendors</TabsTrigger>
                  <TabsTrigger value="comments" className="text-xs gap-1.5"><MessageSquare className="h-3 w-3" /> Comments</TabsTrigger>
                  <TabsTrigger value="activity" className="text-xs gap-1.5"><Activity className="h-3 w-3" /> Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4 space-y-4">
                  {pr.description && <p className="text-sm text-muted-foreground leading-relaxed">{pr.description}</p>}
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Items</div>
                    <div className="rounded-lg border border-border/60 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium">Item</th>
                            <th className="text-right px-3 py-2 font-medium">Qty</th>
                            <th className="text-right px-3 py-2 font-medium">Unit $</th>
                            <th className="text-right px-3 py-2 font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pr.items.map((it, i) => (
                            <tr key={i} className="border-t border-border/40">
                              <td className="px-3 py-2">
                                <div className="font-medium">{it.name}</div>
                                {it.category && <div className="text-[11px] text-muted-foreground">{it.category}</div>}
                              </td>
                              <td className="text-right px-3 py-2">{it.qty} {it.unit}</td>
                              <td className="text-right px-3 py-2">{fmtCurrency(it.estimatedUnitPrice)}</td>
                              <td className="text-right px-3 py-2 font-medium">{fmtCurrency(it.lineTotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="approvals" className="mt-4">
                  <ApprovalTimeline chain={pr.approvalChain || []} currentLevel={pr.currentLevel} status={pr.status} />
                </TabsContent>

                <TabsContent value="vendors" className="mt-4">
                  <VendorCompare
                    pr={pr}
                    vendors={vendors}
                    canManageQuotes={user && ['admin', 'manager', 'buyer'].includes(user.role)}
                    onAddQuote={async (data) => { await api.addQuote(pr._id, data); toast.success('Quote added'); await refresh(); }}
                    onSelect={async (vendorId, amount) => { await api.selectVendor(pr._id, vendorId, amount); toast.success('Vendor selected'); await refresh(); }}
                  />
                </TabsContent>

                <TabsContent value="comments" className="mt-4">
                  <CommentsTab pr={pr} onSend={async (text, internal) => { await api.commentPR(pr._id, text, internal); toast.success('Comment added'); await refresh(); }} />
                </TabsContent>

                <TabsContent value="activity" className="mt-4">
                  <ActivityTab pr={pr} />
                </TabsContent>
              </Tabs>
            </ScrollArea>

            {(canSubmit || canApprove || canConvert) && (
              <div className="border-t border-border/60 p-4 space-y-3 bg-card/40 backdrop-blur">
                {canApprove && (
                  <Input value={approvalComment} onChange={(e) => setApprovalComment(e.target.value)}
                    placeholder="Approval / rejection comment (optional)" className="h-9" />
                )}
                <div className="flex gap-2">
                  {canSubmit && (
                    <Button className="flex-1 gap-1.5" disabled={acting}
                      onClick={() => doAction(() => api.submitPR(pr._id), 'Submitted for approval')}>
                      <Send className="h-3.5 w-3.5" /> Submit for approval
                    </Button>
                  )}
                  {canApprove && (
                    <>
                      <Button variant="outline" className="flex-1 gap-1.5 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300" disabled={acting}
                        onClick={() => doAction(() => api.rejectPR(pr._id, approvalComment), 'Request rejected')}>
                        <X className="h-3.5 w-3.5" /> Reject
                      </Button>
                      <Button className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-600/90" disabled={acting}
                        onClick={() => doAction(() => api.approvePR(pr._id, approvalComment), 'Request approved')}>
                        <Check className="h-3.5 w-3.5" /> Approve
                      </Button>
                    </>
                  )}
                  {canConvert && (
                    <Button className="flex-1 gap-1.5" disabled={acting}
                      onClick={() => doAction(() => api.convertToPO(pr._id), 'Converted to Purchase Order')}>
                      <Sparkles className="h-3.5 w-3.5" /> Convert to PO
                    </Button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}