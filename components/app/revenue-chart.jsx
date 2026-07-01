'use client';

import { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
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
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
        <div>
          <CardTitle className="text-base font-semibold">Spend</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Purchase order spend over time.</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={range} onValueChange={setRange}>
            <TabsList className="h-8">
              <TabsTrigger value="3m" className="h-6 text-xs">3M</TabsTrigger>
              <TabsTrigger value="6m" className="h-6 text-xs">6M</TabsTrigger>
              <TabsTrigger value="12m" className="h-6 text-xs">12M</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="outline" size="sm" className="h-8 gap-1.5"
            disabled={visible.length === 0}
            onClick={() => downloadCsv(`spend-trend-${range}.csv`, visible)}
          >
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] -ml-2">
          {loading ? <Skeleton className="h-full w-full" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={visible} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gSpend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={56} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--border))' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Area type="monotone" dataKey="spend" name="Spend" stroke="hsl(var(--chart-1))" fill="url(#gSpend)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}