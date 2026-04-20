import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Counts, Models } from "@/types";

interface OverviewProps {
  models: Models;
  counts: Counts;
}

function ConfigBadge({ ok }: { ok: boolean }) {
  return (
    <Badge variant={ok ? "default" : "destructive"}>
      {ok ? "configured" : "missing"}
    </Badge>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[180px_1fr] gap-4 py-2 border-b border-border last:border-0">
      <dt className="text-sm text-muted-foreground font-mono">{label}</dt>
      <dd className="text-sm font-mono break-all">{value}</dd>
    </div>
  );
}

function Counter({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-4 flex flex-col gap-1 hover:border-ring transition-colors">
      <span className="text-3xl font-mono font-semibold tabular-nums">
        {value}
      </span>
      <span className="text-xs text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

export function Overview({ models, counts }: OverviewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
            Runtime
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl>
            <Row label="LLM provider" value={models.llm_provider} />
            <Row label="Chat model" value={models.llm_model} />
            <Row label="Embedding model" value={models.embedding_model} />
            <Row label="Vector DB" value={models.vector_db} />
            <Row label="SQLite DB" value={models.sqlite_db} />
            <Row
              label="Mistral API key"
              value={<ConfigBadge ok={models.mistral_key_configured} />}
            />
            <Row
              label="Discord token"
              value={<ConfigBadge ok={models.discord_token_configured} />}
            />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
            Memory
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Counter label="memories" value={counts.memories} />
            <Counter label="episodes" value={counts.episodes} />
            <Counter label="events" value={counts.events} />
            <Counter
              label="reminders pending"
              value={counts.reminders_pending}
            />
            <Counter label="reminders total" value={counts.reminders_total} />
            <Counter
              label="vector docs"
              value={counts.vector_documents ?? "—"}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
