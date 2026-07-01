'use client';

import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

export function KpiCard({ item, index = 0 }) {
  const data = item.spark.map((v, i) => ({ i, v }));
  const up = item.trend === 'up';
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 group hover:border-border transition-colors"
    >
      <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br opacity-60', item.accent)} />
      <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-foreground/[0.03] blur-2xl" />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground">{item.label}</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight">{item.value}</div>
          </div>
          {item.delta !== null && item.delta !== undefined && (
            <div
              className={cn(
                'inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-1',
                up ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
              )}
            >
              {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(item.delta)}%
            </div>
          )}
        </div>
        <div className="mt-4 h-12">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, bottom: 4, left: 0, right: 0 }}>
              <Line
                type="monotone"
                dataKey="v"
                stroke={up ? 'hsl(var(--chart-3))' : 'hsl(var(--destructive))'}
                strokeWidth={2}
                dot={false}
                isAnimationActive
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">{item.sub}</div>
      </div>
    </motion.div>
  );
}