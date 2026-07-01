'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

function initials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

export function VendorRanking({ data = [], loading = false }) {
  return (
    <Card className="border-border/60 h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Top vendors by performance</CardTitle>
        <p className="text-xs text-muted-foreground">Ranked by scorecard.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <Skeleton className="h-8 flex-1" />
          </div>
        ))}
        {!loading && data.length === 0 && (
          <p className="text-xs text-muted-foreground py-6 text-center">No vendors yet</p>
        )}
        {!loading && data.map((v, i) => (
          <motion.div
            key={v._id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-center gap-3 group"
          >
            <Avatar className="h-9 w-9">
              <AvatarFallback className="text-[10px] bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 text-foreground">
                {initials(v.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium truncate">{v.name}</div>
                <div className="text-xs text-muted-foreground">{v.score ?? '—'}</div>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Progress value={v.score || 0} className="h-1.5 flex-1" />
                <Badge variant="outline" className="h-5 text-[10px] border-border/70 text-muted-foreground">
                  {v.category}
                </Badge>
              </div>
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}