import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { relTime, absTime } from "@/lib/time";
import type { Recent } from "@/types";

interface TimelineItem {
  when: string | null;
  who: string;
  what: string;
  ctx?: string | null;
}

function Timeline({ items, empty }: { items: TimelineItem[]; empty: string }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic text-center py-6">
        {empty}
      </p>
    );
  }
  return (
    <ScrollArea className="h-[420px] pr-3">
      <ul className="space-y-3">
        {items.map((it, i) => (
          <li
            key={i}
            className="border-l-2 border-border pl-3 py-1 hover:border-primary transition-colors"
          >
            <div className="flex items-baseline gap-3">
              <span
                title={absTime(it.when)}
                className="font-mono text-[11px] text-muted-foreground"
              >
                {relTime(it.when)}
              </span>
              <span className="font-mono text-[11px] text-primary">
                {it.who}
              </span>
            </div>
            <div className="text-sm mt-0.5">{it.what}</div>
            {it.ctx && (
              <div className="text-xs text-muted-foreground italic mt-0.5">
                {it.ctx}
              </div>
            )}
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function Activity({ recent }: { recent: Recent }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Panel title="Recent memories">
        <Timeline
          empty="no memories yet"
          items={recent.memories.map((m) => ({
            when: m.at,
            who: m.member,
            what: m.content,
          }))}
        />
      </Panel>

      <Panel title="Recent episodes">
        <Timeline
          empty="no episodes yet"
          items={recent.episodes.map((e) => ({
            when: e.at,
            who: e.member,
            what: e.content,
            ctx: e.context,
          }))}
        />
      </Panel>

      <Panel title="Upcoming events">
        <Timeline
          empty="no upcoming events"
          items={recent.events.map((v) => ({
            when: v.start_at,
            who: v.member,
            what: v.title,
            ctx: v.description,
          }))}
        />
      </Panel>

      <Panel title="Pending reminders">
        <Timeline
          empty="nothing pending"
          items={recent.reminders.map((r) => ({
            when: r.due_at,
            who: r.member,
            what: r.content,
          }))}
        />
      </Panel>
    </div>
  );
}
