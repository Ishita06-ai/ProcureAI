'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PlaceholderPage({ icon: Icon = Sparkles, title, description, action = 'Open in beta' }) {
  return (
    <div className="px-4 lg:px-8 py-12 lg:py-20">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl mx-auto text-center relative"
      >
        <div className="absolute inset-0 -z-10 bg-grid opacity-30 mask-image-radial" />
        <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 grid place-items-center shadow-glow">
          <Icon className="h-7 w-7 text-white" />
        </div>
        <h2 className="mt-6 text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button size="sm" className="h-9">{action}</Button>
          <Button size="sm" variant="outline" className="h-9">Learn more</Button>
        </div>
      </motion.div>
    </div>
  );
}
