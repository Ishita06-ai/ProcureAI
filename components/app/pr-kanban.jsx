'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Calendar, AlertCircle, ArrowRight } from 'lucide-react';
import { PR_STATUS, PR_COLUMN_ORDER, PRIORITY, fmtCurrency, fmtDate, initials } from '@/lib/procurement-utils';
import { Skeleton } from '@/components/ui/skeleton';

function PrCard({ pr, onOpen }) {
  const prio = PRIORITY[pr.priority] || PRIORITY.normal;
  return (
    <motion.button
      type="button"
      onClick={() => onOpen(pr)}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="group w-full text-left rounded-xl border border-border/60 bg-card p-3.5 hover:border-border hover:shadow-glow transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-[10px] font-mono text-muted-foreground">{pr.number}</div>
        <Badge variant="outline" className={cn('h-5 text-[10px] font-medium border-0', prio.cls)}>
          {pr.priority === 'urgent' && <AlertCircle className="h-2.5 w-2.5 mr-1" />}
          {prio.label}
        </Badge>
      </div>
      <h4 className="mt-1.5 text-sm font-medium leading-snug line-clamp-2">{pr.title}</h4>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {pr.department} · {pr.items?.length || 0} items
        </div>
        <div className="text-sm font-semibold tracking-tight">{fmtCurrency(pr.estimatedTotal)}</div>
      </div>

      {pr.neededBy && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Calendar className="h-3 w-3" /> by {fmtDate(pr.neededBy)}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-[9px] bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20">
              {initials(pr.requesterName)}
            </AvatarFallback>
          </Avatar>
          <span className="text-[11px] text-muted-foreground truncate max-w-[120px]">{pr.requesterName}</span>
        </div>
        {pr.approvalChain?.length > 0 && (
          <div className="flex items-center gap-0.5">
            {pr.approvalChain.map((s, i) => (
              <span
                key={i}
                title={`L${s.level} · ${s.requiredRole} · ${s.status}`}
                className={cn('h-1.5 w-3 rounded-full',
                  s.status === 'approved' ? 'bg-emerald-500' :
                  s.status === 'rejected' ? 'bg-rose-500' :
                  i === (pr.currentLevel - 1) ? 'bg-amber-400' : 'bg-border'
                )}
              />
            ))}
          </div>
        )}
      </div>
    </motion.button>
  );
}

export function PrKanban({ board, loading, onOpen }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
      {PR_COLUMN_ORDER.map((status) => {
        const items = board?.[status] || [];
        const meta = PR_STATUS[status];
        return (
          <div key={status} className="rounded-2xl border border-border/60 bg-muted/20 p-3 flex flex-col min-h-[400px]">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn('h-5 text-[10px] font-medium border', meta.cls)}>
                  {meta.label}
                </Badge>
                <span className="text-[11px] text-muted-foreground">{items.length}</span>
              </div>
              {status === 'Approved' && items.length > 0 && (
                <ArrowRight className="h-3.5 w-3.5 text-emerald-500" />
              )}
            </div>
            <div className="space-y-2.5 flex-1">
              {loading ? Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-[140px] w-full rounded-xl" />
              )) : items.map((pr) => (
                <PrCard key={pr._id} pr={pr} onOpen={onOpen} />
              ))}
              {!loading && items.length === 0 && (
                <div className="text-center py-8 text-[11px] text-muted-foreground/60">
                  No requests
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
