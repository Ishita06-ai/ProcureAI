'use client';

import { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';

const COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--muted-foreground))',
];

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/70 bg-popover/95 backdrop-blur px-3 py-2 shadow-xl text-xs">
      <div className="font-medium mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="capitalize text-muted-foreground">{p.name || p.dataKey}</span>
          <span className="ml-auto font-medium">
            {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function SectionCard({ title, subtitle, children, height = 280 }) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent>
        <div style={{ height }}>{children}</div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ label = 'No data yet' }) {
  return (
    <div className="h-full grid place-items-center text-xs text-muted-foreground">{label}</div>
  );
}

export function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    (async () => {
      try {
        const res = await api.analyticsOverview();
        if (!cancel) setData(res.data);
      } catch (e) {
        if (!cancel) toast.error(e.message);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [refresh]);

  const trend = (data?.trend || []).map(d => ({ ...d, month: d.month }));
  const byCat = data?.byCat || [];
  const byDept = data?.byDept || [];
  const funnel = data?.funnel || [];
  const topVendors = data?.topVendors || [];
  const cycles = data?.cycles || [];

  return (
    <div className="px-4 lg:px-8 py-6 lg:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Analytics</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Spend, savings and supplier KPIs across your workspace.
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setRefresh(x => x + 1)}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <SectionCard title="Spend trend" subtitle="Purchase order spend & order volume, last 12 months">
        {loading ? <Skeleton className="h-full w-full" /> : trend.length === 0 ? <EmptyState /> : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gAnalyticsSpend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={56} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'hsl(var(--border))' }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Area type="monotone" dataKey="spend" name="Spend" stroke="hsl(var(--chart-1))" fill="url(#gAnalyticsSpend)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Spend by category" subtitle="Distribution across vendor categories" height={300}>
          {loading ? <Skeleton className="h-full w-full" /> : byCat.length === 0 ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<ChartTooltip />} />
                <Pie data={byCat} dataKey="spend" nameKey="category" innerRadius={55} outerRadius={90} paddingAngle={3} stroke="hsl(var(--background))" strokeWidth={2}>
                  {byCat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard title="Spend by department" subtitle="Approved purchase requests by department" height={300}>
          {loading ? <Skeleton className="h-full w-full" /> : byDept.length === 0 ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byDept} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="department" tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={56} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--accent))' }} />
                <Bar dataKey="spend" name="Spend" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="PR approval funnel" subtitle="Where purchase requests stand right now" height={300}>
          {loading ? <Skeleton className="h-full w-full" /> : funnel.length === 0 ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnel} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <YAxis type="category" dataKey="stage" tickLine={false} axisLine={false} width={90} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--accent))' }} />
                <Bar dataKey="count" name="Requests" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Top vendors by spend</CardTitle>
            <p className="text-xs text-muted-foreground">Highest YTD spend across your supplier network</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />) :
              topVendors.length === 0 ? <EmptyState /> : topVendors.map((v) => (
                <div key={v._id || v.name} className="flex items-center justify-between gap-3 py-1.5 border-b border-border/40 last:border-0">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{v.name}</div>
                    <div className="text-xs text-muted-foreground">{v.category}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="text-[10px]">score {v.score ?? '—'}</Badge>
                    <span className="text-sm font-medium tabular-nums">${(v.spend || 0).toLocaleString()}</span>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base font-semibold">PR cycle times</CardTitle>
            <p className="text-xs text-muted-foreground">Average hours from submission to approval, by department</p>
          </div>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div style={{ height: 260 }}>
            {loading ? <Skeleton className="h-full w-full" /> : cycles.length === 0 ? <EmptyState label="Not enough approved requests yet" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cycles} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="department" tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={(v) => `${v.toFixed(0)}h`} width={48} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--accent))' }} />
                  <Bar dataKey="avgHours" name="Avg hours" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}