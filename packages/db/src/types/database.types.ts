/**
 * Supabase generated types placeholder.
 * Replace with `supabase gen types typescript` output when project is connected.
 */
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']>;
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          owner_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['organizations']['Row']>;
        Update: Partial<Database['public']['Tables']['organizations']['Row']>;
      };
      projects: {
        Row: {
          id: string;
          name: string;
          organization_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['projects']['Row']>;
        Update: Partial<Database['public']['Tables']['projects']['Row']>;
      };
    };
  };
};
