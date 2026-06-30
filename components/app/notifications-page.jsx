'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell, CheckCheck, FileText, Package, ShoppingCart, AlertTriangle, Sparkles, Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';

const KIND_ICON = {
  pr: FileText, po: ShoppingCart, grn: Package, stock: AlertTriangle, ai: Sparkles, system: Info,
};

const SEVERITY_STYLES = {
  info: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
  success: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  error: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
};

function timeAgo(date) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function NotificationsPage({ onNavigate }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    (async () => {
      try {
        const res = await api.listNotifications({ unread: filter === 'unread' ? 'true' : undefined, limit: 50 });
        if (!cancel) setItems(res.data || []);
      } catch (e) {
        if (!cancel) toast.error(e.message);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [filter, refresh]);

  const markRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setItems((prev) => prev.map((n) => (n._id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    } catch (e) { toast.error(e.message); }
  };

  const markAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      toast.success('All notifications marked as read');
      setRefresh((x) => x + 1);
    } catch (e) { toast.error(e.message); }
  };

  const unreadCount = items.filter((n) => !n.readAt).length;

  return (
    <div className="px-4 lg:px-8 py-6 lg:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Notifications</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Updates on requests, orders, stock and AI insights across your workspace.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="h-9">
              <TabsTrigger value="all" className="h-7 text-xs">All</TabsTrigger>
              <TabsTrigger value="unread" className="h-7 text-xs">
                Unread{unreadCount > 0 && <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">{unreadCount}</Badge>}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={markAllRead}>
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </Button>
        </div>
      </div>

      <Card className="border-border/60">
        <CardContent className="p-0 divide-y divide-border/60">
          {loading && Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-4">
              <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}

          {!loading && items.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium">You're all caught up</p>
              <p className="text-xs text-muted-foreground">No {filter === 'unread' ? 'unread ' : ''}notifications right now.</p>
            </div>
          )}

          {!loading && items.map((n) => {
            const Icon = KIND_ICON[n.kind] || Info;
            const isUnread = !n.readAt;
            return (
              <div
                key={n._id}
                className={cn(
                  'flex items-start gap-3 p-4 transition-colors cursor-pointer hover:bg-accent/40',
                  isUnread && 'bg-accent/20'
                )}
                onClick={() => { if (isUnread) markRead(n._id); if (n.link && onNavigate) onNavigate(n.link); }}
              >
                <div className={cn('h-9 w-9 rounded-lg grid place-items-center border shrink-0', SEVERITY_STYLES[n.severity] || SEVERITY_STYLES.info)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn('text-sm truncate', isUnread ? 'font-semibold' : 'font-medium text-foreground/90')}>{n.title}</p>
                    {isUnread && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                  </div>
                  {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                  <p className="text-[11px] text-muted-foreground/70 mt-1">{timeAgo(n.createdAt)}</p>
                </div>
                {isUnread && (
                  <Button
                    variant="ghost" size="sm" className="h-7 text-xs shrink-0"
                    onClick={(e) => { e.stopPropagation(); markRead(n._id); }}
                  >
                    Mark read
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}