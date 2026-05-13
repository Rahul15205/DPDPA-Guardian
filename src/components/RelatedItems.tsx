import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Link2, ArrowUpRight, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { findRelated, type LinkSubject, type LinkedItem } from "@/lib/smart-links";

interface Props {
  subject: LinkSubject | null;
  title?: string;
  emptyHint?: string;
}

export function RelatedItems({ subject, title = "Related across modules", emptyHint = "No linked records yet." }: Props) {
  const [items, setItems] = useState<LinkedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!subject?.orgId) return;
    let cancelled = false;
    setLoading(true);
    findRelated(subject)
      .then((r) => { if (!cancelled) setItems(r); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [JSON.stringify(subject)]);

  if (!subject) return null;

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          {title}
          {items.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-[10px]">{items.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {loading && <div className="text-xs text-muted-foreground">Discovering links…</div>}
        {!loading && items.length === 0 && (
          <div className="text-xs text-muted-foreground">{emptyHint}</div>
        )}
        {items.map((it) => (
          <button
            key={`${it.module}-${it.id}`}
            onClick={() => navigate({ to: it.href as never })}
            className="group flex w-full items-center gap-2 rounded-md border border-transparent bg-secondary/40 px-2.5 py-1.5 text-left text-xs hover:border-border hover:bg-secondary"
          >
            <Link2 className="h-3 w-3 text-muted-foreground" />
            <Badge variant="outline" className="shrink-0 text-[9px] uppercase">{it.module}</Badge>
            <span className="truncate font-medium">{it.title}</span>
            {it.subtitle && (
              <span className="hidden truncate text-muted-foreground sm:inline">· {it.subtitle}</span>
            )}
            {it.badge && (
              <Badge variant="secondary" className="ml-auto text-[9px]">{it.badge}</Badge>
            )}
            <ArrowUpRight className="h-3 w-3 shrink-0 opacity-0 transition group-hover:opacity-100" />
          </button>
        ))}
        <div className="pt-1">
          <Button
            variant="ghost" size="sm"
            className="h-7 w-full justify-center text-[11px] text-muted-foreground"
            onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
          >
            Search more (⌘K)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
