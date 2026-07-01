'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Check, FilePlus, RefreshCcw, Truck, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

function kindOf(action = '') {
  const a = action.toLowerCase();
  if (a.includes('approve')) return { icon: Check, cls: 'bg-emerald-500/15 text-emerald-500' };
  if (a.includes('reject') || a.includes('cancel')) return { icon: X, cls: 'bg-rose-500/15 text-rose-500' };
  if (a.includes('submit') || a.includes('creat')) return { icon: FilePlus, cls: 'bg-sky-500/15 text-sky-500' };
  if (a.includes('receiv') || a.includes('deliver') || a.includes('transit')) return { icon: Truck, cls: 'bg-fuchsia-500/15 text-fuchsia-500' };
  if (a.includes('ai') || a.includes('insight')) return { icon: Sparkles, cls: 'bg-violet-500/15 text-violet-500' };
  return { icon: RefreshCcw, cls: 'bg-amber-500/15 text-amber-500' };
}

function timeAgo(date) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function ActivityFeed({ data = [], loading = false }) {
  return (
    <Card className="border-border/60 h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Activity</CardTitle>
        <p className="text-xs text-muted-foreground">Recent activity across your workspace.</p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[320px] pr-3">
          {loading && (
            <ul className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <li key={i} className="flex gap-3">
                  <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                  <Skeleton className="h-8 flex-1" />
                </li>
              ))}
            </ul>
          )}
          {!loading && data.length === 0 && (
            <p className="text-xs text-muted-foreground py-6 text-center">No activity yet</p>
          )}
          {!loading && (
            <ul className="space-y-4">
              {data.map((a, i) => {
                const { icon: Icon, cls } = kindOf(a.action);
                return (
                  <motion.li
                    key={`${a.number}-${a.at}-${i}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex gap-3"
                  >
                    <div className={cn('h-8 w-8 shrink-0 rounded-lg grid place-items-center', cls)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug">
                        <span className="font-medium">{a.who || 'Someone'}</span>{' '}
                        <span className="text-muted-foreground">{a.action}</span>{' '}
                        <span className="font-medium">{a.title || a.number}</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{timeAgo(a.at)}</p>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}