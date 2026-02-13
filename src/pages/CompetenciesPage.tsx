import { useState } from "react";
import { ManageTab } from "@/components/ManageTab";
import { LevelsTab } from "@/components/LevelsTab";
import { CompetencyImportDialog } from "@/components/CompetencyImportDialog";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { useCompetencies } from "@/hooks/useCompetencies";
import { useRoleLevels } from "@/hooks/useRoleLevels";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Pencil, SlidersVertical, Plus, Upload, Sparkles, Layers, ListTree } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const competencySchema = z.object({
  title: z.string().trim().min(1, "Title cannot be empty").max(200, "Title must be less than 200 characters"),
  description: z.string().trim().max(1000, "Description must be less than 1000 characters").optional(),
});

const CompetenciesPage = () => {
  const { isSignedIn, isAdmin } = useAuth();
  const { roleId, role } = useRole();
  const { competencies, subCompetencies, loading } = useCompetencies(roleId);
  const { levels } = useRoleLevels(roleId);
  const { toast } = useToast();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ title: "", description: "" });
  const createMutation = useMutation(api.competencies.create);

  if (loading || !isSignedIn) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleAddCompetency = async () => {
    try {
      const validated = competencySchema.parse(formData);
      await createMutation({
        title: validated.title,
        description: validated.description || undefined,
        orderIndex: 1,
        ...(roleId ? { roleId } : {}),
      });
      toast({ title: "Success", description: "Competency added successfully" });
      setAddDialogOpen(false);
      setFormData({ title: "", description: "" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: "Invalid Input", description: error.errors[0].message, variant: "destructive" });
        return;
      }
      toast({ title: "Error", description: "Failed to add competency", variant: "destructive" });
    }
  };

  const roleTitle = role?.title;
  const isEmpty = competencies.length === 0;

  // Empty state
  if (isEmpty) {
    return (
      <>
        <div className="relative flex flex-col items-center justify-center min-h-[60vh]">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] w-[700px] h-[500px] rounded-full"
              style={{
                background:
                  "radial-gradient(ellipse, hsl(var(--primary) / 0.04) 0%, transparent 70%)",
              }}
            />
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
            <div
              className="mx-auto mb-8 w-20 h-20 rounded-2xl bg-card flex items-center justify-center ring-1 ring-border animate-fade-up"
              style={{ animationDelay: "0ms" }}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
            </div>

            <h1
              className="text-4xl font-bold tracking-tight mb-3 animate-fade-up"
              style={{ animationDelay: "80ms" }}
            >
              Add your first{" "}
              <span className="gradient-heading">competency</span>
            </h1>

            <p
              className="text-muted-foreground text-base leading-relaxed max-w-sm mx-auto mb-10 animate-fade-up"
              style={{ animationDelay: "160ms" }}
            >
              Define the skills and criteria that make up{roleTitle ? ` the ${roleTitle} role` : " this role"}.
            </p>

            <div
              className="flex items-center justify-center gap-3 animate-fade-up"
              style={{ animationDelay: "240ms" }}
            >
              <Button
                onClick={() => setAddDialogOpen(true)}
                size="lg"
                className="rounded-full px-8 h-12 text-base"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Competency
              </Button>
              <Button
                onClick={() => setImportDialogOpen(true)}
                variant="outline"
                size="lg"
                className="rounded-full px-8 h-12 text-base"
              >
                <Upload className="w-5 h-5 mr-2" />
                Import
              </Button>
            </div>
          </div>
        </div>

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Competency</DialogTitle>
              <DialogDescription>Enter the details for the new competency.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="empty-title">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="empty-title"
                  placeholder="e.g., Visual Design"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="empty-description">Description (Optional)</Label>
                <Textarea
                  id="empty-description"
                  placeholder="Provide a brief description of this competency..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">{formData.description.length}/1000 characters</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddCompetency}>Add Competency</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <CompetencyImportDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          onImportComplete={() => {}}
          roleId={roleId}
        />
      </>
    );
  }

  // Populated state
  return (
    <div className="ambient-glow">
      <div className="relative z-10 max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold gradient-heading">Competencies</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            {roleTitle ? `Competency framework for the ${roleTitle} role.` : "Competency framework for this role."}
          </p>
        </div>

        {/* Stats pill */}
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center gap-5 px-6 py-2.5 rounded-full bg-card/60 ring-1 ring-border/50 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-primary/70" />
              {competencies.length} {competencies.length === 1 ? "Competency" : "Competencies"}
            </span>
            <div className="w-px h-3.5 bg-border" />
            <span className="flex items-center gap-1.5">
              <ListTree className="w-3.5 h-3.5" />
              {subCompetencies.length} Sub-{subCompetencies.length === 1 ? "competency" : "competencies"}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="manage" className="space-y-6">
          <div className="flex justify-center">
            <TabsList>
              <TabsTrigger value="manage" className="flex items-center gap-2">
                <Pencil className="w-3.5 h-3.5" />
                Manage
              </TabsTrigger>
              <TabsTrigger value="levels" className="flex items-center gap-2">
                <SlidersVertical className="w-3.5 h-3.5" />
                Levels
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="manage">
            <ManageTab
              competencies={competencies}
              subCompetencies={subCompetencies}
              onUpdate={() => {}}
              loading={loading}
              roleId={roleId}
            />
          </TabsContent>

          <TabsContent value="levels">
            <LevelsTab
              roleType={role?.type || "ic"}
              levels={levels}
              competencies={competencies}
              subCompetencies={subCompetencies}
              loading={loading}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CompetenciesPage;
