import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Eye, EyeOff } from "lucide-react";

export type Comment = {
  id: string;
  author_email: string | null;
  body: string;
  internal: boolean;
  created_at: string;
};

export function CommentThread({
  comments,
  canPost,
  onPost,
}: {
  comments: Comment[];
  canPost: boolean;
  onPost: (body: string, internal: boolean) => Promise<void>;
}) {
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(true);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!body.trim()) return;
    setBusy(true);
    try {
      await onPost(body, internal);
      setBody("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {canPost && (
        <div className="rounded-lg border border-border bg-card p-3">
          <Textarea
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={internal ? "Internal note (only your team can see this)…" : "Reply visible to the requester…"}
          />
          <div className="mt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setInternal((v) => !v)}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
                internal ? "bg-amber-500/10 text-amber-700" : "bg-emerald-500/10 text-emerald-700"
              }`}
            >
              {internal ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {internal ? "Internal only" : "Visible to requester"}
            </button>
            <Button size="sm" onClick={submit} disabled={!body.trim() || busy}>
              <MessageSquare className="mr-1 h-3.5 w-3.5" /> Post
            </Button>
          </div>
        </div>
      )}
      <ul className="space-y-2">
        {comments.length === 0 && <li className="text-xs text-muted-foreground">No comments yet.</li>}
        {comments.map((c) => (
          <li
            key={c.id}
            className={`rounded-md border p-2.5 text-xs ${
              c.internal ? "border-amber-500/30 bg-amber-500/5" : "border-emerald-500/30 bg-emerald-500/5"
            }`}
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="font-semibold">{c.author_email ?? "Unknown"}</span>
              <span className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${c.internal ? "bg-amber-500/20 text-amber-700" : "bg-emerald-500/20 text-emerald-700"}`}>
                  {c.internal ? <EyeOff className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />}
                  {c.internal ? "Internal" : "Requester"}
                </span>
                <span className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
              </span>
            </div>
            <p className="whitespace-pre-wrap">{c.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
