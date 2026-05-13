// MOCK SUPABASE CLIENT FOR DEMO
const mockQueryBuilder = {
  select: () => mockQueryBuilder,
  eq: () => mockQueryBuilder,
  order: () => mockQueryBuilder,
  limit: () => mockQueryBuilder,
  maybeSingle: async () => ({ data: null, error: null }),
  single: async () => ({ data: null, error: null }),
  insert: async () => ({ data: null, error: null }),
  update: async () => ({ data: null, error: null }),
  delete: async () => ({ data: null, error: null }),
  upsert: async () => ({ data: null, error: null }),
};

// Store callbacks for auth state changes
const authListeners = new Set<(event: string, session: any) => void>();

export const supabase = {
  auth: {
    getSession: async () => {
      const stored = localStorage.getItem("demo-session");
      if (stored) return { data: { session: JSON.parse(stored) }, error: null };
      return { data: { session: null }, error: null };
    },
    onAuthStateChange: (cb: (event: string, session: any) => void) => {
      authListeners.add(cb);
      // Immediately call with current session
      const stored = localStorage.getItem("demo-session");
      if (stored) cb("SIGNED_IN", JSON.parse(stored));
      
      return { data: { subscription: { unsubscribe: () => authListeners.delete(cb) } } };
    },
    signInWithPassword: async ({ email, password }: any) => {
      if (email === "contact@protecciodata.com" && password === "protecciodata@admin") {
        const session = { 
          user: { 
            id: "demo-user-123", 
            email: "contact@protecciodata.com",
            user_metadata: { full_name: "Proteccio Admin" }
          } 
        };
        localStorage.setItem("demo-session", JSON.stringify(session));
        
        // Notify listeners
        authListeners.forEach(cb => cb("SIGNED_IN", session));
        
        return { data: session, error: null };
      }
      return { data: { user: null }, error: { message: "Invalid login credentials. Please check your email and password." } };
    },
    signUp: async () => ({ data: { user: null }, error: { message: "Sign up is disabled in demo mode." } }),
    signOut: async () => {
      localStorage.removeItem("demo-session");
      authListeners.forEach(cb => cb("SIGNED_OUT", null));
      return { error: null };
    },
    getUser: async () => {
      const stored = localStorage.getItem("demo-session");
      if (stored) return { data: { user: JSON.parse(stored).user }, error: null };
      return { data: { user: null }, error: null };
    },
  },
  from: () => mockQueryBuilder,
  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: "" } }),
    }),
  },
};
