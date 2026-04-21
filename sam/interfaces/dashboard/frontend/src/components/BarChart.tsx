interface BarChartProps {
  title: string;
  subtitle?: string;
  data: { label: string; value: number }[];
  color?: string;
  formatValue?: (v: number) => string;
  badge?: string;
}

export function BarChart({ title, subtitle, data, color = "var(--primary)", formatValue, badge }: BarChartProps) {
  const max = Math.max(...data.map(d => d.value), 1);

  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--border)",
      borderRadius: 8, padding: 20,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{subtitle}</div>}
        </div>
        {badge && (
          <span style={{
            display: "inline-flex", alignItems: "center",
            padding: "2px 7px", borderRadius: 4, fontSize: 11, fontWeight: 500,
            border: "1px solid var(--border)", color: "var(--muted-foreground)",
            background: "var(--muted)",
          }}>{badge}</span>
        )}
      </div>

      <div style={{
        height: 140, display: "flex", alignItems: "flex-end",
        gap: 6, paddingTop: 12,
      }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div
              title={formatValue ? formatValue(d.value) : String(d.value)}
              style={{
                width: "100%",
                height: `${Math.max((d.value / max) * 100, d.value > 0 ? 4 : 0)}%`,
                minHeight: d.value > 0 ? 4 : 0,
                borderRadius: "4px 4px 0 0",
                background: d.value > 0 ? color : "var(--border)",
                transition: "height .3s ease",
              }}
            />
            <span style={{ fontSize: 10, color: "var(--fg-faint)" }}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
