"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  Bell,
  BookOpen,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Crosshair,
  Flame,
  Gamepad2,
  Globe2,
  Headphones,
  Hexagon,
  Layers3,
  LoaderCircle,
  LockKeyhole,
  Menu,
  Play,
  Plus,
  Radio,
  Settings2,
  Shield,
  ShieldCheck,
  Skull,
  Sparkles,
  Swords,
  Target,
  Trophy,
  UserRound,
  Users,
  Volume2,
  VolumeX,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import {
  abilities,
  arenaModes,
  arenas,
  challenges,
  defaultProfile,
  defaultSettings,
  missions,
  weapons,
  type GameMode,
  type MatchConfig,
  type MatchResult,
  type Profile,
  type Settings,
} from "@/game/content";
import { levelFor } from "@/game/rules";
const Game = dynamic(() => import("./Game"), {
  ssr: false,
  loading: () => (
    <div className="loading-screen">
      <LoaderCircle className="spin" size={36} />
      <span>INITIALIZING COMBAT SYSTEMS</span>
    </div>
  ),
});
type Page =
  | "overview"
  | "campaign"
  | "arena"
  | "survival"
  | "horror"
  | "training"
  | "loadout"
  | "operator"
  | "challenges"
  | "barracks";
type RecordRow = {
  id: string;
  callsign: string;
  mode: string;
  mission: number;
  kills: number;
  xp: number;
  wave: number;
  duration: number;
  outcome: string;
  createdAt: string;
};
const navGroups = [
  {
    label: "OPERATIONS",
    items: [
      { id: "overview", label: "Overview", icon: Layers3 },
      { id: "campaign", label: "Campaign", icon: Hexagon },
      { id: "arena", label: "Multiplayer", icon: Swords },
      { id: "survival", label: "Co-op Survival", icon: Users },
      { id: "horror", label: "The Hollow", icon: Skull },
      { id: "training", label: "Training Grounds", icon: Target },
    ],
  },
  {
    label: "OPERATOR",
    items: [
      { id: "loadout", label: "Loadout", icon: Crosshair },
      { id: "operator", label: "Progression", icon: Shield },
      { id: "challenges", label: "Challenges", icon: Trophy },
      { id: "barracks", label: "Barracks", icon: Activity },
    ],
  },
];
const pad = (n: number) => String(n).padStart(2, "0");
function Mark({ small = false }: { small?: boolean }) {
  return (
    <div className={`brand-mark ${small ? "small" : ""}`}>
      <span />
      <span />
      <span />
    </div>
  );
}
function SectionTitle({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
export default function CommandCenter() {
  const [page, setPage] = useState<Page>("overview"),
    [profile, setProfile] = useState<Profile>(defaultProfile),
    [settings, setSettings] = useState<Settings>(defaultSettings),
    [game, setGame] = useState<MatchConfig | null>(null),
    [modal, setModal] = useState<string | null>(null),
    [notice, setNotice] = useState(""),
    [connected, setConnected] = useState(false),
    [loading, setLoading] = useState(true),
    [mobileNav, setMobileNav] = useState(false),
    [records, setRecords] = useState<RecordRow[]>([]),
    [leaderboard, setLeaderboard] = useState<RecordRow[]>([]),
    [leaderLoading, setLeaderLoading] = useState(false),
    [modeIndex, setModeIndex] = useState(0),
    [mapIndex, setMapIndex] = useState(0),
    [difficulty, setDifficulty] = useState("Regular"),
    [waveCount, setWaveCount] = useState(5),
    [selectedMission, setSelectedMission] = useState(0),
    [selectedWeapon, setSelectedWeapon] = useState("vxr"),
    [draftAbility, setDraftAbility] = useState("scan"),
    [attachments, setAttachments] = useState<Record<string, string>>(
      defaultProfile.attachments,
    ),
    [callsign, setCallsign] = useState("NOMAD"),
    [settingsTab, setSettingsTab] = useState("GENERAL"),
    [cinemaStep, setCinemaStep] = useState(0),
    [saving, setSaving] = useState(false);
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const notify = (message: string) => {
    setNotice(message);
  };
  useEffect(() => {
    try {
      const s = localStorage.getItem("veilbreak-settings");
      if (s) {
        const saved = { ...defaultSettings, ...JSON.parse(s) };
        setSettings(saved);
        setDifficulty(saved.difficulty);
      } else if (
        typeof window.matchMedia === "function" &&
        window.matchMedia("(pointer: coarse)").matches
      ) {
        // Phones default to Low render quality for smooth framerates.
        setSettings({ ...defaultSettings, quality: "Low" });
      }
      const p = localStorage.getItem("veilbreak-profile");
      if (p) setProfile({ ...defaultProfile, ...JSON.parse(p) });
    } catch {}
    fetch("/api/profile")
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((d) => {
        setProfile(d.profile);
        setRecords(d.records);
        setSelectedWeapon(d.profile.weapon);
        setDraftAbility(d.profile.ability);
        setAttachments(d.profile.attachments);
        setCallsign(d.profile.callsign);
        setConnected(true);
      })
      .catch(() => setConnected(false))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (!loading)
      localStorage.setItem("veilbreak-profile", JSON.stringify(profile));
  }, [profile, loading]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    if (modal !== "cinematic") return;
    const t = setInterval(() => setCinemaStep((n) => Math.min(3, n + 1)), 7000);
    return () => clearInterval(t);
  }, [modal]);
  useEffect(() => {
    if (!modal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModal(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [modal]);
  const updateSettings = (patch: Partial<Settings>) =>
    setSettings((s) => {
      const next = { ...s, ...patch };
      localStorage.setItem("veilbreak-settings", JSON.stringify(next));
      return next;
    });
  const navigate = (p: Page) => {
    setPage(p);
    setMobileNav(false);
  };
  const mutate = async (body: Record<string, unknown>, fallback?: Profile) => {
    setSaving(true);
    try {
      const r = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw Error();
      const d = await r.json();
      setProfile(d.profile);
      setConnected(true);
      return true;
    } catch {
      if (fallback) setProfile(fallback);
      setConnected(false);
      notify("Career service offline. Changes saved on this device.");
      return false;
    } finally {
      setSaving(false);
    }
  };
  const finish = (r: MatchResult) => {
    const p = profileRef.current;
    const next = {
      ...p,
      xp: p.xp + r.xp,
      kills: p.kills + r.kills,
      headshots: p.headshots + r.headshots,
      matches: p.matches + 1,
      wins: p.wins + (r.won ? 1 : 0),
      completed:
        r.won && r.mode === "campaign"
          ? [...new Set([...p.completed, r.mission])]
          : p.completed,
      ending: r.ending || p.ending,
    };
    setProfile(next);
    void mutate({ action: "finish", result: r }, next);
    setRecords((rows) =>
      [
        {
          id: crypto.randomUUID(),
          callsign: p.callsign,
          mode: r.mode,
          mission: r.mission,
          kills: r.kills,
          xp: r.xp,
          wave: r.wave,
          duration: r.time,
          outcome: r.won ? "VICTORY" : "KIA",
          createdAt: new Date().toISOString(),
        },
        ...rows,
      ].slice(0, 12),
    );
  };
  const launch = (
    mode: GameMode,
    mission = selectedMission,
    extra: Partial<MatchConfig> = {},
  ) => {
    const m = missions[mission];
    const a = arenaModes[modeIndex];
    const config: MatchConfig = {
      mode,
      mission,
      name:
        mode === "campaign"
          ? m.name
          : mode === "arena"
            ? a.name
            : mode === "survival"
              ? "LAST STAND"
              : mode === "horror"
                ? "THE HOLLOW"
                : "LIVE FIRE EXERCISE",
      rule:
        mode === "campaign"
          ? m.rule
          : mode === "arena"
            ? a.rule
            : mode === "training"
              ? "trial"
              : "elimination",
      environment:
        mode === "campaign"
          ? m.environment
          : mode === "horror"
            ? "horror"
            : arenas[mapIndex].environment,
      target:
        mode === "campaign"
          ? m.target
          : mode === "arena"
            ? a.target
            : mode === "training"
              ? 15
              : waveCount,
      difficulty,
      weapon: profile.weapon,
      ability: profile.ability,
      attachments: profile.attachments,
      ...extra,
    };
    setModal(null);
    setGame(config);
  };
  const nextMission =
      missions.find((m) => !profile.completed.includes(m.id)) || missions[0],
    level = levelFor(profile.xp),
    xpProgress = profile.xp % 2500;
  const claim = (name: string) => {
    const c = challenges.find((x) => x.name === name)!;
    void mutate(
      { action: "claim", name },
      {
        ...profile,
        xp: profile.xp + c.xp,
        claimed: [...profile.claimed, name],
      },
    );
    notify(`DIRECTIVE COMPLETE · +${c.xp.toLocaleString()} XP`);
  };
  const showLeaderboard = () => {
    setModal("leaderboard");
    setLeaderLoading(true);
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((d) => {
        setLeaderboard(d.records || []);
        if (d.error) notify(d.error);
      })
      .catch(() => notify("Leaderboard is currently unavailable."))
      .finally(() => setLeaderLoading(false));
  };
  const saveLoadout = async () => {
    const ok = await mutate(
      {
        action: "loadout",
        weapon: selectedWeapon,
        ability: draftAbility,
        attachments,
      },
      {
        ...profile,
        weapon: selectedWeapon,
        ability: draftAbility,
        attachments,
      },
    );
    if (ok) notify("LOADOUT SAVED · Ready for your next deployment.");
  };
  const weapon = weapons.find((w) => w.id === selectedWeapon) || weapons[0];
  if (game)
    return (
      <Game
        config={game}
        settings={settings}
        onExit={() => setGame(null)}
        onResult={finish}
      />
    );
  return (
    <div className="command-center">
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <button
          className="brand"
          onClick={() => navigate("overview")}
          aria-label="Veilbreak home"
        >
          <Mark />
          <div>
            VEILBREAK<span>VANGUARD OPERATIONS</span>
          </div>
        </button>
        <div className="season-tag">
          <span className="orange-dot" />
          SEASON 01 <span>AFTERLIGHT</span>
        </div>
        <nav>
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <div className="nav-label">{group.label}</div>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${page === item.id ? "active" : ""}`}
                  onClick={() => navigate(item.id as Page)}
                >
                  <item.icon size={17} />
                  <span>{item.label}</span>
                  {item.id === "horror" && <small>NEW</small>}
                  {page === item.id && (
                    <ChevronRight size={14} className="nav-chevron" />
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => setModal("settings")}>
            <Settings2 size={17} />
            <span>Settings</span>
          </button>
          <button className="nav-item" onClick={() => setModal("help")}>
            <CircleHelp size={17} />
            <span>Field Manual</span>
            <span className="external-arrow">↗</span>
          </button>
          <div className="system-status">
            <span className={connected ? "status-dot" : "status-dot amber"} />
            <div>
              {connected
                ? "ALL SYSTEMS OPERATIONAL"
                : loading
                  ? "ESTABLISHING CONNECTION"
                  : "LOCAL SYSTEMS READY"}
              <small>BUILD 1.0.0 · WEBGL</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobileNav(!mobileNav)}
            >
              <Menu size={20} />
            </button>
            <span>COMMAND CENTER</span>
            <ChevronRight size={12} />
            <b>
              {page === "arena"
                ? "MULTIPLAYER"
                : page === "horror"
                  ? "THE HOLLOW"
                  : page.toUpperCase()}
            </b>
          </div>
          <div className="topbar-right">
            <span className="connection-label">
              <span className="status-dot" />
              OFFLINE COMBAT READY
            </span>
            <span className="topbar-divider" />
            <button
              className="icon-button"
              aria-label={settings.volume ? "Mute audio" : "Enable audio"}
              onClick={() =>
                updateSettings({ volume: settings.volume ? 0 : 40 })
              }
            >
              {settings.volume ? <Volume2 size={17} /> : <VolumeX size={17} />}
            </button>
            <button
              className="icon-button notification-button"
              aria-label="Open notifications"
              onClick={() => setModal("notifications")}
            >
              <Bell size={17} />
              <i />
            </button>
            <button
              className="profile-button"
              onClick={() => navigate("operator")}
            >
              <div className="avatar">
                <Shield size={21} />
              </div>
              <div>
                {profile.callsign}
                <small>LEVEL {pad(level)} · VANGUARD</small>
              </div>
              <ChevronDown size={13} />
            </button>
          </div>
        </header>
        <main className="main-content">
          {page === "overview" && (
            <>
              <div className="overview-heading">
                <div>
                  <div className="eyebrow">YOUR NEXT OPERATION STARTS HERE</div>
                  <h1>
                    WELCOME BACK, OPERATOR<span>.</span>
                  </h1>
                  <p>The world went dark. You didn’t.</p>
                </div>
                <div className="local-time">
                  <span className="status-dot" /> VANGUARD NETWORK{" "}
                  <b>CONNECTED</b>
                </div>
              </div>
              <section className="campaign-hero">
                <img
                  src="/images/campaign.jpg"
                  alt="Vanguard operator overlooking the rain-soaked towers of Nova City"
                />
                <div className="hero-shade" />
                <div className="hero-topline">
                  <span className="outline-tag">
                    <span className="orange-dot" /> CAMPAIGN
                  </span>
                  <span className="hero-top-right">
                    A WORLD ON THE EDGE. A SQUAD AGAINST THE SILENCE.
                  </span>
                </div>
                <div className="hero-copy">
                  <span className="eyebrow">
                    OPERATION {pad(nextMission.id + 1)} <i />{" "}
                    {nextMission.name.toUpperCase()}
                  </span>
                  <h2>
                    THE SILENCE
                    <br />
                    ENDS WITH YOU<span>.</span>
                  </h2>
                  <p>
                    Step into the blackout. Uncover the truth.
                    <br />
                    Give the world something to believe in.
                  </p>
                  <div className="hero-actions">
                    <button
                      className="button primary"
                      onClick={() => launch("campaign", nextMission.id)}
                    >
                      <Play size={15} fill="currentColor" />
                      {profile.completed.length
                        ? "CONTINUE CAMPAIGN"
                        : "DEPLOY TO CAMPAIGN"}
                      <ArrowRight size={17} />
                    </button>
                    <button
                      className="hero-secondary"
                      onClick={() => navigate("campaign")}
                    >
                      MISSION SELECT
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
                <div className="hero-bottom">
                  <div>
                    <span className="tiny-cross">+</span> {nextMission.location}
                  </div>
                  <div>
                    <span>CAMPAIGN PROGRESS</span>
                    <div className="segmented-progress">
                      {Array.from({ length: 16 }, (_, i) => (
                        <i
                          className={
                            profile.completed.includes(i) ? "filled" : ""
                          }
                          key={i}
                        />
                      ))}
                    </div>
                    <b>
                      {pad(profile.completed.length)}
                      <span> / 16</span>
                    </b>
                  </div>
                </div>
                <span className="hero-coordinate">
                  35° 41′ 22.4″ N<br />
                  139° 41′ 30.8″ E
                </span>
              </section>
              <div className="section-header">
                <h2>
                  CHOOSE YOUR FIGHT<span>03 AVAILABLE MODES</span>
                </h2>
                <button className="text-link" onClick={() => navigate("arena")}>
                  EXPLORE ALL MODES
                  <ArrowRight size={14} />
                </button>
              </div>
              <div className="mode-cards">
                <button className="mode-card" onClick={() => navigate("arena")}>
                  <img
                    src="/images/arena.jpg"
                    alt="Dust-covered Cinder Yard military arena"
                  />
                  <div className="mode-card-shade" />
                  <span className="card-tag">
                    <Swords size={12} /> COMPETITIVE
                  </span>
                  <div className="mode-card-content">
                    <div className="mode-kicker">
                      OUTTHINK. OUTPLAY. OUTLAST.
                    </div>
                    <h3>
                      MULTIPLAYER
                      <ArrowRight size={23} />
                    </h3>
                    <p>Your arena. Your rules. No second chances.</p>
                    <div className="card-footer">
                      <span>
                        <Users size={12} /> SOLO + BOTS
                      </span>
                      <span>
                        11 MODES <i /> 6 MAPS
                      </span>
                    </div>
                  </div>
                </button>
                <button
                  className="mode-card"
                  onClick={() => navigate("survival")}
                >
                  <img
                    src="/images/survival.jpg"
                    alt="Vanguard fireteam entering an overgrown research outpost"
                  />
                  <div className="mode-card-shade" />
                  <span className="card-tag green">
                    <Users size={12} /> COOPERATIVE
                  </span>
                  <div className="mode-card-content">
                    <div className="mode-kicker">
                      STAND TOGETHER. FALL NEVER.
                    </div>
                    <h3>
                      CO-OP SURVIVAL
                      <ArrowRight size={23} />
                    </h3>
                    <p>Endless enemies. One unbreakable squad.</p>
                    <div className="card-footer">
                      <span>
                        <Users size={12} /> YOU + AI SQUAD
                      </span>
                      <span>WAVE-BASED</span>
                    </div>
                  </div>
                </button>
                <button
                  className="mode-card horror-card"
                  onClick={() => navigate("horror")}
                >
                  <img
                    src="/images/horror.jpg"
                    alt="Red emergency lights in the abandoned Chorus laboratory"
                  />
                  <div className="mode-card-shade" />
                  <span className="card-tag red">
                    <Skull size={12} /> HORROR SURVIVAL
                  </span>
                  <span className="new-tag">NEW</span>
                  <div className="mode-card-content">
                    <div className="mode-kicker">
                      SOME THINGS SHOULD STAY BURIED.
                    </div>
                    <h3>
                      THE HOLLOW
                      <ArrowRight size={23} />
                    </h3>
                    <p>Go deeper. Stay alive. Don’t trust the dark.</p>
                    <div className="card-footer">
                      <span>
                        <UserRound size={12} /> SOLO
                      </span>
                      <span>ENTER IF YOU DARE</span>
                    </div>
                  </div>
                </button>
              </div>
              <div className="overview-bottom">
                <section className="dashboard-panel directive-panel">
                  <div className="panel-heading">
                    <span>
                      <Target size={15} /> FIELD DIRECTIVE
                    </span>
                    <button
                      onClick={() => navigate("challenges")}
                      aria-label="View all challenges"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  <div className="directive-body">
                    <div className="directive-emblem">
                      <Crosshair size={30} />
                    </div>
                    <div>
                      <h3>FIRST CONTACT</h3>
                      <p>Eliminate 10 hostile operators.</p>
                      <div className="directive-progress">
                        <span
                          style={{
                            width: `${Math.min(100, (profile.kills / 10) * 100)}%`,
                          }}
                        />
                      </div>
                      <div className="directive-meta">
                        <span>
                          {Math.min(10, profile.kills)} / 10 ELIMINATIONS
                        </span>
                        <b>+500 XP</b>
                      </div>
                    </div>
                  </div>
                </section>
                <section
                  className="dashboard-panel arsenal-panel"
                  onClick={() => navigate("loadout")}
                >
                  <div className="panel-heading">
                    <span>
                      <Crosshair size={15} /> YOUR ARSENAL
                    </span>
                    <button
                      onClick={() => navigate("loadout")}
                      aria-label="Customize loadout"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  <img
                    src="/images/weapon.jpg"
                    alt="VXR-7 Sentinel assault rifle"
                  />
                  <div className="arsenal-caption">
                    <div>
                      <small>PRIMARY LOADOUT</small>
                      <h3>
                        {
                          (
                            weapons.find((w) => w.id === profile.weapon) ||
                            weapons[0]
                          ).name
                        }
                      </h3>
                    </div>
                    <button
                      className="text-link"
                      onClick={() => navigate("loadout")}
                    >
                      CUSTOMIZE
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </section>
                <section className="dashboard-panel training-panel">
                  <div className="panel-heading">
                    <span>
                      <Radio size={15} /> READY CHECK
                    </span>
                    <span className="subtle">FIELD INTEL</span>
                  </div>
                  <div className="training-body">
                    <div className="training-line-icon">
                      <Target size={34} />
                    </div>
                    <div>
                      <h3>SHARPEN YOUR EDGE.</h3>
                      <p>
                        Every operator starts somewhere.
                        <br />
                        Make every shot count.
                      </p>
                    </div>
                  </div>
                  <button
                    className="training-link"
                    onClick={() => launch("training", 0)}
                  >
                    ENTER TRAINING GROUNDS
                    <ArrowRight size={15} />
                  </button>
                </section>
              </div>
              <div className="hub-bottom-strip">
                <span>
                  <ShieldCheck size={14} /> EARNED. NEVER BOUGHT. <i /> ALL
                  GAMEPLAY. NO PAY-TO-WIN.
                </span>
                <button onClick={() => setModal("news")}>
                  AFTERLIGHT IS HERE <span>READ THE FIELD NOTES</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </>
          )}
          {page === "campaign" && (
            <>
              <SectionTitle
                eyebrow="THE AFTERLIGHT CAMPAIGN"
                title="BREAK THE SILENCE."
                description="One squad. Sixteen operations. A world worth fighting for."
              >
                <button
                  className="button secondary"
                  onClick={() => {
                    setCinemaStep(0);
                    setModal("cinematic");
                  }}
                >
                  <Play size={15} /> WATCH PROLOGUE
                </button>
              </SectionTitle>
              <div className="campaign-banner">
                <img
                  src="/images/campaign.jpg"
                  alt="Nova City campaign key art"
                />
                <div>
                  <span className="eyebrow">
                    {missions[selectedMission].act}
                  </span>
                  <h2>{missions[selectedMission].name}</h2>
                  <p>{missions[selectedMission].briefing}</p>
                  <div className="button-row">
                    <button
                      className="button primary"
                      onClick={() => launch("campaign")}
                    >
                      <Play size={14} fill="currentColor" /> DEPLOY OPERATION{" "}
                      {pad(selectedMission + 1)}
                      <ArrowRight size={17} />
                    </button>
                    <select
                      aria-label="Campaign difficulty"
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                    >
                      {["Recruit", "Regular", "Veteran", "Nightmare"].map(
                        (x) => (
                          <option key={x}>{x}</option>
                        ),
                      )}
                    </select>
                  </div>
                </div>
              </div>
              <div className="section-header">
                <h2>
                  OPERATION ARCHIVE
                  <span>{profile.completed.length} / 16 COMPLETED</span>
                </h2>
                <span className="subtle">
                  ALL OPERATIONS AVAILABLE · REPLAY ANYTIME
                </span>
              </div>
              <div className="mission-grid">
                {missions.map((m) => (
                  <button
                    className={`mission-card ${selectedMission === m.id ? "selected" : ""}`}
                    key={m.id}
                    onClick={() => setSelectedMission(m.id)}
                  >
                    <span className="mission-index">{pad(m.id + 1)}</span>
                    <div>
                      <span className="eyebrow">{m.location}</span>
                      <h3>{m.name}</h3>
                      <small>
                        {m.rule.toUpperCase()} <i />{" "}
                        {m.environment.toUpperCase()}
                      </small>
                    </div>
                    {profile.completed.includes(m.id) ? (
                      <CheckCheck className="green-text" size={20} />
                    ) : (
                      <ChevronRight size={18} />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
          {(page === "arena" || page === "survival" || page === "horror") && (
            <>
              <SectionTitle
                eyebrow={
                  page === "arena"
                    ? "TACTICAL SIMULATION NETWORK"
                    : page === "survival"
                      ? "NO ONE LEFT BEHIND"
                      : "CHORUS FACILITY · QUARANTINE ACTIVE"
                }
                title={
                  page === "arena"
                    ? "MAKE YOUR MARK."
                    : page === "survival"
                      ? "THE LAST LINE."
                      : "THE HOLLOW."
                }
                description={
                  page === "arena"
                    ? "Real objectives. Adaptive opposition. Your next proving ground."
                    : page === "survival"
                      ? "Deploy alongside AI squadmates and withstand an escalating onslaught."
                      : "The network is still alive down here. And it remembers you."
                }
              >
                {page !== "arena" && (
                  <button
                    className="button secondary"
                    onClick={showLeaderboard}
                  >
                    <Trophy size={16} /> LEADERBOARD
                  </button>
                )}
              </SectionTitle>
              <div
                className={`mode-banner ${page === "horror" ? "crimson" : ""}`}
                style={{
                  backgroundImage: `linear-gradient(90deg,rgba(12,17,17,.95),rgba(12,17,17,.2)),url(/images/${page === "arena" ? "arena" : page === "survival" ? "survival" : "horror"}.jpg)`,
                }}
              >
                <span className="eyebrow">
                  {page === "arena"
                    ? "LOCAL COMBAT · NO MATCHMAKING REQUIRED"
                    : page === "survival"
                      ? "AI FIRETEAM · WAVE SURVIVAL"
                      : "SOLO · RESOURCE SURVIVAL"}
                </span>
                <h2>
                  {page === "arena"
                    ? arenaModes[modeIndex].name
                    : page === "survival"
                      ? "STRONGER TOGETHER."
                      : "DON’T FOLLOW THE VOICES."}
                </h2>
                <p>
                  {page === "arena"
                    ? arenaModes[modeIndex].description
                    : page === "survival"
                      ? "Two Vanguard squadmates have your back. Eliminate each wave, collect ammunition, and buy field upgrades with B. Every fifth wave brings a sentinel."
                      : "No health regeneration. Recover resources from the fallen. Upgrade your gear between waves. Find the hidden memory fragment—and survive its guardians."}
                </p>
              </div>
              <div className="mode-setup">
                <div>
                  <div className="section-header">
                    <h2>
                      {page === "arena"
                        ? "SELECT RULESET"
                        : "DEPLOYMENT PARAMETERS"}
                    </h2>
                  </div>
                  {page === "arena" ? (
                    <div className="ruleset-grid">
                      {arenaModes.map((m, i) => (
                        <button
                          className={modeIndex === i ? "selected" : ""}
                          key={m.name}
                          onClick={() => setModeIndex(i)}
                        >
                          <Crosshair size={18} />
                          <div>
                            <h3>{m.name}</h3>
                            <p>{m.description}</p>
                          </div>
                          {modeIndex === i && <Check size={15} />}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="survival-options">
                      <div className="setting-row">
                        <div>
                          <h3>WAVE LIMIT</h3>
                          <p>
                            Extract after your target wave, or fight without
                            end.
                          </p>
                        </div>
                        <select
                          aria-label="Wave limit"
                          value={waveCount}
                          onChange={(e) => setWaveCount(Number(e.target.value))}
                        >
                          <option value={5}>5 waves · First response</option>
                          <option value={10}>10 waves · Endurance</option>
                          <option value={20}>20 waves · Last stand</option>
                          <option value={999}>Endless</option>
                        </select>
                      </div>
                      <div className="feature-rows">
                        <p>
                          <ShieldCheck />{" "}
                          {page === "survival"
                            ? "Two autonomous AI squadmates"
                            : "Solo deployment · no reinforcements"}
                        </p>
                        <p>
                          <Zap /> Escalating enemy counts · boss every 5 waves
                        </p>
                        <p>
                          <Crosshair /> Field upgrades · 500 score per resupply
                        </p>
                        <p>
                          <BookOpen /> Hidden intel caches · recover to earn
                          resources
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <aside className="deployment-panel">
                  <span className="eyebrow">CUSTOM DEPLOYMENT</span>
                  <h3>MISSION CONFIGURATION</h3>
                  <label>
                    BATTLEFIELD
                    <select
                      value={mapIndex}
                      onChange={(e) => setMapIndex(Number(e.target.value))}
                      disabled={page === "horror"}
                    >
                      {arenas.map((a, i) => (
                        <option value={i} key={a.name}>
                          {page === "horror" ? "SUBLEVEL 09" : a.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    BOT DIFFICULTY
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                    >
                      {["Recruit", "Regular", "Veteran", "Nightmare"].map(
                        (d) => (
                          <option key={d}>{d}</option>
                        ),
                      )}
                    </select>
                  </label>
                  <div className="deployment-loadout">
                    <Crosshair size={20} />
                    <div>
                      <small>EQUIPPED PRIMARY</small>
                      <b>
                        {
                          (
                            weapons.find((w) => w.id === profile.weapon) ||
                            weapons[0]
                          ).name
                        }
                      </b>
                    </div>
                    <button
                      aria-label="Change loadout"
                      onClick={() => navigate("loadout")}
                    >
                      <Settings2 size={17} />
                    </button>
                  </div>
                  <p className="small-note">
                    <Wifi size={13} /> Offline bots · no live network players
                  </p>
                  <button
                    className="button primary full-width"
                    onClick={() =>
                      launch(page as GameMode, 0, {
                        endless: waveCount === 999,
                      })
                    }
                  >
                    DEPLOY NOW
                    <ArrowRight size={17} />
                  </button>
                </aside>
              </div>
            </>
          )}
          {page === "training" && (
            <>
              <SectionTitle
                eyebrow="VANGUARD FIELD SCHOOL"
                title="PRECISION IS A PRACTICE."
                description="Know your weapon. Learn your movement. Leave nothing to chance."
              />
              <div className="training-hero">
                <Target size={70} />
                <div>
                  <span className="eyebrow">START HERE</span>
                  <h2>LIVE FIRE QUALIFICATION</h2>
                  <p>
                    Learn movement, aiming, reloads, tactical equipment, and
                    abilities. Stationary targets. No incoming damage. Your time
                    is recorded.
                  </p>
                  <button
                    className="button primary"
                    onClick={() => launch("training", 0)}
                  >
                    ENTER THE RANGE
                    <ArrowRight size={17} />
                  </button>
                </div>
              </div>
              <div className="trial-grid">
                {[
                  {
                    name: "PRECISION TRIAL",
                    desc: "15 targets. Every shot matters. Deploy with the Obelisk precision rifle.",
                    icon: Crosshair,
                    extra: { weapon: "obelisk", target: 15 },
                  },
                  {
                    name: "SPEED QUALIFICATION",
                    desc: "Clear 10 targets against the clock. Fast handling. No hesitation.",
                    icon: Zap,
                    extra: { weapon: "kestrel", target: 10 },
                  },
                  {
                    name: "SENTINEL CHALLENGE",
                    desc: "One heavy sentinel. Limited space. Put your combat training to work.",
                    icon: Shield,
                    extra: {
                      rule: "boss",
                      target: 1,
                      mode: "arena",
                      name: "SENTINEL CHALLENGE",
                    },
                  },
                  {
                    name: "WEAPON TRIAL",
                    desc: "Cycle the entire arsenal. Every elimination equips a different weapon.",
                    icon: Crosshair,
                    extra: { rule: "arsenal", target: 14 },
                  },
                  {
                    name: "SCORE ATTACK",
                    desc: "Thirty live-fire targets. Build your career score and beat your time.",
                    icon: Trophy,
                    extra: { target: 30 },
                  },
                  {
                    name: "MOVEMENT & CONTROL",
                    desc: "Navigate the battlefield and access three terminals. Practice sprinting, jumping, and crouching.",
                    icon: Activity,
                    extra: {
                      rule: "stealth",
                      target: 3,
                      name: "MOVEMENT & CONTROL",
                    },
                  },
                ].map((t) => (
                  <div className="trial-card" key={t.name}>
                    <t.icon size={28} />
                    <h3>{t.name}</h3>
                    <p>{t.desc}</p>
                    <button
                      className="text-link"
                      onClick={() =>
                        launch("training", 0, t.extra as Partial<MatchConfig>)
                      }
                    >
                      START EXERCISE
                      <ArrowRight size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
          {page === "loadout" && (
            <>
              <SectionTitle
                eyebrow="ARMORY · LOADOUT 01"
                title="BUILT FOR YOUR FIGHT."
                description="Original weapons. Purposeful attachments. Make your next shot count."
              >
                <button
                  className="button primary"
                  disabled={saving}
                  onClick={saveLoadout}
                >
                  {saving ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : (
                    <Check size={16} />
                  )}{" "}
                  SAVE LOADOUT
                </button>
              </SectionTitle>
              <div className="gunsmith">
                <div className="weapon-list">
                  <span className="eyebrow">PRIMARY WEAPON</span>
                  {weapons
                    .filter((w) => w.id !== "sidearm")
                    .map((w) => (
                      <button
                        key={w.id}
                        onClick={() => setSelectedWeapon(w.id)}
                        className={selectedWeapon === w.id ? "selected" : ""}
                      >
                        <Crosshair size={21} />
                        <div>
                          <small>{w.class}</small>
                          <b>{w.name}</b>
                        </div>
                        {selectedWeapon === w.id && <Check size={15} />}
                      </button>
                    ))}
                  <div className="secondary-weapon">
                    <small>SECONDARY · ALWAYS EQUIPPED</small>
                    <b>P-11 EMBER</b>
                    <span>Switch in combat with 1 / 2</span>
                  </div>
                </div>
                <div className="weapon-preview">
                  <div className="weapon-preview-heading">
                    <span className="eyebrow">{weapon.class}</span>
                    <span className="outline-tag">FIELD READY</span>
                  </div>
                  <h2>{weapon.name}</h2>
                  <p>{weapon.description}</p>
                  <img
                    src="/images/weapon.jpg"
                    alt="Sentinel platform armory illustration; equipped variant is rendered in game"
                  />
                  <span className="weapon-image-caption">
                    SENTINEL PLATFORM · EQUIPPED VARIANT RENDERED IN COMBAT
                  </span>
                  <div className="weapon-stats">
                    {[
                      {
                        name: "DAMAGE",
                        value: Math.min(
                          100,
                          weapon.damage +
                            (attachments.barrel === "Precision" ? 6 : 0),
                        ),
                      },
                      {
                        name: "ACCURACY",
                        value: Math.min(
                          100,
                          weapon.accuracy +
                            (attachments.barrel === "Precision" ? 8 : 0),
                        ),
                      },
                      { name: "RANGE", value: weapon.range },
                      {
                        name: "HANDLING",
                        value: attachments.stock === "Lightweight" ? 90 : 72,
                      },
                    ].map((s) => (
                      <div key={s.name}>
                        <span>
                          {s.name}
                          <b>{s.value}</b>
                        </span>
                        <div>
                          <i style={{ width: `${s.value}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="attachment-grid">
                    {[
                      {
                        key: "optic",
                        label: "OPTIC",
                        options: ["Reflex", "Iron sights", "Scope"],
                        desc: "Scope gives a tighter 35° ADS field of view.",
                      },
                      {
                        key: "barrel",
                        label: "BARREL",
                        options: ["Standard", "Precision", "Suppressed"],
                        desc: "Precision: +6 damage, +8 accuracy. Suppressor: visible muzzle extension.",
                      },
                      {
                        key: "magazine",
                        label: "MAGAZINE",
                        options: ["Standard", "Extended"],
                        desc: "Extended: 50% more rounds per magazine.",
                      },
                      {
                        key: "stock",
                        label: "STOCK",
                        options: ["Balanced", "Lightweight"],
                        desc: "Lightweight: +12% movement, faster cycling.",
                      },
                    ].map((a) => (
                      <label key={a.key}>
                        {a.label}
                        <select
                          value={attachments[a.key]}
                          onChange={(e) =>
                            setAttachments({
                              ...attachments,
                              [a.key]: e.target.value,
                            })
                          }
                        >
                          {a.options.map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                        <small>{a.desc}</small>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="section-header">
                <h2>
                  TACTICAL ABILITY<span>ONE EQUIPPED · PRESS Q IN COMBAT</span>
                </h2>
              </div>
              <div className="ability-grid">
                {abilities.map((a) => (
                  <button
                    key={a.id}
                    className={draftAbility === a.id ? "selected" : ""}
                    onClick={() => setDraftAbility(a.id)}
                  >
                    <Zap size={22} />
                    <h3>{a.name}</h3>
                    <p>{a.description}</p>
                    <small>
                      {a.cooldown}s COOLDOWN{" "}
                      {draftAbility === a.id && <Check size={14} />}
                    </small>
                  </button>
                ))}
              </div>
            </>
          )}
          {page === "operator" && (
            <>
              <SectionTitle
                eyebrow="OPERATOR DOSSIER"
                title="EVERY OPERATION COUNTS."
                description="A career forged in the field. All rewards earned through play."
              />
              <div className="operator-banner">
                <div className="operator-emblem">
                  <Shield size={70} />
                  <span>{pad(level)}</span>
                </div>
                <div>
                  <span className="eyebrow">VANGUARD OPERATOR</span>
                  <h2>{profile.callsign}</h2>
                  <p>
                    {level < 5
                      ? "RECRUIT"
                      : level < 10
                        ? "PATHFINDER"
                        : level < 20
                          ? "SENTINEL"
                          : "VANGUARD ELITE"}{" "}
                    · LEVEL {pad(level)}
                  </p>
                  <div className="xp-track">
                    <span style={{ width: `${(xpProgress / 2500) * 100}%` }} />
                  </div>
                  <small>
                    {xpProgress.toLocaleString()} / 2,500 XP TO LEVEL{" "}
                    {pad(level + 1)}
                  </small>
                </div>
                <button
                  className="button secondary"
                  onClick={() => {
                    setCallsign(profile.callsign);
                    setModal("callsign");
                  }}
                >
                  <UserRound size={16} /> EDIT CALLSIGN
                </button>
              </div>
              <div className="career-stats">
                {[
                  { n: profile.xp.toLocaleString(), l: "TOTAL CAREER XP" },
                  { n: profile.kills, l: "ELIMINATIONS" },
                  { n: profile.headshots, l: "HEADSHOTS" },
                  { n: profile.wins, l: "VICTORIES" },
                  {
                    n: profile.matches
                      ? `${Math.round((profile.wins / profile.matches) * 100)}%`
                      : "—",
                    l: "WIN RATE",
                  },
                  {
                    n: `${profile.completed.length}/16`,
                    l: "CAMPAIGN OPERATIONS",
                  },
                ].map((s) => (
                  <div key={s.l}>
                    <b>{s.n}</b>
                    <span>{s.l}</span>
                  </div>
                ))}
              </div>
              <div className="section-header">
                <h2>RANK ROADMAP</h2>
                <span className="subtle">
                  WEAPONS ARE AVAILABLE TO ALL · RANK IS EARNED
                </span>
              </div>
              <div className="rank-grid">
                {[
                  { level: 1, name: "RECRUIT", icon: Shield },
                  { level: 5, name: "PATHFINDER", icon: Crosshair },
                  { level: 10, name: "SENTINEL", icon: ShieldCheck },
                  { level: 20, name: "VANGUARD ELITE", icon: Trophy },
                ].map((r) => (
                  <div
                    className={level >= r.level ? "unlocked" : ""}
                    key={r.name}
                  >
                    <r.icon size={34} />
                    <span>LEVEL {pad(r.level)}</span>
                    <h3>{r.name}</h3>
                    <small>
                      {level >= r.level
                        ? "RANK ACHIEVED"
                        : `${((r.level - 1) * 2500 - profile.xp).toLocaleString()} XP REMAINING`}
                    </small>
                    {level >= r.level ? (
                      <Check size={18} />
                    ) : (
                      <LockKeyhole size={16} />
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
          {page === "challenges" && (
            <>
              <SectionTitle
                eyebrow="FIELD DIRECTIVES"
                title="RISE TO THE CHALLENGE."
                description="Push further. Hit harder. Earn additional career XP."
              />
              <div className="challenge-grid">
                {challenges.map((c) => {
                  const value =
                      c.stat === "campaign"
                        ? profile.completed.length
                        : Number(profile[c.stat as keyof Profile]) || 0,
                    claimed = profile.claimed.includes(c.name),
                    ready = value >= c.goal;
                  return (
                    <div
                      className={`challenge-card ${claimed ? "complete" : ""}`}
                      key={c.name}
                    >
                      <div className="challenge-top">
                        <div className="directive-emblem">
                          <Target size={27} />
                        </div>
                        <span>+{c.xp.toLocaleString()} XP</span>
                      </div>
                      <h3>{c.name.toUpperCase()}</h3>
                      <p>{c.description}</p>
                      <div className="xp-track">
                        <span
                          style={{
                            width: `${Math.min(100, (value / c.goal) * 100)}%`,
                          }}
                        />
                      </div>
                      <div className="challenge-bottom">
                        <small>
                          {Math.min(value, c.goal).toLocaleString()} /{" "}
                          {c.goal.toLocaleString()}
                        </small>
                        <button
                          disabled={!ready || claimed || saving}
                          className={`button ${ready && !claimed ? "primary" : "secondary"}`}
                          onClick={() => claim(c.name)}
                        >
                          {claimed ? (
                            <>
                              <Check size={14} /> CLAIMED
                            </>
                          ) : ready ? (
                            "CLAIM REWARD"
                          ) : (
                            "IN PROGRESS"
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          {page === "barracks" && (
            <>
              <SectionTitle
                eyebrow="VANGUARD CAREER ARCHIVE"
                title="LEAVE A RECORD."
                description="Your recent operations, combat statistics, and field performance."
              >
                <button
                  className="button secondary"
                  onClick={() => {
                    const blob = new Blob(
                      [JSON.stringify({ profile, records }, null, 2)],
                      { type: "application/json" },
                    );
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "veilbreak-career.json";
                    a.click();
                    URL.revokeObjectURL(url);
                    notify("Career record exported.");
                  }}
                >
                  <ArrowDownToLine size={16} /> EXPORT DOSSIER
                </button>
              </SectionTitle>
              <div className="record-summary">
                <div>
                  <Activity size={28} />
                  <b>{profile.matches}</b>
                  <span>OPERATIONS DEPLOYED</span>
                </div>
                <div>
                  <Trophy size={28} />
                  <b>{profile.wins}</b>
                  <span>SUCCESSFUL OPERATIONS</span>
                </div>
                <div>
                  <Crosshair size={28} />
                  <b>{profile.kills}</b>
                  <span>HOSTILES ELIMINATED</span>
                </div>
              </div>
              <div className="section-header">
                <h2>
                  AFTER-ACTION ARCHIVE<span>LAST 12 OPERATIONS</span>
                </h2>
              </div>
              {records.length ? (
                <div className="records-table">
                  <table>
                    <thead>
                      <tr>
                        <th>OPERATION</th>
                        <th>MODE</th>
                        <th>RESULT</th>
                        <th>ELIMINATIONS</th>
                        <th>XP EARNED</th>
                        <th>DATE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r) => (
                        <tr key={r.id}>
                          <td>
                            {r.mode === "campaign"
                              ? missions[r.mission]?.name
                              : "Combat deployment"}
                          </td>
                          <td>{r.mode.toUpperCase()}</td>
                          <td>
                            <span
                              className={
                                r.outcome === "VICTORY"
                                  ? "green-text"
                                  : "orange"
                              }
                            >
                              {r.outcome}
                            </span>
                          </td>
                          <td>{r.kills}</td>
                          <td>+{r.xp.toLocaleString()}</td>
                          <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <BookOpen size={42} />
                  <h3>YOUR STORY STARTS IN THE FIELD.</h3>
                  <p>
                    Complete your first operation to begin your combat record.
                  </p>
                  <button
                    className="button primary"
                    onClick={() => launch("campaign", 0)}
                  >
                    FIRST DEPLOYMENT
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </main>
        <footer className="footer">
          <div>
            <Mark small />
            <span>VEILBREAK</span>
            <i /> AN ORIGINAL COMBAT UNIVERSE
          </div>
          <div>
            <span className="status-dot" />
            {saving
              ? "SYNCING CAREER…"
              : connected
                ? "CAREER SYNC ACTIVE"
                : "LOCAL SAVE ACTIVE"}
            <span className="footer-separator">|</span>
            <span>PC / BROWSER</span>
            <button onClick={() => setModal("help")}>
              F1 <span>FIELD MANUAL</span>
            </button>
          </div>
        </footer>
      </div>
      {notice && (
        <div className="toast">
          <Check size={17} />
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <div
            className={`modal ${modal === "settings" ? "settings-modal" : ""} ${modal === "cinematic" ? "cinematic-modal" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={modal}
          >
            <button
              className="modal-close"
              aria-label="Close dialog"
              onClick={() => setModal(null)}
            >
              <X size={22} />
            </button>
            {modal === "settings" && (
              <>
                <span className="eyebrow">SYSTEM CONFIGURATION</span>
                <h2>YOUR SETUP. YOUR RULES.</h2>
                <div className="settings-tabs">
                  {[
                    "GENERAL",
                    "AUDIO",
                    "GRAPHICS",
                    "CONTROLS",
                    "ACCESSIBILITY",
                  ].map((t) => (
                    <button
                      className={settingsTab === t ? "active" : ""}
                      key={t}
                      onClick={() => setSettingsTab(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {settingsTab === "GENERAL" && (
                  <>
                    <div className="setting-row">
                      <div>
                        <h3>DEFAULT DIFFICULTY</h3>
                        <p>
                          Incoming damage scales with your chosen difficulty.
                        </p>
                      </div>
                      <select
                        value={settings.difficulty}
                        onChange={(e) => {
                          updateSettings({ difficulty: e.target.value });
                          setDifficulty(e.target.value);
                        }}
                      >
                        {["Recruit", "Regular", "Veteran", "Nightmare"].map(
                          (d) => (
                            <option key={d}>{d}</option>
                          ),
                        )}
                      </select>
                    </div>
                    <div className="setting-row">
                      <div>
                        <h3>CAREER STORAGE</h3>
                        <p>
                          {connected
                            ? "PostgreSQL cloud save connected. Progress saves after every match."
                            : "Local browser save active. Career service reconnects on refresh."}
                        </p>
                      </div>
                      <span className="green-text">
                        <Check size={20} />
                      </span>
                    </div>
                    <button
                      className="button secondary"
                      onClick={() => {
                        updateSettings(defaultSettings);
                        setDifficulty("Regular");
                        notify("Settings restored to defaults.");
                      }}
                    >
                      RESTORE DEFAULT SETTINGS
                    </button>
                  </>
                )}
                {settingsTab === "AUDIO" && (
                  <>
                    <div className="setting-row">
                      <div>
                        <h3>MASTER VOLUME</h3>
                        <p>
                          Original synthesized weapons, steps, ambience, and
                          music.
                        </p>
                      </div>
                      <div className="range-control">
                        <input
                          aria-label="Master volume"
                          type="range"
                          min="0"
                          max="100"
                          value={settings.volume}
                          onChange={(e) =>
                            updateSettings({ volume: Number(e.target.value) })
                          }
                        />
                        <b>{settings.volume}%</b>
                      </div>
                    </div>
                    <div className="audio-info">
                      <Headphones size={30} />
                      <p>
                        Headphones recommended. Audio initializes when you enter
                        combat. All sounds are generated in-engine; no
                        copyrighted recordings.
                      </p>
                    </div>
                  </>
                )}
                {settingsTab === "GRAPHICS" && (
                  <>
                    <div className="setting-row">
                      <div>
                        <h3>RENDER QUALITY</h3>
                        <p>
                          Controls resolution, antialiasing, shadows, and
                          weather particles.
                        </p>
                      </div>
                      <select
                        value={settings.quality}
                        onChange={(e) =>
                          updateSettings({ quality: e.target.value })
                        }
                      >
                        {["Low", "High", "Ultra"].map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                    </div>
                    <div className="setting-row">
                      <div>
                        <h3>CAMERA RECOIL</h3>
                        <p>Enable weapon-induced camera movement.</p>
                      </div>
                      <button
                        className={`toggle ${settings.shake ? "on" : ""}`}
                        aria-label="Toggle camera recoil"
                        onClick={() =>
                          updateSettings({ shake: !settings.shake })
                        }
                      >
                        <i />
                      </button>
                    </div>
                    <div className="setting-row">
                      <div>
                        <h3>STREAM WEB MODELS</h3>
                        <p>
                          Upgrade soldiers to animated web-streamed 3D models
                          when online (High/Ultra quality). Local models are
                          always used offline.
                        </p>
                      </div>
                      <button
                        className={`toggle ${settings.webModels !== false ? "on" : ""}`}
                        aria-label="Toggle streamed web models"
                        onClick={() =>
                          updateSettings({
                            webModels: settings.webModels === false,
                          })
                        }
                      >
                        <i />
                      </button>
                    </div>
                    <p className="small-note">
                      Graphics settings apply on your next deployment. Low is
                      recommended for integrated graphics and phones.
                    </p>
                  </>
                )}
                {settingsTab === "CONTROLS" && (
                  <>
                    <div className="setting-row">
                      <div>
                        <h3>MOUSE SENSITIVITY</h3>
                        <p>
                          Adjust look speed. Aiming reduces sensitivity
                          automatically.
                        </p>
                      </div>
                      <div className="range-control">
                        <input
                          type="range"
                          aria-label="Mouse sensitivity"
                          min="1"
                          max="100"
                          value={settings.sensitivity}
                          onChange={(e) =>
                            updateSettings({
                              sensitivity: Number(e.target.value),
                            })
                          }
                        />
                        <b>{settings.sensitivity}</b>
                      </div>
                    </div>
                    <div className="controls-list">
                      {[
                        ["W A S D", "Move"],
                        ["MOUSE", "Look · left fire · right aim"],
                        ["SHIFT", "Sprint"],
                        ["SPACE", "Jump"],
                        ["C / CTRL", "Crouch"],
                        ["R", "Reload"],
                        ["1 / 2", "Switch weapon"],
                        ["Q", "Tactical ability"],
                        ["G", "Throw grenade"],
                        ["F", "Melee"],
                        ["E", "Hold to interact"],
                        ["ESC", "Pause operation"],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <kbd>{k}</kbd>
                          <span>{v}</span>
                        </div>
                      ))}
                    </div>
                    <p className="small-note">
                      On phones and tablets the game shows touch controls: left
                      stick to move (push far to sprint), drag the right side
                      to aim, and hold FIRE to shoot.
                    </p>
                  </>
                )}
                {settingsTab === "ACCESSIBILITY" && (
                  <>
                    {[
                      {
                        key: "subtitles",
                        title: "RADIO SUBTITLES",
                        desc: "Show squad communications and objective messages.",
                      },
                      {
                        key: "contrast",
                        title: "HIGH-CONTRAST HUD",
                        desc: "Increase heads-up display text and background contrast.",
                      },
                    ].map((s) => (
                      <div className="setting-row" key={s.key}>
                        <div>
                          <h3>{s.title}</h3>
                          <p>{s.desc}</p>
                        </div>
                        <button
                          className={`toggle ${settings[s.key as keyof Settings] ? "on" : ""}`}
                          aria-label={`Toggle ${s.title.toLowerCase()}`}
                          onClick={() =>
                            updateSettings({
                              [s.key]: !settings[s.key as keyof Settings],
                            })
                          }
                        >
                          <i />
                        </button>
                      </div>
                    ))}
                    <p className="small-note">
                      Enemy radar indicators use different shapes and colors
                      from the player. Mouse capture has a click-and-drag
                      fallback.
                    </p>
                  </>
                )}
                <div className="settings-saved">
                  <Check size={13} /> SETTINGS SAVE AUTOMATICALLY
                </div>
              </>
            )}
            {modal === "help" && (
              <>
                <span className="eyebrow">VANGUARD FIELD MANUAL</span>
                <h2>KNOW YOUR BATTLEFIELD.</h2>
                <div className="manual-sections">
                  <section>
                    <Crosshair />
                    <div>
                      <h3>FIGHT WITH INTENT</h3>
                      <p>
                        WASD to move, mouse to aim, left-click to fire,
                        right-click to aim down sights. R reloads. Shift
                        sprints, Space jumps, C crouches. Press 1 or 2 to switch
                        to your Ember sidearm.
                      </p>
                    </div>
                  </section>
                  <section>
                    <Target />
                    <div>
                      <h3>THE OBJECTIVE COMES FIRST</h3>
                      <p>
                        Orange terminals require holding E. Cyan rings mark
                        control zones—clear enemies and stay inside. After
                        collecting all cores, return to the green extraction
                        ring at your spawn.
                      </p>
                    </div>
                  </section>
                  <section>
                    <Zap />
                    <div>
                      <h3>CHANGE THE ODDS</h3>
                      <p>
                        Q activates your chosen ability. G detonates a forward
                        frag grenade. F strikes nearby enemies. Cooldowns and
                        ammunition are shown on your HUD.
                      </p>
                    </div>
                  </section>
                  <section>
                    <Users />
                    <div>
                      <h3>SURVIVE TOGETHER</h3>
                      <p>
                        Co-op uses two AI squadmates, not online players.
                        Eliminate every hostile to advance waves. Collect drops
                        for ammo and spend 500 score with B for a resupply and
                        weapon upgrade.
                      </p>
                    </div>
                  </section>
                  <section>
                    <Skull />
                    <div>
                      <h3>INTO THE HOLLOW</h3>
                      <p>
                        Health does not regenerate here. Fallen hunters drop
                        resources that restore health. Look beyond the main
                        routes for a hidden memory fragment.
                      </p>
                    </div>
                  </section>
                </div>
                <button
                  className="button primary"
                  onClick={() => launch("training", 0)}
                >
                  LEARN IN THE FIELD
                  <ArrowRight size={16} />
                </button>
              </>
            )}
            {(modal === "news" || modal === "notifications") && (
              <>
                <span className="eyebrow">VANGUARD TRANSMISSION · 001</span>
                <h2>AFTERLIGHT IS HERE.</h2>
                <img
                  className="news-image"
                  src="/images/campaign.jpg"
                  alt="Afterlight campaign"
                />
                <p className="modal-text">
                  The Directorate erased a city. A broken radio signal brought
                  four strangers together. Now the Vanguard has one chance to
                  bring the truth into the light.
                </p>
                <div className="news-list">
                  <span>
                    <Hexagon size={16} /> 16 replayable campaign operations
                    across six environments
                  </span>
                  <span>
                    <Swords size={16} /> 11 objective-based offline bot rulesets
                  </span>
                  <span>
                    <Users size={16} /> AI-supported survival and The Hollow
                  </span>
                  <span>
                    <Crosshair size={16} /> 7 original weapons · 6 tactical
                    abilities
                  </span>
                  <span>
                    <ShieldCheck size={16} /> Persistent career and earned-only
                    progression
                  </span>
                </div>
                <button
                  className="button primary"
                  onClick={() => {
                    setModal(null);
                    navigate("campaign");
                  }}
                >
                  EXPLORE THE CAMPAIGN
                  <ArrowRight size={16} />
                </button>
              </>
            )}
            {modal === "callsign" && (
              <>
                <span className="eyebrow">OPERATOR IDENTITY</span>
                <h2>MAKE A NAME.</h2>
                <p className="modal-text">
                  Your callsign appears in your career record and on survival
                  leaderboards.
                </p>
                <label className="callsign-label">
                  CALLSIGN
                  <input
                    value={callsign}
                    maxLength={16}
                    onChange={(e) => setCallsign(e.target.value.toUpperCase())}
                    autoFocus
                    placeholder="YOUR CALLSIGN"
                  />
                </label>
                <button
                  className="button primary"
                  disabled={saving || !callsign.trim()}
                  onClick={async () => {
                    await mutate(
                      { action: "loadout", callsign },
                      { ...profile, callsign },
                    );
                    setModal(null);
                    notify("Operator identity updated.");
                  }}
                >
                  SAVE IDENTITY
                  <Check size={16} />
                </button>
              </>
            )}
            {modal === "leaderboard" && (
              <>
                <span className="eyebrow">SURVIVAL NETWORK</span>
                <h2>THE ONES WHO HELD.</h2>
                <p className="modal-text">
                  Top survival deployments, ranked by wave reached and
                  eliminations.
                </p>
                {leaderLoading ? (
                  <div className="empty-state">
                    <LoaderCircle className="spin" />
                  </div>
                ) : leaderboard.length ? (
                  <div className="leaderboard-list">
                    {leaderboard.map((r, i) => (
                      <div key={r.id}>
                        <b>{pad(i + 1)}</b>
                        <span>
                          {r.callsign}
                          <small>{r.mode.toUpperCase()}</small>
                        </span>
                        <strong>WAVE {r.wave}</strong>
                        <span>{r.kills} KILLS</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <Trophy size={40} />
                    <h3>SET THE FIRST BENCHMARK.</h3>
                    <p>
                      Complete a survival deployment to put your callsign on the
                      board.
                    </p>
                    <button
                      className="button primary"
                      onClick={() => launch("survival", 0)}
                    >
                      DEPLOY TO SURVIVAL
                      <ArrowRight size={16} />
                    </button>
                  </div>
                )}
              </>
            )}
            {modal === "cinematic" && (
              <>
                <img
                  src="/images/campaign.jpg"
                  alt="Nova City before the blackout"
                  className="cinema-image"
                />
                <div className="cinema-shade" />
                <div className="cinema-copy">
                  <span className="eyebrow">PROLOGUE · THE SIGNAL</span>
                  <h2>
                    {
                      [
                        "ELEVEN MINUTES.",
                        "FOUR VOICES.",
                        "ONE LAST SIGNAL.",
                        "THE SILENCE ENDS WITH YOU.",
                      ][cinemaStep]
                    }
                  </h2>
                  <p>
                    {
                      [
                        "That is how long it took for Nova City to disappear. Not from the map. From the world. Every screen, every voice, every heartbeat—silence.",
                        "Captain Sera Voss. Rook, a medic who refused to leave. Lyra, the engineer who built the network. And a voice on the radio that should not exist.",
                        "The Directorate calls it a containment event. We call it a city full of people. At 04:17, a dead frequency came back to life. Someone inside is still fighting.",
                        "VOSS: Vanguard, check your weapons. We are going into the blackout. ROOK: Right beside you, Captain. Always.",
                      ][cinemaStep]
                    }
                  </p>
                  <div className="cinema-dots">
                    {[0, 1, 2, 3].map((i) => (
                      <button
                        key={i}
                        className={cinemaStep === i ? "active" : ""}
                        aria-label={`Prologue part ${i + 1}`}
                        onClick={() => setCinemaStep(i)}
                      />
                    ))}
                  </div>
                  <button
                    className="button primary"
                    onClick={() =>
                      cinemaStep < 3
                        ? setCinemaStep(cinemaStep + 1)
                        : launch("campaign", 0)
                    }
                  >
                    {cinemaStep < 3 ? "CONTINUE" : "ENTER THE BLACKOUT"}
                    <ArrowRight size={16} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
