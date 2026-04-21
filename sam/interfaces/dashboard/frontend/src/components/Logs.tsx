import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LogLine, LogsResponse } from "@/types";

const RESERVED = new Set(["level", "timestamp", "msg", "logger"]);

function levelStyle(level: string): React.CSSProperties {
  switch (level) {
    case "info":    return { color: "var(--primary)" };
    case "warning": return { color: "var(--log-warning)" };
    case "error":   return { color: "var(--log-error)" };
    case "debug":   return { color: "var(--log-debug)" };
    default:        return { color: "var(--foreground)" };
  }
}

function formatExtras(line: LogLine): string {
  return Object.entries(line)
    .filter(([k]) => !RESERVED.has(k))
    .map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`)
    .join(" ");
}

function LogRow({ line }: { line: LogLine }) {
  const level = (line.level ?? "info").toLowerCase();
  const ts = line.timestamp
    ? new Date(line.timestamp).toLocaleTimeString(undefined, { hour12: false })
    : "--:--:--";
  const extras = formatExtras(line);
  return (
    <div style={{ display: "flex", gap: 10, padding: "1px 0", lineHeight: 1.6 }}>
      <span style={{ color: "var(--fg-faint)", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{ts}</span>
      <span style={{ flexShrink: 0, width: 56, fontWeight: 500, ...levelStyle(level) }}>{level}</span>
      <span>{line.msg}</span>
      {extras && <span style={{ color: "var(--muted-foreground)", fontSize: 11, marginLeft: 4 }}>{extras}</span>}
    </div>
  );
}

export function Logs({ data }: { data: LogsResponse | null }) {
  const streamRef = useRef<HTMLDivElement | null>(null);
  const wasAtBottomRef = useRef(true);

  useEffect(() => {
    const el = streamRef.current;
    if (!el) return;
    if (wasAtBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [data]);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    wasAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
  };

  const path = data?.path ?? "—";
  const lines = data?.lines ?? [];
  const exists = data?.exists ?? false;

  return (
    <Card style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 220px)" }}>
      <CardHeader>
        <CardTitle style={{
          fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em",
          color: "var(--muted-foreground)", fontWeight: 500,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          Log stream
          <span style={{ marginLeft: "auto", fontFamily: "monospace", fontSize: 10, color: "var(--fg-faint)", textTransform: "none", letterSpacing: "normal", fontWeight: 400 }}>
            {exists ? path : `${path} (not yet written)`}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent style={{ flex: 1, minHeight: 0 }}>
        <div
          ref={streamRef}
          onScroll={onScroll}
          style={{
            height: "100%", overflowY: "auto",
            fontFamily: "monospace", fontSize: 12,
            background: "var(--muted)", border: "1px solid var(--border)",
            borderRadius: 6, padding: 12,
            whiteSpace: "pre-wrap", wordBreak: "break-all",
          }}
        >
          {lines.length === 0 ? (
            <span style={{ color: "var(--muted-foreground)", fontStyle: "italic" }}>no logs yet</span>
          ) : (
            lines.map((line, i) => <LogRow key={i} line={line} />)
          )}
        </div>
      </CardContent>
    </Card>
  );
}
