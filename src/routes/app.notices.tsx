import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
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
  Activity,
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
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/app/notices")({
  component: NoticesPage,
});

// --- Mock Data ---

const MOCK_COOKIES = [
  { id: "c1", name: "_ga", domain: "proteccio.ai", category: "Analytics", expiration: "2 years", provider: "Google" },
  { id: "c2", name: "_gid", domain: "proteccio.ai", category: "Analytics", expiration: "24 hours", provider: "Google" },
  { id: "c3", name: "session_id", domain: "proteccio.ai", category: "Necessary", expiration: "Session", provider: "Internal" },
  { id: "c4", name: "ads_retarget", domain: "proteccio.ai", category: "Marketing", expiration: "3 months", provider: "Meta" },
  { id: "c5", name: "pref_lang", domain: "proteccio.ai", category: "Functional", expiration: "1 year", provider: "Internal" },
];

const MOCK_DOMAINS = [
  { id: "d1", url: "https://www.proteccio.ai", status: "Verified", lastScan: "2024-05-10", pages: 45, cookies: 12 },
  { id: "d2", url: "https://app.proteccio.ai", status: "Verified", lastScan: "2024-05-12", pages: 120, cookies: 8 },
  { id: "d3", url: "https://blog.proteccio.ai", status: "Pending", lastScan: "Never", pages: 0, cookies: 0 },
];

const MOCK_NOTICES = [
  { id: "n1", title: "Global Privacy Policy", version: "2.1", status: "Published", lastUpdate: "2024-04-15", views: 1240, avgTime: "45s" },
  { id: "n2", title: "Employee Data Policy", version: "1.0", status: "Draft", lastUpdate: "2024-05-01", views: 0, avgTime: "0s" },
  { id: "n3", title: "Cookie Policy", version: "1.4", status: "Published", lastUpdate: "2024-05-08", views: 890, avgTime: "32s" },
];

const MOCK_VISITS = [
  { id: "v1", visitor: "rahul@proteccio.ai", notice: "Privacy Policy", duration: "1m 20s", device: "Desktop", browser: "Chrome", date: "2024-05-13 10:15" },
  { id: "v2", visitor: "192.168.1.45", notice: "Cookie Policy", duration: "45s", device: "Mobile", browser: "Safari", date: "2024-05-13 09:42" },
  { id: "v3", visitor: "guest_882", notice: "Privacy Policy", duration: "2m 10s", device: "Desktop", browser: "Edge", date: "2024-05-12 18:30" },
  { id: "v4", visitor: "amit@demo.com", notice: "Cookie Policy", duration: "12s", device: "Tablet", browser: "Chrome", date: "2024-05-12 14:20" },
];

