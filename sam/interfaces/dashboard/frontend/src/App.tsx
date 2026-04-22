import { useState, useEffect } from "react";
import { Overview } from "@/components/Overview";
import { Tools } from "@/components/Tools";
import { Members } from "@/components/Members";
import { Activity } from "@/components/Activity";
import { Logs } from "@/components/Logs";
import { Setup } from "@/components/Setup";
import { Timeline } from "@/components/Timeline";
import { Cost } from "@/components/Cost";
import { usePolling } from "@/hooks/usePolling";
import { absTime } from "@/lib/time";
import type { DailyStats, LogsResponse, RunRecord, RunStats, SamState } from "@/types";

const Icon = ({ d, size = 15 }: { d: string | string[]; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const icons = {
  overview: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  timeline: ["M12 20h9", "M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"],
  cost:     ["M12 2v20", "M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6"],
  activity: ["M22 12h-4l-3 9L9 3l-3 9H2"],
  tools:    ["M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"],
  members:  ["M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2", "M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M23 21v-2a4 4 0 0 0-3-3.87", "M16 3.13a4 4 0 0 1 0 7.75"],
  logs:     "M4 6h16M4 12h16M4 18h12",
  setup:    ["M12 2L2 7l10 5 10-5-10-5z", "M2 17l10 5 10-5", "M2 12l10 5 10-5"],
  warn:     ["M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z", "M12 9v4", "M12 17h.01"],
  refresh:  ["M23 4v6h-6", "M1 20v-6h6", "M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"],
};

const NAV = [
  { id: "overview",  label: "Overview",  icon: "overview" },
  { id: "timeline",  label: "Timeline",  icon: "timeline" },
  { id: "cost",      label: "Cost",      icon: "cost"     },
  { id: "activity",  label: "Activity",  icon: "activity" },
  { id: "tools",     label: "Tools",     icon: "tools"    },
  { id: "members",   label: "Members",   icon: "members"  },
  { id: "logs",      label: "Logs",      icon: "logs"     },
] as const;

const NAV_BOTTOM = [{ id: "setup", label: "Setup", icon: "setup" }] as const;

type PageId = typeof NAV[number]["id"] | typeof NAV_BOTTOM[number]["id"];

const PAGE_TITLES: Record<PageId, string> = {
  overview: "Overview", timeline: "Timeline", cost: "Cost",
  activity: "Activity", tools: "Tools", members: "Members",
  logs: "Logs", setup: "Setup",
};

function Sidebar({ page, setPage, setupDone }: {
  page: PageId; setPage: (p: PageId) => void; setupDone: boolean;
}) {
  const navItem = (id: string, label: string, iconKey: string, dot?: boolean) => {
    const active = page === id;
    return (
      <div
        key={id}
        onClick={() => setPage(id as PageId)}
        style={{
          display: "flex", alignItems: "center", gap: 9,
          padding: "7px 10px", borderRadius: 6, cursor: "pointer",
          fontSize: 13.5, fontWeight: active ? 500 : 450,
          color: active ? "var(--foreground)" : "var(--muted-foreground)",
          background: active ? "var(--muted)" : "transparent",
          transition: "background .12s, color .12s",
          userSelect: "none",
        }}
        onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "var(--muted)"; (e.currentTarget as HTMLElement).style.color = "var(--foreground)"; } }}
        onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--muted-foreground)"; } }}
      >
        <span style={{ opacity: active ? 1 : 0.7, display: "flex" }}>
          <Icon d={icons[iconKey as keyof typeof icons]} size={15} />
        </span>
        {label}
        {dot && (
          <span style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "hsl(38,92%,50%)", flexShrink: 0 }} />
        )}
      </div>
    );
  };

  return (
    <nav style={{
      width: 220, background: "var(--card)",
      borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column",
      position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 20,
    }}>
      <div style={{
        padding: "20px 16px 16px", borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 28, height: 28, background: "var(--foreground)", borderRadius: 7,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.02em" }}>Agentwatch</span>
        <span style={{
          marginLeft: "auto", fontSize: 10, fontWeight: 500,
          padding: "2px 6px", background: "var(--primary-bg)", color: "var(--primary)",
          borderRadius: 4, letterSpacing: "0.02em",
        }}>beta</span>
      </div>

      <div style={{ padding: 8, flex: 1, overflowY: "auto" }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: "var(--fg-faint)", letterSpacing: "0.06em", textTransform: "uppercase", padding: "8px 8px 4px" }}>
          Monitor
        </div>
        {NAV.map(n => navItem(n.id, n.label, n.icon))}
      </div>

      <div style={{ padding: "0 8px 8px" }}>
        {NAV_BOTTOM.map(n => navItem(n.id, n.label, n.icon, n.id === "setup" && !setupDone))}
      </div>

      <div style={{
        padding: "12px 16px", borderTop: "1px solid var(--border)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%", background: "var(--border)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)",
        }}>S</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Personal</div>
          <div style={{ fontSize: 11, color: "var(--fg-faint)" }}>local agent</div>
        </div>
      </div>
    </nav>
  );
}

