'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Search, Bell, Sun, Moon, Plus, Command as CmdIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export function Topbar({ onOpenPalette, title, subtitle }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && theme === 'dark';

  return (
    <header className="sticky top-0 z-30 h-16 flex items-center gap-4 px-4 lg:px-8 border-b border-border/60 glass">
      <div className="min-w-0 flex-1">
        <h1 className="text-sm font-medium truncate">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
      </div>

      {/* Search trigger */}
      <button
        onClick={onOpenPalette}
        className={cn(
          'group hidden md:flex items-center gap-2 h-9 w-[320px] rounded-lg border border-border/60 bg-muted/40 px-3 text-sm text-muted-foreground hover:bg-muted/70 transition-colors'
        )}
        aria-label="Open command palette"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search vendors, POs, insights…</span>
        <kbd className="hidden lg:inline-flex items-center gap-1 rounded border border-border/70 bg-background/60 px-1.5 py-0.5 text-[10px] font-medium">
          <CmdIcon className="h-3 w-3" />K
        </kbd>
      </button>

      <Button onClick={onOpenPalette} size="icon" variant="ghost" className="md:hidden" aria-label="Search">
        <Search className="h-4 w-4" />
      </Button>

      <Button size="sm" className="hidden md:inline-flex h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
        <Plus className="h-4 w-4" /> New PO
      </Button>

      <Button
        size="icon"
        variant="ghost"
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        aria-label="Toggle theme"
        className="relative"
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>

      <Button size="icon" variant="ghost" aria-label="Notifications" className="relative">
        <Bell className="h-4 w-4" />
        <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-background" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-full hover:bg-accent/60 p-0.5 pr-2.5 transition-colors" aria-label="User menu">
            <Avatar className="h-8 w-8">
              <AvatarImage src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&crop=faces" alt="Avatar" />
              <AvatarFallback>MC</AvatarFallback>
            </Avatar>
            <div className="hidden md:block text-left">
              <div className="text-xs font-medium leading-tight">Maya Chen</div>
              <div className="text-[10px] text-muted-foreground leading-tight">Head of Procurement</div>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>My account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Profile</DropdownMenuItem>
          <DropdownMenuItem>Billing</DropdownMenuItem>
          <DropdownMenuItem>Team</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive">Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
