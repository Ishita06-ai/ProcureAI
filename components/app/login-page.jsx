'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Boxes, Loader2, ArrowRight, ShieldCheck, ShoppingCart, ClipboardCheck, Banknote, Briefcase, Mail, Lock, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context.jsx';
import { LOGIN, REGISTER } from '@/lib/constants/testIds/auth.js';

export function LoginPage() {
  const { login, register, demoLogin } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'

  // Sign-in state — starts empty. Pre-filling a real account (admin@procurio.app /
  // procurio123 in earlier versions) published working credentials on the login
  // page to anyone who visited the deployed site. Users must type their own.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Registration state
  const [name, setName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');

  const [loading, setLoading] = useState(false);

  // One demo button at a time; null when idle. Role while pending.
  const [demoLoading, setDemoLoading] = useState(null);

  const onDemo = async (role) => {
    setDemoLoading(role);
    try {
      const u = await demoLogin(role);
      toast.success(`Demo mode — signed in as ${u.name}`);
    } catch (err) { toast.error(err.message || 'Demo login failed'); }
    finally { setDemoLoading(null); }
  };

  const onLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success(`Welcome back, ${u.name.split(' ')[0]}`);
    } catch (err) { toast.error(err.message || 'Login failed'); }
    finally { setLoading(false); }
  };

  const onRegister = async (e) => {
    e.preventDefault();
    if (regPassword.length < 8) return toast.error('Password must be at least 8 characters');
    if (regPassword !== regConfirm) return toast.error('Passwords do not match');
    setLoading(true);
    try {
      const u = await register({ name, email: regEmail, password: regPassword });
      toast.success(`Account created — welcome, ${u.name.split(' ')[0]}`);
    } catch (err) { toast.error(err.message || 'Registration failed'); }
    finally { setLoading(false); }
  };

  const switchTo = (next) => { setMode(next); setLoading(false); };

  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen w-full bg-background relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 bg-grid opacity-30 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />
      <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-fuchsia-500/10 blur-3xl" />

      {/* Top nav — decorative only; no existing nav functionality to preserve */}
      <header className="relative z-10 border-b border-border/60 bg-background/70 backdrop-blur-md sticky top-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 grid place-items-center shadow-glow">
              <Boxes className="h-4 w-4 text-white" />
            </div>
            <span className="font-heading text-base font-bold tracking-tight text-primary">Procurio</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline">Support</a>
            <Button variant="outline" type="button" className="h-9 px-4">Request Demo</Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-10 sm:py-14">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-4xl grid md:grid-cols-2 gap-6 items-stretch"
        >
          {/* Login / register card */}
          <Card className="glass-card p-6 sm:p-8 border-border/60 relative overflow-hidden flex flex-col">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-primary to-[hsl(var(--chart-2))] opacity-70" />

            {mode === 'login' ? (
              <>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Sign in</h1>
                <p className="text-sm text-muted-foreground mt-1.5">Enterprise procurement intelligence</p>

                <form onSubmit={onLogin} className="mt-6 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="l-email" className="text-[11px] font-mono uppercase tracking-wider text-foreground/80">Work email</Label>
                    <div className="relative">
                      <Mail className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <Input id="l-email" type="email" autoComplete="email" placeholder="name@company.com" data-testid={LOGIN.emailInput} value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-9 h-11" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="l-pwd" className="text-[11px] font-mono uppercase tracking-wider text-foreground/80">Password</Label>
                      <button type="button" data-testid={LOGIN.forgotPasswordLink} className="text-[11px] text-primary hover:underline">Forgot password?</button>
                    </div>
                    <div className="relative">
                      <Lock className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <Input id="l-pwd" type="password" autoComplete="current-password" placeholder="••••••••" data-testid={LOGIN.passwordInput} value={password} onChange={(e) => setPassword(e.target.value)} required className="pl-9 h-11" />
                    </div>
                  </div>
                  <Button type="submit" disabled={loading} data-testid={LOGIN.submitButton} className="w-full h-11 gap-1.5 mt-1">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Sign in <ArrowRight className="h-4 w-4" /></>}
                  </Button>
                </form>
              </>
            ) : (
              <>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Create your account</h1>
                <p className="text-sm text-muted-foreground mt-1.5">Set up your workspace in under a minute.</p>

                <form onSubmit={onRegister} className="mt-6 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="r-name" className="text-[11px] font-mono uppercase tracking-wider text-foreground/80">Full name</Label>
                    <Input id="r-name" autoComplete="name" data-testid={REGISTER.nameInput} value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={80} required className="h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="r-email" className="text-[11px] font-mono uppercase tracking-wider text-foreground/80">Work email</Label>
                    <div className="relative">
                      <Mail className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <Input id="r-email" type="email" autoComplete="email" data-testid={REGISTER.emailInput} value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required className="pl-9 h-11" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="r-pwd" className="text-[11px] font-mono uppercase tracking-wider text-foreground/80">Password</Label>
                    <div className="relative">
                      <Lock className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <Input id="r-pwd" type="password" autoComplete="new-password" data-testid={REGISTER.passwordInput} value={regPassword} onChange={(e) => setRegPassword(e.target.value)} minLength={8} maxLength={120} required className="pl-9 h-11" />
                    </div>
                    <p className="text-[11px] text-muted-foreground">At least 8 characters.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="r-pwd2" className="text-[11px] font-mono uppercase tracking-wider text-foreground/80">Confirm password</Label>
                    <div className="relative">
                      <Lock className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <Input id="r-pwd2" type="password" autoComplete="new-password" data-testid={REGISTER.passwordConfirmInput} value={regConfirm} onChange={(e) => setRegConfirm(e.target.value)} required className="pl-9 h-11" />
                    </div>
                  </div>
                  <Button type="submit" disabled={loading} data-testid={REGISTER.submitButton} className="w-full h-11 gap-1.5 mt-1">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create account <ArrowRight className="h-4 w-4" /></>}
                  </Button>
                </form>
              </>
            )}

            <div className="mt-6 pt-5 border-t border-border/60 text-center text-sm text-muted-foreground">
              {mode === 'login' ? (
                <>
                  Don&apos;t have an account?{' '}
                  <button type="button" data-testid={LOGIN.registerLink} onClick={() => switchTo('register')} className="font-medium text-primary hover:underline">
                    Request access
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button type="button" data-testid={REGISTER.loginLink} onClick={() => switchTo('login')} className="font-medium text-primary hover:underline">
                    Sign in
                  </button>
                </>
              )}
            </div>
          </Card>

          {/* Demo Environments card — same demoLogin handlers/testids, restyled as role cards */}
          <Card className="glass-card p-6 border-border/60 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="h-4 w-4 text-[hsl(var(--chart-2))]" />
              <h2 className="text-lg font-semibold tracking-tight">Demo Environments</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Explore the platform instantly with sample data — no signup or credentials needed.
            </p>

            <div className="space-y-2.5">
              <button type="button" disabled={demoLoading !== null} onClick={() => onDemo('admin')} data-testid={LOGIN.demoAdminButton} className="w-full flex items-center justify-between p-3.5 rounded-lg bg-background/60 hover:bg-accent border border-border/60 hover:border-border transition-all group text-left disabled:opacity-60 disabled:cursor-not-allowed">
                <div className="flex items-center gap-3.5">
                  <div className="h-9 w-9 rounded-full bg-violet-500/20 grid place-items-center text-violet-400 shrink-0">
                    {demoLoading === 'admin' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">System Admin</div>
                    <div className="text-xs text-muted-foreground">Full platform access &amp; configuration</div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </button>

              <button type="button" disabled={demoLoading !== null} onClick={() => onDemo('buyer')} data-testid={LOGIN.demoBuyerButton} className="w-full flex items-center justify-between p-3.5 rounded-lg bg-background/60 hover:bg-accent border border-border/60 hover:border-border transition-all group text-left disabled:opacity-60 disabled:cursor-not-allowed">
                <div className="flex items-center gap-3.5">
                  <div className="h-9 w-9 rounded-full bg-[hsl(var(--chart-2))]/20 grid place-items-center text-[hsl(var(--chart-2))] shrink-0">
                    {demoLoading === 'buyer' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">Chief Buyer</div>
                    <div className="text-xs text-muted-foreground">Procurement workflows &amp; vendor management</div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </button>

              <button type="button" disabled={demoLoading !== null} onClick={() => onDemo('manager')} data-testid={LOGIN.demoManagerButton} className="w-full flex items-center justify-between p-3.5 rounded-lg bg-background/60 hover:bg-accent border border-border/60 hover:border-border transition-all group text-left disabled:opacity-60 disabled:cursor-not-allowed">
                <div className="flex items-center gap-3.5">
                  <div className="h-9 w-9 rounded-full bg-blue-500/20 grid place-items-center text-blue-400 shrink-0">
                    {demoLoading === 'manager' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">Procurement Manager</div>
                    <div className="text-xs text-muted-foreground">Approvals &amp; workflow oversight</div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </button>

              <button type="button" disabled={demoLoading !== null} onClick={() => onDemo('finance')} data-testid={LOGIN.demoFinanceButton} className="w-full flex items-center justify-between p-3.5 rounded-lg bg-background/60 hover:bg-accent border border-border/60 hover:border-border transition-all group text-left disabled:opacity-60 disabled:cursor-not-allowed">
                <div className="flex items-center gap-3.5">
                  <div className="h-9 w-9 rounded-full bg-rose-500/20 grid place-items-center text-rose-400 shrink-0">
                    {demoLoading === 'finance' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">Financial Analyst</div>
                    <div className="text-xs text-muted-foreground">Spend intelligence &amp; reporting</div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </button>

              <button type="button" disabled={demoLoading !== null} onClick={() => onDemo('director')} data-testid={LOGIN.demoDirectorButton} className="w-full flex items-center justify-between p-3.5 rounded-lg bg-background/60 hover:bg-accent border border-border/60 hover:border-border transition-all group text-left disabled:opacity-60 disabled:cursor-not-allowed">
                <div className="flex items-center gap-3.5">
                  <div className="h-9 w-9 rounded-full bg-amber-500/20 grid place-items-center text-amber-400 shrink-0">
                    {demoLoading === 'director' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Briefcase className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">Director</div>
                    <div className="text-xs text-muted-foreground">Final approval &amp; oversight</div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </button>
            </div>
          </Card>
        </motion.div>
      </main>

      {/* Footer — decorative only; no existing footer functionality to preserve */}
      <footer className="relative z-10 border-t border-border/60 py-5 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>© {year} Procurio Enterprise Systems. All rights reserved.</span>
          <div className="flex gap-5">
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-foreground transition-colors">Security</a>
            <a href="#" className="hover:text-foreground transition-colors">Status</a>
          </div>
        </div>
      </footer>
    </div>
  );
}