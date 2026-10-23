import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type Role = 'seller' | 'buyer' | 'carrier' | 'regulator' | 'admin';

export interface Profile {
  id: string;
  role: Role;
  display_name: string | null;
  facility_id: string | null;
  carrier_id: string | null;
}

interface SessionState {
  configured: boolean;
  session: Session | null;
  profile: Profile | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, role: Role, displayName: string) => Promise<'signed_in' | 'confirm_email'>;
  signOut: () => Promise<void>;
  claim: (kind: 'facility' | 'carrier', id: string) => Promise<void>;
}

const Ctx = createContext<SessionState | null>(null);

function need() {
  if (!supabase) throw new Error('Supabase is not configured (see frontend/.env.example).');
  return supabase;
}

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const loadProfile = async (s: Session | null) => {
    if (!supabase || !s) return setProfile(null);
    const { data } = await supabase
      .from('profiles')
      .select('id, role, display_name, facility_id, carrier_id')
      .eq('id', s.user.id)
      .maybeSingle();
    setProfile((data as Profile) ?? null);
  };

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      loadProfile(data.session);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      loadProfile(s);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const value: SessionState = {
    configured: supabase !== null,
    session,
    profile,
    signIn: async (email, password) => {
      const { error } = await need().auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    signUp: async (email, password, role, displayName) => {
      // The signup trigger only honours seller/buyer/carrier; anything else becomes buyer.
      const { data, error } = await need().auth.signUp({
        email,
        password,
        options: { data: { role, display_name: displayName } },
      });
      if (error) throw error;
      return data.session ? 'signed_in' : 'confirm_email';
    },
    signOut: async () => {
      await need().auth.signOut();
    },
    claim: async (kind, id) => {
      const { error } = await need().rpc(kind === 'facility' ? 'claim_facility' : 'claim_carrier', kind === 'facility' ? { fid: id } : { cid: id });
      if (error) throw error;
      await loadProfile(session);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useSession(): SessionState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession must be used inside SessionProvider');
  return v;
}
