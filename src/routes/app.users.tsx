import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Trash2, Mail, ShieldCheck, X, Users } from "lucide-react";
import { ModuleTour } from "@/components/ModuleTour";
import { DownloadReportButton } from "@/components/DownloadReportButton";

export const Route = createFileRoute("/app/users")({ component: UsersPage });

// --- HIGH FIDELITY MOCK DATA ---

const MOCK_MEMBERS: any[] = [
  { id: "m1", user_id: "u1", role: "admin", created_at: "2024-01-01T10:00:00Z", email: "rahul@demo.com", full_name: "Rahul Kumar" },
  { id: "m2", user_id: "u2", role: "dpo", created_at: "2024-02-15T10:00:00Z", email: "priya.sharma@demo.com", full_name: "Priya Sharma" },
  { id: "m3", user_id: "u3", role: "analyst", created_at: "2024-03-10T10:00:00Z", email: "arjun.mehra@demo.com", full_name: "Arjun Mehra" },
  { id: "m4", user_id: "u4", role: "viewer", created_at: "2024-04-05T10:00:00Z", email: "sneha.gupta@demo.com", full_name: "Sneha Gupta" }
];

const MOCK_INVITES: any[] = [
  { id: "i1", email: "amit.v@demo.com", role: "analyst", status: "pending", created_at: "2024-05-12T14:00:00Z" }
];

type Role = "admin" | "dpo" | "analyst" | "viewer";
const ROLES: Role[] = ["admin", "dpo", "analyst", "viewer"];

const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  dpo: "DPO",
  analyst: "Analyst",
  viewer: "Viewer",
};

const ROLE_DESC: Record<Role, string> = {
  admin: "Full control over workspace and billing.",
  dpo: "Privacy lead: manages RoPA, DSAR, and Compliance.",
  analyst: "Operational access: edits controls and activities.",
  viewer: "Read-only access across all modules.",
};

function UsersPage() {
  const { membership } = useAuth();
  const [members] = useState<any[]>(MOCK_MEMBERS);
  const [invites] = useState<any[]>(MOCK_INVITES);
  const [loading] = useState(false);

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-10 animate-in fade-in duration-500">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
             <Users className="h-8 w-8 text-primary" /> Users & roles
          </h1>
          <p className="mt-1.5 text-sm font-medium text-slate-500">
            Manage your DPDPA compliance team and access levels.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ModuleTour moduleKey="users" />
          <DownloadReportButton moduleLabel="Users" filenameBase="users" rows={MOCK_MEMBERS} />
        </div>
      </header>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-bold">Invite a teammate</h2>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="teammate@company.com" className="pl-9 h-10" />
          </div>
          <Select defaultValue="analyst">
            <SelectTrigger className="sm:w-44 h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button className="h-10 px-8">Send invite</Button>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ROLES.map((r) => (
            <div key={r} className="rounded-lg border border-border/60 bg-muted/20 p-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider mb-1">
                <ShieldCheck className="h-3.5 w-3.5" /> {ROLE_LABEL[r]}
              </div>
              <div className="text-[11px] leading-relaxed text-slate-500 font-medium">{ROLE_DESC[r]}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="bg-secondary/40 px-6 py-4 border-b">
           <h2 className="font-display text-lg font-bold">Organization Members ({members.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4 text-left">Member</th>
                <th className="px-6 py-4 text-left">Role</th>
                <th className="px-6 py-4 text-left">Joined Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm shadow-inner">
                        {m.full_name[0]}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{m.full_name}</div>
                        <div className="text-[11px] text-slate-500 font-medium">{m.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className="text-[10px] font-bold border-primary/20 bg-primary/5 text-primary">
                      {ROLE_LABEL[m.role as Role]}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-medium">
                    {new Date(m.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" className="text-slate-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {invites.length > 0 && (
         <section className="rounded-xl border border-border bg-amber-50/30 p-6 border-dashed">
            <h3 className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-4">Pending Invitations</h3>
            {invites.map(inv => (
               <div key={inv.id} className="flex items-center justify-between bg-white p-4 rounded-lg border shadow-sm">
                  <div className="flex items-center gap-3">
                     <Mail className="h-4 w-4 text-amber-500" />
                     <div>
                        <div className="text-sm font-bold">{inv.email}</div>
                        <div className="text-[10px] font-medium text-slate-400">Invited {new Date(inv.created_at).toLocaleDateString()}</div>
                     </div>
                  </div>
                  <div className="flex items-center gap-3">
                     <Badge variant="outline" className="text-[10px] font-bold text-amber-600 border-amber-200">{ROLE_LABEL[inv.role as Role]}</Badge>
                     <Button variant="ghost" size="sm" className="text-slate-400"><X className="h-4 w-4" /></Button>
                  </div>
               </div>
            ))}
         </section>
      )}
    </div>
  );
}
