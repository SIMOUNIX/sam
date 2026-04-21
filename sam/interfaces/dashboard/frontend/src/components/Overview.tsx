import { BarChart } from "@/components/BarChart";
import type { Counts, DailyStats, RunRecord, RunStats } from "@/types";

interface OverviewProps {
  counts: Counts;
  runStats: RunStats | null;
  daily: DailyStats[];
  recentRuns: RunRecord[];
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 6, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: "var(--fg-faint)" }}>{sub}</div>}
    </div>
  );
}

function MemoryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{
      borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", padding: 16,
      display: "flex", flexDirection: "column", gap: 4,
      transition: "border-color .12s",
    }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--ring)"}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"}
    >
      <span style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </span>
      <span style={{ fontSize: 11, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </span>
    </div>
  );
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

function fmtCost(usd: number): string {
  if (usd === 0) return "$0.00";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

function statusStyle(status: string): React.CSSProperties {
  return status === "ok"
    ? { color: "hsl(142,71%,40%)", background: "hsl(142,71%,95%)", borderColor: "hsl(142,71%,85%)" }
    : { color: "hsl(0,72%,51%)", background: "hsl(0,72%,97%)", borderColor: "hsl(0,72%,88%)" };
}

export function Overview({ counts, runStats, daily, recentRuns }: OverviewProps) {
  const totalRuns = runStats?.total_runs ?? 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Run stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <StatCard label="Total runs"     value={fmt(totalRuns)} sub={totalRuns === 0 ? "no runs yet" : undefined} />
        <StatCard label="Input tokens"   value={fmt(runStats?.total_input_tokens ?? 0)} />
        <StatCard label="Output tokens"  value={fmt(runStats?.total_output_tokens ?? 0)} />
        <StatCard label="Tool calls"     value={fmt(runStats?.total_tool_calls ?? 0)} />
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
        <BarChart
          title="Runs per day"
          subtitle="Message invocations"
          badge="7 days"
          data={daily.map(d => ({ label: d.label, value: d.runs }))}
        />
        <BarChart
          title="Token usage"
          subtitle="Input + output combined"
          badge="7 days"
          data={daily.map(d => ({ label: d.label, value: d.tokens }))}
          formatValue={fmt}
        />
      </div>

      {/* Recent runs table */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
        <div style={{
          padding: "14px 18px 10px", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>Recent runs</span>
          {recentRuns.length > 0 && (
            <span style={{
              display: "inline-flex", alignItems: "center", padding: "2px 7px", borderRadius: 4,
              fontSize: 11, fontWeight: 500, border: "1px solid var(--border)",
              color: "var(--muted-foreground)", background: "var(--muted)",
            }}>{recentRuns.length}</span>
          )}
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Member", "Model", "Started", "Duration", "Tokens", "Tools", "Cost", "Status"].map(h => (
                <th key={h} style={{
                  textAlign: "left", padding: "10px 18px",
                  fontSize: 12, fontWeight: 500, color: "var(--muted-foreground)",
                  borderBottom: "1px solid var(--border)", background: "var(--muted)",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentRuns.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: "48px 18px", textAlign: "center", color: "var(--muted-foreground)", fontStyle: "italic", fontSize: 13 }}>
                  No runs yet — start chatting with SAM on Discord
                </td>
              </tr>
            ) : recentRuns.map(r => (
              <tr key={r.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <td style={{ padding: "11px 18px", fontSize: 13 }}>{r.member}</td>
                <td style={{ padding: "11px 18px", fontSize: 12, fontFamily: "monospace", color: "var(--muted-foreground)" }}>{r.model}</td>
                <td style={{ padding: "11px 18px", fontSize: 12, color: "var(--muted-foreground)" }}>
                  {r.created_at ? new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                </td>
                <td style={{ padding: "11px 18px", fontSize: 12, color: "var(--muted-foreground)" }}>{r.duration_ms}ms</td>
                <td style={{ padding: "11px 18px", fontSize: 12, color: "var(--muted-foreground)" }}>{fmt(r.input_tokens + r.output_tokens)}</td>
                <td style={{ padding: "11px 18px", fontSize: 12, color: "var(--muted-foreground)" }}>{r.tool_calls}</td>
                <td style={{ padding: "11px 18px", fontSize: 12, fontFamily: "monospace" }}>{fmtCost(r.cost_usd)}</td>
                <td style={{ padding: "11px 18px" }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center",
                    padding: "2px 8px", borderRadius: 99,
                    fontSize: 11, fontWeight: 500,
                    border: "1px solid transparent",
                    ...statusStyle(r.status),
                  }}>{r.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Memory counts */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>
          Memory
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          <MemoryCard label="Memories"         value={counts.memories} />
          <MemoryCard label="Episodes"          value={counts.episodes} />
          <MemoryCard label="Events"            value={counts.events} />
          <MemoryCard label="Reminders pending" value={counts.reminders_pending} />
          <MemoryCard label="Reminders total"   value={counts.reminders_total} />
          <MemoryCard label="Vector docs"       value={counts.vector_documents ?? "—"} />
        </div>
      </div>
    </div>
  );
}
