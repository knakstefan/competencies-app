import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useAuth } from "@/hooks/useAuth";
import { MemberProgressView } from "@/components/MemberProgressView";
import { PromotionPlan } from "@/components/PromotionPlan";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, BarChart3, TrendingUp, Loader2 } from "lucide-react";

const TeamMemberDetailPage = () => {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const member = useQuery(
    api.teamMembers.get,
    memberId ? { id: memberId as Id<"teamMembers"> } : "skip"
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
        <Button variant="outline" className="mt-4" onClick={() => navigate("/team")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Team
        </Button>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-center text-center gap-4 relative">
        <Button
          variant="outline"
          className="absolute left-0 cursor-pointer"
          onClick={() => navigate("/team")}
        >
          <ArrowLeft className="h-8 w-8 mr-2" />
          Back
        </Button>

        <div>
          <h2 className="text-3xl font-bold">{member.name}</h2>
          <p className="text-muted-foreground">
            {member.role} • Started {formatDate(member.startDate)}
          </p>
        </div>
      </div>

      <Tabs defaultValue="progress" className="space-y-6">
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
          <MemberProgressView member={member} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="promotion">
          <PromotionPlan member={member} isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TeamMemberDetailPage;
