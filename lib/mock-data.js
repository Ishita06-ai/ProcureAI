// Centralized realistic mock data for the Procurio dashboard.

export const KPI_DATA = [
  {
    key: 'spend',
    label: 'Total Spend (MTD)',
    value: '$4.82M',
    delta: 12.4,
    trend: 'up',
    sub: 'vs. $4.29M last month',
    spark: [3.1, 3.4, 3.2, 3.8, 4.1, 4.0, 4.4, 4.6, 4.5, 4.7, 4.6, 4.82],
    accent: 'from-violet-500/40 to-fuchsia-500/10',
  },
  {
    key: 'orders',
    label: 'Open Purchase Orders',
    value: '1,284',
    delta: -3.1,
    trend: 'down',
    sub: '42 awaiting approval',
    spark: [1450, 1420, 1380, 1395, 1330, 1310, 1290, 1305, 1295, 1284],
    accent: 'from-sky-500/40 to-cyan-500/10',
  },
  {
    key: 'savings',
    label: 'Savings Identified',
    value: '$612K',
    delta: 28.7,
    trend: 'up',
    sub: 'AI flagged 38 contracts',
    spark: [120, 180, 210, 260, 320, 360, 410, 470, 530, 580, 612],
    accent: 'from-emerald-500/40 to-teal-500/10',
  },
  {
    key: 'risk',
    label: 'Vendors At Risk',
    value: '7',
    delta: 2,
    trend: 'up',
    sub: '2 critical, 5 watchlist',
    spark: [4, 5, 4, 6, 5, 6, 5, 6, 6, 7],
    accent: 'from-rose-500/40 to-orange-500/10',
  },
];

export const SPEND_TIMESERIES = [
  { month: 'Jan', spend: 2.9, savings: 0.18, forecast: 3.0 },
  { month: 'Feb', spend: 3.2, savings: 0.22, forecast: 3.3 },
  { month: 'Mar', spend: 3.5, savings: 0.27, forecast: 3.4 },
  { month: 'Apr', spend: 3.4, savings: 0.31, forecast: 3.6 },
  { month: 'May', spend: 3.9, savings: 0.36, forecast: 3.8 },
  { month: 'Jun', spend: 4.1, savings: 0.41, forecast: 4.0 },
  { month: 'Jul', spend: 4.3, savings: 0.46, forecast: 4.2 },
  { month: 'Aug', spend: 4.0, savings: 0.49, forecast: 4.3 },
  { month: 'Sep', spend: 4.4, savings: 0.52, forecast: 4.5 },
  { month: 'Oct', spend: 4.6, savings: 0.55, forecast: 4.6 },
  { month: 'Nov', spend: 4.7, savings: 0.58, forecast: 4.7 },
  { month: 'Dec', spend: 4.82, savings: 0.61, forecast: 4.9 },
];

export const VENDORS = [
  { id: 'v-001', name: 'Apex Components Ltd.', category: 'Electronics', spend: 842300, score: 96, status: 'Preferred', risk: 'low', country: 'Germany' },
  { id: 'v-002', name: 'Northwind Logistics', category: 'Logistics', spend: 612400, score: 91, status: 'Active', risk: 'low', country: 'USA' },
  { id: 'v-003', name: 'Helix Materials Co.', category: 'Raw Materials', spend: 528900, score: 87, status: 'Active', risk: 'medium', country: 'Vietnam' },
  { id: 'v-004', name: 'Kairo Print Works', category: 'Packaging', spend: 318200, score: 82, status: 'Active', risk: 'low', country: 'Japan' },
  { id: 'v-005', name: 'Solace Cloud Services', category: 'IT Services', spend: 296700, score: 78, status: 'Watchlist', risk: 'medium', country: 'Ireland' },
  { id: 'v-006', name: 'Bramble & Co.', category: 'Office Supplies', spend: 184300, score: 72, status: 'Active', risk: 'low', country: 'UK' },
  { id: 'v-007', name: 'Orbita Freight', category: 'Logistics', spend: 142800, score: 64, status: 'At Risk', risk: 'high', country: 'Brazil' },
  { id: 'v-008', name: 'Lumen Industrial', category: 'Machinery', spend: 121500, score: 89, status: 'Active', risk: 'low', country: 'Sweden' },
];

export const PURCHASE_ORDERS = [
  { id: 'PO-10293', vendor: 'Apex Components Ltd.', amount: 84200, status: 'Approved', eta: '3 days', owner: 'I R' },
  { id: 'PO-10294', vendor: 'Northwind Logistics', amount: 12450, status: 'In Transit', eta: '1 day', owner: 'S. Patel' },
  { id: 'PO-10295', vendor: 'Helix Materials Co.', amount: 47210, status: 'Pending', eta: '—', owner: 'J. Rivera' },
  { id: 'PO-10296', vendor: 'Kairo Print Works', amount: 9320, status: 'Approved', eta: '5 days', owner: 'L. Okafor' },
  { id: 'PO-10297', vendor: 'Solace Cloud Services', amount: 28800, status: 'Pending', eta: '—', owner: 'A. Müller' },
  { id: 'PO-10298', vendor: 'Lumen Industrial', amount: 65400, status: 'Delivered', eta: 'Done', owner: 'I R' },
];

export const CATEGORY_SPEND = [
  { name: 'Electronics', value: 32 },
  { name: 'Logistics', value: 21 },
  { name: 'Raw Materials', value: 18 },
  { name: 'IT Services', value: 12 },
  { name: 'Packaging', value: 9 },
  { name: 'Other', value: 8 },
];

export const ACTIVITY = [
  { id: 1, who: 'Ishita R', action: 'approved PO-10293 for', target: 'Apex Components Ltd.', when: '2m ago', kind: 'approve' },
  { id: 2, who: 'AI Assistant', action: 'flagged a contract renewal risk on', target: 'Solace Cloud Services', when: '14m ago', kind: 'ai' },
  { id: 3, who: 'Sasha Patel', action: 'created RFQ #4421 for', target: 'Q3 Packaging Refresh', when: '38m ago', kind: 'create' },
  { id: 4, who: 'AI Assistant', action: 'identified $124K savings on', target: 'Logistics category', when: '1h ago', kind: 'ai' },
  { id: 5, who: 'Jordan Rivera', action: 'updated vendor scorecard for', target: 'Helix Materials Co.', when: '2h ago', kind: 'update' },
  { id: 6, who: 'Lena Okafor', action: 'received goods from', target: 'Kairo Print Works', when: '3h ago', kind: 'receive' },
];