function NoticesPage() {
  const [activeMainTab, setActiveMainTab] = useState("cookies");

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50">
      <header className="px-8 py-6 border-b bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Privacy & Consent</h1>
            <p className="text-slate-500 mt-1 text-lg">Manage your cookie banners, legal notices, and compliance workflows.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" /> Export Reports
            </Button>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" /> New Notice
            </Button>
          </div>
        </div>
      </header>

      <main className="p-8">
        <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="space-y-6">
          <TabsList className="bg-white border p-1 rounded-xl shadow-sm w-fit">
            <TabsTrigger value="cookies" className="px-6 py-2.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
              <Cookie className="w-4 h-4 mr-2" /> Cookie Management
            </TabsTrigger>
            <TabsTrigger value="notices" className="px-6 py-2.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
              <FileText className="w-4 h-4 mr-2" /> Legal Notices
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cookies" className="space-y-6 animate-in fade-in duration-500">
            <CookieManagementView />
          </TabsContent>

          <TabsContent value="notices" className="space-y-6 animate-in fade-in duration-500">
            <NoticesManagementView />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function CookieManagementView() {
  const [subTab, setSubTab] = useState("overview");

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPIBox icon={Globe} label="Managed Domains" value="3" trend="+1 this month" />
        <KPIBox icon={Cookie} label="Total Cookies" value="156" trend="24 active" />
        <KPIBox icon={Shield} label="Compliance Score" value="94%" trend="Excellent" color="text-emerald-600" />
        <KPIBox icon={CheckCircle} label="Active Consents" value="12.4k" trend="+8% vs last week" />
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-64 shrink-0">
          <Card className="border-slate-200">
            <CardContent className="p-2 flex flex-col gap-1">
              <SidebarItem active={subTab === "overview"} onClick={() => setSubTab("overview")} icon={Layout} label="Dashboard Overview" />
              <SidebarItem active={subTab === "design"} onClick={() => setSubTab("design")} icon={Palette} label="Banner Designer" />
              <SidebarItem active={subTab === "inventory"} onClick={() => setSubTab("inventory")} icon={Search} label="Cookie Inventory" />
              <SidebarItem active={subTab === "domains"} onClick={() => setSubTab("domains")} icon={Globe} label="Domain Settings" />
              <SidebarItem active={subTab === "advanced"} onClick={() => setSubTab("advanced")} icon={Settings} label="Advanced Config" />
            </CardContent>
          </Card>
        </div>

        <div className="flex-1 min-w-0">
          {subTab === "overview" && <CookieOverview />}
          {subTab === "design" && <BannerDesigner />}
          {subTab === "inventory" && <CookieInventory />}
          {subTab === "domains" && <DomainConfig />}
          {subTab === "advanced" && (
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle>Advanced Settings</CardTitle>
                <CardDescription>Global compliance configurations for all cookie banners.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <div className="font-medium">Strict Mode Compliance</div>
                    <div className="text-xs text-slate-500">Block all non-essential cookies until consent is explicitly given.</div>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <div className="font-medium">Geo-Location Detection</div>
                    <div className="text-xs text-slate-500">Automatically adjust banner based on user's region (GDPR vs CCPA).</div>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <div className="font-medium">Implicit Consent</div>
                    <div className="text-xs text-slate-500">Consider scrolling or clicking as consent (Not recommended for EU).</div>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function NoticesManagementView() {
  const [subTab, setSubTab] = useState("all");

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPIBox icon={FileText} label="Active Notices" value="2" trend="3 total" />
        <KPIBox icon={Eye} label="Total Visits" value="2,130" trend="+12% today" color="text-blue-600" />
        <KPIBox icon={Clock} label="Avg Read Time" value="38s" trend="Healthy" color="text-emerald-600" />
        <KPIBox icon={Users} label="Acknowledgements" value="1,450" trend="68% rate" />
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-64 shrink-0">
          <Card className="border-slate-200">
            <CardContent className="p-2 flex flex-col gap-1">
              <SidebarItem active={subTab === "all"} onClick={() => setSubTab("all")} icon={FileText} label="Manage Notices" />
              <SidebarItem active={subTab === "analytics"} onClick={() => setSubTab("analytics")} icon={BarChart3} label="Visit Analytics" />
              <SidebarItem active={subTab === "history"} onClick={() => setSubTab("history")} icon={History} label="Change History" />
            </CardContent>
          </Card>
        </div>

        <div className="flex-1 min-w-0">
          {subTab === "all" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {MOCK_NOTICES.map((notice) => (
                <Card key={notice.id} className="hover:shadow-md transition-all border-slate-200 overflow-hidden">
                  <div className={`h-1.5 w-full ${notice.status === "Published" ? "bg-emerald-500" : "bg-slate-300"}`} />
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <Badge variant={notice.status === "Published" ? "success" : "secondary"}>
                        {notice.status}
                      </Badge>
                    </div>
                    <CardTitle className="mt-4 text-xl">{notice.title}</CardTitle>
                    <CardDescription>Version {notice.version} · Updated {notice.lastUpdate}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-100 my-4">
                      <div className="text-center">
                        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Views</div>
                        <div className="text-lg font-bold">{notice.views.toLocaleString()}</div>
                      </div>
                      <div className="text-center border-l">
                        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Avg Time</div>
                        <div className="text-lg font-bold">{notice.avgTime}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="w-full">Edit Content</Button>
                      <Button variant="outline" size="sm" className="w-full">Preview</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <button className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-slate-400 hover:border-primary hover:text-primary transition-all group min-h-[280px]">
                <div className="p-3 bg-slate-50 rounded-full group-hover:bg-primary/10 mb-3">
                  <Plus className="w-6 h-6" />
                </div>
                <span className="font-medium text-lg">Add New Policy Notice</span>
              </button>
            </div>
          )}

          {subTab === "analytics" && (
            <Card className="border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle>Visitor Analytics</CardTitle>
                  <CardDescription>Live tracking of who is visiting your legal notices.</CardDescription>
                </div>
                <Button size="sm" variant="outline"><RefreshCw className="w-4 h-4 mr-2" /> Refresh</Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Visitor (Email/IP)</th>
                        <th className="px-6 py-4">Notice</th>
                        <th className="px-6 py-4">Duration</th>
                        <th className="px-6 py-4">Device</th>
                        <th className="px-6 py-4">Browser</th>
                        <th className="px-6 py-4 text-right">Date/Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {MOCK_VISITS.map((visit) => (
                        <tr key={visit.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-900">{visit.visitor}</div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100">{visit.notice}</Badge>
                          </td>
                          <td className="px-6 py-4 text-slate-600 font-medium">{visit.duration}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-slate-600">
                              {visit.device === "Desktop" ? <Monitor className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}
                              {visit.device}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-600">{visit.browser}</td>
                          <td className="px-6 py-4 text-right text-slate-500 font-mono text-xs">{visit.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {subTab === "history" && (
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle>Version History</CardTitle>
                <CardDescription>Audit trail of all changes made to legal notices.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4 p-4 border rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <History className="w-5 h-5 text-slate-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-slate-900">Privacy Policy Updated</div>
                        <Badge variant="outline">v2.{i}</Badge>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">Section 4.2 updated to include new DPDPA compliance clauses regarding cross-border transfers.</p>
                      <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Rahul Kumar</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> May {10 + i}, 2024</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Sub Components ---

function CookieOverview() {
  return (
    <div className="grid grid-cols-1 gap-6">
      <Card className="border-slate-200 overflow-hidden">
        <CardHeader className="bg-white border-b">
          <CardTitle className="text-lg">Compliance Health</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-8 border-r flex flex-col items-center justify-center text-center">
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="80" cy="80" r="70" fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
                  <circle cx="80" cy="80" r="70" fill="transparent" stroke="#10b981" strokeWidth="12" strokeDasharray="440" strokeDashoffset="44" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold text-slate-900">94</span>
                  <span className="text-xs text-slate-500 uppercase font-semibold">Grade A</span>
                </div>
              </div>
              <h3 className="mt-6 font-semibold text-xl">Highly Compliant</h3>
              <p className="text-sm text-slate-500 max-w-[240px] mt-2">Your domains are following 9/10 recommended privacy guidelines.</p>
            </div>
            <div className="p-8 space-y-4">
              <h4 className="font-medium text-slate-900 mb-4">Compliance Checklist</h4>
              <CheckListItem label="GDPR Article 7 Compliance" status="passed" />
              <CheckListItem label="Cookie Categorization" status="passed" />
              <CheckListItem label="Banner Accessibility" status="passed" />
              <CheckListItem label="Opt-out mechanism" status="passed" />
              <CheckListItem label="Consent Logging" status="failed" warning="Missing for app.proteccio.ai" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BannerDesigner() {
  const [heading, setHeading] = useState("We value your privacy");
  const [pos, setPos] = useState("bottom");
  const [themeColor, setThemeColor] = useState("#10b981");
  const [device, setDevice] = useState("desktop");

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr,400px] gap-6">
      {/* Editor Side */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Banner Appearance</CardTitle>
          <CardDescription>Customize how your consent banner looks on your website.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Banner Heading</Label>
            <Input value={heading} onChange={(e) => setHeading(e.target.value)} />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Position</Label>
              <Select value={pos} onValueChange={setPos}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom">Bottom Bar</SelectItem>
                  <SelectItem value="top">Top Bar</SelectItem>
                  <SelectItem value="bottom-right">Bottom Right (Box)</SelectItem>
                  <SelectItem value="bottom-left">Bottom Left (Box)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Theme Color</Label>
              <div className="flex gap-2">
                <input type="color" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} className="w-10 h-10 rounded border" />
                <Input value={themeColor} readOnly className="font-mono text-xs" />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium text-sm">Advanced Options</h4>
            <div className="flex items-center justify-between">
              <Label className="text-slate-600 font-normal">Show Reject Button</Label>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-slate-600 font-normal">Show Preferences Button</Label>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-slate-600 font-normal">Animate Entry</Label>
              <Switch defaultChecked />
            </div>
          </div>
          
          <div className="pt-4">
            <Button className="w-full" onClick={() => toast.success("Settings saved as draft")}>
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Side */}
      <div className="space-y-4">
        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg w-fit">
          <Button variant={device === "desktop" ? "secondary" : "ghost"} size="sm" onClick={() => setDevice("desktop")}>
            <Monitor className="w-4 h-4 mr-1" /> Desktop
          </Button>
          <Button variant={device === "mobile" ? "secondary" : "ghost"} size="sm" onClick={() => setDevice("mobile")}>
            <Smartphone className="w-4 h-4 mr-1" /> Mobile
          </Button>
        </div>

        <div className={`relative border rounded-xl bg-white shadow-lg overflow-hidden transition-all duration-300 ${device === "desktop" ? "h-[500px] w-full" : "h-[500px] w-[280px] mx-auto"}`}>
          <div className="p-4 border-b bg-slate-50 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-emerald-400" />
            <div className="ml-2 flex-1 h-5 bg-white border rounded text-[10px] flex items-center px-2 text-slate-400 truncate">https://yourwebsite.com</div>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="h-4 w-3/4 bg-slate-100 rounded" />
            <div className="h-32 w-full bg-slate-50 rounded" />
            <div className="h-4 w-full bg-slate-100 rounded" />
            <div className="h-4 w-5/6 bg-slate-100 rounded" />
            <div className="h-4 w-1/2 bg-slate-100 rounded" />
          </div>

          {/* Banner Preview Overlay */}
          <div className={`absolute transition-all duration-500 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] bg-white p-6 border-t ${
            pos === "bottom" ? "bottom-0 left-0 right-0" : 
            pos === "top" ? "top-10 left-0 right-0 border-b border-t-0" :
            pos === "bottom-right" ? "bottom-4 right-4 w-[340px] rounded-xl border border-slate-200" :
            "bottom-4 left-4 w-[340px] rounded-xl border border-slate-200"
          }`}>
            <h5 className="font-bold text-lg leading-tight">{heading}</h5>
            <p className="text-slate-500 text-xs mt-2 leading-relaxed">
              We use cookies to improve your experience and analyze traffic. By clicking "Accept", you agree to our use of cookies.
            </p>
            <div className="flex gap-2 mt-4">
              <button className="px-4 py-2 rounded-lg text-white text-xs font-semibold flex-1 transition-colors" style={{ backgroundColor: themeColor }}>
                Accept All
              </button>
              <button className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold flex-1 hover:bg-slate-200 transition-colors">
                Reject All
              </button>
            </div>
            <div className="mt-3 text-center">
              <button className="text-[10px] text-slate-400 hover:text-slate-600 underline">Privacy Preferences</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CookieInventory() {
  return (
    <Card className="border-slate-200">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Cookie Inventory</CardTitle>
          <CardDescription>Global repository of all trackers detected across your domains.</CardDescription>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input className="pl-9 h-9 w-64" placeholder="Search cookies..." />
          </div>
          <Button size="sm" variant="outline"><Download className="w-4 h-4 mr-2" /> CSV</Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Cookie Name</th>
                <th className="px-6 py-4">Domain</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Expiration</th>
                <th className="px-6 py-4">Provider</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOCK_COOKIES.map((cookie) => (
                <tr key={cookie.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 font-mono font-medium text-slate-900">{cookie.name}</td>
                  <td className="px-6 py-4 text-slate-600">{cookie.domain}</td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className={
                      cookie.category === "Necessary" ? "border-emerald-200 bg-emerald-50 text-emerald-700" :
                      cookie.category === "Analytics" ? "border-blue-200 bg-blue-50 text-blue-700" :
                      "border-slate-200 bg-slate-50 text-slate-700"
                    }>
                      {cookie.category}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{cookie.expiration}</td>
                  <td className="px-6 py-4 text-slate-600 font-medium">{cookie.provider}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-emerald-600">
                      <CheckCircle className="w-4 h-4 mr-1.5" /> <span className="text-xs font-semibold">Active</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function DomainConfig() {
  return (
    <div className="space-y-6">
      <Card className="border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Connected Domains</CardTitle>
            <CardDescription>Websites where your cookie banner is currently active or pending.</CardDescription>
          </div>
          <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Add Domain</Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {MOCK_DOMAINS.map((domain) => (
              <div key={domain.id} className="p-6 hover:bg-slate-50/50 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${domain.status === "Verified" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                    <Globe className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{domain.url}</span>
                      <Badge variant={domain.status === "Verified" ? "success" : "secondary"}>{domain.status}</Badge>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Last Scan: {domain.lastScan} · {domain.pages} Pages · {domain.cookies} Cookies
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => toast.info("Installation script copied!")}>
                    <Code className="w-4 h-4 mr-2" /> Get Script
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9"><ExternalLink className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-rose-500"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 text-white border-none shadow-xl overflow-hidden relative">
        <div className="absolute right-0 top-0 w-64 h-64 bg-primary/20 blur-3xl rounded-full -mr-32 -mt-32" />
        <CardHeader>
          <div className="flex items-center gap-2 text-primary">
            <RefreshCw className="w-4 h-4 animate-spin-slow" />
            <span className="text-xs font-bold uppercase tracking-widest">Integration Hub</span>
          </div>
          <CardTitle className="text-2xl mt-2 text-white">Global Integration Script</CardTitle>
          <CardDescription className="text-slate-400">Add this script to your website's &lt;head&gt; section to enable the consent banner.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-black/40 rounded-xl p-4 font-mono text-sm text-emerald-400 border border-white/10 relative group">
            <code>
              {`<script src="https://cdn.proteccio.ai/v1/consent.js" id="proteccio-guardian" data-org="demo-org-123"></script>`}
            </code>
            <Button size="icon" variant="ghost" className="absolute right-2 top-2 text-white/50 hover:text-white hover:bg-white/10" onClick={() => {
              navigator.clipboard.writeText('<script src="https://cdn.proteccio.ai/v1/consent.js" id="proteccio-guardian" data-org="demo-org-123"></script>');
              toast.success("Script copied to clipboard!");
            }}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
            <Shield className="w-3 h-3" /> Auto-updates with your latest banner design and settings.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KPIBox({ icon: Icon, label, value, trend, color, colorBg }: any) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className={`p-2 rounded-lg ${colorBg || "bg-slate-100"} ${color || "text-slate-600"}`}>
            <Icon className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{trend}</span>
        </div>
        <div className="mt-4">
          <div className="text-3xl font-bold text-slate-900">{value}</div>
          <div className="text-sm text-slate-500 font-medium mt-1">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function SidebarItem({ active, onClick, icon: Icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
        active ? "bg-primary text-white shadow-md shadow-primary/20" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function CheckListItem({ label, status, warning }: any) {
  return (
    <div className="flex items-start gap-3 p-3 border rounded-lg bg-white">
      {status === "passed" ? (
        <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
      ) : (
        <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
      )}
      <div>
        <div className="text-sm font-medium text-slate-900">{label}</div>
        {warning && <div className="text-xs text-rose-500 font-medium mt-0.5">{warning}</div>}
      </div>
    </div>
  );
}
