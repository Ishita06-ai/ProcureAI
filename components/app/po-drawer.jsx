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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context.jsx';
import { toast } from 'sonner';
import {
  Check, X, Send, ShoppingCart, Building2, User as UserIcon,
  CheckCircle2, XCircle, Clock, MessageSquare, FileText, Activity, AlertTriangle,
} from 'lucide-react';
import {
  PO_STATUS, APPROVAL_ROLE_LABELS, canApprovePoStep,
  fmtCurrency, fmtDate, fmtRelative, fmtHours, initials,
} from '@/lib/procurement-utils';

// Sequential approval stages for a PO, PR-drawer visual language. Shows the
// stage, its current state, the approver, and SLA (pending duration / breach).
function ApprovalTimeline({ po }) {
  const chain = po.approvalChain || [];
  const currentLevel = po.currentLevel || 1;
  return (
    <div className="space-y-3">
      {chain.map((step, i) => {
        const active = i === currentLevel - 1 && po.status === 'Pending';
        const breached = active && step.sla?.breached;
        const Icon = step.status === 'approved' ? CheckCircle2 : step.status === 'rejected' ? XCircle : Clock;
        const cls =
          step.status === 'approved' ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' :
          step.status === 'rejected' ? 'bg-rose-500/15 text-rose-500 border-rose-500/30' :
          active ? (breached ? 'bg-rose-500/15 text-rose-500 border-rose-500/30 ring-2 ring-rose-500/20'
                             : 'bg-amber-500/15 text-amber-500 border-amber-500/30 ring-2 ring-amber-500/20')
                 : 'bg-muted text-muted-foreground border-border';
        return (
          <div key={i} className="flex gap-3">
            <div className={cn('h-8 w-8 rounded-full border grid place-items-center shrink-0', cls)}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 pb-3 border-b border-border/40 last:border-0">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium">{APPROVAL_ROLE_LABELS[step.requiredRole] || step.requiredRole} approval</div>
                <Badge variant="outline" className="text-[10px] capitalize">{step.status}</Badge>
              </div>
              {active && (
                <div className={cn('flex items-center gap-1.5 text-xs mt-0.5 font-medium', breached ? 'text-rose-500' : 'text-amber-500')}>
                  {breached && <AlertTriangle className="h-3.5 w-3.5" />}
                  {breached ? 'SLA breached' : 'Awaiting decision'} · {fmtHours(step.sla?.durationHours)} pending
                </div>
              )}
              {step.approverName && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {step.approverName} · {fmtRelative(step.actedAt)}
                  {step.sla && <span className="ml-2">took {fmtHours(step.sla.durationHours)}</span>}
                </div>
              )}
              {step.comment && (
                <div className="mt-2 text-xs bg-muted/40 border border-border/40 rounded-md p-2 text-muted-foreground">
                  “{step.comment}”
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CommentsTab({ po, onSend }) {
  const [text, setText] = useState('');
  const send = async () => {
    if (!text.trim()) return;
    await onSend(text.trim());
    setText('');
  };
  return (
    <div className="space-y-3">
      <div className="space-y-3">
        {(po.comments || []).length === 0 && (
          <div className="text-center py-6 text-sm text-muted-foreground">No comments yet.</div>
        )}
        {(po.comments || []).map((c) => (
          <div key={c._id} className="flex gap-3">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="text-[10px] bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20">{initials(c.userName || 'U')}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{c.userName || 'User'}</span>
                <span className="text-[11px] text-muted-foreground">{fmtRelative(c.at)}</span>
              </div>
              <p className="text-sm text-foreground/90 mt-0.5">{c.text}</p>
            </div>
          </div>
        ))}
      </div>
      <Separator />
      <div className="space-y-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a comment…" onKeyDown={(e) => e.key === 'Enter' && send()} />
        <div className="flex justify-end">
          <Button size="sm" onClick={send} disabled={!text.trim()} className="gap-1.5">
            <Send className="h-3 w-3" /> Post
          </Button>
        </div>
      </div>
    </div>
  );
}

function ActivityTab({ po }) {
  const log = (po.activityLog || []).slice().reverse();
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

export function PoDrawer({ poId, open, onOpenChange, onMutated }) {
  const { user } = useAuth();
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');

  useEffect(() => {
    if (!poId || !open) return;
    let cancel = false;
    setLoading(true);
    api.getPO(poId).then((res) => { if (!cancel) setPo(res.data); })
      .catch((e) => toast.error(e.message))
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, [poId, open]);

  const refresh = async () => {
    if (!poId) return;
    const res = await api.getPO(poId);
    setPo(res.data);
    onMutated?.();
  };

  const doAction = async (fn, label) => {
    setActing(true);
    try { await fn(); toast.success(label); await refresh(); }
    catch (e) { toast.error(e.message); }
    finally { setActing(false); }
  };

  if (!open) return null;

  const meta = po ? (PO_STATUS[po.status] || PO_STATUS.Pending) : null;
  const currentStep = po ? (po.approvalInfo?.currentStep || po.approvalChain?.[(po.currentLevel || 1) - 1]) : null;
  const canApprove = user && po && po.status === 'Pending' && currentStep && canApprovePoStep(user.role, currentStep);
  const slaBreached = !!(po?.approvalInfo?.slaBreached || (currentStep?.sla?.breached));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[640px] p-0 flex flex-col">
        {loading || !po ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            <SheetHeader className="px-6 py-5 border-b border-border/60 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono text-muted-foreground">{po.number}</span>
                <Badge variant="outline" className={cn('h-5 text-[10px] font-medium', meta.cls)}>{po.status}</Badge>
                {slaBreached && po.status === 'Pending' && (
                  <Badge variant="outline" className="h-5 text-[10px] gap-1 bg-rose-500/15 text-rose-400 border-rose-500/30">
                    <AlertTriangle className="h-3 w-3" /> SLA breached
                  </Badge>
                )}
              </div>
              <SheetTitle className="text-lg leading-snug flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-muted-foreground" /> PO {po.number}
              </SheetTitle>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {po.vendorName}</span>
                <span className="flex items-center gap-1"><UserIcon className="h-3 w-3" /> {po.ownerName || '—'}</span>
                {po.requestNumber && <span className="text-[11px] font-mono">from {po.requestNumber}</span>}
                {po.eta !== '—' && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> ETA {po.eta}</span>}
              </div>
              <div className="flex items-baseline justify-between pt-2">
                <div className="text-[11px] text-muted-foreground">Amount</div>
                <div className="text-2xl font-semibold tracking-tight">{fmtCurrency(po.amount)}</div>
              </div>
            </SheetHeader>

            <ScrollArea className="flex-1">
              <Tabs defaultValue="overview" className="px-6 py-4">
                <TabsList className="grid grid-cols-4 w-full h-9">
                  <TabsTrigger value="overview" className="text-xs gap-1.5"><FileText className="h-3 w-3" /> Overview</TabsTrigger>
                  <TabsTrigger value="approvals" className="text-xs gap-1.5"><CheckCircle2 className="h-3 w-3" /> Approvals</TabsTrigger>
                  <TabsTrigger value="comments" className="text-xs gap-1.5"><MessageSquare className="h-3 w-3" /> Comments</TabsTrigger>
                  <TabsTrigger value="activity" className="text-xs gap-1.5"><Activity className="h-3 w-3" /> Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4 space-y-4">
                  {po.notes && <p className="text-sm text-muted-foreground leading-relaxed">{po.notes}</p>}
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Line items</div>
                    <div className="rounded-lg border border-border/60 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium">Item</th>
                            <th className="text-right px-3 py-2 font-medium">Qty</th>
                            <th className="text-right px-3 py-2 font-medium">Unit</th>
                            <th className="text-right px-3 py-2 font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(po.lines || []).map((it, i) => (
                            <tr key={i} className="border-t border-border/40">
                              <td className="px-3 py-2">
                                <div className="font-medium">{it.description || it.sku}</div>
                                {it.sku && it.description && <div className="text-[11px] text-muted-foreground font-mono">{it.sku}</div>}
                              </td>
                              <td className="text-right px-3 py-2">{it.qty} {it.unit}</td>
                              <td className="text-right px-3 py-2">{fmtCurrency(it.unitPrice)}</td>
                              <td className="text-right px-3 py-2 font-medium">{fmtCurrency(it.lineTotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 text-sm">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-semibold">{fmtCurrency(po.amount)}</span>
                  </div>
                </TabsContent>

                <TabsContent value="approvals" className="mt-4">
                  {slaBreached && po.status === 'Pending' && (
                    <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
                      <AlertTriangle className="h-4 w-4" />
                      SLA breached — {po.number} · {fmtCurrency(po.amount)} · waiting for {currentStep ? (APPROVAL_ROLE_LABELS[currentStep.requiredRole] || currentStep.requiredRole) : 'approval'} · {fmtHours(currentStep?.sla?.durationHours)} pending
                    </div>
                  )}
                  <ApprovalTimeline po={po} />
                </TabsContent>

                <TabsContent value="comments" className="mt-4">
                  <CommentsTab po={po} onSend={async (text) => { await api.commentPO(po._id, text); toast.success('Comment added'); await refresh(); }} />
                </TabsContent>

                <TabsContent value="activity" className="mt-4">
                  <ActivityTab po={po} />
                </TabsContent>
              </Tabs>
            </ScrollArea>

            {canApprove && (
              <div className="border-t border-border/60 p-4 space-y-3 bg-card/40 backdrop-blur">
                <Input value={approvalComment} onChange={(e) => setApprovalComment(e.target.value)}
                  placeholder="Approval / rejection comment (optional)" className="h-9" />
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 gap-1.5 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300" disabled={acting}
                    onClick={() => doAction(() => api.rejectPO(po._id, approvalComment), 'PO rejected')}>
                    <X className="h-3.5 w-3.5" /> Reject
                  </Button>
                  <Button className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-600/90" disabled={acting}
                    onClick={() => doAction(() => api.approvePO(po._id, approvalComment), 'Approved stage')}>
                    <Check className="h-3.5 w-3.5" /> Approve
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
