import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Competency {
  _id: string;
  title: string;
  orderIndex: number;
}

interface SubCompetency {
  _id: string;
  competencyId: string;
  title: string;
  orderIndex: number;
}

interface AssessmentOverviewDialogProps {
  open: boolean;
  onClose: () => void;
  assessmentId: string;
  assessmentDate: number;
  competencies: Competency[];
  subCompetencies: SubCompetency[];
}

export const AssessmentOverviewDialog = ({
  open,
  onClose,
  assessmentId,
  assessmentDate,
  competencies,
  subCompetencies,
}: AssessmentOverviewDialogProps) => {
  const progressData = useQuery(
    api.progress.listForAssessment,
    open ? { assessmentId: assessmentId as Id<"assessments"> } : "skip"
  );

  const progressIds = useMemo(
    () => (progressData || []).map((p: any) => p._id),
    [progressData]
  );

  const evaluationsData = useQuery(
    api.evaluations.listForProgressIds,
    progressIds.length > 0 ? { progressIds: progressIds as any } : "skip"
  );

  // Build progress lookup
  const progressMap = useMemo(() => {
    if (!progressData || !evaluationsData) return {};
    const evalsByProgress: Record<string, Array<{ criterionText: string; evaluation: string }>> = {};
    for (const e of evaluationsData as any[]) {
      if (!evalsByProgress[e.progressId]) evalsByProgress[e.progressId] = [];
      evalsByProgress[e.progressId].push(e);
    }
    const map: Record<string, {
      notes: string;
      evaluations: Array<{ criterionText: string; evaluation: string }>;
    }> = {};
    for (const p of progressData as any[]) {
      map[p.subCompetencyId] = {
        notes: p.notes || "",
        evaluations: evalsByProgress[p._id] || [],
      };
    }
    return map;
  }, [progressData, evaluationsData]);

  const getEvalBadge = (evaluation: string) => {
    switch (evaluation) {
      case "well_above":
        return <Badge variant="default" className="bg-emerald-600 text-xs">Well Above</Badge>;
      case "above":
        return <Badge variant="default" className="bg-green-600 text-xs">Above</Badge>;
      case "target":
        return <Badge variant="secondary" className="text-xs">At Target</Badge>;
      case "below":
        return <Badge variant="outline" className="text-xs text-orange-400 border-orange-400/50">Below</Badge>;
      case "well_below":
        return <Badge variant="destructive" className="text-xs">Well Below</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{evaluation}</Badge>;
    }
  };

  const sortedComps = [...competencies].sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {format(new Date(assessmentDate), "MMMM yyyy")} Assessment
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Completed {format(new Date(assessmentDate), "MMM d, yyyy 'at' h:mm a")}
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {sortedComps.map((comp) => {
            const compSubs = [...subCompetencies]
              .filter((sc) => sc.competencyId === comp._id)
              .sort((a, b) => a.orderIndex - b.orderIndex);

            const hasAnyProgress = compSubs.some((sub) => progressMap[sub._id]);
            if (!hasAnyProgress) return null;

            return (
              <div key={comp._id} className="space-y-3">
                <h3 className="font-semibold text-base border-b border-border/50 pb-2">{comp.title}</h3>
                {compSubs.map((sub) => {
                  const data = progressMap[sub._id];
                  if (!data) return null;

                  return (
                    <div key={sub._id} className="p-4 rounded-lg bg-muted/30 space-y-3">
                      <h4 className="font-medium text-sm">{sub.title}</h4>
                      {data.evaluations.length > 0 && (
                        <div className="space-y-1.5">
                          {data.evaluations.map((e, idx) => (
                            <div key={idx} className="flex items-start justify-between gap-3 text-sm">
                              <span className="text-muted-foreground flex-1">{e.criterionText}</span>
                              {getEvalBadge(e.evaluation)}
                            </div>
                          ))}
                        </div>
                      )}
                      {data.notes && (
                        <p className="text-sm text-muted-foreground italic">{data.notes}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
