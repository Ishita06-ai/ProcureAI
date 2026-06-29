// Status & priority style maps used across procurement components.
export const PR_STATUS = {
  Draft:       { label: 'Draft',        cls: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30' },
  Submitted:   { label: 'Submitted',    cls: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
  UnderReview: { label: 'Under Review', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  Approved:    { label: 'Approved',     cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  Rejected:    { label: 'Rejected',     cls: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
  Cancelled:   { label: 'Cancelled',    cls: 'bg-muted text-muted-foreground border-border' },
};
export const PR_COLUMN_ORDER = ['Draft', 'Submitted', 'UnderReview', 'Approved', 'Rejected'];

export const PRIORITY = {
  low:    { label: 'Low',    cls: 'bg-muted text-muted-foreground' },
  normal: { label: 'Normal', cls: 'bg-sky-500/15 text-sky-400' },
  high:   { label: 'High',   cls: 'bg-amber-500/15 text-amber-400' },
  urgent: { label: 'Urgent', cls: 'bg-rose-500/15 text-rose-400' },
};

export const PO_STATUS = {
  Draft:       { cls: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' },
  Pending:     { cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  Approved:    { cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  'In Transit':{ cls: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
  Delivered:   { cls: 'bg-violet-500/15 text-violet-400 border-violet-500/30' },
  Cancelled:   { cls: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
};

export const GRN_STATUS = {
  Received:           { cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  PartiallyReceived:  { cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  Disputed:           { cls: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
};

export const fmtCurrency = (n, c = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n || 0);

export const fmtDate = (d) => d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export const fmtRelative = (d) => {
  if (!d) return '';
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

export const initials = (n = '') =>
  n.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
