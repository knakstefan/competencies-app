import { Target, Users, Telescope, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import heroImage from "@/assets/competency-hero.jpg";
import growthIcon from "@/assets/growth-path-icon.jpg";
import collaborationIcon from "@/assets/collaboration-icon.jpg";
import visionIcon from "@/assets/vision-icon.jpg";

export const CompetencyIntroduction = () => {
  return (
    <div className="space-y-12 mb-16">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl shadow-2xl">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/60 backdrop-blur-sm" />
        </div>
        
        <div className="relative z-10 px-8 py-16 md:px-16 md:py-24">
          <Badge className="mb-6 text-lg px-4 py-2 bg-primary/20 border-primary/40">
            P1–P5 Framework
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 gradient-heading leading-tight">
            Knak Product Designer
            <br />
            Competency Framework
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-2 font-light">
            Associate → Principal
          </p>
          
          <p className="text-lg text-muted-foreground/80 italic">
            Comprehensive, Notion-Ready Edition
          </p>
        </div>
      </div>

      {/* Introduction Card */}
      <Card className="border-2 border-primary/20 shadow-xl">
        <CardContent className="p-8 md:p-12">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 rounded-xl bg-primary/10">
              <Target className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-4">Introduction</h2>
              <div className="h-1 w-20 bg-gradient-primary rounded-full" />
            </div>
          </div>
          
          <p className="text-lg text-muted-foreground leading-relaxed mb-6">
            This competency framework defines the full set of skills, behaviors, and expectations for Product Designers at Knak. It provides:
          </p>
          
          <ul className="space-y-4 text-muted-foreground">
            <li className="flex items-start gap-3">
              <div className="mt-1 p-1 rounded bg-primary/10">
                <div className="w-2 h-2 rounded-full bg-primary" />
              </div>
              <span>A shared language for evaluating design craft, collaboration, research, strategy, technical fluency, and leadership</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="mt-1 p-1 rounded bg-primary/10">
                <div className="w-2 h-2 rounded-full bg-primary" />
              </div>
              <span>Clear growth paths from P1 (Associate) to P5 (Principal)</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="mt-1 p-1 rounded bg-primary/10">
                <div className="w-2 h-2 rounded-full bg-primary" />
              </div>
              <span>A standardized basis for hiring, leveling, performance reviews, promotion, and development planning</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="mt-1 p-1 rounded bg-primary/10">
                <div className="w-2 h-2 rounded-full bg-primary" />
              </div>
              <span>Alignment with industry best practices (including NN/g and leading design organizations)</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="mt-1 p-1 rounded bg-primary/10">
                <div className="w-2 h-2 rounded-full bg-primary" />
              </div>
              <span>Coverage across core UX skills, product thinking, system thinking, business acumen, accessibility, ethical design, and design systems</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* How to Use Section */}
      <div className="grid md:grid-cols-2 gap-8">
        <Card className="border border-border/50 shadow-lg hover:shadow-xl transition-all">
          <CardContent className="p-8">
            <div className="mb-6 relative">
              <img 
                src={growthIcon} 
                alt="Growth Path" 
                className="w-full h-48 object-cover rounded-xl opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent rounded-xl" />
            </div>
            
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-6 h-6 text-primary" />
              <h3 className="text-2xl font-bold">How to Use This Framework</h3>
            </div>
            
            <p className="text-muted-foreground mb-4">
              Managers and designers should use this to:
            </p>
            
            <ol className="space-y-3 text-muted-foreground">
              <li className="flex gap-3">
                <span className="font-semibold text-primary min-w-[1.5rem]">1.</span>
                <span>Identify current level</span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-primary min-w-[1.5rem]">2.</span>
                <span>Assess strengths and gaps</span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-primary min-w-[1.5rem]">3.</span>
                <span>Build development plans targeting next-level competencies</span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-primary min-w-[1.5rem]">4.</span>
                <span>Align expectations across triads and cross-functional partners</span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-primary min-w-[1.5rem]">5.</span>
                <span>Support hiring and interview scorecards using level-appropriate criteria</span>
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card className="border border-border/50 shadow-lg hover:shadow-xl transition-all">
          <CardContent className="p-8">
            <div className="mb-6 relative">
              <img 
                src={visionIcon} 
                alt="Vision and Strategy" 
                className="w-full h-48 object-cover rounded-xl opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent rounded-xl" />
            </div>
            
            <div className="flex items-center gap-3 mb-4">
              <Telescope className="w-6 h-6 text-primary" />
              <h3 className="text-2xl font-bold">Understanding Levels (P1–P5)</h3>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">P1</Badge>
                  <span className="font-semibold text-sm">Associate</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Learns foundational skills; completes well-defined tasks with guidance; focused on craft fundamentals and understanding processes.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">P2</Badge>
                  <span className="font-semibold text-sm">Intermediate</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Independently executes standard design work; contributes meaningfully to team discussions; shows growing ownership and consistency.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">P3</Badge>
                  <span className="font-semibold text-sm">Senior</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Owns large, complex features or problem spaces; synthesizes insights; drives cross-functional alignment; mentors others informally.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">P4</Badge>
                  <span className="font-semibold text-sm">Lead</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Owns UX direction across product areas; mentors designers; drives multi-team alignment; influences strategy and process improvements.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">P5</Badge>
                  <span className="font-semibold text-sm">Principal</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Sets organization-wide UX vision; leads cross-org alignment; defines systems, frameworks, and long-term design strategy.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alignment Section */}
      <Card className="border-2 border-primary/20 shadow-xl bg-gradient-to-br from-card to-card/50">
        <CardContent className="p-8 md:p-12">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="md:w-1/3">
              <img 
                src={collaborationIcon} 
                alt="Cross-functional Alignment" 
                className="w-full rounded-2xl shadow-lg"
              />
            </div>
            
            <div className="md:w-2/3">
              <div className="flex items-center gap-3 mb-6">
                <Users className="w-8 h-8 text-primary" />
                <h3 className="text-3xl font-bold">Cross-Functional Alignment</h3>
              </div>
              
              <p className="text-lg text-muted-foreground leading-relaxed">
                This framework serves as the foundation for alignment across the entire product organization. 
                It ensures that designers, product managers, engineers, and stakeholders share a common 
                understanding of expectations at each level, facilitating better collaboration, clearer 
                communication, and more effective team dynamics.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="h-px bg-gradient-primary opacity-50" />
    </div>
  );
};
