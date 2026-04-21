import type { RunRecord } from "@/types";

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

function fmtCost(usd: number): string {
  if (usd === 0) return "$0.000000";
  if (usd < 0.01) return `$${usd.toFixed(6)}`;
  return `$${usd.toFixed(4)}`;
}

function statusStyle(status: string): React.CSSProperties {
  return status === "ok"
    ? { color: "hsl(142,71%,40%)", background: "hsl(142,71%,95%)", borderColor: "hsl(142,71%,85%)" }
    : { color: "hsl(0,72%,51%)", background: "hsl(0,72%,97%)", borderColor: "hsl(0,72%,88%)" };
}

export function Timeline({ runs }: { runs: RunRecord[] }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em" }}>Timeline</h1>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 3 }}>Chronological history of all agent runs</p>
        </div>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
        <div style={{
          padding: "14px 18px 10px", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>Run history</span>
          <span style={{
            display: "inline-flex", alignItems: "center", padding: "2px 7px", borderRadius: 4,
            fontSize: 11, fontWeight: 500, border: "1px solid var(--border)",
            color: "var(--muted-foreground)", background: "var(--muted)",
          }}>{runs.length} runs</span>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Run ID", "Member", "Model", "Started at", "Duration", "Input tk", "Output tk", "Tools", "Cost", "Status"].map(h => (
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
            {runs.length === 0 ? (
              <tr>
                <td colSpan={10}>
                  <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    padding: "60px 20px", gap: 12, color: "var(--muted-foreground)",
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: "var(--muted)", border: "1px solid var(--border)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                      </svg>
                    </div>
                    <h4 style={{ fontSize: 14, fontWeight: 500, color: "var(--foreground)" }}>No runs yet</h4>
                    <p style={{ fontSize: 13, textAlign: "center", maxWidth: 260 }}>
                      Your agent hasn't been invoked yet. Once it runs, every execution will appear here.
                    </p>
                  </div>
                </td>
              </tr>
            ) : runs.map((r, i) => (
              <tr key={r.id} style={{ borderBottom: i < runs.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                <td style={{ padding: "11px 18px", fontSize: 12, fontFamily: "monospace", color: "var(--muted-foreground)" }}>#{r.id}</td>
                <td style={{ padding: "11px 18px", fontSize: 13 }}>{r.member}</td>
                <td style={{ padding: "11px 18px", fontSize: 12, fontFamily: "monospace", color: "var(--muted-foreground)" }}>{r.model}</td>
                <td style={{ padding: "11px 18px", fontSize: 12, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>
                  {r.created_at ? new Date(r.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                </td>
                <td style={{ padding: "11px 18px", fontSize: 12, color: "var(--muted-foreground)" }}>{r.duration_ms}ms</td>
                <td style={{ padding: "11px 18px", fontSize: 12, color: "var(--muted-foreground)", fontVariantNumeric: "tabular-nums" }}>{fmt(r.input_tokens)}</td>
                <td style={{ padding: "11px 18px", fontSize: 12, color: "var(--muted-foreground)", fontVariantNumeric: "tabular-nums" }}>{fmt(r.output_tokens)}</td>
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
    </div>
  );
}
