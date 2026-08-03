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
import { LOGIN, REGISTER } from '@/lib/constants/testIds/auth.js';

export function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'

  // Sign-in state
  const [email, setEmail] = useState('admin@procurio.app');
  const [password, setPassword] = useState('procurio123');

  // Registration state
  const [name, setName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');

  const [loading, setLoading] = useState(false);

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
            {mode === 'login' ? (
              <>
                <h1 className="text-xl font-semibold tracking-tight">Sign in to your workspace</h1>
                <p className="text-sm text-muted-foreground mt-1">Use your team credentials to continue.</p>

                <form onSubmit={onLogin} className="mt-6 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="l-email">Work email</Label>
                    <Input id="l-email" type="email" autoComplete="email" data-testid={LOGIN.emailInput} value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="l-pwd">Password</Label>
                      <button type="button" data-testid={LOGIN.forgotPasswordLink} className="text-[11px] text-muted-foreground hover:text-foreground">Forgot?</button>
                    </div>
                    <Input id="l-pwd" type="password" autoComplete="current-password" data-testid={LOGIN.passwordInput} value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                  <Button type="submit" disabled={loading} data-testid={LOGIN.submitButton} className="w-full h-10 gap-1.5">
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
              </>
            ) : (
              <>
                <h1 className="text-xl font-semibold tracking-tight">Create your account</h1>
                <p className="text-sm text-muted-foreground mt-1">Set up your workspace in under a minute.</p>

                <form onSubmit={onRegister} className="mt-6 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="r-name">Full name</Label>
                    <Input id="r-name" autoComplete="name" data-testid={REGISTER.nameInput} value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={80} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="r-email">Work email</Label>
                    <Input id="r-email" type="email" autoComplete="email" data-testid={REGISTER.emailInput} value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="r-pwd">Password</Label>
                    <Input id="r-pwd" type="password" autoComplete="new-password" data-testid={REGISTER.passwordInput} value={regPassword} onChange={(e) => setRegPassword(e.target.value)} minLength={8} maxLength={120} required />
                    <p className="text-[11px] text-muted-foreground">At least 8 characters.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="r-pwd2">Confirm password</Label>
                    <Input id="r-pwd2" type="password" autoComplete="new-password" data-testid={REGISTER.passwordConfirmInput} value={regConfirm} onChange={(e) => setRegConfirm(e.target.value)} required />
                  </div>
                  <Button type="submit" disabled={loading} data-testid={REGISTER.submitButton} className="w-full h-10 gap-1.5">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create account <ArrowRight className="h-4 w-4" /></>}
                  </Button>
                </form>
              </>
            )}

            <div className="mt-5 text-center text-sm text-muted-foreground">
              {mode === 'login' ? (
                <>
                  Don&apos;t have an account?{' '}
                  <button type="button" data-testid={LOGIN.registerLink} onClick={() => switchTo('register')} className="font-medium text-primary hover:underline">
                    Create one
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

          <p className="text-center text-[11px] text-muted-foreground mt-6">
            © {new Date().getFullYear()} Procurio · Enterprise procurement intelligence
          </p>
        </motion.div>
      </div>
    </div>
  );
}
