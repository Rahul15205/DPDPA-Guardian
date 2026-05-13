// MOCK SUPABASE SERVER CLIENT FOR DEMO
export const supabase = {
  auth: {
    getUser: async () => ({ data: { user: null }, error: null }),
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({ data: null, error: null }),
      }),
    }),
  }),
};
