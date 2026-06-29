'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Boxes, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context.jsx';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@procurio.app');
  const [password, setPassword] = useState('procurio123');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success(`Welcome back, ${u.name.split(' ')[0]}`);
    } catch (err) { toast.error(err.message || 'Login failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen w-full bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />
      <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-fuchsia-500/10 blur-3xl" />

      <div className="relative min-h-screen grid place-items-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[420px]"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 grid place-items-center shadow-glow">
              <Boxes className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-base font-semibold tracking-tight">Procurio</div>
              <div className="text-[11px] text-muted-foreground">Enterprise procurement intelligence</div>
            </div>
          </div>

          <Card className="glass-card p-6 border-border/60">
            <h1 className="text-xl font-semibold tracking-tight">Sign in to your workspace</h1>
            <p className="text-sm text-muted-foreground mt-1">Use your team credentials to continue.</p>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="l-email">Work email</Label>
                <Input id="l-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="l-pwd">Password</Label>
                  <button type="button" className="text-[11px] text-muted-foreground hover:text-foreground">Forgot?</button>
                </div>
                <Input id="l-pwd" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-10 gap-1.5">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Sign in <ArrowRight className="h-4 w-4" /></>}
              </Button>
            </form>

            <div className="mt-5 flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 p-3 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 mt-0.5 text-emerald-500 shrink-0" />
              <div>
                Demo credentials are pre-filled: <span className="font-mono text-foreground">admin@procurio.app</span> /{' '}
                <span className="font-mono text-foreground">procurio123</span>
              </div>
            </div>
          </Card>

          <p className="text-center text-[11px] text-muted-foreground mt-6">
            © {new Date().getFullYear()} Procurio · Enterprise procurement intelligence
          </p>
        </motion.div>
      </div>
    </div>
  );
}
