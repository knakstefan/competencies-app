import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Competency, SubCompetency } from "@/types/competency";
import { exportToJSON, exportToMarkdown } from "@/lib/competencyFormat";
import { RoleLevel } from "@/lib/levelUtils";
import { Copy, Check, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CompetencyExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competencies: Competency[];
  subCompetencies: SubCompetency[];
  levels?: RoleLevel[];
}

export const CompetencyExportDialog = ({
  open,
  onOpenChange,
  competencies,
  subCompetencies,
  levels,
}: CompetencyExportDialogProps) => {
  const [format, setFormat] = useState<"markdown" | "json">("markdown");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const exportedContent =
    format === "json"
      ? exportToJSON(competencies, subCompetencies)
      : exportToMarkdown(competencies, subCompetencies);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportedContent);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Content copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    const filename = `competencies.${format === "json" ? "json" : "md"}`;
    const blob = new Blob([exportedContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Downloaded!",
      description: `Saved as ${filename}`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Export Competencies</DialogTitle>
          <DialogDescription>
            Choose a format and copy or download your competencies.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={format} onValueChange={(v) => setFormat(v as "markdown" | "json")}>
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="markdown">Markdown</TabsTrigger>
              <TabsTrigger value="json">JSON</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>

          <TabsContent value="markdown" className="mt-0">
            <Textarea
              value={exportedContent}
              readOnly
              className="font-mono text-sm h-[400px] resize-none"
            />
          </TabsContent>

          <TabsContent value="json" className="mt-0">
            <Textarea
              value={exportedContent}
              readOnly
              className="font-mono text-sm h-[400px] resize-none"
            />
          </TabsContent>
        </Tabs>

        <p className="text-xs text-muted-foreground mt-2">
          {format === "markdown"
            ? "Markdown works great for Notion and ChatGPT conversations."
            : "JSON is best for programmatic use and data integrity."}
        </p>
      </DialogContent>
    </Dialog>
  );
};
