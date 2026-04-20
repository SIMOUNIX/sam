import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Overview } from "@/components/Overview";
import { Tools } from "@/components/Tools";
import { Members } from "@/components/Members";
import { Activity } from "@/components/Activity";
import { Logs } from "@/components/Logs";
import { usePolling } from "@/hooks/usePolling";
import { absTime } from "@/lib/time";
import type { LogsResponse, SamState } from "@/types";

function Status({
  error,
  lastFetched,
}: {
  error: string | null;
  lastFetched: Date | null;
}) {
  if (error)
    return (
      <span className="text-xs font-mono text-red-400">
        sync failed · {error}
      </span>
    );
  return (
    <span className="text-xs font-mono text-muted-foreground">
      {lastFetched
        ? `synced ${absTime(lastFetched.toISOString())}`
        : "syncing…"}
    </span>
  );
}

function Header({
  error,
  lastFetched,
  onRefresh,
}: {
  error: string | null;
  lastFetched: Date | null;
  onRefresh: () => void;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur">
      <div className="px-7 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="relative inline-flex h-2.5 w-2.5">
            <span className="absolute inset-0 rounded-full bg-green-400 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400" />
          </span>
          <span className="font-mono font-semibold tracking-wider">SAM</span>
          <span className="text-xs font-mono text-muted-foreground">
            personal agent · local dashboard
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Status error={error} lastFetched={lastFetched} />
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="font-mono text-xs"
          >
            refresh
          </Button>
        </div>
      </div>
    </header>
  );
}

export default function App() {
  const state = usePolling<SamState>("/api/state", 3000);
  const logs = usePolling<LogsResponse>("/api/logs?tail=200", 2000);

  const refresh = () => {
    state.refresh();
    logs.refresh();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header
        error={state.error}
        lastFetched={state.lastFetched}
        onRefresh={refresh}
      />

      <Tabs orientation="vertical" defaultValue="overview">
        <div className="border-b border-border sticky top-[57px] z-[9] bg-background">
          <TabsList className="h-auto bg-transparent p-0 px-6 rounded-none">
            {[
              ["overview", "Overview"],
              ["tools", "Tools"],
              ["members", "Members"],
              ["activity", "Activity"],
              ["logs", "Logs"],
            ].map(([v, label]) => (
              <TabsTrigger
                key={v}
                value={v}
                className="font-mono text-sm py-3.5 px-5 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary text-muted-foreground"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="px-7 py-6">
          <TabsContent value="overview">
            {state.data ? (
              <Overview models={state.data.models} counts={state.data.counts} />
            ) : (
              <LoadingMsg />
            )}
          </TabsContent>

          <TabsContent value="tools">
            {state.data ? <Tools tools={state.data.tools} /> : <LoadingMsg />}
          </TabsContent>

          <TabsContent value="members">
            {state.data ? (
              <Members members={state.data.members} />
            ) : (
              <LoadingMsg />
            )}
          </TabsContent>

          <TabsContent value="activity">
            {state.data ? (
              <Activity recent={state.data.recent} />
            ) : (
              <LoadingMsg />
            )}
          </TabsContent>

          <TabsContent value="logs">
            <Logs data={logs.data} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function LoadingMsg() {
  return (
    <p className="text-sm text-muted-foreground font-mono py-8 text-center">
      loading…
    </p>
  );
}
