'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Search, Filter, Download, MoreHorizontal, Trash2, RefreshCw } from 'lucide-react';
import { cn, hasRole } from '@/lib/utils';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context.jsx';
import { VendorDialog } from '@/components/app/vendor-dialog';
import { toast } from 'sonner';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const riskStyles = {
  low: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  medium: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  high: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
};
const initials = (n) => n.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

export function VendorsPage() {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await api.listVendors({ q, limit: 50 });
        if (!cancel) setData({ items: res.data, total: res.meta?.total ?? res.data.length });
      } catch (e) { if (!cancel) toast.error(e.message); }
      finally { if (!cancel) setLoading(false); }
    }, 250);
    return () => { cancel = true; clearTimeout(t); };
  }, [q, refresh]);

  const onDelete = async (id, name) => {
    if (!confirm(`Delete vendor “${name}”?`)) return;
    try {
      await api.deleteVendor(id);
      toast.success('Vendor deleted');
      setRefresh((x) => x + 1);
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="px-4 lg:px-8 py-6 lg:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Vendors</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage your supplier network, scorecards and contracts.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setRefresh((x) => x + 1)}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-1.5"><Download className="h-3.5 w-3.5" /> Export</Button>
          {hasRole(user, 'admin', 'manager', 'buyer') ? <VendorDialog onCreated={() => setRefresh((x) => x + 1)} /> : (
            <Button size="sm" className="h-9" disabled title={user ? "Your role can't add vendors" : "Sign in to add vendors"}>Add vendor</Button>
          )}
        </div>
      </div>

      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search vendors, categories, countries…" className="pl-9 h-9" />
            </div>
            <Button variant="outline" size="sm" className="h-9 gap-1.5"><Filter className="h-3.5 w-3.5" /> Filters</Button>
            <div className="ml-auto text-xs text-muted-foreground">{loading ? '…' : `${data.items.length} of ${data.total}`}</div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="pl-6 text-[11px] uppercase tracking-wider">Vendor</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">Category</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">Country</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">Risk</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-right">Score</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-right">YTD Spend</TableHead>
                <TableHead className="w-10 pr-6"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`s-${i}`} className="border-border/60">
                  <TableCell className="pl-6"><div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-full" /><div><Skeleton className="h-3 w-32 mb-1" /><Skeleton className="h-2 w-16" /></div></div></TableCell>
                  <TableCell><Skeleton className="h-3 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-3 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-14 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-14 rounded-full" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-3 w-8 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-3 w-16 ml-auto" /></TableCell>
                  <TableCell className="pr-6"></TableCell>
                </TableRow>
              ))}
              {!loading && data.items.map((v) => (
                <TableRow key={v._id} className="border-border/60 hover:bg-accent/40">
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-[10px] bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 text-foreground">
                          {initials(v.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">{v.name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{String(v._id).slice(0, 8)}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{v.category}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{v.country || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="h-5 text-[10px] border-border/70 text-muted-foreground">{v.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('h-5 text-[10px] capitalize', riskStyles[v.risk])}>{v.risk}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{v.score}</TableCell>
                  <TableCell className="text-right font-medium">${(v.spend || 0).toLocaleString()}</TableCell>
                  <TableCell className="pr-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onDelete(v._id, v.name)} className="text-destructive">
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && data.items.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-sm text-muted-foreground">No vendors match your search.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}