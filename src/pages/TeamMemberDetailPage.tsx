import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { MemberProgressView } from "@/components/MemberProgressView";
import { PromotionPlan } from "@/components/PromotionPlan";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  TrendingUp,
  Loader2,
  ClipboardCheck,
  Calendar,
} from "lucide-react";

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const TeamMemberDetailPage = () => {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { roleId } = useRole();

  const member = useQuery(
    api.teamMembers.get,
    memberId ? { id: memberId as Id<"teamMembers"> } : "skip"
  );

  const assessments = useQuery(
    api.assessments.listForMember,
    memberId ? { memberId: memberId as Id<"teamMembers"> } : "skip"
  );

  if (member === undefined) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (member === null) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Team member not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(`/roles/${roleId}/team`)}>
          Back to Team
        </Button>
      </div>
    );
  }

  const completedAssessments = (assessments || []).filter((a: any) => a.status === "completed");
  const lastAssessment = completedAssessments.length > 0
    ? [...completedAssessments].sort((a: any, b: any) => (b.completedAt || 0) - (a.completedAt || 0))[0]
    : null;

  return (
    <div className="ambient-glow">
      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3 animate-fade-up">
          <Badge variant="outline" className="text-xs">
            {member.role}
          </Badge>
          <h1 className="text-4xl font-bold gradient-heading">{member.name}</h1>
          <p className="text-muted-foreground">
            Started {formatDate(member.startDate)}
          </p>
        </div>

        {/* Stats bar */}
        <div className="flex items-center justify-center animate-fade-up" style={{ animationDelay: "80ms" }}>
          <div className="inline-flex items-center gap-5 px-6 py-2.5 rounded-full bg-card/60 ring-1 ring-border/50 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ClipboardCheck className="w-3.5 h-3.5 text-primary/70" />
              {completedAssessments.length} {completedAssessments.length === 1 ? "Assessment" : "Assessments"}
            </span>
            {lastAssessment && (
              <>
                <div className="w-px h-3.5 bg-border" />
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Last assessed {formatDate((lastAssessment as any).completedAt)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="animate-fade-up" style={{ animationDelay: "160ms" }}>
          <Tabs defaultValue="progress" className="space-y-8">
            <TabsList className="grid w-full max-w-md grid-cols-2 mx-auto">
              <TabsTrigger value="progress" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Assessment
              </TabsTrigger>
              <TabsTrigger value="promotion" className="gap-2">
                <TrendingUp className="w-4 h-4" />
                Progression Plan
              </TabsTrigger>
            </TabsList>

            <TabsContent value="progress">
              <MemberProgressView member={member} isAdmin={isAdmin} roleId={roleId} />
            </TabsContent>

            <TabsContent value="promotion">
              <PromotionPlan member={member} isAdmin={isAdmin} roleId={roleId} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default TeamMemberDetailPage;
