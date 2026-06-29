'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ACTIVITY } from '@/lib/mock-data';
import { Sparkles, Check, FilePlus, RefreshCcw, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const kindMap = {
  approve: { icon: Check, cls: 'bg-emerald-500/15 text-emerald-500' },
  ai: { icon: Sparkles, cls: 'bg-violet-500/15 text-violet-500' },
  create: { icon: FilePlus, cls: 'bg-sky-500/15 text-sky-500' },
  update: { icon: RefreshCcw, cls: 'bg-amber-500/15 text-amber-500' },
  receive: { icon: Truck, cls: 'bg-fuchsia-500/15 text-fuchsia-500' },
};

export function ActivityFeed() {
  return (
    <Card className="border-border/60 h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Activity</CardTitle>
        <p className="text-xs text-muted-foreground">Real-time pulse across your workspace.</p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[320px] pr-3">
          <ul className="space-y-4">
            {ACTIVITY.map((a, i) => {
              const { icon: Icon, cls } = kindMap[a.kind] || kindMap.update;
              return (
                <motion.li
                  key={a.id}
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
                      <span className="font-medium">{a.who}</span>{' '}
                      <span className="text-muted-foreground">{a.action}</span>{' '}
                      <span className="font-medium">{a.target}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{a.when}</p>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
