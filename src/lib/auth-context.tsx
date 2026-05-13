import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

// Mock types to avoid Supabase dependency
type User = { id: string; email: string; user_metadata: any };
type Session = { user: User };
type Membership = { org_id: string; role: string; org_name: string; org_slug: string };

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  membership: Membership | null;
  refreshMembership: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

// DEMO MEMBERSHIP DATA
const MOCK_MEMBERSHIP: Membership = { 
  org_id: "demo-org-123", 
  role: "ADMIN", 
  org_name: "Proteccio Data Corp", 
  org_slug: "proteccio-data" 
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [membership, setMembership] = useState<Membership | null>(null);

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setSession(data.session as any);
        setUser(data.session.user as any);
        setMembership(MOCK_MEMBERSHIP);
      }
      setLoading(false);
    };

    checkSession();

    // Mock listener for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: any, session: any) => {
        setSession(session);
        setUser(session?.user ?? null);
        setMembership(session ? MOCK_MEMBERSHIP : null);
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        loading,
        membership,
        refreshMembership: async () => {},
        signOut: async () => {
          await supabase.auth.signOut();
          setUser(null);
          setSession(null);
          setMembership(null);
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
};
