import { useState } from "react";

// ── Types ────────────────────────────────────────────────────────────────────
interface MemberEntry { id: number; firstname: string; discord_id: string; }
interface FamilyEntry  { id: number; name: string; members: MemberEntry[]; }

// ── TOML builder (matches config/members.toml format exactly) ────────────────
function buildToml(families: FamilyEntry[]): string {
  const lines: string[] = [
    "# SAM family configuration",
    "# Place at: config/members.toml (project root)",
    "",
  ];
  families.forEach(fam => {
    lines.push("[[families]]");
    lines.push(`name = "${fam.name}"`);
    fam.members.forEach(mem => {
      lines.push("[[families.members]]");
      lines.push(`firstname   = "${mem.firstname}"`);
      lines.push(`discord_id  = "${mem.discord_id}"`);
    });
    lines.push("");
  });
  return lines.join("\n").trimEnd();
}

// ── TOML syntax highlighter ──────────────────────────────────────────────────
function TomlHighlight({ code }: { code: string }) {
  return (
    <div style={{
      background: "hsl(224,71%,4%)",
      borderRadius: 8,
      padding: "16px 20px",
      fontFamily: "DM Mono, Fira Code, monospace",
      fontSize: 12.5,
      lineHeight: 1.75,
      color: "hsl(215,16%,75%)",
      overflowX: "auto",
      maxHeight: 360,
      overflowY: "auto",
    }}>
      {code.split("\n").map((line, i) => {
        let el: React.ReactNode;
        if (line.startsWith("#")) {
          el = <span style={{ color: "hsl(215,16%,50%)" }}>{line}</span>;
        } else if (line.startsWith("[[")) {
          el = <span style={{ color: "hsl(286,60%,67%)" }}>{line}</span>;
        } else if (line.includes("=")) {
          const eq = line.indexOf("=");
          const key = line.slice(0, eq);
          const val = line.slice(eq + 1).trim();
          const isStr = val.startsWith('"');
          el = (
            <>
              <span style={{ color: "hsl(207,82%,66%)" }}>{key}</span>
              <span style={{ color: "hsl(215,16%,50%)" }}>= </span>
              <span style={{ color: isStr ? "hsl(29,54%,61%)" : "hsl(95,38%,62%)" }}>{val}</span>
            </>
          );
        } else {
          el = <span>{line || "\u00A0"}</span>;
        }
        return <div key={i}>{el}</div>;
      })}
    </div>
  );
}

// ── Step indicator ────────────────────────────────────────────────────────────
function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 32 }}>
      {steps.map((label, i) => (
        <div key={label} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : undefined }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 24, height: 24,
              borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 600,
              flexShrink: 0,
              background: i === current ? "var(--primary)" : i < current ? "var(--muted)" : "transparent",
              border: i === current ? "none" : `1.5px solid var(--border)`,
              color: i === current ? "var(--primary-foreground)" : i < current ? "var(--muted-foreground)" : "var(--muted-foreground)",
              fontFamily: "DM Mono, monospace",
            }}>
              {i < current ? "✓" : i + 1}
            </div>
            <span style={{
              fontSize: 13,
              fontWeight: i === current ? 500 : 400,
              color: i === current ? "var(--foreground)" : "var(--muted-foreground)",
              whiteSpace: "nowrap",
            }}>
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div style={{
              flex: 1,
              height: 1,
              background: "var(--border)",
              margin: "0 12px",
              minWidth: 24,
            }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Shared button styles ─────────────────────────────────────────────────────
const btnBase: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "7px 14px",
  fontSize: 13, fontWeight: 500,
  borderRadius: 6, cursor: "pointer",
  fontFamily: "DM Sans, system-ui, sans-serif",
  border: "1px solid var(--border)",
  background: "var(--card)",
  color: "var(--foreground)",
  transition: "background 0.12s",
};
const btnPrimary: React.CSSProperties = {
  ...btnBase,
  background: "var(--primary)",
  color: "var(--primary-foreground)",
  border: "1px solid var(--primary)",
};

// ── Field component ───────────────────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 500, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "DM Mono, monospace" }}>
        {label}
      </label>
      {children}
      {hint && <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{hint}</span>}
    </div>
  );
}

