'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Search, Bell, Sun, Moon, Plus, Command as CmdIcon, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context.jsx';

export function Topbar({ onOpenPalette, title, subtitle, onNavigate, onOpenMobileNav }) {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [unread, setUnread] = useState(0);
  const [recent, setRecent] = useState([]);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && theme === 'dark';

  useEffect(() => {
    if (!user) return;
    let cancel = false;
    const load = async () => {
      try {
        const [count, list] = await Promise.all([api.unreadCount(), api.listNotifications({ limit: 6 })]);
        if (!cancel) { setUnread(count.data.count); setRecent(list.data || []); }
      } catch { /* not signed in or not yet available */ }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => { cancel = true; clearInterval(interval); };
  }, [user]);

  return (
    <header className="sticky top-0 z-30 h-16 flex items-center gap-4 px-4 lg:px-8 border-b border-border/60 glass">
      <Button
        onClick={onOpenMobileNav}
        size="icon"
        variant="ghost"
        className="lg:hidden -ml-1"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

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

     <Button size="sm" className="hidden md:inline-flex h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => onNavigate?.('procurement')}>
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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" aria-label="Notifications" className="relative">
            <Bell className="h-4 w-4" />
            {unread > 0 && <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-background" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Notifications</span>
            {unread > 0 && <Badge variant="secondary" className="h-5 text-[10px]">{unread} new</Badge>}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {recent.length === 0 && (
            <div className="px-2 py-4 text-xs text-muted-foreground text-center">No notifications yet</div>
          )}
          {recent.map((n) => (
            <DropdownMenuItem key={n._id} className="flex flex-col items-start gap-0.5 whitespace-normal" onClick={() => onNavigate?.('notifications')}>
              <span className={cn('text-xs', !n.readAt && 'font-semibold')}>{n.title}</span>
              {n.body && <span className="text-[11px] text-muted-foreground line-clamp-1">{n.body}</span>}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="justify-center text-xs text-primary" onClick={() => onNavigate?.('notifications')}>
            View all notifications
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-full hover:bg-accent/60 p-0.5 pr-2.5 transition-colors" aria-label="User menu">
            <Avatar className="h-8 w-8">
              <AvatarImage src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&crop=faces" alt="Avatar" />
              <AvatarFallback>{(user?.name || 'U').slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="hidden md:block text-left">
              <div className="text-xs font-medium leading-tight">{user?.name || 'Guest'}</div>
              <div className="text-[10px] text-muted-foreground leading-tight">{user?.role || ''}</div>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>My account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onNavigate?.('settings')}>Profile</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onNavigate?.('settings')}>Billing</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onNavigate?.('settings')}>Team</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onClick={logout}>Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}