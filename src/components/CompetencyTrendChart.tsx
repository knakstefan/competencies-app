import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format } from "date-fns";

interface AssessmentTrendData {
  date: string;
  assessmentId: string;
  competencyScores: Record<string, number>;
}

interface CompetencyTrendChartProps {
  trendData: AssessmentTrendData[];
  competencies: { _id: string; title: string }[];
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 68%, 60%)",
  "hsl(0, 84%, 60%)",
  "hsl(200, 98%, 39%)",
  "hsl(320, 70%, 50%)",
  "hsl(60, 80%, 45%)",
  "hsl(180, 60%, 40%)",
  "hsl(240, 60%, 55%)",
  "hsl(20, 90%, 50%)",
  "hsl(100, 50%, 45%)",
];

export const CompetencyTrendChart = ({ trendData, competencies }: CompetencyTrendChartProps) => {
  const [selectedCompetency, setSelectedCompetency] = useState<string | null>(null);

  if (trendData.length < 2) return null;

  // Calculate trends for each competency
  const getTrend = (competencyId: string) => {
    const firstScore = trendData[0].competencyScores[competencyId] || 0;
    const lastScore = trendData[trendData.length - 1].competencyScores[competencyId] || 0;
    const diff = lastScore - firstScore;

    if (diff > 0.3) return "up";
    if (diff < -0.3) return "down";
    return "stable";
  };

  // Format data for the chart
  const chartData = trendData.map((item) => {
    const dataPoint: Record<string, string | number> = {
      date: format(new Date(item.date), "MMM d, yyyy"),
    };

    competencies.forEach((comp) => {
      dataPoint[comp.title] = item.competencyScores[comp._id] || 0;
    });

    return dataPoint;
  });

  // Count improvements and regressions
  const improvements = competencies.filter((c) => getTrend(c.id) === "up").length;
  const regressions = competencies.filter((c) => getTrend(c.id) === "down").length;
  const stable = competencies.filter((c) => getTrend(c.id) === "stable").length;

  return (
    <Card className="bg-transparent border-0 p-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Trending</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Tracking {trendData.length} assessments</p>
          </div>
          <div className="flex items-center gap-2">
            {improvements > 0 && (
              <Badge variant="default" className="bg-green-600 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {improvements} Improving
              </Badge>
            )}
            {stable > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Minus className="h-3 w-3" />
                {stable} Stable
              </Badge>
            )}
            {regressions > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <TrendingDown className="h-3 w-3" />
                {regressions} Declining
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickLine={{ stroke: "hsl(var(--border))" }}
              />
              <YAxis
                domain={[0, 5]}
                ticks={[1, 2, 3, 4, 5]}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickLine={{ stroke: "hsl(var(--border))" }}
                tickFormatter={(value) => {
                  const labels = ["", "1", "2", "3", "4", "5"];
                  return labels[value] || value;
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
                formatter={(value: number) => [value.toFixed(2), ""]}
              />
              {competencies.map((comp, index) => (
                <Line
                  key={comp._id}
                  type="monotone"
                  dataKey={comp.title}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={selectedCompetency === comp._id ? 4 : selectedCompetency ? 1 : 2}
                  strokeOpacity={selectedCompetency && selectedCompetency !== comp._id ? 0.2 : 1}
                  dot={{ r: selectedCompetency === comp._id ? 6 : 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Trend indicators */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {competencies.map((comp, index) => {
            const trend = getTrend(comp._id);
            const firstScore = trendData[0].competencyScores[comp._id] || 0;
            const lastScore = trendData[trendData.length - 1].competencyScores[comp._id] || 0;
            const diff = lastScore - firstScore;
            const isSelected = selectedCompetency === comp._id;

            return (
              <div
                key={comp._id}
                onClick={() => setSelectedCompetency(isSelected ? null : comp._id)}
                className={`p-2 rounded-md flex flex-col items-center text-center cursor-pointer transition-all ${
                  isSelected
                    ? "bg-primary/20 ring-2 ring-primary"
                    : "bg-muted/50 hover:bg-muted"
                }`}
              >
                <div className="w-3 h-3 rounded-full mb-1" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-xs font-medium truncate w-full">{comp.title}</span>
                <div className="flex items-center gap-1 mt-1">
                  {trend === "up" && <TrendingUp className="h-3 w-3 text-green-600" />}
                  {trend === "down" && <TrendingDown className="h-3 w-3 text-destructive" />}
                  {trend === "stable" && <Minus className="h-3 w-3 text-muted-foreground" />}
                  <span
                    className={`text-xs ${
                      trend === "up"
                        ? "text-green-600"
                        : trend === "down"
                          ? "text-destructive"
                          : "text-muted-foreground"
                    }`}
                  >
                    {diff > 0 ? "+" : ""}
                    {diff.toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
