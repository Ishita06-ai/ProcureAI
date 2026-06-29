'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { VENDORS } from '@/lib/mock-data';
import { motion } from 'framer-motion';

function initials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export function VendorRanking() {
  const top = [...VENDORS].sort((a, b) => b.score - a.score).slice(0, 6);
  return (
    <Card className="border-border/60 h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Top vendors by performance</CardTitle>
        <p className="text-xs text-muted-foreground">Scorecard blends quality, OTIF, price variance and risk.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {top.map((v, i) => (
          <motion.div
            key={v.id}
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
                <div className="text-xs text-muted-foreground">{v.score}</div>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Progress value={v.score} className="h-1.5 flex-1" />
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