function Topbar({ page, error, lastFetched, onRefresh }: {
  page: PageId; error: string | null; lastFetched: Date | null; onRefresh: () => void;
}) {
  return (
    <div style={{
      background: "var(--card)", borderBottom: "1px solid var(--border)",
      padding: "0 28px", height: 54,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      position: "sticky", top: 0, zIndex: 10,
    }}>
      <span style={{ fontSize: 14, fontWeight: 500 }}>{PAGE_TITLES[page]}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 500,
          border: "1px solid var(--border)", color: "var(--muted-foreground)",
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "hsl(142,71%,45%)", display: "inline-block" }} />
          {error ? "sync failed" : lastFetched ? `synced ${absTime(lastFetched.toISOString())}` : "syncing…"}
        </span>
        <button
          onClick={onRefresh}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 12px", fontSize: 13, fontWeight: 500,
            borderRadius: 6, cursor: "pointer",
            border: "1px solid var(--border)", background: "var(--card)",
            color: "var(--foreground)", fontFamily: "inherit", transition: "background .12s",
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "var(--card)"}
        >
          <Icon d={icons.refresh} size={13} />
          Refresh
        </button>
      </div>
    </div>
  );
}

function SetupBanner({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  return (
    <div style={{
      margin: "20px 28px 0", background: "var(--card)",
      border: "1px solid var(--border)", borderRadius: 8, padding: "14px 16px",
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: "hsl(38,92%,95%)", border: "1px solid hsl(38,92%,85%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, color: "hsl(38,60%,40%)",
      }}>
        <Icon d={icons.warn} size={15} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
          <strong style={{ color: "var(--foreground)", fontWeight: 500 }}>Configuration missing</strong>
          {" "}— run the setup wizard to generate your <code style={{ fontFamily: "monospace", fontSize: 11 }}>config/members.toml</code>.
        </p>
      </div>
      <button
        onClick={() => onNavigate("setup")}
        style={{
          padding: "6px 12px", fontSize: 13, fontWeight: 500,
          border: "1px solid var(--border)", borderRadius: 6,
          background: "var(--card)", color: "var(--foreground)",
          cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit",
        }}
      >
        Open Setup
      </button>
    </div>
  );
}

export default function App() {
  const state    = usePolling<SamState>("/api/state", 3000);
  const logs     = usePolling<LogsResponse>("/api/logs?tail=200", 2000);
  const runStats = usePolling<RunStats>("/api/stats", 5000);
  const daily    = usePolling<DailyStats[]>("/api/stats/daily?days=7", 10000);
  const runs     = usePolling<RunRecord[]>("/api/runs?limit=50", 5000);

  const [page, setPage] = useState<PageId>(() =>
    (localStorage.getItem("sam_page") as PageId) ?? "overview"
  );
  const [setupDone, setSetupDone] = useState(() => !!localStorage.getItem("sam_setup_done"));

  useEffect(() => { localStorage.setItem("sam_page", page); }, [page]);

  const refresh = () => {
    state.refresh(); logs.refresh();
    runStats.refresh(); daily.refresh(); runs.refresh();
  };

  const handleSetupComplete = () => {
    localStorage.setItem("sam_setup_done", "1");
    setSetupDone(true);
    setPage("overview");
  };

  const renderPage = () => {
    switch (page) {
      case "overview": return (
        <Overview
          counts={state.data?.counts ?? { memories: 0, episodes: 0, events: 0, reminders_total: 0, reminders_pending: 0, vector_documents: null }}
          runStats={runStats.data}
          daily={daily.data ?? []}
          recentRuns={runs.data ?? []}
        />
      );
      case "timeline": return <Timeline runs={runs.data ?? []} />;
      case "cost":     return <Cost runStats={runStats.data} daily={daily.data ?? []} recentRuns={runs.data ?? []} />;
      case "activity": return state.data ? <Activity recent={state.data.recent} /> : <LoadingMsg />;
      case "tools":    return state.data ? <Tools tools={state.data.tools} /> : <LoadingMsg />;
      case "members":  return <Members />;
      case "logs":     return <Logs data={logs.data} />;
      case "setup":    return <Setup onComplete={handleSetupComplete} />;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar page={page} setPage={setPage} setupDone={setupDone} />
      <main style={{ marginLeft: 220, flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <Topbar page={page} error={state.error} lastFetched={state.lastFetched} onRefresh={refresh} />
        {!setupDone && page !== "setup" && <SetupBanner onNavigate={setPage} />}
        <div className="animate-fade-up-1" style={{ padding: 28, flex: 1 }}>
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

function LoadingMsg() {
  return (
    <p style={{ fontSize: 13, color: "var(--muted-foreground)", textAlign: "center", padding: "64px 0", fontStyle: "italic" }}>
      loading…
    </p>
  );
}
