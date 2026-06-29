'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, ArrowUpRight } from 'lucide-react';
import { PURCHASE_ORDERS } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

const statusStyles = {
  Approved: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  Pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  'In Transit': 'bg-sky-500/10 text-sky-500 border-sky-500/20',
  Delivered: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
};

export function PoTable() {
  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-semibold">Recent purchase orders</CardTitle>
          <p className="text-xs text-muted-foreground">Latest activity across your procurement pipeline.</p>
        </div>
        <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
          View all <ArrowUpRight className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead className="pl-6 text-[11px] uppercase tracking-wider">PO</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wider">Vendor</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wider">Owner</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wider">ETA</TableHead>
              <TableHead className="text-right text-[11px] uppercase tracking-wider pr-6">Amount</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {PURCHASE_ORDERS.map((po) => (
              <TableRow key={po.id} className="border-border/60 hover:bg-accent/40">
                <TableCell className="pl-6 font-medium">{po.id}</TableCell>
                <TableCell className="text-sm">{po.vendor}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{po.owner}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn('h-5 text-[10px] font-medium', statusStyles[po.status])}>
                    {po.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{po.eta}</TableCell>
                <TableCell className="text-right pr-6 font-medium">
                  ${po.amount.toLocaleString()}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
