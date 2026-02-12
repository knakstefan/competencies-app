import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { parseContent, detectFormat, CompetencyExportData } from "@/lib/competencyFormat";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CompetencyImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
  existingCount?: number;
  roleId?: string;
}

export const CompetencyImportDialog = ({
  open,
  onOpenChange,
  onImportComplete,
  existingCount = 0,
  roleId,
}: CompetencyImportDialogProps) => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<CompetencyExportData | null>(null);
  const { toast } = useToast();
  const bulkImport = useMutation(api.competencies.bulkImport);

  const detectedFormat = content.trim() ? detectFormat(content) : null;

  const handleContentChange = (value: string) => {
    setContent(value);
    setError(null);
    setPreview(null);

    if (value.trim()) {
      try {
        const parsed = parseContent(value);
        setPreview(parsed);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to parse content");
      }
    }
  };

  const handleImport = async () => {
    if (!preview) return;

    setLoading(true);
    setError(null);

    try {
      let nextCompIndex = existingCount;

      const competenciesData = preview.competencies.map((comp, i) => ({
        title: comp.title,
        description: comp.description || undefined,
        orderIndex: nextCompIndex + i + 1,
        subCompetencies: comp.subCompetencies.map((sub, subIndex) => ({
          title: sub.title,
          orderIndex: subIndex + 1,
          associateLevel: sub.associate_level || undefined,
          intermediateLevel: sub.intermediate_level || undefined,
          seniorLevel: sub.senior_level || undefined,
          leadLevel: sub.lead_level || undefined,
          principalLevel: sub.principal_level || undefined,
        })),
      }));

      await bulkImport({
        competencies: competenciesData,
        ...(roleId ? { roleId: roleId as any } : {}),
      });

      toast({
        title: "Import successful",
        description: `Imported ${preview.competencies.length} competencies`,
      });

      setContent("");
      setPreview(null);
      onOpenChange(false);
      onImportComplete();
    } catch (e) {
      console.error("Import error:", e);
      setError(e instanceof Error ? e.message : "Failed to import competencies");
      toast({
        title: "Import failed",
        description: e instanceof Error ? e.message : "Failed to import competencies",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setContent("");
      setError(null);
      setPreview(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Competencies</DialogTitle>
          <DialogDescription>
            Paste your competencies in Markdown or JSON format. The format will be auto-detected.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Detected format:</span>
            {detectedFormat ? (
              <Badge variant="secondary">{detectedFormat.toUpperCase()}</Badge>
            ) : (
              <span className="text-sm text-muted-foreground">Paste content to detect</span>
            )}
          </div>

          <Textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder={`Paste your competencies here...

Example Markdown:
# 1. Visual Design

## 1.1 Typography
### Associate
- Understands basic type hierarchy
- Can apply existing type styles

Or JSON:
{
  "competencies": [
    {
      "title": "Visual Design",
      "subCompetencies": [...]
    }
  ]
}`}
            className="font-mono text-sm flex-1 min-h-[300px] resize-none"
          />

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {preview && !error && (
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <p className="font-medium mb-1">Preview:</p>
              <p className="text-muted-foreground">
                {preview.competencies.length} competencies with{" "}
                {preview.competencies.reduce((acc, c) => acc + c.subCompetencies.length, 0)} sub-competencies
              </p>
              <ul className="mt-2 space-y-1">
                {preview.competencies.slice(0, 3).map((c, i) => (
                  <li key={i} className="text-muted-foreground">
                    • {c.title} ({c.subCompetencies.length} sub-competencies)
                  </li>
                ))}
                {preview.competencies.length > 3 && (
                  <li className="text-muted-foreground">
                    ... and {preview.competencies.length - 3} more
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!preview || loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
