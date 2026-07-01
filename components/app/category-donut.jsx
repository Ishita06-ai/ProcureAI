'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--muted-foreground))',
];

export function CategoryDonut({ data = [], loading = false }) {
  const total = data.reduce((s, c) => s + (c.spend || 0), 0) || 1;
  const withPct = data.map((c) => ({ ...c, value: Math.round((c.spend / total) * 100) }));

  return (
    <Card className="border-border/60 h-full">
      <CardHeader className="pb-0">
        <CardTitle className="text-base font-semibold">Spend by category</CardTitle>
        <p className="text-xs text-muted-foreground">Distribution across vendor categories.</p>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          {loading ? <Skeleton className="h-full w-full" /> : withPct.length === 0 ? (
            <div className="h-full grid place-items-center text-xs text-muted-foreground">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                  formatter={(value) => [`${value}%`, 'Share']}
                />
                <Pie data={withPct} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} paddingAngle={3} stroke="hsl(var(--background))" strokeWidth={2}>
                  {withPct.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
          {withPct.map((c, i) => (
            <li key={c.name} className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="text-muted-foreground truncate">{c.name}</span>
              <span className="ml-auto font-medium">{c.value}%</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}