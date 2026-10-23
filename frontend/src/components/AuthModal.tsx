import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useSession, Role } from '../lib/session';

// Email + password sign-in through Supabase Auth. New accounts pick seller,
// buyer or carrier; regulator and admin are granted by an admin only.

export const AuthModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { signIn, signUp } = useSession();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('seller');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (mode === 'in') {
        await signIn(email, password);
        onClose();
      } else {
        const result = await signUp(email, password, role, name || email.split('@')[0]);
        if (result === 'signed_in') onClose();
        else setMessage({ text: 'Check your inbox for a confirmation link, then sign in.', error: false });
      }
    } catch (err) {
      const text = (err as Error).message;
      setMessage({
        text: text === 'Failed to fetch' ? "Can't reach Supabase. Check your connection and VITE_SUPABASE_URL." : text,
        error: true,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-full max-w-md rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle>{mode === 'in' ? 'Sign in' : 'Create an account'}</DialogTitle>
          <DialogDescription>
            {mode === 'in' ? 'Use the email and password you signed up with.' : 'You will link your facility or fleet after signing in.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          {mode === 'up' && (
            <>
              <Input placeholder="Your name or company" value={name} onChange={(e) => setName(e.target.value)} />
              <label className="text-xs font-semibold text-muted-foreground flex flex-col gap-1">
                I am a
                <select
                  className="h-9 rounded-md border border-border bg-card px-2 text-sm text-foreground"
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                >
                  <option value="seller">Seller (I generate byproducts or waste)</option>
                  <option value="buyer">Buyer (I reuse or recycle material)</option>
                  <option value="carrier">Carrier (I run trucks)</option>
                </select>
              </label>
            </>
          )}
          <Input type="email" required placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input
            type="password"
            required
            minLength={8}
            placeholder="Password (8+ characters)"
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {message && <p className={`text-xs ${message.error ? 'text-red-700 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{message.text}</p>}
          <Button type="submit" disabled={busy}>
            {busy ? 'Working…' : mode === 'in' ? 'Sign in' : 'Create account'}
          </Button>
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
            onClick={() => {
              setMode(mode === 'in' ? 'up' : 'in');
              setMessage(null);
            }}
          >
            {mode === 'in' ? 'New here? Create an account' : 'Already have an account? Sign in'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
