import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Tool } from "@/types";

export function Tools({ tools }: { tools: Tool[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)", fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
          Tools
          <Badge variant="secondary">{tools.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {tools.map(tool => {
          const requiredCount = tool.params.filter(p => p.required).length;
          return (
            <div key={tool.name} style={{
              borderRadius: 8, border: "1px solid var(--border)",
              background: "var(--muted)", padding: 16,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 500, color: "var(--primary)" }}>
                  {tool.name}
                </span>
                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)", fontFamily: "monospace" }}>
                  {requiredCount} required
                </span>
              </div>
              <p style={{ fontSize: 13, color: "var(--foreground)", marginBottom: 12 }}>{tool.description}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {tool.params.map(p => (
                  <span key={p.name} title={p.description} style={{
                    fontFamily: "monospace", fontSize: 11,
                    padding: "2px 8px", borderRadius: 4,
                    border: `1px solid ${p.required ? "hsl(221,83%,70%)" : "var(--border)"}`,
                    color: p.required ? "var(--primary)" : "var(--muted-foreground)",
                    background: p.required ? "var(--primary-bg)" : "var(--card)",
                  }}>
                    {p.name}<span style={{ opacity: 0.5 }}>:{p.type}</span>
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
