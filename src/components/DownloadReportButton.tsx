import { Download, FileSpreadsheet, FileJson, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { downloadCSV, downloadJSON, downloadHTMLReport, timestamp } from "@/lib/export";

interface Props {
  moduleLabel: string; // e.g. "DSAR"
  filenameBase: string; // e.g. "dsar"
  rows: Record<string, unknown>[];
  summary?: { label: string; value: string | number }[];
  size?: "sm" | "default";
}

export function DownloadReportButton({ moduleLabel, filenameBase, rows, summary, size = "sm" }: Props) {
  const stamp = timestamp();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size={size} variant="outline" className="gap-1.5">
          <Download className="h-3.5 w-3.5" /> Download report
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{moduleLabel} · {rows.length} record{rows.length === 1 ? "" : "s"}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => downloadCSV(`${filenameBase}-${stamp}.csv`, rows)}>
          <FileSpreadsheet className="mr-2 h-4 w-4" /> CSV (spreadsheet)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => downloadJSON(`${filenameBase}-${stamp}.json`, rows)}>
          <FileJson className="mr-2 h-4 w-4" /> JSON
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            downloadHTMLReport({
              filename: `${filenameBase}-${stamp}.html`,
              title: `${moduleLabel} report`,
              subtitle: `Generated ${new Date().toLocaleString()}`,
              rows,
              summary,
            })
          }
        >
          <FileText className="mr-2 h-4 w-4" /> Printable / PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
