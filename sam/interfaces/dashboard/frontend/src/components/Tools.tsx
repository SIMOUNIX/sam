import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Tool } from "@/types";

export function Tools({ tools }: { tools: Tool[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-semibold flex items-center gap-2">
          Tools
          <Badge variant="secondary" className="font-mono">
            {tools.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tools.map((tool) => {
          const requiredCount = tool.params.filter((p) => p.required).length;
          return (
            <div
              key={tool.name}
              className="rounded-lg border border-border bg-card/50 p-4"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-mono text-sm font-medium text-primary">
                  {tool.name}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                  {requiredCount} required
                </span>
              </div>
              <p className="text-sm mb-3">{tool.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {tool.params.map((p) => (
                  <span
                    key={p.name}
                    title={p.description}
                    className={`font-mono text-[11px] px-2 py-0.5 rounded border ${
                      p.required
                        ? "border-primary/60 text-foreground"
                        : "border-border text-muted-foreground"
                    } bg-background`}
                  >
                    {p.name}
                    <span className="text-muted-foreground/60 ml-1">
                      :{p.type}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
