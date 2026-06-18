import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AccountType = "tenant" | "landlord" | "admin";

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  account_type: AccountType;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (!s?.user) {
        setProfile(null);
      } else {
        setTimeout(() => {
          supabase
            .from("profiles")
            .select("id, full_name, phone, account_type")
            .eq("id", s.user.id)
            .maybeSingle()
            .then(({ data }) => setProfile(data as Profile | null));
        }, 0);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
      if (data.session?.user) {
        supabase
          .from("profiles")
          .select("id, full_name, phone, account_type")
          .eq("id", data.session.user.id)
          .maybeSingle()
          .then(({ data: p }) => setProfile(p as Profile | null));
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user, profile, loading };
}