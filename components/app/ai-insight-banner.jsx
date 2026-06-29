'use client';

import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AiInsightBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-transparent p-5 lg:p-6"
    >
      <div className="absolute -top-16 -right-10 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-fuchsia-500/10 blur-3xl" />
      <div className="relative flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 grid place-items-center shadow-glow">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-primary/90 font-medium">Procurio AI · Daily brief</div>
            <h3 className="text-base lg:text-lg font-semibold mt-0.5">
              You can save <span className="text-gradient">$612K this quarter</span> — 3 actions ready.
            </h3>
          </div>
        </div>
        <p className="text-sm text-muted-foreground lg:max-w-xl">
          Consolidate 4 logistics vendors, renegotiate Solace Cloud renewal, and reroute Q3 raw materials via Lumen Industrial.
        </p>
        <div className="lg:ml-auto flex gap-2">
          <Button variant="outline" size="sm" className="h-9">Dismiss</Button>
          <Button size="sm" className="h-9 gap-1.5 bg-foreground text-background hover:bg-foreground/90">
            Review actions <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
