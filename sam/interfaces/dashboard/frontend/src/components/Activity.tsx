import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { relTime, absTime } from "@/lib/time";
import type { Recent } from "@/types";

interface TimelineItem { when: string | null; who: string; what: string; ctx?: string | null; }

function Timeline({ items, empty }: { items: TimelineItem[]; empty: string }) {
  if (items.length === 0) {
    return (
      <p style={{ fontSize: 13, color: "var(--muted-foreground)", fontStyle: "italic", textAlign: "center", padding: "24px 0" }}>
        {empty}
      </p>
    );
  }
  return (
    <ScrollArea className="h-[420px] pr-3">
      <ul style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((it, i) => (
          <li
            key={i}
            style={{
              borderLeft: "2px solid var(--border)",
              paddingLeft: 12, paddingTop: 2, paddingBottom: 2,
              transition: "border-color .12s", cursor: "default",
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderLeftColor = "var(--primary)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderLeftColor = "var(--border)"}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 2 }}>
              <span title={absTime(it.when)} style={{ fontFamily: "monospace", fontSize: 11, color: "var(--muted-foreground)" }}>
                {relTime(it.when)}
              </span>
              <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--primary)" }}>
                {it.who}
              </span>
            </div>
            <div style={{ fontSize: 13 }}>{it.what}</div>
            {it.ctx && (
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", fontStyle: "italic", marginTop: 2 }}>
                {it.ctx}
              </div>
            )}
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)", fontWeight: 500 }}>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function Activity({ recent }: { recent: Recent }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
      <Panel title="Recent memories">
        <Timeline empty="no memories yet" items={recent.memories.map(m => ({ when: m.at, who: m.member, what: m.content }))} />
      </Panel>
      <Panel title="Recent episodes">
        <Timeline empty="no episodes yet" items={recent.episodes.map(e => ({ when: e.at, who: e.member, what: e.content, ctx: e.context }))} />
      </Panel>
      <Panel title="Upcoming events">
        <Timeline empty="no upcoming events" items={recent.events.map(v => ({ when: v.start_at, who: v.member, what: v.title, ctx: v.description }))} />
      </Panel>
      <Panel title="Pending reminders">
        <Timeline empty="nothing pending" items={recent.reminders.map(r => ({ when: r.due_at, who: r.member, what: r.content }))} />
      </Panel>
    </div>
  );
}
