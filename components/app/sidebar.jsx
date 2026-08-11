'use client';

import {
  LayoutDashboard, Users, Package, BarChart3, Sparkles, ShoppingCart,
  Settings, LifeBuoy, Hexagon, ChevronsLeft, Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

export const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'vendors', label: 'Vendors', icon: Users, badge: '8' },
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

function NavBadge({ children }) {
  return (
    <span className="bg-muted/80 text-muted-foreground text-[10px] font-medium px-2 py-0.5 rounded">
      {children}
    </span>
  );
}

export function AppSidebar({ active, onNavigate, collapsed, onToggle }) {
  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col shrink-0 h-screen sticky top-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-300',
        collapsed ? 'w-[76px]' : 'w-[240px]'
      )}
    >
      {/* Brand */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-sidebar-border">
        <div className="relative w-8 h-8 rounded-md border border-sidebar-border bg-card grid place-items-center">
          <Hexagon className="h-4 w-4 text-primary" fill="currentColor" />
          <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-sidebar" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="font-heading text-base font-bold leading-tight tracking-tight">Procurio</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5 truncate">Enterprise · Acme Corp</div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-7 w-7 text-muted-foreground hover:text-foreground', collapsed && 'mx-auto')}
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronsLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
        </Button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {!collapsed && (
          <p className="px-3 mb-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/80">Workspace</p>
        )}
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.key;
            return (
              <li key={item.key}>
                <button
                  onClick={() => onNavigate(item.key)}
                  className={cn(
                    'group w-full flex items-center justify-between gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-150',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-muted-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/70'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-primary')} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </span>
                  {!collapsed && item.badge && <NavBadge>{item.badge}</NavBadge>}
                  {!collapsed && item.soon && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">New</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {!collapsed && (
          <p className="px-3 mt-6 mb-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/80">Account</p>
        )}
        <ul className="space-y-0.5">
          {FOOTER_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.key;
            return (
              <li key={item.key}>
                <button
                  onClick={() => onNavigate(item.key)}
                  className={cn(
                    'group w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-150',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-muted-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/70'
                  )}
                >
                  <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-primary')} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
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
          <div className="relative w-8 h-8 rounded-md border border-sidebar-border bg-card grid place-items-center">
            <Hexagon className="h-4 w-4 text-primary" fill="currentColor" />
            <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-sidebar" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-heading text-base font-bold leading-tight tracking-tight">Procurio</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">Enterprise · Acme Corp</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <p className="px-3 mb-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/80">Workspace</p>
          <ul className="space-y-0.5">
            {NAV.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.key;
              return (
                <li key={item.key}>
                  <button
                    onClick={() => go(item.key)}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 rounded-md px-3 py-2.5 text-sm transition-colors',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-muted-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/70'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-primary')} />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.badge && <NavBadge>{item.badge}</NavBadge>}
                    {item.soon && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">New</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          <p className="px-3 mt-6 mb-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/80">Account</p>
          <ul className="space-y-0.5">
            {FOOTER_NAV.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.key;
              return (
                <li key={item.key}>
                  <button
                    onClick={() => go(item.key)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-muted-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/70'
                    )}
                  >
                    <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-primary')} />
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
