'use client';

import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

// Reference-style accent per KPI: lavender (spend), teal (approvals),
// pink/error (open POs), pink (vendors at risk).
const SPARK_COLOR = {
  monthSpend: 'hsl(var(--chart-3))',
  pendingApprovals: 'hsl(var(--chart-2))',
  openPurchaseOrders: 'hsl(var(--destructive))',
  vendorsAtRisk: 'hsl(var(--chart-4))',
};

export function KpiCard({ item, index = 0 }) {
  const data = item.spark.map((v, i) => ({ i, v }));
  const up = item.trend === 'up';
  const color = SPARK_COLOR[item.key] || 'hsl(var(--chart-1))';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      className="group flex h-[160px] cursor-pointer flex-col justify-between rounded-md border border-border/60 bg-card p-4 transition-colors hover:border-border hover:bg-accent/30"
    >
      <div className="flex items-start justify-between">
        <h4 className="text-[12px] font-medium text-muted-foreground">{item.label}</h4>
        {item.delta !== null && item.delta !== undefined && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium',
              up ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
            )}
          >
            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(item.delta)}%
          </span>
        )}
      </div>

      <div className="font-heading text-2xl font-semibold tracking-tight text-foreground tabular-nums">{item.value}</div>

      <div className="h-7 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
            <Area
              type="monotone"
              dataKey="v"
              stroke={color}
              fill="transparent"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="text-[11px] font-mono text-muted-foreground">{item.sub}</div>
    </motion.div>
  );
}
