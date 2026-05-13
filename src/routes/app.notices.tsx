import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { 
  Shield, 
  Cookie, 
  FileText, 
  Plus, 
  Settings, 
  Globe, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Palette, 
  Layout, 
  Monitor, 
  Smartphone, 
  Search, 
  Download, 
  Trash2, 
  Copy, 
  ExternalLink,
  Eye,
  Languages,
  ArrowRight,
  Code,
  Users,
  Clock,
  History,
  BarChart3,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/app/notices")({ component: NoticesPage });

// --- HIGH FIDELITY MOCK DATA ---

const MOCK_NOTICES = [
  { id: "n1", title: "Customer Privacy Notice (Global)", version: "2.4", status: "Published", lastUpdate: "2024-05-01", views: 12450, avgTime: "1m 15s", region: "Global" },
  { id: "n2", title: "Employee Privacy Policy", version: "1.2", status: "Published", lastUpdate: "2024-04-10", views: 420, avgTime: "2m 45s", region: "Internal" },
  { id: "n3", title: "DPDPA Specific Notice (India)", version: "1.0", status: "Draft", lastUpdate: "2024-05-12", views: 0, avgTime: "0s", region: "India" },
  { id: "n4", title: "Marketing Consent Notice", version: "1.1", status: "Published", lastUpdate: "2024-05-08", views: 8902, avgTime: "22s", region: "Global" },
];

const MOCK_COOKIES = [
  { id: "c1", name: "_ga", domain: "demo.com", category: "Analytics", expiration: "2 years", provider: "Google" },
  { id: "c2", name: "_gid", domain: "demo.com", category: "Analytics", expiration: "24 hours", provider: "Google" },
  { id: "c3", name: "session_id", domain: "demo.com", category: "Necessary", expiration: "Session", provider: "Internal" },
  { id: "c4", name: "ads_retarget", domain: "demo.com", category: "Marketing", expiration: "3 months", provider: "Meta" },
];

function NoticesPage() {
  const [activeMainTab, setActiveMainTab] = useState("notices");

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/30 animate-in fade-in duration-700">
      <header className="px-8 py-6 border-b bg-white shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
               <Shield className="h-8 w-8 text-primary" /> Privacy & Consent
            </h1>
            <p className="text-slate-500 mt-1 text-sm font-medium">Manage your DPDPA notices, cookie banners, and compliance workflows.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" /> Export Logs</Button>
            <Button size="sm"><Plus className="w-4 h-4 mr-2" /> New Notice</Button>
          </div>
        </div>
      </header>

      <main className="p-8 max-w-7xl mx-auto w-full">
        <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="space-y-8">
          <TabsList className="bg-white border p-1 rounded-xl shadow-sm w-fit">
            <TabsTrigger value="notices" className="px-8 py-2.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
              <FileText className="w-4 h-4 mr-2" /> Policy Notices
            </TabsTrigger>
            <TabsTrigger value="cookies" className="px-8 py-2.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
              <Cookie className="w-4 h-4 mr-2" /> Cookie Banner
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notices" className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <KPI icon={FileText} label="Active Notices" value="3" trend="1 Draft" />
              <KPI icon={Eye} label="Notice Views" value="21.7k" trend="+12% this week" tone="text-blue-600" />
              <KPI icon={Clock} label="Avg. Read Time" value="1m 02s" trend="Healthy Engagement" tone="text-emerald-600" />
              <KPI icon={CheckCircle} label="Ack Rate" value="74%" trend="+5% vs last month" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {MOCK_NOTICES.map(notice => (
                 <Card key={notice.id} className="hover:shadow-md transition-all border-border/60 overflow-hidden group">
                   <div className={`h-1.5 w-full ${notice.status === "Published" ? "bg-emerald-500" : "bg-amber-400"}`} />
                   <CardHeader className="pb-2">
                     <div className="flex justify-between items-start">
                        <Badge variant={notice.status === "Published" ? "default" : "outline"} className="text-[9px] uppercase tracking-wider h-5">
                          {notice.status}
                        </Badge>
                        <Badge variant="secondary" className="text-[9px] uppercase h-5">{notice.region}</Badge>
                     </div>
                     <CardTitle className="mt-4 text-lg font-bold group-hover:text-primary transition-colors">{notice.title}</CardTitle>
                     <CardDescription className="text-[11px] font-medium">Version {notice.version} · Updated {notice.lastUpdate}</CardDescription>
                   </CardHeader>
                   <CardContent>
                      <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-100 my-4">
                         <div>
                            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Impressions</div>
                            <div className="text-xl font-bold">{notice.views.toLocaleString()}</div>
                         </div>
                         <div className="border-l pl-4">
                            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Avg Duration</div>
                            <div className="text-xl font-bold">{notice.avgTime}</div>
                         </div>
                      </div>
                      <div className="flex gap-2">
                         <Button variant="outline" size="sm" className="w-full text-xs">Edit</Button>
                         <Button variant="ghost" size="sm" className="w-full text-xs">Preview</Button>
                      </div>
                   </CardContent>
                 </Card>
               ))}
               <button className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-slate-400 hover:border-primary hover:text-primary transition-all group min-h-[250px]">
                  <Plus className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-sm">Create New Policy Notice</span>
               </button>
            </div>
          </TabsContent>

          <TabsContent value="cookies" className="space-y-6">
             <Card className="border-border/60 shadow-sm">
                <CardHeader>
                   <CardTitle className="text-lg font-bold">Banner Configuration</CardTitle>
                   <CardDescription>Customize your cookie consent banner for compliance with DPDPA & GDPR.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                   <div className="grid md:grid-cols-2 gap-12">
                      <div className="space-y-6">
                         <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider">Banner Theme</Label>
                            <div className="flex gap-2">
                               <div className="w-10 h-10 rounded-lg bg-primary cursor-pointer ring-2 ring-offset-2 ring-primary" />
                               <div className="w-10 h-10 rounded-lg bg-slate-900 cursor-pointer" />
                               <div className="w-10 h-10 rounded-lg bg-blue-600 cursor-pointer" />
                            </div>
                         </div>
                         <div className="space-y-4 pt-4 border-t">
                            <div className="flex items-center justify-between">
                               <div><Label className="text-sm font-semibold">Strict Consent Mode</Label><p className="text-[11px] text-muted-foreground">Block cookies until user accepts.</p></div>
                               <Switch defaultChecked />
                            </div>
                            <div className="flex items-center justify-between">
                               <div><Label className="text-sm font-semibold">Geolocation Detection</Label><p className="text-[11px] text-muted-foreground">Show DPDPA notice in India, GDPR in EU.</p></div>
                               <Switch defaultChecked />
                            </div>
                         </div>
                      </div>
                      <div className="bg-slate-100 rounded-2xl p-8 flex flex-col items-center justify-center border-2 border-dashed">
                         <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-[300px] border">
                            <div className="h-2 w-12 bg-primary/20 rounded mb-4" />
                            <h4 className="font-bold text-sm mb-2">Cookie Preferences</h4>
                            <p className="text-[10px] text-slate-500 mb-4 leading-relaxed">We use cookies to ensure you get the best experience on our website.</p>
                            <div className="flex gap-2">
                               <Button size="sm" className="w-full text-[10px] h-8">Accept All</Button>
                               <Button variant="outline" size="sm" className="w-full text-[10px] h-8">Reject</Button>
                            </div>
                         </div>
                         <span className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Preview</span>
                      </div>
                   </div>
                </CardContent>
             </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function KPI({ icon: Icon, label, value, trend, tone }: any) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 bg-slate-50 rounded-lg text-primary"><Icon className="w-5 h-5" /></div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{trend}</span>
        </div>
        <div>
          <div className={`text-2xl font-bold ${tone || "text-slate-900"}`}>{value}</div>
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
