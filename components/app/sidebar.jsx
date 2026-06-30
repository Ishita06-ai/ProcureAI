'use client';

import { motion } from 'framer-motion';
import {
  LayoutDashboard, Users, Package, BarChart3, Sparkles, ShoppingCart,
  Settings, LifeBuoy, Boxes, ChevronsLeft, Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

export const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'vendors', label: 'Vendors', icon: Users, badge: '128' },
  { key: 'inventory', label: 'Inventory', icon: Package },
  { key: 'procurement', label: 'Procurement', icon: ShoppingCart, badge: '42' },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'ai', label: 'AI Assistant', icon: Sparkles, soon: true },
];

export const FOOTER_NAV = [
  { key: 'settings', label: 'Settings', icon: Settings },
  { key: 'support', label: 'Support', icon: LifeBuoy },
];

export function AppSidebar({ active, onNavigate, collapsed, onToggle }) {
  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col shrink-0 h-screen sticky top-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-300',
        collapsed ? 'w-[76px]' : 'w-[260px]'
      )}
    >
      {/* Brand */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-sidebar-border">
        <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 grid place-items-center shadow-glow">
          <Boxes className="h-5 w-5 text-white" />
          <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-sidebar" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold tracking-tight">Procurio</div>
            <div className="text-[11px] text-muted-foreground">Enterprise · Acme Corp</div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-7 w-7', collapsed && 'mx-auto')}
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronsLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
        </Button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {!collapsed && (
          <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">Workspace</div>
        )}
        <ul className="space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.key;
            return (
              <li key={item.key}>
                <button
                  onClick={() => onNavigate(item.key)}
                  className={cn(
                    'group relative w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {isActive && (
                    <motion.span
                      layoutId="sidebar-active"
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r bg-primary"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className={cn('h-4.5 w-4.5 shrink-0', isActive && 'text-primary')} />
                  {!collapsed && <span className="flex-1 text-left truncate">{item.label}</span>}
                  {!collapsed && item.badge && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-muted text-muted-foreground">
                      {item.badge}
                    </Badge>
                  )}
                  {!collapsed && item.soon && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/20">New</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {!collapsed && (
          <div className="px-2 mt-6 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">Account</div>
        )}
        <ul className="space-y-1">
          {FOOTER_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.key;
            return (
              <li key={item.key}>
                <button
                  onClick={() => onNavigate(item.key)}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60'
                  )}
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Upgrade card */}
      {!collapsed && (
        <div className="p-3">
          <div className="relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-transparent p-4">
            <div className="absolute -top-10 -right-10 h-24 w-24 rounded-full bg-fuchsia-500/20 blur-2xl" />
            <div className="flex items-center gap-2 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-foreground">Procurio AI</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Unlock contract intelligence, savings discovery and risk forecasting.
            </p>
            <Button size="sm" className="mt-3 w-full h-8 bg-foreground text-background hover:bg-foreground/90">
              Upgrade plan
            </Button>
          </div>
        </div>
      )}
    </aside>
  );
}

// Mobile nav drawer — shown via a hamburger trigger in the Topbar on screens
// below `lg`, where the fixed sidebar is hidden. Reuses the same NAV/FOOTER_NAV
// so the two stay in sync automatically.
export function MobileSidebar({ open, onOpenChange, active, onNavigate }) {
  const go = (key) => { onNavigate(key); onOpenChange(false); };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px] p-0 flex flex-col bg-sidebar text-sidebar-foreground border-sidebar-border">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <div className="h-16 flex items-center gap-3 px-5 border-b border-sidebar-border">
          <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 grid place-items-center shadow-glow">
            <Boxes className="h-5 w-5 text-white" />
            <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-sidebar" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold tracking-tight">Procurio</div>
            <div className="text-[11px] text-muted-foreground">Enterprise · Acme Corp</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">Workspace</div>
          <ul className="space-y-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.key;
              return (
                <li key={item.key}>
                  <button
                    onClick={() => go(item.key)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className={cn('h-4.5 w-4.5 shrink-0', isActive && 'text-primary')} />
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-muted text-muted-foreground">
                        {item.badge}
                      </Badge>
                    )}
                    {item.soon && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/20">New</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="px-2 mt-6 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">Account</div>
          <ul className="space-y-1">
            {FOOTER_NAV.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.key;
              return (
                <li key={item.key}>
                  <button
                    onClick={() => go(item.key)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60'
                    )}
                  >
                    <Icon className="h-4.5 w-4.5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}