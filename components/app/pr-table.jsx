'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { PR_STATUS, PRIORITY, fmtCurrency, fmtDate, initials } from '@/lib/procurement-utils';
import { ArrowUpRight } from 'lucide-react';

export function PrTable({ items, loading, onOpen }) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead className="pl-6 text-[11px] uppercase tracking-wider">Request</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wider">Requester</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wider">Department</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wider">Priority</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wider">Needed by</TableHead>
              <TableHead className="text-right text-[11px] uppercase tracking-wider pr-6">Estimated</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={`s${i}`} className="border-border/60">
                <TableCell className="pl-6"><Skeleton className="h-4 w-44" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-14 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                <TableCell></TableCell>
              </TableRow>
            ))}
            {!loading && items.map((pr) => {
              const meta = PR_STATUS[pr.status];
              const prio = PRIORITY[pr.priority] || PRIORITY.normal;
              return (
                <TableRow key={pr._id} className="border-border/60 hover:bg-accent/30 cursor-pointer" onClick={() => onOpen(pr)}>
                  <TableCell className="pl-6">
                    <div className="text-[10px] font-mono text-muted-foreground">{pr.number}</div>
                    <div className="text-sm font-medium truncate max-w-[280px]">{pr.title}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[9px] bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20">
                          {initials(pr.requesterName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{pr.requesterName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{pr.department}</TableCell>
                  <TableCell><Badge variant="outline" className={cn('h-5 text-[10px] capitalize border-0', prio.cls)}>{prio.label}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className={cn('h-5 text-[10px]', meta.cls)}>{meta.label}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{fmtDate(pr.neededBy)}</TableCell>
                  <TableCell className="text-right font-medium pr-6">{fmtCurrency(pr.estimatedTotal)}</TableCell>
                  <TableCell><ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" /></TableCell>
                </TableRow>
              );
            })}
            {!loading && items.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center py-12 text-sm text-muted-foreground">No requests match your filters.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
