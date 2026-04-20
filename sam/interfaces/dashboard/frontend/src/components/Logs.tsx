import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LogLine, LogsResponse } from "@/types";

const RESERVED = new Set(["level", "timestamp", "msg", "logger"]);

function levelClass(level: string): string {
  switch (level) {
    case "info":
      return "text-primary";
    case "warning":
      return "text-yellow-400";
    case "error":
      return "text-red-400";
    case "debug":
      return "text-muted-foreground";
    default:
      return "text-foreground";
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
    <div className="flex gap-2 py-px leading-relaxed">
      <span className="text-muted-foreground/60 shrink-0">{ts}</span>
      <span className={`shrink-0 w-14 font-medium ${levelClass(level)}`}>
        {level}
      </span>
      <span className="text-foreground">{line.msg}</span>
      {extras && (
        <span className="text-muted-foreground text-[11px] ml-1">{extras}</span>
      )}
    </div>
  );
}

export function Logs({ data }: { data: LogsResponse | null }) {
  const streamRef = useRef<HTMLDivElement | null>(null);
  const wasAtBottomRef = useRef(true);

  useEffect(() => {
    const el = streamRef.current;
    if (!el) return;
    if (wasAtBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [data]);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    wasAtBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 30;
  };

  const path = data?.path ?? "—";
  const lines = data?.lines ?? [];
  const exists = data?.exists ?? false;

  return (
    <Card className="flex flex-col h-[calc(100vh-220px)]">
      <CardHeader>
        <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-semibold flex items-center gap-2">
          Log stream
          <span className="ml-auto font-mono text-[11px] text-muted-foreground/70 normal-case tracking-normal font-normal">
            {exists ? path : `${path} (not yet written)`}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <div
          ref={streamRef}
          onScroll={onScroll}
          className="h-full overflow-y-auto font-mono text-xs bg-background/50 border border-border rounded-lg p-3 whitespace-pre-wrap break-all"
        >
          {lines.length === 0 ? (
            <span className="text-muted-foreground italic">no logs yet</span>
          ) : (
            lines.map((line, i) => <LogRow key={i} line={line} />)
          )}
        </div>
      </CardContent>
    </Card>
  );
}
