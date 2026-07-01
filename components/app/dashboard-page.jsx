'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { KpiCard } from '@/components/app/kpi-card';
import { SpendChart } from '@/components/app/revenue-chart';
import { VendorRanking } from '@/components/app/vendor-ranking';
import { PoTable } from '@/components/app/po-table';
import { ActivityFeed } from '@/components/app/activity-feed';
import { AiInsightBanner } from '@/components/app/ai-insight-banner';
import { CategoryDonut } from '@/components/app/category-donut';
import { Skeleton } from '@/components/ui/skeleton';
import { fmtCurrency } from '@/lib/procurement-utils';

const accents = {
  monthSpend:         'from-violet-500/40 to-fuchsia-500/10',
  pendingApprovals:   'from-amber-500/40 to-orange-500/10',
  openPurchaseOrders: 'from-sky-500/40 to-cyan-500/10',
  vendorsAtRisk:      'from-rose-500/40 to-orange-500/10',
};

function buildKpis(d) {
  const k = d?.kpis || {};
  const s = d?.sparks || {};
  const fallback = [0, 0, 0, 0, 0, 0, 0, 0];
  return [
    {
      key: 'monthSpend',
      label: 'Spend (MTD)',
      value: fmtCurrency(k.monthSpend || 0),
      delta: null, trend: 'up',
      sub: `${k.openPurchaseOrders ?? 0} open POs · ${k.deliveredPOs ?? 0} delivered`,
      spark: s.spend?.length ? s.spend : fallback,
      accent: accents.monthSpend,
    },
    {
      key: 'pendingApprovals',
      label: 'Pending Approvals',
      value: String(k.pendingApprovals ?? 0),
      delta: null, trend: k.pendingApprovals > 0 ? 'up' : 'down',
      sub: `${k.approvedPRs ?? 0} approved · awaiting PO`,
      spark: s.approval?.length ? s.approval : fallback,
      accent: accents.pendingApprovals,
    },
    {
      key: 'openPurchaseOrders',
      label: 'Open Purchase Orders',
      value: String(k.openPurchaseOrders ?? 0),
      delta: null, trend: 'down',
      sub: `${k.openPRs ?? 0} active requests`,
      spark: s.po?.length ? s.po : fallback,
      accent: accents.openPurchaseOrders,
    },
    {
      key: 'vendorsAtRisk',
      label: 'Vendors At Risk',
      value: String(k.vendorsAtRisk ?? 0),
      delta: null, trend: k.vendorsAtRisk > 0 ? 'up' : 'down',
      sub: `out of ${k.vendorCount ?? 0} vendors`,
      spark: fallback,
      accent: accents.vendorsAtRisk,
    },
  ];
}

export function DashboardPage({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    api.dashboard()
      .then(r => { if (!cancel) setData(r.data); })
      .catch(() => {})
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, []);

  const kpis = buildKpis(data);

  return (
    <div className="px-4 lg:px-8 py-6 lg:py-8 space-y-6">
      <AiInsightBanner onNavigate={onNavigate} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[150px] rounded-2xl" />)
          : kpis.map((k, i) => <KpiCard key={k.key} item={k} index={i} />)
        }
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2"><SpendChart /></div>
        <CategoryDonut data={data?.distribution || []} loading={loading} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2"><PoTable data={data?.recentPOs || []} loading={loading} onNavigate={onNavigate} /></div>
        <ActivityFeed data={data?.activityFeed || []} loading={loading} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-1"><VendorRanking data={data?.topVendors || []} loading={loading} /></div>
      </div>
    </div>
  );
}