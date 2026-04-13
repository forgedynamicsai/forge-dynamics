import { useState, useEffect, useCallback } from "react";
import { SCENARIOS } from "./scenarios.js";

/* ══════════════════════════════════════════════════════════════════════════════
   SUPABASE CONFIG
   ══════════════════════════════════════════════════════════════════════════════ */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://ypowxcqhrlgcldborqzf.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const GROWTH_STAGE_TENANT = "00000000-0000-0000-0000-000000000001";
const TID = `tenant_id=eq.${GROWTH_STAGE_TENANT}`;

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Accept-Profile": "ai_ops",
  "Content-Type": "application/json",
};

async function query(table, params = "") {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, { headers });
    if (!res.ok) throw new Error(`${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn(`Supabase fetch ${table} failed:`, e.message);
    return null;
  }
}

/* ══════════════════════════════════════════════════════════════════════════════
   DEFAULT MOCK — Growth Stage scenario (scenario index 0 = Dunning Spiral by default)
   All 15 scenarios live in scenarios.js; this is just the seed for initial render.
   ══════════════════════════════════════════════════════════════════════════════ */
const MOCK = SCENARIOS[0].data;

/* All scenario mock data lives in scenarios.js — imported above as SCENARIOS */

/* ══════════════════════════════════════════════════════════════════════════════
   CHART COMPONENTS
   ══════════════════════════════════════════════════════════════════════════════ */
const MiniChart = ({ data, color, height = 40, width = 120 }) => {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  const last = points.split(" ").pop().split(",");
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={parseFloat(last[0])} cy={parseFloat(last[1])} r="4" fill={color} />
    </svg>
  );
};

const SimpleBarChart = ({ data, labels, color, accentColor, height = 140, hideZeroLabels = false }) => {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height, width: "100%", padding: "0 4px" }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 11, opacity: 0.6, fontWeight: 600 }}>{v > 0 ? v : ""}</span>
          <div style={{
            width: "100%", maxWidth: 32,
            height: `${Math.max((v / max) * (height - 30), v > 0 ? 4 : 2)}px`,
            background: v === 0 ? "rgba(255,255,255,0.07)" : (i === data.length - 1 ? accentColor : color),
            borderRadius: "4px 4px 0 0",
            transition: "height 0.5s ease",
          }} />
          <span style={{ fontSize: 10, opacity: 0.5 }}>{(hideZeroLabels && v === 0) ? "" : (labels?.[i] || "")}</span>
        </div>
      ))}
    </div>
  );
};

/* Horizontal tier bar for Attribution */
const TierBar = ({ amount, maxAmount, color, height = 12 }) => {
  const pct = maxAmount > 0 ? Math.min((amount / maxAmount) * 100, 100) : 0;
  return (
    <div style={{ width: "100%", height, background: "rgba(255,255,255,0.05)", borderRadius: height / 2, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: height / 2, transition: "width 0.8s ease" }} />
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════════
   THEMES
   ══════════════════════════════════════════════════════════════════════════════ */
const themes = {
  dark: {
    bg: "#0B0F14", surface: "#141A22", surfaceHover: "#1C242E", surfaceElevated: "#1A2230",
    border: "#2A3440", text: "#E8EDF2", textSecondary: "#8899AA",
    accent: "#D4A853", accentMuted: "rgba(212,168,83,0.15)", accentStrong: "rgba(212,168,83,0.25)",
    green: "#4ADE80", red: "#F87171", yellow: "#FBBF24", blue: "#60A5FA",
    chart: "#4A6A8A", chartAccent: "#D4A853", cardShadow: "0 2px 8px rgba(0,0,0,0.5)",
  },
  light: {
    bg: "#F3F5F8", surface: "#FFFFFF", surfaceHover: "#F0F2F5", surfaceElevated: "#FAFBFC",
    border: "#E0E4EA", text: "#1A2028", textSecondary: "#6B7A8D",
    accent: "#B8860B", accentMuted: "rgba(184,134,11,0.08)", accentStrong: "rgba(184,134,11,0.15)",
    green: "#16A34A", red: "#DC2626", yellow: "#D97706", blue: "#2563EB",
    chart: "#B0BEC5", chartAccent: "#B8860B", cardShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
};

const TAG_COLORS = {
  "mrr-growth":                 { bg: "rgba(74,222,128,0.15)",  text: "#4ADE80" },
  "mrr-decline":                { bg: "rgba(248,113,113,0.15)", text: "#F87171" },
  "churn":                      { bg: "rgba(248,113,113,0.15)", text: "#F87171" },
  "red-flags":                  { bg: "rgba(251,191,36,0.15)",  text: "#FBBF24" },
  "low-velocity":               { bg: "rgba(251,191,36,0.15)",  text: "#FBBF24" },
  "bug-spike":                  { bg: "rgba(251,191,36,0.15)",  text: "#FBBF24" },
  "feature-demand":             { bg: "rgba(96,165,250,0.15)",  text: "#60A5FA" },
  "playbook:Expansion Revenue": { bg: "rgba(212,168,83,0.2)",   text: "#D4A853" },
  "playbook:Dunning Recovery":  { bg: "rgba(167,139,250,0.2)",  text: "#A78BFA" },
};

const CATEGORY_COLORS = {
  expansion:       "#4ADE80",
  churn_prevention:"#F87171",
  retention:       "#FBBF24",
  reporting:       "#8899AA",
  product:         "#60A5FA",
  engineering:     "#A78BFA",
};

/* ══════════════════════════════════════════════════════════════════════════════
   DASHBOARD
   ══════════════════════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const [mode, setMode] = useState("dark");
  const [d, setD] = useState(MOCK);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isSmallMobile, setIsSmallMobile] = useState(window.innerWidth < 480);
  const [memoryPages, setMemoryPages] = useState(SCENARIOS[0].memoryPages);
  const [attributionEntries, setAttributionEntries] = useState(SCENARIOS[0].attributionEntries);
  const [expandedPage, setExpandedPage] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState(0);
  const t = themes[mode];

  /* When scenario changes (and we're in demo mode), swap all mock data */
  const handleScenarioChange = useCallback((idx) => {
    if (live) return; // live mode: scenario selector is disabled
    const s = SCENARIOS[idx];
    setSelectedScenario(idx);
    setD(s.data);
    setMemoryPages(s.memoryPages);
    setAttributionEntries(s.attributionEntries);
    setExpandedPage(null);
    setActiveTab("overview");
  }, [live]);

  useEffect(() => {
    const handler = () => {
      setIsMobile(window.innerWidth < 768);
      setIsSmallMobile(window.innerWidth < 480);
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      // Seeded rows for Growth Stage tenant all have created_at <= 2026-04-09T09:00:00Z.
      // System-generated rows accumulate with newer timestamps; the date ceiling pins us
      // to exactly the 13 seeded story pages and 12 seeded ledger entries.
      const SEED_CEILING = "2026-04-09T23:59:59Z";
      const [reports, snapshots, confidence, skills, digests, audits, unitEcon, triageBatches, auditLog, metricDeltas, pages, savedMrr] = await Promise.all([
        query("weekly_reports", `${TID}&order=created_at.desc&limit=1`),
        query("saas_metrics_snapshot", "order=created_at.desc&limit=1"),
        query("confidence_history", `${TID}&order=recorded_at.desc&limit=13`),
        query("skills_registry", `${TID}&select=*`),
        query("weekly_digests", `${TID}&order=created_at.desc&limit=3`),
        query("dogfood_audits", "order=created_at.desc&limit=1"),
        query("unit_economics_snapshot", "order=created_at.desc&limit=1"),
        query("issue_triage_batches", "order=created_at.desc&limit=1"),
        query("audit_log", `${TID}&order=created_at.desc&limit=10`),
        query("metric_deltas", "order=created_at.desc&limit=1"),
        query("memory_pages", `${TID}&created_at=lte.${SEED_CEILING}&order=created_at.desc&limit=13`),
        query("saved_mrr_ledger", `${TID}&created_at=lte.${SEED_CEILING}&order=created_at.desc&limit=200`),
      ]);
      if (cancelled) return;

      const latest = reports?.[0];
      const merged = { ...MOCK };
      let anyLive = false;

      if (latest) {
        anyLive = true;
        const report = typeof latest.report_data === "string" ? JSON.parse(latest.report_data) : latest.report_data;
        if (report) {
          merged.reporting_week = report.reporting_week || latest.reporting_week || MOCK.reporting_week;
          merged.last_run = latest.created_at || MOCK.last_run;
          if (report.mrr_delta) {
            merged.mrr = { current: report.mrr_delta.current_mrr ?? MOCK.mrr.current, previous: report.mrr_delta.previous_mrr ?? MOCK.mrr.previous, change_pct: report.mrr_delta.change_pct ?? MOCK.mrr.change_pct };
          }
          merged.active_subscriptions = report.active_subscriptions ?? MOCK.active_subscriptions;
          if (report.churn_risk_flag) {
            merged.churn = { rate: MOCK.churn.rate, at_risk: report.churn_risk_flag.at_risk_accounts ?? MOCK.churn.at_risk, reason: report.churn_risk_flag.reason ?? MOCK.churn.reason };
          }
          if (report.github_issue_velocity) {
            merged.velocity = { opened: report.github_issue_velocity.opened ?? MOCK.velocity.opened, closed: report.github_issue_velocity.closed ?? MOCK.velocity.closed, net: report.github_issue_velocity.net_change ?? MOCK.velocity.net, avg_close_hrs: report.github_issue_velocity.avg_close_time_hours ?? MOCK.velocity.avg_close_hrs, backlog: report.github_issue_velocity.open_backlog ?? MOCK.velocity.backlog };
          }
          if (report.blocked_items?.length) merged.blocked = report.blocked_items.map(b => ({ id: b.id, title: b.title, since: b.blocked_since, reason: b.reason }));
          merged.confidence.current = report.confidence ?? MOCK.confidence.current;
          merged.recommendation = report.top_priority_recommendation ?? MOCK.recommendation;
          if (report.advisor_note) merged.advisor_note = report.advisor_note;
          if (report.playbook_match) merged.playbook_match = { name: report.playbook_match.playbook_name || report.playbook_match.name || MOCK.playbook_match.name, success_rate: report.playbook_match.success_rate ?? MOCK.playbook_match.success_rate, applications: report.playbook_match.applications ?? MOCK.playbook_match.applications, flag: MOCK.playbook_match.flag };
        }
      }

      // Confidence history — dedup by period, keep highest recorded_at per period, then sort asc
      if (confidence?.length > 0) {
        anyLive = true;
        const byPeriod = {};
        for (const c of confidence) {
          const p = c.period || c.reporting_week || c.run_id || "";
          if (!byPeriod[p] || (c.recorded_at || "") > (byPeriod[p].recorded_at || "")) byPeriod[p] = c;
        }
        const deduped = Object.values(byPeriod).sort((a, b) => (a.period || "") < (b.period || "") ? -1 : 1);
        const confHist = deduped.map(c => c.confidence ?? c.confidence_value ?? c.value).filter(v => v != null && v > 0);
        if (confHist.length > merged.confidence.history.length) merged.confidence.history = confHist;
      }
      if (skills?.length > 0) {
        anyLive = true;
        const SKIP = new Set(["test_skill"]);
        const seen = new Set();
        merged.skills = skills
          .filter(s => { const key = s.skill_name || s.name; return key && !SKIP.has(key) && !seen.has(key) && seen.add(key); })
          .map(s => ({ name: s.skill_name || s.name, tier: s.tier ?? 0, agent: s.agent || "system", status: s.status || "healthy", success_rate: s.success_rate ?? 100 }));
      }
      if (digests?.length > 0) { anyLive = true; merged.digests = digests.map(dg => ({ period: dg.reporting_week || dg.period, status: dg.status || "delivered", channel: dg.channel || "slack" })); }

      const snap = snapshots?.[0];
      if (snap) {
        anyLive = true;
        const snapData = typeof snap.snapshot_data === "string" ? JSON.parse(snap.snapshot_data) : snap.snapshot_data;
        if (snapData?.red_flags) merged.red_flags = snapData.red_flags.map(f => ({ metric: f.metric, severity: f.severity, detail: f.detail || f.reason || "" }));
      }

      const ueRow = unitEcon?.[0];
      if (ueRow) {
        anyLive = true;
        const ue = typeof ueRow.snapshot_data === "string" ? JSON.parse(ueRow.snapshot_data) : (ueRow.snapshot_data || ueRow);
        merged.unit_economics = { rule40_score: ue.rule40_score ?? ue.rule40?.score ?? MOCK.unit_economics.rule40_score, health_grade: ue.health_grade ?? ue.rule40?.health_grade ?? MOCK.unit_economics.health_grade, ltv_simple: ue.ltv_simple ?? ue.ltv?.ltv_simple ?? MOCK.unit_economics.ltv_simple, arpu: ue.arpu ?? MOCK.unit_economics.arpu, quick_ratio: ue.quick_ratio ?? MOCK.unit_economics.quick_ratio, nrr_pct: ue.nrr_pct ?? ue.net_revenue_retention ?? MOCK.unit_economics.nrr_pct };
      }

      if (auditLog?.length > 0) {
        const mapped = auditLog.slice(0, 10).map(e => ({ event_type: e.event_type || e.action || "UNKNOWN", severity: e.severity || "info", message: e.message || e.details || "", created_at: e.created_at || "" }));
        const hasMessages = mapped.some(e => e.message && e.message.length > 5);
        if (hasMessages) {
          anyLive = true;
          merged.audit_events = mapped;
        }
      }

      // Memory pages
      if (pages?.length > 0) {
        anyLive = true;
        const parsed = pages.map(p => ({
          ...p,
          timeline: typeof p.timeline === "string" ? JSON.parse(p.timeline) : (p.timeline || []),
          metadata: typeof p.metadata === "string" ? JSON.parse(p.metadata) : (p.metadata || {}),
          tags: Array.isArray(p.tags) ? p.tags : (p.tags || "").split(",").filter(Boolean),
        }));
        setMemoryPages(parsed);
        merged.memory_health = { total_pages: parsed.length, matches_found: MOCK.memory_health.matches_found, avg_relevance: MOCK.memory_health.avg_relevance, active_playbooks: MOCK.memory_health.active_playbooks, stale_playbooks: 0 };
        // Build confidence history from memory pages when richer than what confidence_history returned
        const pageConf = parsed
          .filter(p => p.metadata?.confidence != null)
          .sort((a, b) => (a.metadata?.reporting_week || a.title || "") < (b.metadata?.reporting_week || b.title || "") ? -1 : 1)
          .map(p => p.metadata.confidence);
        if (pageConf.length > merged.confidence.history.length) merged.confidence.history = pageConf;
      }

      // Saved MRR ledger — dedup by action_id (multiple seeder runs insert identical rows)
      if (savedMrr?.length > 0) {
        anyLive = true;
        const seenAid = new Set();
        const deduped = savedMrr.filter(r => {
          const key = r.action_id || r.id;
          return key && !seenAid.has(key) && seenAid.add(key);
        });
        setAttributionEntries(deduped);
        const direct   = deduped.filter(r => r.attribution_tier === "direct");
        const likely   = deduped.filter(r => r.attribution_tier === "likely");
        const reported = deduped.filter(r => r.attribution_tier === "operator_reported");
        const sum = (arr) => arr.reduce((s, r) => s + parseFloat(r.mrr_amount || 0), 0);
        const avgConf = (arr) => { const cs = arr.map(r => { const ev = typeof r.evidence === "string" ? JSON.parse(r.evidence) : (r.evidence || {}); return ev.confidence; }).filter(c => c != null); return cs.length ? cs.reduce((a, b) => a + b, 0) / cs.length : null; };
        merged.saved_mrr = { direct: { amount: Math.round(sum(direct)), actions: direct.length, avg_confidence: avgConf(direct) }, likely: { amount: Math.round(sum(likely)), actions: likely.length, avg_confidence: avgConf(likely) }, reported: { amount: Math.round(sum(reported)), actions: reported.length, avg_confidence: null } };
      }

      setD(merged);
      setLive(anyLive);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const timeSince = (iso) => { const diff = Date.now() - new Date(iso).getTime(); const hrs = Math.floor(diff / 3600000); if (hrs < 1) return "< 1h ago"; if (hrs < 24) return `${hrs}h ago`; return `${Math.floor(hrs / 24)}d ago`; };
  const fmt = (n) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`;
  const fmtFull = (n) => `$${n.toLocaleString()}`;

  const Card = ({ children, style = {} }) => (
    <div style={{ background: t.surface, borderRadius: 14, border: `1px solid ${t.border}`, padding: 22, boxShadow: t.cardShadow, transition: "all 0.2s ease", ...style }}>{children}</div>
  );

  const healthDot = (val, thresholds) => {
    const color = val >= thresholds[0] ? t.green : val >= thresholds[1] ? t.yellow : t.red;
    return <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: color, marginRight: 6 }} />;
  };

  const severityColor = (s) => s === "critical" ? t.red : s === "warning" ? t.yellow : t.textSecondary;
  const statusColor = (s) => s === "healthy" ? t.green : s === "stale" ? t.yellow : s === "failing" ? t.red : t.textSecondary;
  const gradeColor = (g) => (g === "Excellent" || g === "Strong") ? t.green : g === "Adequate" ? t.yellow : t.red;
  const deltaArrow = (val) => { if (val == null || val === 0) return ""; return val > 0 ? `▲ ${Math.abs(val).toFixed(1)}` : `▼ ${Math.abs(val).toFixed(1)}`; };
  const eventIcon = (type) => { if (type.includes("RED_FLAG") || type.includes("ALERT") || type.includes("RISK")) return "🔴"; if (type.includes("SLACK") || type.includes("EMAIL")) return "📨"; if (type.includes("CONFIDENCE")) return "🎯"; if (type.includes("RUN_COMPLETE") || type.includes("RUN_START")) return "✅"; if (type.includes("ADVISOR") || type.includes("MEMORY")) return "🧠"; if (type.includes("OUTCOME")) return "📊"; if (type.includes("EXPANSION")) return "🚀"; if (type.includes("NODE")) return "⚙️"; if (type.includes("CEO")) return "📋"; return "📋"; };

  const tierLabel = (tier) => tier === "direct" ? "DIRECT" : tier === "likely" ? "LIKELY" : "REPORTED";
  const tierColor = (tier) => tier === "direct" ? t.green : tier === "likely" ? t.blue : t.yellow;
  const tagStyle = (tag) => {
    const c = TAG_COLORS[tag] || { bg: "rgba(136,153,170,0.15)", text: "#8899AA" };
    return { fontSize: 10, padding: "2px 8px", borderRadius: 10, fontWeight: 700, background: c.bg, color: c.text, display: "inline-block", marginRight: 4, marginBottom: 4 };
  };

  const tabs = [
    { id: "overview",     label: "Overview" },
    { id: "memory",       label: "Memory Vault", badge: d.memory_health.total_pages },
    { id: "attribution",  label: "Attribution" },
  ];

  const avgConfidence = memoryPages.length > 0
    ? (memoryPages.reduce((s, p) => s + (p.metadata?.confidence || 0), 0) / memoryPages.length).toFixed(2)
    : "—";

  // Attribution aggregates
  const attrDirect   = attributionEntries.filter(e => e.attribution_tier === "direct");
  const attrLikely   = attributionEntries.filter(e => e.attribution_tier === "likely");
  const attrReported = attributionEntries.filter(e => e.attribution_tier === "operator_reported");
  const sumMrr = (arr) => arr.reduce((s, e) => s + parseFloat(e.mrr_amount || 0), 0);
  const totalDirect   = sumMrr(attrDirect);
  const totalLikely   = sumMrr(attrLikely);
  const totalReported = sumMrr(attrReported);
  const maxTier = Math.max(totalDirect, totalLikely, totalReported, 1);

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.text, fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif", transition: "background 0.3s ease, color 0.3s ease", overflowX: "hidden" }}>

      {/* ── DEMO BANNER ─────────────────────────────────────────────── */}
      {!live && !loading && (
        <div style={{ background: "rgba(212,168,83,0.1)", borderBottom: `1px solid rgba(212,168,83,0.25)`, padding: "9px 32px", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "#D4A853", fontWeight: 700, letterSpacing: 0.3 }}>
            DEMO MODE
          </span>
          <span style={{ fontSize: 12, color: "#8b8fa8" }}>
            15 behavioral scenarios — simulated operational data. No Stripe or GitHub connection required.
          </span>
          <a href="https://forge-dynamics-executive-crew.vercel.app" style={{ fontSize: 12, color: "#D4A853", fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }} onMouseOver={e => e.target.style.textDecoration = "underline"} onMouseOut={e => e.target.style.textDecoration = "none"}>
            Connect your own data →
          </a>
        </div>
      )}

      {/* ── SCENARIO SELECTOR ───────────────────────────────────────── */}
      {!live && !loading && (
        <div style={{ background: t.surface, borderBottom: `1px solid ${t.border}`, padding: isMobile ? "12px 16px" : "12px 32px" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: t.textSecondary, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, whiteSpace: "nowrap" }}>Scenario</span>
              <span style={{ fontSize: 11, color: t.accent, background: t.accentMuted, padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>{SCENARIOS[selectedScenario].label}</span>
              <span style={{ fontSize: 11, color: t.textSecondary }}>{SCENARIOS[selectedScenario].description}</span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {SCENARIOS.map((s, idx) => {
                const badgeColors = {
                  churn: { bg: "rgba(248,113,113,0.15)", text: "#F87171" },
                  engineering: { bg: "rgba(167,139,250,0.15)", text: "#A78BFA" },
                  growth: { bg: "rgba(74,222,128,0.15)", text: "#4ADE80" },
                  stable: { bg: "rgba(136,153,170,0.15)", text: "#8899AA" },
                  risk: { bg: "rgba(251,191,36,0.15)", text: "#FBBF24" },
                  data: { bg: "rgba(96,165,250,0.15)", text: "#60A5FA" },
                };
                const bc = badgeColors[s.badge] || badgeColors.stable;
                const isActive = idx === selectedScenario;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleScenarioChange(idx)}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "5px 11px",
                      borderRadius: 20,
                      border: isActive ? `1.5px solid ${t.accent}` : `1px solid ${t.border}`,
                      background: isActive ? t.accentStrong : t.surfaceHover,
                      color: isActive ? t.accent : t.text,
                      fontSize: 11, fontWeight: isActive ? 700 : 500,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 6, fontWeight: 700, background: bc.bg, color: bc.text, textTransform: "uppercase", letterSpacing: 0.3 }}>{s.badge}</span>
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <div style={{ padding: isMobile ? "14px 16px" : "14px 32px", borderBottom: `1px solid ${t.border}`, background: t.surface, position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5 }}>Forge Dynamics</div>
              <div style={{ fontSize: 11, color: t.accent, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>AI Ops Platform</div>
            </div>
            {!isMobile && (
              <div style={{ display: "flex", gap: 2, marginLeft: 16 }}>
                {tabs.map(tab => (
                  <button type="button" key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                    background: activeTab === tab.id ? t.accentStrong : "transparent", border: "none", borderRadius: 8,
                    padding: "8px 16px", cursor: "pointer", color: activeTab === tab.id ? t.accent : t.textSecondary,
                    fontSize: 13, fontWeight: 600, transition: "all 0.15s ease", display: "flex", alignItems: "center", gap: 6,
                  }}>
                    {tab.label}
                    {tab.badge != null && <span style={{ fontSize: 10, background: t.accentMuted, color: t.accent, padding: "1px 6px", borderRadius: 10, fontWeight: 700 }}>{tab.badge}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 14 }}>
            {!isMobile && (
              <>
                <span style={{ fontSize: 11, color: t.textSecondary, fontFamily: "'JetBrains Mono', monospace" }}>{d.reporting_week}</span>
                <span style={{ fontSize: 10, background: t.accentMuted, color: t.accent, padding: "4px 10px", borderRadius: 20, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                  {d.llm_provider} · {d.cross_model_consistency}%
                </span>
                <span style={{ fontSize: 11, color: live ? t.green : t.textSecondary, background: live ? "rgba(74,222,128,0.1)" : t.accentMuted, padding: "4px 10px", borderRadius: 20, fontWeight: 600 }}>
                  {loading ? "Loading…" : live ? `● Live · ${timeSince(d.last_run)}` : `○ Demo · ${timeSince(d.last_run)}`}
                </span>
              </>
            )}
            <button type="button" onClick={() => setMode(m => m === "dark" ? "light" : "dark")} style={{ background: t.accentMuted, border: `1px solid ${t.border}`, borderRadius: 8, padding: "6px 14px", cursor: "pointer", color: t.accent, fontSize: 12, fontWeight: 600 }}>
              {mode === "dark" ? "☀" : "🌙"}
            </button>
          </div>
        </div>
        {isMobile && (
          <div style={{ display: "flex", gap: 2, marginTop: 10, overflowX: "auto" }}>
            {tabs.map(tab => (
              <button type="button" key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                background: activeTab === tab.id ? t.accentStrong : "transparent", border: "none", borderRadius: 8,
                padding: "8px 16px", cursor: "pointer", color: activeTab === tab.id ? t.accent : t.textSecondary,
                fontSize: 13, fontWeight: 600, transition: "all 0.15s ease", display: "flex", alignItems: "center", gap: 6,
                whiteSpace: "nowrap", flexShrink: 0,
              }}>
                {tab.label}
                {tab.badge != null && <span style={{ fontSize: 10, background: t.accentMuted, color: t.accent, padding: "1px 6px", borderRadius: 10, fontWeight: 700 }}>{tab.badge}</span>}
              </button>
            ))}
          </div>
        )}
        {isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: t.textSecondary, fontFamily: "'JetBrains Mono', monospace" }}>{d.reporting_week}</span>
            <span style={{ fontSize: 10, background: t.accentMuted, color: t.accent, padding: "4px 10px", borderRadius: 20, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
              {d.llm_provider} · {d.cross_model_consistency}%
            </span>
            <span style={{ fontSize: 11, color: live ? t.green : t.textSecondary, background: live ? "rgba(74,222,128,0.1)" : t.accentMuted, padding: "4px 10px", borderRadius: 20, fontWeight: 600 }}>
              {loading ? "Loading…" : live ? `● Live · ${timeSince(d.last_run)}` : `○ Demo · ${timeSince(d.last_run)}`}
            </span>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "24px 16px" : "24px 32px" }}>

        {/* ══ OVERVIEW TAB ════════════════════════════════════════════ */}
        {activeTab === "overview" && (<>

          {/* CEO RECOMMENDATION */}
          <Card style={{ marginBottom: 22, borderLeft: `4px solid ${t.accent}`, background: t.surfaceElevated, padding: "24px 28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: t.accent, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5 }}>CEO Recommendation</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: t.textSecondary }}>Confidence</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: d.confidence.current >= 0.8 ? t.green : d.confidence.current >= 0.6 ? t.yellow : t.red, fontFamily: "'JetBrains Mono', monospace" }}>{d.confidence.current.toFixed(2)}</span>
              </div>
            </div>
            <div style={{ fontSize: 16, lineHeight: 1.7, color: t.text, fontWeight: 500, marginBottom: 16 }}>{d.recommendation}</div>
            {d.advisor_note && (
              <div style={{ padding: "14px 16px", background: t.accentMuted, borderRadius: 10, borderLeft: `3px solid ${t.accent}` }}>
                <div style={{ fontSize: 10, color: t.accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>🧠 Advisor · Memory Flywheel</div>
                <div style={{ fontSize: 13, lineHeight: 1.6, color: t.text }}>{d.advisor_note}</div>
                {d.playbook_match && (
                  <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 11, color: t.textSecondary, flexWrap: "wrap" }}>
                    <span>Playbook: <b style={{ color: t.accent }}>{d.playbook_match.name}</b></span>
                    <span>Success: <b style={{ color: t.green }}>{(d.playbook_match.success_rate * 100).toFixed(0)}%</b> ({d.playbook_match.applications} runs)</span>
                    <span>Signal: <b style={{ color: d.playbook_match.flag === "strong" ? t.green : t.yellow }}>{d.playbook_match.flag}</b></span>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* KPI ROW */}
          <div style={{ display: "grid", gridTemplateColumns: isSmallMobile ? "minmax(0,1fr)" : isMobile ? "repeat(2, minmax(0,1fr))" : "repeat(4, minmax(0,1fr))", gap: 16, marginBottom: 22 }}>
            {[
              { label: "MRR", value: fmtFull(d.mrr.current), sub: `${d.mrr.change_pct > 0 ? "+" : ""}${d.mrr.change_pct.toFixed(1)}% WoW`, color: t.accent, health: [5, 0], healthVal: d.mrr.change_pct },
              { label: "Active Subscriptions", value: d.active_subscriptions, sub: `${d.churn.at_risk} at risk`, color: t.text, health: [1, 3], healthVal: d.churn.at_risk === 0 ? 999 : d.churn.at_risk <= 2 ? 2 : 0 },
              { label: "Engineering Velocity", value: `${d.velocity.closed} closed`, sub: `${d.velocity.backlog} backlog · ${deltaArrow(d.deltas.backlog_delta)} WoW`, color: t.text, health: [8, 4], healthVal: d.velocity.closed },
              { label: "Confidence", value: d.confidence.current.toFixed(2), sub: `${deltaArrow(d.deltas.confidence_delta)} WoW · Calibrated`, color: d.confidence.current >= 0.8 ? t.green : t.yellow, health: [0.8, 0.6], healthVal: d.confidence.current },
            ].map((kpi, i) => (
              <Card key={i} style={{ padding: "20px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
                  {healthDot(kpi.healthVal, kpi.health)}
                  <span style={{ fontSize: 12, color: t.textSecondary, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700 }}>{kpi.label}</span>
                </div>
                <div style={{ fontSize: 32, fontWeight: 800, color: kpi.color, lineHeight: 1.1, fontFamily: "'DM Sans', sans-serif" }}>{kpi.value}</div>
                <div style={{ fontSize: 13, color: typeof kpi.sub === "string" && kpi.sub.startsWith("+") ? t.green : typeof kpi.sub === "string" && kpi.sub.includes("▼") ? t.red : t.textSecondary, marginTop: 6, fontWeight: 500 }}>{kpi.sub}</div>
              </Card>
            ))}
          </div>

          {/* SAVED MRR — 3-TIER */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "minmax(0,1fr)" : "repeat(3, minmax(0,1fr))", gap: 16, marginBottom: 22 }}>
            {[
              { tier: "DIRECT", desc: "Deterministic event match", data: d.saved_mrr.direct, color: t.green, barPct: 100 },
              { tier: "LIKELY", desc: "Correlated timing", data: d.saved_mrr.likely, color: t.blue, barPct: Math.round((d.saved_mrr.likely.amount / d.saved_mrr.direct.amount) * 100) },
              { tier: "REPORTED", desc: "Operator-reported", data: d.saved_mrr.reported, color: t.yellow, barPct: Math.round((d.saved_mrr.reported.amount / d.saved_mrr.direct.amount) * 100) },
            ].map((card, i) => (
              <Card key={i} style={{ padding: "18px 22px" }}>
                <div style={{ fontSize: 10, color: t.textSecondary, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, marginBottom: 4 }}>Saved MRR · {card.tier}</div>
                <div style={{ fontSize: 9, color: t.textSecondary, marginBottom: 12 }}>{card.desc}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: card.color, fontFamily: "'DM Sans', sans-serif" }}>{fmtFull(card.data.amount)}</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: t.textSecondary }}>
                  <span>{card.data.actions} actions</span>
                  <span>{card.data.avg_confidence != null ? `avg conf: ${card.data.avg_confidence.toFixed(2)}` : "N/A"}</span>
                </div>
                <div style={{ width: "100%", height: 4, background: t.border, borderRadius: 2, marginTop: 10, overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(card.barPct, 100)}%`, height: "100%", background: card.color, borderRadius: 2, transition: "width 0.5s ease" }} />
                </div>
              </Card>
            ))}
          </div>

          {/* CHARTS ROW */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "minmax(0,1fr)" : "minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)", gap: 16, marginBottom: 22 }}>
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>GitHub Velocity</span>
                <span style={{ fontSize: 10, color: t.textSecondary, background: t.accentMuted, padding: "2px 8px", borderRadius: 10 }}>7d</span>
              </div>
              <SimpleBarChart data={[7, 9, 5, 11, 8, d.velocity.opened, d.velocity.closed]} labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]} color={t.chart} accentColor={t.chartAccent} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 12, color: t.textSecondary }}>
                <span>Opened: <b style={{ color: t.text }}>{d.velocity.opened}</b></span>
                <span>Closed: <b style={{ color: t.green }}>{d.velocity.closed}</b></span>
                <span>Avg: <b style={{ color: t.text }}>{d.velocity.avg_close_hrs}h</b></span>
              </div>
            </Card>

            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>Red Flags</span>
                <span style={{ fontSize: 10, color: d.red_flags.some(f => f.severity === "critical") ? t.red : d.red_flags.length > 0 ? t.yellow : t.green, background: d.red_flags.length > 0 ? "rgba(251,191,36,0.15)" : "rgba(74,222,128,0.1)", padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>{d.red_flags.length > 0 ? `${d.red_flags.length} active` : "Clear"}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {d.red_flags.map((f, i) => (
                  <div key={i} style={{ padding: "10px 12px", background: t.surfaceHover, borderRadius: 8, borderLeft: `3px solid ${severityColor(f.severity)}` }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{f.metric}</div>
                    <div style={{ fontSize: 12, color: t.textSecondary }}>{f.detail}</div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: severityColor(f.severity), textTransform: "uppercase", letterSpacing: 0.5 }}>{f.severity}</span>
                  </div>
                ))}
                {d.red_flags.length === 0 && <div style={{ fontSize: 14, color: t.green, textAlign: "center", padding: 24, fontWeight: 600 }}>No active flags ✓</div>}
              </div>
            </Card>

            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>Confidence Trend</span>
                <span style={{ fontSize: 10, color: t.textSecondary, background: t.accentMuted, padding: "2px 8px", borderRadius: 10 }}>{d.confidence.history.length} weeks</span>
              </div>
              <div style={{ display: "flex", justifyContent: "center", padding: "10px 0" }}>
                <MiniChart data={d.confidence.history} color={t.accent} height={100} width={260} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: t.textSecondary }}>
                <span>Min: <b style={{ color: t.text }}>{Math.min(...d.confidence.history).toFixed(2)}</b></span>
                <span>Max: <b style={{ color: t.text }}>{Math.max(...d.confidence.history).toFixed(2)}</b></span>
                <span>Current: <b style={{ color: t.accent }}>{d.confidence.current.toFixed(2)}</b></span>
              </div>
            </Card>
          </div>

          {/* BOTTOM ROW */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "minmax(0,1fr)" : "minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)", gap: 16, marginBottom: 22 }}>
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>Unit Economics</span>
                <span style={{ fontSize: 11, color: gradeColor(d.unit_economics.health_grade), background: `${gradeColor(d.unit_economics.health_grade)}22`, padding: "3px 10px", borderRadius: 10, fontWeight: 700 }}>{d.unit_economics.health_grade}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                <div style={{ position: "relative", width: 90, height: 90 }}>
                  <svg width={90} height={90} viewBox="0 0 90 90">
                    <circle cx={45} cy={45} r={38} fill="none" stroke={t.border} strokeWidth={6} />
                    <circle cx={45} cy={45} r={38} fill="none" stroke={gradeColor(d.unit_economics.health_grade)} strokeWidth={6} strokeDasharray={`${(Math.min(d.unit_economics.rule40_score, 100) / 100) * 238.76} 238.76`} strokeLinecap="round" transform="rotate(-90 45 45)" style={{ transition: "stroke-dasharray 0.8s ease" }} />
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: gradeColor(d.unit_economics.health_grade) }}>{d.unit_economics.rule40_score.toFixed(0)}</span>
                    <span style={{ fontSize: 9, color: t.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 }}>Rule of 40</span>
                  </div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 8 }}>
                {[{ label: "ARPU", value: `$${d.unit_economics.arpu.toFixed(0)}` }, { label: "LTV", value: `$${d.unit_economics.ltv_simple.toFixed(0)}` }, { label: "Quick Ratio", value: d.unit_economics.quick_ratio.toFixed(1) }, { label: "NRR", value: `${d.unit_economics.nrr_pct.toFixed(1)}%` }].map((m, i) => (
                  <div key={i} style={{ padding: "8px 10px", background: t.surfaceHover, borderRadius: 8 }}>
                    <div style={{ fontSize: 10, color: t.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 }}>{m.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{m.value}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Skill Health</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {d.skills.map((s, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: t.surfaceHover, borderRadius: 8 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                      <div style={{ fontSize: 10, color: t.textSecondary }}>T{s.tier} · {s.agent}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 8 }}>
                      <div style={{ width: 50, height: 5, background: t.border, borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${s.success_rate}%`, height: "100%", background: statusColor(s.status), borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 11, color: statusColor(s.status), fontWeight: 700 }}>{s.success_rate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>Audit Log</span>
                <span style={{ fontSize: 10, color: t.textSecondary, background: t.accentMuted, padding: "2px 8px", borderRadius: 10, fontWeight: 500 }}>last {d.audit_events.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 260, overflowY: "auto" }}>
                {d.audit_events.map((e, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 8px", borderRadius: 6, background: i % 2 === 0 ? "transparent" : t.surfaceHover }}>
                    <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>{eventIcon(e.event_type)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: e.severity === "warning" ? t.yellow : e.severity === "error" ? t.red : t.textSecondary }}>{e.event_type}</div>
                      <div style={{ fontSize: 12, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.message}</div>
                    </div>
                    <span style={{ fontSize: 10, color: t.textSecondary, flexShrink: 0, marginTop: 2 }}>{e.created_at ? new Date(e.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

        </>)}

        {/* ══ MEMORY VAULT TAB ════════════════════════════════════════ */}
        {activeTab === "memory" && (<>

          {/* Stats bar */}
          <div style={{ display: "grid", gridTemplateColumns: isSmallMobile ? "repeat(2,minmax(0,1fr))" : "repeat(4, minmax(0,1fr))", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Memory Pages", value: memoryPages.length, color: t.accent },
              { label: "Avg Confidence", value: avgConfidence, color: t.green },
              { label: "Active Playbooks", value: d.memory_health.active_playbooks, color: t.blue },
              { label: "Playbook Matches", value: d.memory_health.matches_found, color: t.yellow },
            ].map((s, i) => (
              <Card key={i} style={{ padding: "16px 18px" }}>
                <div style={{ fontSize: 10, color: t.textSecondary, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700, marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: s.color, fontFamily: "'DM Sans', sans-serif" }}>{s.value}</div>
              </Card>
            ))}
          </div>

          {/* 13-week confidence sparkline */}
          <Card style={{ marginBottom: 20, padding: "20px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Confidence Flywheel — {d.confidence.history.length} Weeks</div>
                <div style={{ fontSize: 11, color: t.textSecondary, marginTop: 2 }}>CEO confidence calibrated from weekly run history · {SCENARIOS[selectedScenario].label}</div>
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: 11, color: t.textSecondary }}>
                <span>Min: <b style={{ color: t.text }}>{Math.min(...d.confidence.history).toFixed(2)}</b></span>
                <span>Peak: <b style={{ color: t.text }}>{Math.max(...d.confidence.history).toFixed(2)}</b></span>
                <span>Current: <b style={{ color: t.accent }}>{d.confidence.current.toFixed(2)}</b></span>
              </div>
            </div>
            <div style={{ position: "relative" }}>
              <MiniChart data={d.confidence.history} color={t.accent} height={80} width={Math.min(typeof window !== "undefined" ? window.innerWidth - 120 : 1100, 1100)} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 10, color: t.textSecondary, fontFamily: "'JetBrains Mono', monospace" }}>
                {d.confidence.history.map((_, i) => <span key={i}>W{String(i + 1).padStart(2, "0")}</span>)}
              </div>
              <div style={{ fontSize: 10, color: t.textSecondary, marginTop: 6, fontWeight: 600 }}>
                {d.reporting_week} · {SCENARIOS[selectedScenario].description}
              </div>
            </div>
          </Card>

          {/* Memory page timeline */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {memoryPages.map((page, idx) => {
              const conf = page.metadata?.confidence ?? 0;
              const week = page.metadata?.reporting_week || page.title?.match(/2026-W\d+/)?.[0] || "";
              const isExpanded = expandedPage === page.id;
              const catColor = CATEGORY_COLORS[page.category] || t.textSecondary;
              const isWarning = page.tags?.some(t => t === "churn" || t === "mrr-decline" || t === "red-flags");

              return (
                <div key={page.id}
                  onClick={() => setExpandedPage(isExpanded ? null : page.id)}
                  style={{ background: t.surface, borderRadius: 12, border: `1px solid ${isWarning ? "rgba(248,113,113,0.3)" : t.border}`, boxShadow: t.cardShadow, cursor: "pointer", transition: "all 0.2s ease", overflow: "hidden" }}
                >
                  {/* Card header */}
                  <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                    {/* Week badge */}
                    <div style={{ background: t.accentMuted, borderRadius: 8, padding: "4px 10px", flexShrink: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: t.accent, fontFamily: "'JetBrains Mono', monospace" }}>{week}</span>
                    </div>
                    {/* Category */}
                    <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 10, fontWeight: 700, background: `${catColor}22`, color: catColor, textTransform: "uppercase", letterSpacing: 0.5, flexShrink: 0 }}>
                      {page.category?.replace(/_/g, " ")}
                    </span>
                    {/* Confidence */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: conf >= 0.8 ? t.green : conf >= 0.65 ? t.yellow : t.red }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: conf >= 0.8 ? t.green : conf >= 0.65 ? t.yellow : t.red, fontFamily: "'JetBrains Mono', monospace" }}>{conf.toFixed(2)}</span>
                    </div>
                    {/* Tags */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, flex: 1 }}>
                      {(page.tags || []).map(tag => (
                        <span key={tag} style={tagStyle(tag)}>{tag}</span>
                      ))}
                    </div>
                    {/* Title excerpt */}
                    <div style={{ flex: 2, minWidth: 0, fontSize: 13, color: t.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {page.compiled_truth?.slice(0, 80)}…
                    </div>
                    {/* Expand chevron */}
                    <span style={{ fontSize: 12, color: t.textSecondary, flexShrink: 0, transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
                  </div>

                  {/* Expanded body */}
                  {isExpanded && (
                    <div style={{ padding: "0 20px 20px", borderTop: `1px solid ${t.border}` }}>
                      <div style={{ paddingTop: 16, fontSize: 13, lineHeight: 1.7, color: t.text, marginBottom: 14 }}>
                        {page.compiled_truth}
                      </div>
                      {page.timeline?.length > 0 && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: t.textSecondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Run Events</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {page.timeline.map((ev, j) => (
                              <div key={j} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 10px", background: t.surfaceHover, borderRadius: 8 }}>
                                <span style={{ fontSize: 12, flexShrink: 0 }}>{eventIcon(ev.event || "")}</span>
                                <div>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: t.accent, fontFamily: "'JetBrains Mono', monospace", marginBottom: 2 }}>{ev.event}</div>
                                  <div style={{ fontSize: 12, color: t.text }}>{ev.detail}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </>)}

        {/* ══ ATTRIBUTION TAB ═════════════════════════════════════════ */}
        {activeTab === "attribution" && (<>

          {/* ADR-016 notice */}
          <div style={{ padding: "12px 18px", background: t.accentMuted, borderRadius: 10, border: `1px solid ${t.border}`, marginBottom: 20, display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>⚖️</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.accent, marginBottom: 4 }}>ADR-016 · Attribution Tier Separation</div>
              <div style={{ fontSize: 12, color: t.text, lineHeight: 1.6 }}>
                Saved revenue is tracked in three separate tiers. <b>No combined total is computed, stored, or displayed.</b> Direct = deterministic event match. Likely = correlated timing (not causal). Reported = operator-asserted. Tiers are never aggregated without explicit disclaimer.
              </div>
            </div>
          </div>

          {/* 3-tier summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "minmax(0,1fr)" : "repeat(3, minmax(0,1fr))", gap: 16, marginBottom: 22 }}>
            {[
              { tier: "direct",            label: "DIRECT", desc: "Deterministic event match — Forge action triggered and outcome verified", total: totalDirect,   count: attrDirect.length,   color: t.green  },
              { tier: "likely",            label: "LIKELY", desc: "Correlated timing — action preceded outcome within causal window", total: totalLikely,   count: attrLikely.length,   color: t.blue   },
              { tier: "operator_reported", label: "REPORTED", desc: "Operator-asserted — founder/operator reports attribution manually", total: totalReported, count: attrReported.length, color: t.yellow },
            ].map(card => (
              <Card key={card.tier} style={{ padding: "20px 22px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>Saved MRR · {card.label}</div>
                <div style={{ fontSize: 11, color: t.textSecondary, marginBottom: 14, lineHeight: 1.5 }}>{card.desc}</div>
                <div style={{ fontSize: 30, fontWeight: 800, color: card.color, fontFamily: "'DM Sans', sans-serif", marginBottom: 12 }}>{fmtFull(Math.round(card.total))}</div>
                <TierBar amount={card.total} maxAmount={maxTier} color={card.color} height={10} />
                <div style={{ fontSize: 11, color: t.textSecondary, marginTop: 8 }}>{card.count} action{card.count !== 1 ? "s" : ""} attributed</div>
              </Card>
            ))}
          </div>

          {/* Weekly attribution chart — all tiers, active weeks only */}
          <Card style={{ marginBottom: 22, padding: "20px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Saved MRR by Week</div>
              <div style={{ display: "flex", gap: 10, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>
                <span style={{ color: t.green }}>■ Direct</span>
                <span style={{ color: t.blue }}>■ Likely</span>
                <span style={{ color: t.yellow }}>■ Reported</span>
              </div>
            </div>
            <div style={{ fontSize: 11, color: t.textSecondary, marginBottom: 16 }}>Total saved MRR per week across all attribution tiers · 13-week window</div>
            {(() => {
              if (attributionEntries.length === 0) return <div style={{ color: t.textSecondary, fontSize: 13, textAlign: "center", padding: 32 }}>No attribution data yet.</div>;
              // Aggregate per week
              const byWeek = {};
              attributionEntries.forEach(e => { byWeek[e.week] = (byWeek[e.week] || 0) + parseFloat(e.mrr_amount || 0); });
              // Build full 13-week window ending at the latest week in data
              const allWeekKeys = Object.keys(byWeek).sort();
              const latestWeek = allWeekKeys[allWeekKeys.length - 1];
              const [yr, wk] = latestWeek.split("-W").map(Number);
              const weeks13 = [];
              for (let i = 12; i >= 0; i--) {
                let w = wk - i;
                let y = yr;
                if (w <= 0) { w += 52; y -= 1; }
                weeks13.push(`${y}-W${String(w).padStart(2, "0")}`);
              }
              const vals = weeks13.map(w => Math.round(byWeek[w] || 0));
              const labels = weeks13.map(w => w.replace(/\d{4}-/, ""));
              return <SimpleBarChart data={vals} labels={labels} color={t.chart} accentColor={t.green} height={160} hideZeroLabels />;
            })()}
          </Card>

          {/* Evidence chain */}
          <Card style={{ padding: "20px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Evidence Chain</div>
                <div style={{ fontSize: 11, color: t.textSecondary, marginTop: 2 }}>All ledger entries · sorted by week (newest first)</div>
              </div>
              <span style={{ fontSize: 10, background: t.accentMuted, color: t.accent, padding: "3px 10px", borderRadius: 10, fontWeight: 700 }}>{attributionEntries.length} entries</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 480, overflowY: "auto" }}>
              {attributionEntries.map((entry, i) => {
                const ev = typeof entry.evidence === "string" ? JSON.parse(entry.evidence) : (entry.evidence || {});
                const tier = entry.attribution_tier;
                const color = tierColor(tier);
                const label = tierLabel(tier);
                return (
                  <div key={entry.id || entry.action_id || i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 14px", background: t.surfaceHover, borderRadius: 10, borderLeft: `3px solid ${color}` }}>
                    <div style={{ flexShrink: 0, textAlign: "center" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: 0.5, background: `${color}22`, padding: "2px 8px", borderRadius: 6, marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color, fontFamily: "'DM Sans', sans-serif" }}>{fmtFull(parseFloat(entry.mrr_amount || 0))}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: t.textSecondary, fontFamily: "'JetBrains Mono', monospace" }}>{entry.week}</span>
                        {ev.playbook && <span style={{ fontSize: 10, background: t.accentMuted, color: t.accent, padding: "1px 7px", borderRadius: 8, fontWeight: 700 }}>{ev.playbook}</span>}
                        {ev.confidence != null && <span style={{ fontSize: 10, color: ev.confidence >= 0.9 ? t.green : t.yellow, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>conf {ev.confidence.toFixed(2)}</span>}
                      </div>
                      <div style={{ fontSize: 13, color: t.text, lineHeight: 1.5 }}>{ev.action || "No description"}</div>
                      {ev.trigger && <div style={{ fontSize: 11, color: t.textSecondary, marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>trigger: {ev.trigger}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

        </>)}

        {/* ── FOOTER ─────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? 4 : 0, padding: "16px 0 8px", fontSize: 11, color: t.textSecondary, borderTop: `1px solid ${t.border}`, marginTop: 8 }}>
          <span>Forge Dynamics AI Ops · Executive Crew v2 · 5 Agents · {d.llm_provider}</span>
          <span>{live ? "🟢 Live Supabase ai_ops" : "⚪ Scenario data"} · 26 tables · 1018 tests · 17 playbooks · <a href="/security.html" style={{ color: t.textSecondary, textDecoration: "none" }} onMouseOver={e => e.target.style.color = t.accent} onMouseOut={e => e.target.style.color = t.textSecondary}>Security</a></span>
          <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>Run cost: ${d.cost.last_run.toFixed(5)} · Monthly: ${d.cost.monthly.toFixed(3)} / ${d.cost.ceiling}</span>
        </div>

      </div>
    </div>
  );
}
