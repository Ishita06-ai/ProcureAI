'use client';

import { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Download } from 'lucide-react';
import { api } from '@/lib/api-client';
import { downloadCsv } from '@/lib/export-utils';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/70 bg-popover/95 backdrop-blur px-3 py-2 shadow-xl text-xs">
      <div className="font-medium mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="capitalize text-muted-foreground">{p.dataKey}</span>
          <span className="ml-auto font-medium">${(p.value || 0).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

const RANGE_MONTHS = { '3m': 3, '6m': 6, '12m': 12 };

export function SpendChart() {
  const [range, setRange] = useState('12m');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    api.analyticsSpendTrend()
      .then((r) => { if (!cancel) setData(r.data || []); })
      .catch(() => {})
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, []);

  const visible = data.slice(-RANGE_MONTHS[range]);

  return (
    <Card className="flex h-[380px] flex-col rounded-md border-border/60 bg-card">
      <CardHeader className="flex flex-row items-start justify-between gap-4 p-5 pb-3">
        <div>
          <CardTitle className="font-heading text-sm font-semibold">Spend Over Time</CardTitle>
          <p className="text-[12px] text-muted-foreground mt-0.5">Purchase order spend overview</p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={range} onValueChange={setRange}>
            <TabsList className="h-7 rounded bg-muted/60 p-0.5">
              <TabsTrigger value="3m" className="h-6 rounded px-2 text-[11px]">3M</TabsTrigger>
              <TabsTrigger value="6m" className="h-6 rounded px-2 text-[11px]">6M</TabsTrigger>
              <TabsTrigger value="12m" className="h-6 rounded px-2 text-[11px]">12M</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="outline" size="sm" className="h-7 gap-1.5 rounded border-border/70 bg-card text-foreground hover:bg-accent/40 text-[11px]"
            disabled={visible.length === 0}
            onClick={() => downloadCsv(`spend-trend-${range}.csv`, visible)}
          >
            <Download className="h-3 w-3" /> Export
          </Button>
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 p-5 pt-1">
        <div className="h-full">
          {loading ? <Skeleton className="h-full w-full rounded" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={visible} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="hsl(var(--border))" vertical={false} opacity={0.4} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={48} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--border))' }} />
                <Area type="monotone" dataKey="spend" name="Spend" stroke="hsl(var(--chart-1))" fill="transparent" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
