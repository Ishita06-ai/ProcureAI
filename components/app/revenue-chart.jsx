'use client';

import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Download, Sparkles } from 'lucide-react';
import { SPEND_TIMESERIES } from '@/lib/mock-data';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/70 bg-popover/95 backdrop-blur px-3 py-2 shadow-xl text-xs">
      <div className="font-medium mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="capitalize text-muted-foreground">{p.dataKey}</span>
          <span className="ml-auto font-medium">${p.value.toFixed(2)}M</span>
        </div>
      ))}
    </div>
  );
}

export function SpendChart() {
  const [range, setRange] = useState('12m');
  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
        <div>
          <CardTitle className="text-base font-semibold">Spend & Savings</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Forecast vs. actual procurement spend, with AI-identified savings overlay.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={range} onValueChange={setRange}>
            <TabsList className="h-8">
              <TabsTrigger value="3m" className="h-6 text-xs">3M</TabsTrigger>
              <TabsTrigger value="6m" className="h-6 text-xs">6M</TabsTrigger>
              <TabsTrigger value="12m" className="h-6 text-xs">12M</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" className="h-8 gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" />
            <span>AI insight:</span>
          </div>
          <p className="text-xs">
            Spend is trending <span className="text-emerald-500 font-medium">+12.4%</span> against forecast — likely driven by Q4 logistics surcharges.
          </p>
        </div>
        <div className="h-[280px] -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={SPEND_TIMESERIES} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gSpend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gForecast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gSavings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={(v) => `$${v}M`} width={50} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--border))' }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Area type="monotone" dataKey="forecast" name="Forecast" stroke="hsl(var(--chart-2))" fill="url(#gForecast)" strokeWidth={2} strokeDasharray="4 4" />
              <Area type="monotone" dataKey="spend" name="Spend" stroke="hsl(var(--chart-1))" fill="url(#gSpend)" strokeWidth={2.5} />
              <Area type="monotone" dataKey="savings" name="Savings" stroke="hsl(var(--chart-3))" fill="url(#gSavings)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
