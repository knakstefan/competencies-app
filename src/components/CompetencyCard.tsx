import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CompetencyCardProps {
  title: string;
  subCompetencies: Array<{
    id: string;
    title: string;
    description: string;
  }>;
}

export const CompetencyCard = ({ title, subCompetencies }: CompetencyCardProps) => {
  return (
    <Card className="hover:shadow-xl transition-all">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {subCompetencies.map((sub) => (
            <div
              key={sub.id}
              className="p-4 rounded-lg bg-muted/40 hover:bg-muted/60 transition-all"
            >
              <div className="mb-2">
                <h4 className="font-medium text-sm">{sub.title}</h4>
              </div>
              <div className="text-sm text-muted-foreground leading-relaxed">
                {sub.description ? (
                  <ul className="list-disc list-inside space-y-1">
                    {sub.description.split("\n• ").map((item, idx) => 
                      item ? <li key={idx}>{item}</li> : null
                    )}
                  </ul>
                ) : (
                  <p className="italic">No criteria defined for this level</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
