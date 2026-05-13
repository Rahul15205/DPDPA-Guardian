import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserPlus, Trash2, Mail, ShieldCheck, X } from "lucide-react";
import { ModuleTour } from "@/components/ModuleTour";
import { DownloadReportButton } from "@/components/DownloadReportButton";

export const Route = createFileRoute("/app/users")({
  component: UsersPage,
});

type Role = "admin" | "dpo" | "analyst" | "viewer";
const ROLES: Role[] = ["admin", "dpo", "analyst", "viewer"];

const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  dpo: "DPO",
  analyst: "Analyst",
  viewer: "Viewer",
};

const ROLE_DESC: Record<Role, string> = {
  admin: "Full control: members, billing, all modules",
  dpo: "Privacy lead: controls, RoPA, DSAR, notices, reports",
  analyst: "Day-to-day operator: edit controls, RoPA, DSAR",
  viewer: "Read-only access to all modules",
};

type Member = {
  id: string;
  user_id: string;
  role: Role;
  created_at: string;
  email: string | null;
  full_name: string | null;
};

type Invite = {
  id: string;
  email: string;
  role: Role;
  status: string;
  created_at: string;
};

function UsersPage() {
  const { membership, user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("analyst");
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = membership?.role === "admin";

  const load = async () => {
    if (!membership) return;
    setLoading(true);
    const [mRes, iRes] = await Promise.all([
      supabase
        .from("org_members")
        .select("id, user_id, role, created_at, profiles!inner(email, full_name)")
        .eq("org_id", membership.org_id)
        .order("created_at", { ascending: true }),
      supabase
        .from("org_invitations")
        .select("id, email, role, status, created_at")
        .eq("org_id", membership.org_id)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
    ]);

    if (mRes.data) {
      setMembers(
        mRes.data.map((m: any) => ({
          id: m.id,
          user_id: m.user_id,
          role: m.role,
          created_at: m.created_at,
          email: m.profiles?.email ?? null,
          full_name: m.profiles?.full_name ?? null,
        })),
      );
    }
    if (iRes.data) setInvites(iRes.data as Invite[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membership?.org_id]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!membership || !inviteEmail) return;
    setSubmitting(true);
    const { error } = await supabase.from("org_invitations").insert({
      org_id: membership.org_id,
      email: inviteEmail.trim().toLowerCase(),
      role: inviteRole,
      invited_by: user?.id,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message.includes("unique") ? "An invitation for this email is already pending" : error.message);
      return;
    }
    toast.success(`Invitation queued for ${inviteEmail}. They'll join on signup.`);
    setInviteEmail("");
    setInviteRole("analyst");
    load();
  };

  const changeRole = async (memberId: string, newRole: Role) => {
    const { error } = await supabase.from("org_members").update({ role: newRole }).eq("id", memberId);
    if (error) return toast.error(error.message);
    toast.success("Role updated");
    load();
  };

  const removeMember = async (memberId: string, userId: string) => {
    if (userId === user?.id) return toast.error("You can't remove yourself");
    if (!confirm("Remove this member from the organization?")) return;
    const { error } = await supabase.from("org_members").delete().eq("id", memberId);
    if (error) return toast.error(error.message);
    toast.success("Member removed");
    load();
  };

  const revokeInvite = async (inviteId: string) => {
    const { error } = await supabase.from("org_invitations").update({ status: "revoked" }).eq("id", inviteId);
    if (error) return toast.error(error.message);
    toast.success("Invitation revoked");
    load();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-primary">Workspace</div>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Users & roles</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Manage who has access to {membership?.org_name} and what they can do.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ModuleTour moduleKey="users" />
          <DownloadReportButton
            moduleLabel="Users & roles"
            filenameBase="users"
            rows={[
              ...members.map((m) => ({ kind: "member", email: m.email ?? "", role: m.role, joined_at: m.created_at })),
              ...invites.map((i) => ({ kind: "invite", email: i.email, role: i.role, joined_at: i.created_at })),
            ]}
          />
        </div>
      </header>

      {/* Invite */}
      {isAdmin && (
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-semibold">Invite a teammate</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            They'll be added to your workspace automatically the moment they sign up with this email.
          </p>
          <form onSubmit={handleInvite} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                required
                placeholder="teammate@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
              <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" disabled={submitting} className="bg-primary text-primary-foreground">
              {submitting ? "Sending…" : "Send invite"}
            </Button>
          </form>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {ROLES.map((r) => (
              <div key={r} className="rounded-md border border-border/60 bg-muted/30 p-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <ShieldCheck className="h-3 w-3 text-primary" /> {ROLE_LABEL[r]}
                </div>
                <div className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{ROLE_DESC[r]}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pending invites */}
      {invites.length > 0 && (
        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-6 py-4">
            <h2 className="font-display text-lg font-semibold">Pending invitations</h2>
          </div>
          <ul className="divide-y divide-border">
            {invites.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between gap-4 px-6 py-4">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{inv.email}</div>
                  <div className="text-xs text-muted-foreground">
                    Invited {new Date(inv.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="border-primary/30 text-primary">{ROLE_LABEL[inv.role]}</Badge>
                  {isAdmin && (
                    <Button size="sm" variant="ghost" onClick={() => revokeInvite(inv.id)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Members */}
      <section className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-semibold">Members ({members.length})</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Joined</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const isSelf = m.user_id === user?.id;
                  return (
                    <tr key={m.id} className="border-b border-border/60 last:border-0">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                            {(m.full_name || m.email || "?").slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium">
                              {m.full_name || m.email}
                              {isSelf && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                            </div>
                            <div className="text-xs text-muted-foreground">{m.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isAdmin && !isSelf ? (
                          <Select value={m.role} onValueChange={(v) => changeRole(m.id, v as Role)}>
                            <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {ROLES.map((r) => (
                                <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline" className="border-primary/30 text-primary">{ROLE_LABEL[m.role]}</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {new Date(m.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isAdmin && !isSelf ? (
                          <Button size="sm" variant="ghost" onClick={() => removeMember(m.id, m.user_id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {!isAdmin && (
        <p className="text-xs text-muted-foreground">
          Only organization admins can invite or manage members. Contact your admin to request changes.
        </p>
      )}
    </div>
  );
}
