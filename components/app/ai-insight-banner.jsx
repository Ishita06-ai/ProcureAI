'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AiInsightBanner({ onNavigate }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <AnimatePresence>
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
        className="relative flex flex-col items-start justify-between gap-6 overflow-hidden rounded-lg border border-border/70 border-l-4 border-l-primary bg-card p-6 md:flex-row md:items-center"
      >
        <div className="relative flex items-start gap-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-border/80 bg-muted/60 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Daily Insight Brief
            </p>
            <h3 className="font-heading text-base font-semibold text-foreground lg:text-lg">
              3 procurement actions ready for review.
            </h3>
            <p className="mt-1 max-w-2xl text-[13px] text-muted-foreground">
              Consolidate logistics vendors, review upcoming renewals, and check inventory reorder points.
            </p>
          </div>
        </div>
        <div className="relative flex w-full shrink-0 items-center gap-3 md:w-auto">
          <Button variant="outline" size="sm" className="h-9 w-full rounded-md border-border/80 md:w-auto" onClick={() => setDismissed(true)}>
            Dismiss
          </Button>
          <Button size="sm" className="h-9 w-full gap-2 rounded-md bg-foreground text-background hover:bg-foreground/90 md:w-auto" onClick={() => onNavigate?.('ai')}>
            Review actions <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </motion.section>
    </AnimatePresence>
  );
}