const fieldInput: React.CSSProperties = {
  padding: "7px 10px",
  border: "1px solid var(--border)",
  borderRadius: 6,
  fontSize: 13,
  fontFamily: "DM Sans, system-ui, sans-serif",
  background: "var(--muted)",
  color: "var(--foreground)",
  outline: "none",
  width: "100%",
};

// ── Main Setup component ──────────────────────────────────────────────────────
export function Setup({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);

  const [families, setFamilies] = useState<FamilyEntry[]>([
    { id: 1, name: "", members: [{ id: 1, firstname: "", discord_id: "" }] },
  ]);

  const toml = buildToml(families.filter(f => f.name.trim()));

  // Family mutations
  const addFamily = () => setFamilies(fs => [
    ...fs,
    { id: Date.now(), name: "", members: [{ id: Date.now() + 1, firstname: "", discord_id: "" }] },
  ]);

  const removeFamily = (fid: number) => setFamilies(fs => fs.filter(f => f.id !== fid));

  const updateFamily = (fid: number, name: string) =>
    setFamilies(fs => fs.map(f => f.id === fid ? { ...f, name } : f));

  const addMember = (fid: number) =>
    setFamilies(fs => fs.map(f =>
      f.id === fid
        ? { ...f, members: [...f.members, { id: Date.now(), firstname: "", discord_id: "" }] }
        : f
    ));

  const removeMember = (fid: number, mid: number) =>
    setFamilies(fs => fs.map(f =>
      f.id === fid ? { ...f, members: f.members.filter(m => m.id !== mid) } : f
    ));

  const updateMember = (fid: number, mid: number, k: keyof MemberEntry, v: string) =>
    setFamilies(fs => fs.map(f =>
      f.id === fid
        ? { ...f, members: f.members.map(m => m.id === mid ? { ...m, [k]: v } : m) }
        : f
    ));

  const handleCopy = () => {
    navigator.clipboard.writeText(toml).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    const blob = new Blob([toml], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "members.toml";
    a.click();
  };

  const STEPS = ["Welcome", "Families", "Export"];

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 4 }}>Setup</h1>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
          Generate your <code style={{ fontFamily: "DM Mono, monospace", fontSize: 11 }}>config/members.toml</code> to tell SAM who to talk to
        </p>
      </div>

      <StepIndicator steps={STEPS} current={step} />

      {/* ── Step 0: Welcome ── */}
      {step === 0 && (
        <div style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: 24,
          maxWidth: 520,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)",
        }}>
          <p style={{ fontSize: 13.5, color: "var(--muted-foreground)", lineHeight: 1.7, marginBottom: 20 }}>
            SAM uses a local{" "}
            <code style={{ fontFamily: "DM Mono, monospace", fontSize: 12, background: "var(--muted)", padding: "1px 5px", borderRadius: 4 }}>
              config/members.toml
            </code>{" "}
            to know who you are and who to address. This wizard generates that file.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {[
              { emoji: "👨‍👩‍👧", text: "Add families and their members" },
              { emoji: "🎮", text: "Link each person's Discord ID" },
              { emoji: "📄", text: "Export the config.toml and place it in your project" },
            ].map(({ emoji, text }) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--muted-foreground)" }}>
                <span style={{ fontSize: 16 }}>{emoji}</span>
                {text}
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 14 }}>
            You can also write the file manually at{" "}
            <code style={{ fontFamily: "DM Mono, monospace", fontSize: 11 }}>config/members.toml</code>.
          </p>
          <button style={btnPrimary} onClick={() => setStep(1)}>
            Get started →
          </button>
        </div>
      )}

      {/* ── Step 1: Families ── */}
      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
            Add families and their members. Each member needs a firstname and Discord user ID.
          </p>

          {families.map((fam) => (
            <div key={fam.id} style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: 18,
              position: "relative",
            }}>
              {/* Family name */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <Field label="Family name" hint="e.g. SMITH">
                  <input
                    style={{ ...fieldInput, maxWidth: 200, textTransform: "uppercase" }}
                    value={fam.name}
                    placeholder="SMITH"
                    onChange={e => updateFamily(fam.id, e.target.value.toUpperCase())}
                  />
                </Field>
                {families.length > 1 && (
                  <button
                    onClick={() => removeFamily(fam.id)}
                    style={{
                      marginTop: 18,
                      padding: "4px 8px",
                      fontSize: 11,
                      border: "1px solid var(--border)",
                      borderRadius: 5,
                      background: "transparent",
                      color: "var(--muted-foreground)",
                      cursor: "pointer",
                    }}
                  >
                    Remove family
                  </button>
                )}
              </div>

              {/* Members */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "DM Mono, monospace" }}>
                  Members
                </div>
                {fam.members.map((mem) => (
                  <div key={mem.id} style={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: 10,
                    background: "var(--muted)",
                    borderRadius: 6,
                    padding: "12px 14px",
                  }}>
                    <div style={{
                      width: 32, height: 32,
                      borderRadius: "50%",
                      background: "var(--primary-bg)",
                      border: "1px solid hsl(221,83%,88%)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 600, color: "var(--primary)",
                      flexShrink: 0, marginBottom: 2,
                    }}>
                      {mem.firstname ? mem.firstname[0].toUpperCase() : "?"}
                    </div>
                    <Field label="First name">
                      <input
                        style={{ ...fieldInput, width: 150 }}
                        value={mem.firstname}
                        placeholder="Jane"
                        onChange={e => updateMember(fam.id, mem.id, "firstname", e.target.value)}
                      />
                    </Field>
                    <Field label="Discord ID" hint="right-click → Copy User ID">
                      <input
                        style={{ ...fieldInput, width: 200, fontFamily: "DM Mono, monospace", fontSize: 12 }}
                        value={mem.discord_id}
                        placeholder="226390401811087360"
                        onChange={e => updateMember(fam.id, mem.id, "discord_id", e.target.value)}
                      />
                    </Field>
                    {fam.members.length > 1 && (
                      <button
                        onClick={() => removeMember(fam.id, mem.id)}
                        style={{ ...btnBase, padding: "7px 10px", marginBottom: 0, color: "var(--muted-foreground)" }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  style={{ ...btnBase, alignSelf: "flex-start", fontSize: 12, padding: "5px 10px" }}
                  onClick={() => addMember(fam.id)}
                >
                  + Add member
                </button>
              </div>
            </div>
          ))}

          <button style={{ ...btnBase, alignSelf: "flex-start" }} onClick={addFamily}>
            + Add family
          </button>

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button style={btnBase} onClick={() => setStep(0)}>Back</button>
            <button style={btnPrimary} onClick={() => setStep(2)}>Next — Export →</button>
          </div>
        </div>
      )}

      {/* ── Step 2: Export ── */}
      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* TOML preview card */}
          <div style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            overflow: "hidden",
          }}>
            <div style={{
              padding: "12px 18px",
              borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>members.toml</span>
                <span style={{
                  fontSize: 10,
                  fontFamily: "DM Mono, monospace",
                  background: "var(--muted)",
                  color: "var(--muted-foreground)",
                  padding: "2px 6px",
                  borderRadius: 4,
                  border: "1px solid var(--border)",
                }}>
                  config/members.toml
                </span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button style={{ ...btnBase, padding: "4px 10px", fontSize: 12 }} onClick={handleCopy}>
                  {copied ? "✓ Copied" : "Copy"}
                </button>
                <button style={{ ...btnPrimary, padding: "4px 10px", fontSize: 12 }} onClick={handleDownload}>
                  Download
                </button>
              </div>
            </div>
            <div style={{ padding: 16 }}>
              <TomlHighlight code={toml} />
            </div>
          </div>

          {/* Next steps */}
          <div style={{
            background: "var(--muted)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "16px 18px",
          }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Next steps</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { cmd: "cp ~/Downloads/members.toml config/members.toml", desc: "Move the file to your project root" },
                { cmd: "uv run sam-dashboard", desc: "Restart the dashboard to load new config" },
              ].map(({ cmd, desc }) => (
                <div key={cmd} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <code style={{
                    fontFamily: "DM Mono, monospace",
                    fontSize: 11.5,
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    padding: "3px 8px",
                    borderRadius: 5,
                    whiteSpace: "nowrap",
                    color: "var(--foreground)",
                    flexShrink: 0,
                  }}>
                    {cmd}
                  </code>
                  <span style={{ fontSize: 12, color: "var(--muted-foreground)", paddingTop: 3 }}>{desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button style={btnBase} onClick={() => setStep(1)}>Back</button>
            <button style={btnPrimary} onClick={onComplete}>
              ✓ Done — go to dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
