import { BarChart } from "@/components/BarChart";
import type { DailyStats, RunRecord, RunStats } from "@/types";

function fmtCost(usd: number): string {
  if (usd === 0) return "$0.00";
  if (usd < 0.001) return `$${usd.toFixed(6)}`;
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

interface CostProps {
  runStats: RunStats | null;
  daily: DailyStats[];
  recentRuns: RunRecord[];
}

export function Cost({ runStats, daily, recentRuns }: CostProps) {
  // Aggregate cost per model from recent runs
  const modelCosts: Record<string, number> = {};
  for (const r of recentRuns) {
    modelCosts[r.model] = (modelCosts[r.model] ?? 0) + r.cost_usd;
  }
  const modelEntries = Object.entries(modelCosts).sort((a, b) => b[1] - a[1]);
  const maxModelCost = Math.max(...modelEntries.map(e => e[1]), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Cost cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {[
          { label: "Total cost",    value: fmtCost(runStats?.total_cost_usd ?? 0),    sub: "all time" },
          { label: "This month",    value: fmtCost(runStats?.month_cost_usd ?? 0),     sub: "current calendar month" },
          { label: "Avg per run",   value: fmtCost(runStats?.avg_cost_per_run ?? 0),  sub: "across all runs" },
        ].map(({ label, value, sub }) => (
          <div key={label} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              {label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 6, fontVariantNumeric: "tabular-nums" }}>
              {value}
            </div>
            <div style={{ fontSize: 12, color: "var(--fg-faint)" }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
        <BarChart
          title="Daily spend"
          subtitle="USD"
          badge="7 days"
          data={daily.map(d => ({ label: d.label, value: d.cost_usd }))}
          formatValue={fmtCost}
        />

        {/* Cost by model */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>Cost by model</div>
          {modelEntries.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 0", gap: 8, color: "var(--muted-foreground)" }}>
              <p style={{ fontSize: 13, textAlign: "center" }}>Cost will be tracked as soon as your agent starts making API calls.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 8 }}>
              {modelEntries.map(([model, cost]) => (
                <div key={model}>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: 5, gap: 8 }}>
                    <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontFamily: "monospace", flex: 1 }}>{model}</span>
                    <span style={{ fontSize: 12, fontFamily: "monospace" }}>{fmtCost(cost)}</span>
                  </div>
                  <div style={{ height: 6, background: "var(--muted)", borderRadius: 3 }}>
                    <div style={{ height: 6, width: `${(cost / maxModelCost) * 100}%`, borderRadius: 3, background: "var(--primary)", transition: "width .3s" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cost per run table */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px 10px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>Cost per run</span>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Date", "Member", "Model", "Input tk", "Output tk", "Input $", "Output $", "Total"].map(h => (
                <th key={h} style={{
                  textAlign: "left", padding: "10px 18px",
                  fontSize: 12, fontWeight: 500, color: "var(--muted-foreground)",
                  borderBottom: "1px solid var(--border)", background: "var(--muted)",
                  whiteSpace: "nowrap",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentRuns.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: "40px 18px", textAlign: "center", color: "var(--muted-foreground)", fontStyle: "italic", fontSize: 13 }}>
                  No runs yet
                </td>
              </tr>
            ) : recentRuns.map((r, i) => {
              // Approximate input/output cost split (same pricing ratios as backend)
              const totalTokens = r.input_tokens + r.output_tokens;
              const inputCost = totalTokens > 0 ? r.cost_usd * (r.input_tokens / totalTokens) * (1 / 3) : 0;
              const outputCost = r.cost_usd - inputCost;
              return (
                <tr key={r.id} style={{ borderBottom: i < recentRuns.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                  <td style={{ padding: "11px 18px", fontSize: 12, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>
                    {r.created_at ? new Date(r.created_at).toLocaleDateString([], { month: "short", day: "numeric" }) : "—"}
                  </td>
                  <td style={{ padding: "11px 18px", fontSize: 13 }}>{r.member}</td>
                  <td style={{ padding: "11px 18px", fontSize: 12, fontFamily: "monospace", color: "var(--muted-foreground)" }}>{r.model}</td>
                  <td style={{ padding: "11px 18px", fontSize: 12, color: "var(--muted-foreground)", fontVariantNumeric: "tabular-nums" }}>{fmt(r.input_tokens)}</td>
                  <td style={{ padding: "11px 18px", fontSize: 12, color: "var(--muted-foreground)", fontVariantNumeric: "tabular-nums" }}>{fmt(r.output_tokens)}</td>
                  <td style={{ padding: "11px 18px", fontSize: 12, fontFamily: "monospace", color: "var(--muted-foreground)" }}>{fmtCost(inputCost)}</td>
                  <td style={{ padding: "11px 18px", fontSize: 12, fontFamily: "monospace", color: "var(--muted-foreground)" }}>{fmtCost(outputCost)}</td>
                  <td style={{ padding: "11px 18px", fontSize: 12, fontFamily: "monospace", fontWeight: 500 }}>{fmtCost(r.cost_usd)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
