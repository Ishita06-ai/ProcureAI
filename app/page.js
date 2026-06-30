'use client';

import { useState } from 'react';
import { AppSidebar, MobileSidebar } from '@/components/app/sidebar';
import { Topbar } from '@/components/app/topbar';
import { CommandPalette } from '@/components/app/command-palette';
import { DashboardPage } from '@/components/app/dashboard-page';
import { VendorsPage } from '@/components/app/vendors-page';
import { ProcurementPage } from '@/components/app/procurement-page';
import { InventoryPage } from '@/components/app/inventory-page';
import { AiAssistantPage } from '@/components/app/ai-assistant-page';
import { AnalyticsPage } from '@/components/app/analytics-page';
import { NotificationsPage } from '@/components/app/notifications-page';
import { SettingsPage } from '@/components/app/settings-page';
import { PlaceholderPage } from '@/components/app/placeholder-page';
import { LoginPage } from '@/components/app/login-page';
import { useAuth } from '@/lib/auth-context.jsx';
import { LifeBuoy } from 'lucide-react';

const META = {
  dashboard:    { title: 'Dashboard',     subtitle: 'Overview · Live procurement & inventory intelligence' },
  vendors:      { title: 'Vendors',       subtitle: 'Supplier network and scorecards' },
  inventory:    { title: 'Inventory',     subtitle: 'Multi-warehouse stock & valuation' },
  procurement:  { title: 'Procurement',   subtitle: 'PRs, POs and goods received' },
  analytics:    { title: 'Analytics',     subtitle: 'Spend, savings and supplier KPIs' },
  ai:           { title: 'AI Assistant',  subtitle: 'Grounded on your live data' },
  notifications:{ title: 'Notifications', subtitle: 'Updates across your workspace' },
  settings:     { title: 'Settings',      subtitle: 'Workspace, integrations and team' },
  support:      { title: 'Support',       subtitle: 'Documentation and help center' },
};

function Shell() {
  const [active, setActive] = useState('ai');
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const meta = META[active] ?? META.dashboard;

  const renderPage = () => {
    switch (active) {
      case 'dashboard':  return <DashboardPage />;
      case 'vendors':    return <VendorsPage />;
      case 'procurement':return <ProcurementPage />;
      case 'inventory':  return <InventoryPage />;
      case 'ai':         return <AiAssistantPage />;
      case 'analytics':  return <AnalyticsPage />;
      case 'notifications': return <NotificationsPage onNavigate={setActive} />;
      case 'settings':   return <SettingsPage />;
      case 'support':    return <PlaceholderPage icon={LifeBuoy} title="Support center" description="Search the knowledge base or talk to a human within minutes." action="Contact support" />;
      default:           return <DashboardPage />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <AppSidebar active={active} onNavigate={setActive} collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <MobileSidebar open={mobileNavOpen} onOpenChange={setMobileNavOpen} active={active} onNavigate={setActive} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar onOpenPalette={() => setPaletteOpen(true)} onOpenMobileNav={() => setMobileNavOpen(true)} title={meta.title} subtitle={meta.subtitle} onNavigate={setActive} />
        <main className="flex-1 min-w-0">{renderPage()}</main>
      </div>
      <CommandPalette open={paletteOpen} setOpen={setPaletteOpen} onNavigate={setActive} />
    </div>
  );
}

function App() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-background grid place-items-center">
        <div className="h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }
  if (!user) return <LoginPage />;
  return <Shell />;
}

export default App;