import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Paperclip, X, Loader2, Download, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export type Attachment = {
  path: string;
  name: string;
  size: number;
  mime?: string;
  tag?: string;
  comment?: string;
};

const TAGS = ["Policy", "Screenshot", "Contract", "Report", "Other"];

type Props = {
  orgId: string;
  assessmentId: string;
  questionKey: string;
  value: Attachment[];
  onChange: (next: Attachment[]) => void;
  disabled?: boolean;
  mandatory?: boolean;
};

export function EvidenceUploader({ orgId, assessmentId, questionKey, value, onChange, disabled, mandatory }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const next: Attachment[] = [...value];
      for (const f of Array.from(files)) {
        const path = `${orgId}/${assessmentId}/${questionKey}/${Date.now()}-${f.name}`;
        const { error } = await supabase.storage.from("assessment-evidence").upload(path, f, { upsert: false });
        if (error) throw error;
        next.push({ path, name: f.name, size: f.size, mime: f.type, tag: "Other", comment: "" });
      }
      onChange(next);
      toast.success(`${files.length} file(s) attached`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };

  const remove = async (a: Attachment) => {
    await supabase.storage.from("assessment-evidence").remove([a.path]);
    onChange(value.filter((x) => x.path !== a.path));
  };

  const download = async (a: Attachment) => {
    const { data, error } = await supabase.storage.from("assessment-evidence").createSignedUrl(a.path, 60);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  };

  const patch = (path: string, p: Partial<Attachment>) =>
    onChange(value.map((x) => (x.path === path ? { ...x, ...p } : x)));

  return (
    <div className="space-y-2">
      {mandatory && value.length === 0 && (
        <div className="text-[11px] font-medium text-rose-600">Evidence required for this question.</div>
      )}
      <div className="flex flex-wrap gap-2">
        {value.map((a) => (
          <span key={a.path} className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/50 px-2 py-1 text-xs">
            <button type="button" className="hover:underline" onClick={() => download(a)}>
              <Download className="inline h-3 w-3 mr-1" />{a.name}
            </button>
            {a.tag && <span className="rounded bg-primary/10 px-1 text-[10px] text-primary">{a.tag}</span>}
            <span className="text-muted-foreground">{Math.round(a.size / 1024)} KB</span>
            {!disabled && (
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="hover:text-primary"><MessageSquare className="h-3 w-3" /></button>
                </PopoverTrigger>
                <PopoverContent className="w-64 space-y-2">
                  <div>
                    <Label className="text-xs">Tag</Label>
                    <Select value={a.tag ?? "Other"} onValueChange={(v) => patch(a.path, { tag: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{TAGS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Reviewer comment</Label>
                    <Textarea
                      rows={3}
                      value={a.comment ?? ""}
                      onChange={(e) => patch(a.path, { comment: e.target.value })}
                      className="text-xs"
                    />
                  </div>
                </PopoverContent>
              </Popover>
            )}
            {!disabled && (
              <button type="button" onClick={() => remove(a)} className="hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
      </div>
      {!disabled && (
        <div>
          <input ref={ref} type="file" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
          <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()} disabled={busy}>
            {busy ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Paperclip className="h-3 w-3 mr-1" />}
            Attach evidence
          </Button>
        </div>
      )}
    </div>
  );
}
