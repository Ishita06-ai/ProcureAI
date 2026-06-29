'use client';

import { useEffect } from 'react';
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard, Users, Package, BarChart3, Sparkles,
  ShoppingCart, Settings, Plus, FileText, Search,
} from 'lucide-react';

export function CommandPalette({ open, setOpen, onNavigate }) {
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!open);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  const go = (key) => { onNavigate(key); setOpen(false); };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => go('dashboard')}><LayoutDashboard className="mr-2 h-4 w-4" />Dashboard</CommandItem>
          <CommandItem onSelect={() => go('vendors')}><Users className="mr-2 h-4 w-4" />Vendors</CommandItem>
          <CommandItem onSelect={() => go('inventory')}><Package className="mr-2 h-4 w-4" />Inventory</CommandItem>
          <CommandItem onSelect={() => go('procurement')}><ShoppingCart className="mr-2 h-4 w-4" />Procurement</CommandItem>
          <CommandItem onSelect={() => go('analytics')}><BarChart3 className="mr-2 h-4 w-4" />Analytics</CommandItem>
          <CommandItem onSelect={() => go('ai')}><Sparkles className="mr-2 h-4 w-4" />AI Assistant</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem><Plus className="mr-2 h-4 w-4" />Create new purchase order</CommandItem>
          <CommandItem><FileText className="mr-2 h-4 w-4" />Draft RFQ from template</CommandItem>
          <CommandItem><Search className="mr-2 h-4 w-4" />Find vendor by name…</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Settings">
          <CommandItem onSelect={() => go('settings')}><Settings className="mr-2 h-4 w-4" />Workspace settings</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
