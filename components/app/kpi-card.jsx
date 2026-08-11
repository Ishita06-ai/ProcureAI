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
  const gradId = `kpi-spark-${item.key}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      className="group flex h-[176px] cursor-pointer flex-col justify-between rounded-lg border border-border/70 bg-card p-5 transition-colors hover:border-border hover:bg-accent/40"
    >
      <div className="flex items-start justify-between">
        <h4 className="text-[13px] font-medium text-muted-foreground">{item.label}</h4>
        {item.delta !== null && item.delta !== undefined && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
              up ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
            )}
          >
            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(item.delta)}%
          </span>
        )}
      </div>

      <div className="font-heading text-3xl font-semibold tracking-tight text-foreground">{item.value}</div>

      <div className="h-8 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke={color}
              fill={`url(#${gradId})`}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="text-[11px] text-muted-foreground">{item.sub}</div>
    </motion.div>
  );
}
