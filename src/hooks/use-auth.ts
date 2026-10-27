import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { tagAsInternalUser } from "@/integrations/posthog/client";
import { isInternalEmail } from "@/lib/internal-accounts";

export type AccountType = "tenant" | "landlord" | "admin";

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  account_type: AccountType;
  hear_about_us: string | null;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let currentUserId: string | null = null;
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      // Ignore noisy events (INITIAL_SESSION on every mount, TOKEN_REFRESHED
      // hourly and on tab focus, PASSWORD_RECOVERY, etc.) — they create new
      // user object references that churn dependent effects and swallow
      // in-flight UI interactions.
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      const nextUserId = s?.user?.id ?? null;
      if (nextUserId === currentUserId && event !== "USER_UPDATED") return;
      currentUserId = nextUserId;
      setSession(s);
      setUser(s?.user ?? null);
      if (!s?.user) {
        setProfile(null);
      } else {
        setTimeout(() => {
          supabase
            .from("profiles")
            .select("id, full_name, phone, account_type, hear_about_us")
            .eq("id", s.user.id)
            .maybeSingle()
            .then(({ data }) => {
              const p = data as Profile | null;
              setProfile(p);
              if (p?.account_type === "admin" || isInternalEmail(s.user.email)) tagAsInternalUser();
            });
        }, 0);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      currentUserId = data.session?.user?.id ?? null;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        supabase
          .from("profiles")
          .select("id, full_name, phone, account_type, hear_about_us")
          .eq("id", data.session.user.id)
          .maybeSingle()
          .then(({ data: p }) => {
            const prof = p as Profile | null;
            setProfile(prof);
            if (prof?.account_type === "admin" || isInternalEmail(data.session?.user?.email)) tagAsInternalUser();
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user, profile, loading };
}