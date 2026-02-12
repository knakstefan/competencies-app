import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { RoleCard } from "@/components/RoleCard";
import { CreateRoleDialog } from "@/components/CreateRoleDialog";
import { Button } from "@/components/ui/button";
import { ChartNetwork, Plus, Users, UserPlus, Loader2, Sparkles } from "lucide-react";

const RolesPage = () => {
  const { isAdmin } = useAuth();
  const roles = useQuery(api.roles.listWithStats);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (roles === undefined) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Empty state
  if (roles.length === 0) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-[70vh]">
        {/* Background atmosphere */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Primary glow */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] w-[700px] h-[500px] rounded-full"
            style={{
              background:
                "radial-gradient(ellipse, hsl(var(--primary) / 0.04) 0%, transparent 70%)",
            }}
          />
          {/* Structural grid — evokes the framework/matrix concept */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(hsl(var(--border) / 0.3) 1px, transparent 1px),
                linear-gradient(90deg, hsl(var(--border) / 0.3) 1px, transparent 1px)
              `,
              backgroundSize: "80px 80px",
              mask: "radial-gradient(ellipse 50% 40% at 50% 45%, black 0%, transparent 100%)",
              WebkitMask:
                "radial-gradient(ellipse 50% 40% at 50% 45%, black 0%, transparent 100%)",
            }}
          />
        </div>

        <div className="relative z-10 text-center max-w-lg">
          {/* Icon */}
          <div
            className="mx-auto mb-8 w-20 h-20 rounded-2xl bg-card flex items-center justify-center ring-1 ring-border animate-fade-up"
            style={{ animationDelay: "0ms" }}
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
          </div>

          {/* Heading */}
          <h1
            className="text-4xl font-bold tracking-tight mb-3 animate-fade-up"
            style={{ animationDelay: "80ms" }}
          >
            Create your first{" "}
            <span className="gradient-heading">role</span>
          </h1>

          {/* Description */}
          <p
            className="text-muted-foreground text-base leading-relaxed max-w-sm mx-auto mb-10 animate-fade-up"
            style={{ animationDelay: "160ms" }}
          >
            Roles define competency frameworks for your team. Start by
            creating a role to map skills across career levels.
          </p>

          {/* CTA */}
          {isAdmin && (
            <div
              className="animate-fade-up"
              style={{ animationDelay: "240ms" }}
            >
              <Button
                onClick={() => setDialogOpen(true)}
                size="lg"
                className="rounded-full px-8 h-12 text-base"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Role
              </Button>
            </div>
          )}
        </div>

        <CreateRoleDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          existingCount={0}
        />
      </div>
    );
  }

  // Stats summary
  const totalCompetencies = roles.reduce(
    (sum, r) => sum + r.competencyCount,
    0,
  );
  const totalMembers = roles.reduce((sum, r) => sum + r.memberCount, 0);
  const totalCandidates = roles.reduce(
    (sum, r) => sum + r.candidateCount,
    0,
  );

  return (
    <div className="ambient-glow">
      <div className="relative z-10 max-w-6xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold gradient-heading">Roles</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Competency frameworks for your team, from IC to management.
          </p>
        </div>

        {/* Stats bar */}
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center gap-5 px-6 py-2.5 rounded-full bg-card/60 ring-1 ring-border/50 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ChartNetwork className="w-3.5 h-3.5 text-primary/70" />
              {roles.length} {roles.length === 1 ? "Role" : "Roles"}
            </span>
            <div className="w-px h-3.5 bg-border" />
            <span>{totalCompetencies} Competencies</span>
            <div className="w-px h-3.5 bg-border" />
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {totalMembers}
            </span>
            <div className="w-px h-3.5 bg-border" />
            <span className="flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5" />
              {totalCandidates}
            </span>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((role, index) => (
            <RoleCard key={role._id} role={role} index={index} isAdmin={isAdmin} />
          ))}

          {/* Create card */}
          {isAdmin && (
            <button
              onClick={() => setDialogOpen(true)}
              className="animate-fade-up group flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border/40 p-8 text-muted-foreground transition-all duration-300 hover:border-primary/30 hover:text-primary hover:bg-primary/[0.02] min-h-[200px]"
              style={{ animationDelay: `${roles.length * 100}ms` }}
            >
              <div className="w-10 h-10 rounded-lg border border-dashed border-current flex items-center justify-center transition-colors group-hover:border-primary/40">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium">Create Role</span>
            </button>
          )}
        </div>
      </div>

      <CreateRoleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        existingCount={roles.length}
      />
    </div>
  );
};

export default RolesPage;
