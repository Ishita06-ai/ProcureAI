'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserPlus, MoreHorizontal, ShieldCheck, ScrollText } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context.jsx';
import { toast } from 'sonner';

const ROLE_STYLES = {
  admin: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  manager: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
  buyer: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  viewer: 'bg-muted text-muted-foreground border-border',
};
const initials = (n = '') => n.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

function InviteDialog({ onInvited }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'buyer' });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!form.name || !form.email) return toast.error('Name and email are required');
    setBusy(true);
    try {
      const res = await api.inviteTeamMember(form);
      toast.success(`Invited ${form.email} — temp password: ${res.data.tempPassword}`);
      setForm({ name: '', email: '', role: 'buyer' });
      setOpen(false);
      onInvited();
    } catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-9 gap-1.5"><UserPlus className="h-3.5 w-3.5" /> Invite member</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Invite a team member</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="inv-name">Name</Label>
            <Input id="inv-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Doe" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-email">Email</Label>
            <Input id="inv-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@company.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(role) => setForm({ ...form, role })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="buyer">Buyer</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? 'Inviting…' : 'Send invite'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TeamTab() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    (async () => {
      try {
        const res = await api.listTeam();
        if (!cancel) setMembers(res.data || []);
      } catch (e) { if (!cancel) toast.error(e.message); }
      finally { if (!cancel) setLoading(false); }
    })();
    return () => { cancel = true; };
  }, [refresh]);

  const changeRole = async (id, role) => {
    try {
      await api.updateMemberRole(id, role);
      toast.success('Role updated');
      setRefresh((x) => x + 1);
    } catch (e) { toast.error(e.message); }
  };
  const changeStatus = async (id, status) => {
    try {
      await api.updateMemberStatus(id, status);
      toast.success(`Member ${status}`);
      setRefresh((x) => x + 1);
    } catch (e) { toast.error(e.message); }
  };
  const remove = async (id, name) => {
    if (!confirm(`Remove ${name} from the workspace?`)) return;
    try {
      await api.removeTeamMember(id);
      toast.success('Member removed');
      setRefresh((x) => x + 1);
    } catch (e) { toast.error(e.message); }
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-semibold">Team members</CardTitle>
          <p className="text-xs text-muted-foreground">Manage who has access and their permission level.</p>
        </div>
        {isAdmin && <InviteDialog onInvited={() => setRefresh((x) => x + 1)} />}
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead className="pl-6 text-[11px] uppercase tracking-wider">Member</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wider">Role</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wider">Status</TableHead>
              <TableHead className="w-10 pr-6"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i} className="border-border/60">
                <TableCell className="pl-6"><div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-3 w-32" /></div></TableCell>
                <TableCell><Skeleton className="h-4 w-16 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-14 rounded-full" /></TableCell>
                <TableCell className="pr-6"></TableCell>
              </TableRow>
            ))}
            {!loading && members.map((m) => (
              <TableRow key={m._id} className="border-border/60 hover:bg-accent/40">
                <TableCell className="pl-6">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8"><AvatarFallback>{initials(m.name)}</AvatarFallback></Avatar>
                    <div>
                      <div className="text-sm font-medium">{m.name}</div>
                      <div className="text-xs text-muted-foreground">{m.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={ROLE_STYLES[m.role] || ROLE_STYLES.viewer}>{m.role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={m.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : m.status === 'invited' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-muted text-muted-foreground'}>
                    {m.status}
                  </Badge>
                </TableCell>
                <TableCell className="pr-6">
                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {['admin', 'manager', 'buyer', 'viewer'].filter((r) => r !== m.role).map((r) => (
                          <DropdownMenuItem key={r} onClick={() => changeRole(m._id, r)}>Make {r}</DropdownMenuItem>
                        ))}
                        <DropdownMenuItem onClick={() => changeStatus(m._id, m.status === 'disabled' ? 'active' : 'disabled')}>
                          {m.status === 'disabled' ? 'Re-enable' : 'Disable'}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => remove(m._id, m.name)}>Remove</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function AuditTab() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await api.auditLog({ limit: 100 });
        if (!cancel) setLogs(res.data || []);
      } catch (e) { if (!cancel) toast.error(e.message); }
      finally { if (!cancel) setLoading(false); }
    })();
    return () => { cancel = true; };
  }, []);

  if (!['admin', 'manager'].includes(user?.role)) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          You need manager or admin access to view the audit log.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2"><ScrollText className="h-4 w-4" /> Audit log</CardTitle>
        <p className="text-xs text-muted-foreground">Recent administrative and security-relevant actions.</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        {!loading && logs.length === 0 && <p className="text-xs text-muted-foreground py-6 text-center">No audit entries yet.</p>}
        {!loading && logs.map((l) => (
          <div key={l._id} className="flex items-center justify-between gap-3 text-xs py-2 border-b border-border/40 last:border-0">
            <span className="font-mono text-foreground/90">{l.action}</span>
            <span className="text-muted-foreground">{l.resource}{l.resourceId ? ` · ${l.resourceId}` : ''}</span>
            <span className="text-muted-foreground/70 shrink-0">{new Date(l.at).toLocaleString()}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function WorkspaceTab() {
  const { user } = useAuth();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="border-border/60">
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Workspace</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5"><Label>Workspace name</Label><Input defaultValue="Acme Corp" /></div>
          <div className="space-y-1.5"><Label>Default currency</Label><Input defaultValue="USD" /></div>
          <Button size="sm" className="mt-1">Save changes</Button>
        </CardContent>
      </Card>
      <Card className="border-border/60">
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Your account</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12"><AvatarFallback>{initials(user?.name)}</AvatarFallback></Avatar>
            <div>
              <div className="text-sm font-medium">{user?.name || 'Signed-in user'}</div>
              <div className="text-xs text-muted-foreground">{user?.email}</div>
            </div>
          </div>
          <Badge variant="outline" className={ROLE_STYLES[user?.role] || ROLE_STYLES.viewer}>{user?.role || 'viewer'}</Badge>
        </CardContent>
      </Card>
    </div>
  );
}

export function SettingsPage() {
  return (
    <div className="px-4 lg:px-8 py-6 lg:py-8 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Workspace, integrations and team configuration.</p>
      </div>

      <Tabs defaultValue="team">
        <TabsList className="h-9">
          <TabsTrigger value="workspace" className="h-7 text-xs">Workspace</TabsTrigger>
          <TabsTrigger value="team" className="h-7 text-xs">Team</TabsTrigger>
          <TabsTrigger value="audit" className="h-7 text-xs">Audit log</TabsTrigger>
        </TabsList>
        <TabsContent value="workspace" className="mt-4"><WorkspaceTab /></TabsContent>
        <TabsContent value="team" className="mt-4"><TeamTab /></TabsContent>
        <TabsContent value="audit" className="mt-4"><AuditTab /></TabsContent>
      </Tabs>
    </div>
  );
}