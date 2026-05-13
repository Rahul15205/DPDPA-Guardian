import { supabase } from "@/integrations/supabase/client";

export type ControlMappingRow = {
  id: string;
  control_id: string;
  regulation_code: string;
  clause_ref: string;
};

export async function fetchAllControlMappings() {
  const pageSize = 1000;
  const rows: ControlMappingRow[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("control_mappings")
      .select("id, control_id, regulation_code, clause_ref")
      .order("regulation_code", { ascending: true })
      .order("clause_ref", { ascending: true })
      .order("control_id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;

    const page = (data ?? []) as unknown as ControlMappingRow[];
    rows.push(...page);

    if (page.length < pageSize) return rows;
  }
}