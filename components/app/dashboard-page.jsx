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
  monthSpend:        'from-violet-500/40 to-fuchsia-500/10',
  pendingApprovals:  'from-amber-500/40 to-orange-500/10',
  openPurchaseOrders:'from-sky-500/40 to-cyan-500/10',
  vendorsAtRisk:     'from-rose-500/40 to-orange-500/10',
};

function buildKpis(d) {
  const k = d?.kpis || {};
  return [
    {
      key: 'monthSpend',
      label: 'Spend (MTD)',
      value: fmtCurrency(k.monthSpend || 0),
      delta: 12.4, trend: 'up',
      sub: `${k.openPurchaseOrders ?? 0} open POs, ${k.deliveredPOs ?? 0} delivered`,
      spark: [3.1, 3.4, 3.2, 3.8, 4.1, 4.0, 4.4, 4.6, 4.5, 4.7, 4.6, (k.monthSpend || 0) / 1e6],
      accent: accents.monthSpend,
    },
    {
      key: 'pendingApprovals',
      label: 'Pending Approvals',
      value: String(k.pendingApprovals ?? 0),
      delta: k.pendingApprovals > 0 ? +k.pendingApprovals : 0,
      trend: k.pendingApprovals > 0 ? 'up' : 'down',
      sub: `${k.approvedPRs ?? 0} approved \u00b7 awaiting PO`,
      spark: [1, 2, 1, 3, 2, 3, 2, k.pendingApprovals || 0],
      accent: accents.pendingApprovals,
    },
    {
      key: 'openPurchaseOrders',
      label: 'Open Purchase Orders',
      value: String(k.openPurchaseOrders ?? 0),
      delta: -3.1, trend: 'down',
      sub: `${k.openPRs ?? 0} active requests`,
      spark: [9, 8, 7, 8, 6, 7, 6, k.openPurchaseOrders || 0],
      accent: accents.openPurchaseOrders,
    },
    {
      key: 'vendorsAtRisk',
      label: 'Vendors At Risk',
      value: String(k.vendorsAtRisk ?? 0),
      delta: 2, trend: 'up',
      sub: `out of ${k.vendorCount ?? 0} vendors`,
      spark: [4, 5, 4, 6, 5, 6, 5, k.vendorsAtRisk || 0],
      accent: accents.vendorsAtRisk,
    },
  ];
}

export function DashboardPage() {
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
      <AiInsightBanner />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[150px] rounded-2xl" />)
          : kpis.map((k, i) => <KpiCard key={k.key} item={k} index={i} />)
        }
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2"><SpendChart /></div>
        <CategoryDonut />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2"><PoTable /></div>
        <ActivityFeed />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-1"><VendorRanking /></div>
      </div>
    </div>
  );
}
