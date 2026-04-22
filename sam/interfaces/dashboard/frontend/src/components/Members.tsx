import { useState, useEffect, useCallback } from "react";
import type { FamilyRecord, MemberRecord } from "@/types";

const PLATFORMS = ["discord", "slack", "telegram"] as const;
type Platform = typeof PLATFORMS[number];

const PLATFORM_LABELS: Record<Platform, string> = {
  discord: "Discord",
  slack: "Slack",
  telegram: "Telegram",
};

async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, opts);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "1px 7px", borderRadius: 4,
      fontSize: 11, fontWeight: 500,
      border: "1px solid var(--border)", background: "var(--muted)",
      color: "var(--muted-foreground)",
    }}>{children}</span>
  );
}

function PlatformChip({ platform, id }: { platform: string; id: string }) {
  const colors: Record<string, string> = {
    discord: "hsl(235,86%,65%)",
    slack: "hsl(141,38%,48%)",
    telegram: "hsl(200,80%,50%)",
  };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 500,
      background: `color-mix(in srgb, ${colors[platform] ?? "var(--muted-foreground)"} 12%, transparent)`,
      color: colors[platform] ?? "var(--muted-foreground)",
      border: `1px solid color-mix(in srgb, ${colors[platform] ?? "var(--muted-foreground)"} 25%, transparent)`,
    }}>
      {PLATFORM_LABELS[platform as Platform] ?? platform}
      <span style={{ fontFamily: "monospace", opacity: 0.8 }}>{id}</span>
    </span>
  );
}

export function Members() {
  const [families, setFamilies] = useState<FamilyRecord[]>([]);
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [newFamily, setNewFamily] = useState("");
  const [familyError, setFamilyError] = useState<string | null>(null);
  const [familyLoading, setFamilyLoading] = useState(false);

  const [form, setForm] = useState({
    family_id: "",
    firstname: "",
    discord: "",
    slack: "",
    telegram: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [f, m] = await Promise.all([
        apiFetch<FamilyRecord[]>("/api/families"),
        apiFetch<MemberRecord[]>("/api/members"),
      ]);
      setFamilies(f);
      setMembers(m);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    setFamilyError(null);
    setFamilyLoading(true);
    try {
      await apiFetch("/api/families", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFamily.trim() }),
      });
      setNewFamily("");
      await load();
    } catch (e) {
      setFamilyError(String(e));
    } finally {
      setFamilyLoading(false);
    }
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);
    try {
      const channels: Record<string, string> = {};
      if (form.discord.trim()) channels.discord = form.discord.trim();
      if (form.slack.trim()) channels.slack = form.slack.trim();
      if (form.telegram.trim()) channels.telegram = form.telegram.trim();
      await apiFetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ family_id: Number(form.family_id), firstname: form.firstname.trim(), channels }),
      });
      setForm({ family_id: form.family_id, firstname: "", discord: "", slack: "", telegram: "" });
      await load();
    } catch (e) {
      setFormError(String(e));
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Remove ${name}? This cannot be undone.`)) return;
    try {
      await apiFetch(`/api/members/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      alert(String(e));
    }
  };

  const grouped = families.map(f => ({
    ...f,
    members: members.filter(m => m.family_id === f.id),
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {error && (
        <div style={{ padding: "12px 16px", background: "hsl(0,72%,97%)", border: "1px solid hsl(0,72%,88%)", borderRadius: 8, fontSize: 13, color: "hsl(0,72%,45%)" }}>
          {error}
        </div>
      )}

      {/* Member list by family */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px 10px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>Members</span>
          <Badge>{members.length}</Badge>
        </div>
        {grouped.length === 0 ? (
          <div style={{ padding: "48px 18px", textAlign: "center", color: "var(--muted-foreground)", fontStyle: "italic", fontSize: 13 }}>
            No families yet — create one below.
          </div>
        ) : grouped.map(family => (
          <div key={family.id}>
            <div style={{
              padding: "8px 18px", fontSize: 11, fontWeight: 600,
              textTransform: "uppercase", letterSpacing: "0.07em",
              color: "var(--muted-foreground)", background: "var(--muted)",
              borderBottom: "1px solid var(--border)",
            }}>
              {family.name}
            </div>
            {family.members.length === 0 ? (
              <div style={{ padding: "14px 18px", fontSize: 13, color: "var(--muted-foreground)", fontStyle: "italic" }}>
                No members
              </div>
            ) : family.members.map((m, i) => (
              <div key={m.id} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 18px",
                borderBottom: i < family.members.length - 1 ? "1px solid var(--border-subtle)" : "none",
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", background: "var(--muted)",
                  border: "1px solid var(--border)", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 13, fontWeight: 600,
                  color: "var(--muted-foreground)", flexShrink: 0,
                }}>
                  {m.firstname[0].toUpperCase()}
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{m.firstname}</span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {Object.entries(m.channels).map(([p, id]) => (
                    <PlatformChip key={p} platform={p} id={id} />
                  ))}
                </div>
                <button
                  onClick={() => handleDelete(m.id, m.firstname)}
                  style={{
                    padding: "4px 10px", fontSize: 12, borderRadius: 5, cursor: "pointer",
                    border: "1px solid var(--border)", background: "transparent",
                    color: "var(--muted-foreground)", fontFamily: "inherit",
                    transition: "background .12s, color .12s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "hsl(0,72%,97%)"; (e.currentTarget as HTMLElement).style.color = "hsl(0,72%,45%)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--muted-foreground)"; }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Add member form */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* New family */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 14 }}>New family</div>
          <form onSubmit={handleCreateFamily} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              value={newFamily}
              onChange={e => setNewFamily(e.target.value)}
              placeholder="Family name"
              required
              style={inputStyle}
            />
            {familyError && <p style={{ fontSize: 12, color: "hsl(0,72%,45%)" }}>{familyError}</p>}
            <button type="submit" disabled={familyLoading} style={btnStyle}>
              {familyLoading ? "Creating…" : "Create family"}
            </button>
          </form>
        </div>

        {/* New member */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 14 }}>New member</div>
          <form onSubmit={handleCreateMember} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <select
              value={form.family_id}
              onChange={e => setForm(f => ({ ...f, family_id: e.target.value }))}
              required
              style={inputStyle}
            >
              <option value="">Select family…</option>
              {families.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <input
              value={form.firstname}
              onChange={e => setForm(f => ({ ...f, firstname: e.target.value }))}
              placeholder="First name"
              required
              style={inputStyle}
            />
            {PLATFORMS.map(p => (
              <input
                key={p}
                value={form[p]}
                onChange={e => setForm(f => ({ ...f, [p]: e.target.value }))}
                placeholder={`${PLATFORM_LABELS[p]} ID (optional)`}
                style={inputStyle}
              />
            ))}
            {formError && <p style={{ fontSize: 12, color: "hsl(0,72%,45%)" }}>{formError}</p>}
            <button type="submit" disabled={formLoading} style={btnStyle}>
              {formLoading ? "Adding…" : "Add member"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "7px 10px", fontSize: 13, borderRadius: 6,
  border: "1px solid var(--border)", background: "var(--background)",
  color: "var(--foreground)", fontFamily: "inherit", outline: "none",
  width: "100%", boxSizing: "border-box",
};

const btnStyle: React.CSSProperties = {
  padding: "7px 14px", fontSize: 13, fontWeight: 500, borderRadius: 6,
  border: "1px solid var(--border)", background: "var(--primary)",
  color: "white", cursor: "pointer", fontFamily: "inherit",
  transition: "opacity .12s",
};
