'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

// Reference segment palette: lavender, violet, pink, light red, teal.
const COLORS = [
  'hsl(var(--chart-3))',
  'hsl(var(--chart-1))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--chart-2))',
  'hsl(var(--muted-foreground))',
];

export function CategoryDonut({ data = [], loading = false }) {
  const total = data.reduce((s, c) => s + (c.spend || 0), 0) || 1;
  const withPct = data.map((c) => ({ ...c, value: Math.round((c.spend / total) * 100) }));
  const shown = withPct.reduce((s, c) => s + (c.value || 0), 0);

  return (
    <Card className="flex h-full min-h-[400px] flex-col rounded-lg border-border/70 bg-card">
      <CardHeader className="p-6 pb-2">
        <CardTitle className="font-heading text-base font-semibold">Spend by Category</CardTitle>
        <p className="text-[13px] text-muted-foreground mt-1">Distribution across vendor categories.</p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col p-6 pt-2">
        <div className="relative h-[200px] flex-1 min-h-[160px]">
          {loading ? <Skeleton className="h-full w-full" /> : withPct.length === 0 ? (
            <div className="h-full grid place-items-center text-xs text-muted-foreground">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                  formatter={(value) => [`${value}%`, 'Share']}
                />
                <Pie data={withPct} dataKey="value" nameKey="name" innerRadius={58} outerRadius={80} paddingAngle={3} stroke="hsl(var(--background))" strokeWidth={2}>
                  {withPct.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          )}
          {!loading && withPct.length > 0 && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-heading text-2xl font-semibold text-foreground">{shown}%</span>
              <span className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Total</span>
            </div>
          )}
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
          {withPct.map((c, i) => (
            <li key={c.name} className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="text-muted-foreground truncate">{c.name}</span>
              <span className="ml-auto font-medium text-foreground">{c.value}%</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
