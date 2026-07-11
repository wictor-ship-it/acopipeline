/* Hook for screens to read agent items (autonomy resolved from Settings §03).
   Re-reads on data change so approvals/undo and settings toggles reflect live. */
import { useEffect, useState } from "react";
import type { AgentSkill, ResolvedAgentItem } from "../domain/agent";
import { getAgentService } from "./index";
import { onDataChange } from "../data/repository";

export function useAgentItems(skill?: AgentSkill): { items: ResolvedAgentItem[]; loading: boolean } {
  const [items, setItems] = useState<ResolvedAgentItem[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    const svc = getAgentService();
    const read = () => {
      const p = skill ? svc.listItemsBySkill(skill) : svc.listItems();
      p.then((rows) => { if (alive) { setItems(rows); setLoading(false); } });
    };
    read();
    const off = onDataChange(() => read());
    return () => { alive = false; off(); };
  }, [skill]);
  return { items, loading };
}
