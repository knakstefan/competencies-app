import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useRole } from "@/hooks/useRole";
import { useRoleLevels } from "@/hooks/useRoleLevels";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles, Copy, Check, FileText } from "lucide-react";

const JobDescriptionPage = () => {
  const { roleId, role } = useRole();
  const { isAdmin } = useAuth();
  const { levels, loading: levelsLoading } = useRoleLevels(roleId);
  const { toast } = useToast();

  const [selectedLevelKey, setSelectedLevelKey] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [roleFocus, setRoleFocus] = useState("");

  const generateAction = useAction(api.ai.generateJobDescription);

  // Auto-select first level once loaded
  const effectiveLevel = selectedLevelKey || (levels.length > 0 ? levels[0].key : "");

  // Fetch all JDs for this role to show dot indicators
  const allJds = useQuery(api.jobDescriptions.listForRole, { roleId });
  const jdLevelKeys = new Set((allJds ?? []).map((jd) => jd.levelKey));

  // Fetch JD for selected level
  const jd = useQuery(
    api.jobDescriptions.getForRoleLevel,
    effectiveLevel ? { roleId, levelKey: effectiveLevel } : "skip"
  );

  const selectedLevel = levels.find((l) => l.key === effectiveLevel);
  const content = jd?.content as {
    title: string;
    summary: string;
    portfolioCallout: string;
    responsibilities: string[];
    requirements: string[];
    niceToHave: string[];
    levelContext: string;
  } | null;

  const handleGenerateClick = () => {
    if (!effectiveLevel || !selectedLevel) return;
    setDialogOpen(true);
  };

  const handleGenerate = async () => {
    if (!effectiveLevel || !selectedLevel) return;
    setDialogOpen(false);
    setGenerating(true);
    try {
      await generateAction({
        roleId,
        levelKey: effectiveLevel,
        levelLabel: selectedLevel.label,
        ...(roleFocus.trim() ? { roleFocus: roleFocus.trim() } : {}),
      });
      toast({ title: "Success", description: "Job description generated!" });
    } catch (error: any) {
      const message = error?.message || "";
      if (message.includes("429")) {
        toast({
          title: "Rate Limit",
          description: "Too many requests. Please try again in a moment.",
          variant: "destructive",
        });
      } else if (message.includes("402")) {
        toast({
          title: "Credits Required",
          description: "AI credits depleted. Please add credits to continue.",
          variant: "destructive",
        });
      } else if (message.includes("No competency criteria")) {
        toast({
          title: "No Criteria",
          description: message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to generate job description. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!content) return;
    const lines: string[] = [
      content.title,
      "",
      content.summary,
    ];
    if (content.portfolioCallout) {
      lines.push("", content.portfolioCallout);
    }
    lines.push(
      "",
      "Responsibilities",
      ...(content.responsibilities ?? []).map((r) => `- ${r}`),
      "",
      "Requirements",
      ...(content.requirements ?? []).map((r) => `- ${r}`),
    );
    if ((content.niceToHave ?? []).length > 0) {
      lines.push("", "Nice to Have", ...content.niceToHave.map((r) => `- ${r}`));
    }
    if (content.levelContext) {
      lines.push("", content.levelContext);
    }

    const text = lines.join("\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for browsers/contexts where clipboard API is denied
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    toast({ title: "Copied", description: "Job description copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  if (levelsLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (levels.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        No levels configured for this role. Add levels first.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header controls */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            Level:
          </label>
          <Select
            value={effectiveLevel}
            onValueChange={setSelectedLevelKey}
          >
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              {levels.map((level) => (
                <SelectItem key={level.key} value={level.key}>
                  <span className="flex items-center gap-2">
                    {level.label}
                    {jdLevelKeys.has(level.key) && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isAdmin && (
          <Button onClick={handleGenerateClick} disabled={generating || !effectiveLevel}>
            {generating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            {content ? "Regenerate" : "Generate"}
          </Button>
        )}
      </div>

      {/* Generate dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Job Description</DialogTitle>
            <DialogDescription>
              Optionally provide additional context to tailor this job description to a specific hiring need.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="role-focus">Role focus</Label>
              <Textarea
                id="role-focus"
                placeholder="e.g. Joining the Growth team to own onboarding flows and activation experiments"
                value={roleFocus}
                onChange={(e) => setRoleFocus(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Describe the team, specific responsibilities, or context for this hire.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerate}>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Content */}
      {jd === undefined && effectiveLevel ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : content ? (
        <div className="space-y-6 animate-fade-up">
          {/* Title + meta */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">{content.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Generated{" "}
                {new Date(jd!.generatedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? (
                <Check className="w-4 h-4 mr-1.5" />
              ) : (
                <Copy className="w-4 h-4 mr-1.5" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>

          {/* Summary */}
          <p className="text-muted-foreground leading-relaxed">{content.summary}</p>

          {/* Portfolio callout */}
          {content.portfolioCallout && (
            <p className="text-sm font-medium text-primary">{content.portfolioCallout}</p>
          )}

          {/* Responsibilities */}
          {content.responsibilities.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold mb-3">Responsibilities</h3>
              <ul className="list-disc list-outside ml-5 space-y-2">
                {content.responsibilities.map((item, i) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Requirements */}
          {content.requirements.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold mb-3">Requirements</h3>
              <ul className="list-disc list-outside ml-5 space-y-2">
                {content.requirements.map((item, i) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Nice to Have */}
          {content.niceToHave.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold mb-3">Nice to Have</h3>
              <ul className="list-disc list-outside ml-5 space-y-2">
                {content.niceToHave.map((item, i) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Level Context */}
          {content.levelContext && (
            <p className="text-sm text-muted-foreground italic border-t border-border/50 pt-4">
              {content.levelContext}
            </p>
          )}
        </div>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
            <FileText className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <div>
            <p className="text-muted-foreground">
              No job description for{" "}
              <span className="font-medium text-foreground">
                {selectedLevel?.label}
              </span>{" "}
              yet.
            </p>
            {isAdmin && (
              <p className="text-sm text-muted-foreground mt-1">
                Click "Generate JD" to create one from the competency framework.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default JobDescriptionPage;
