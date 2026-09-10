"use client";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  ArrowRight,
  Crosshair,
  Shield,
  Radio,
  RotateCcw,
  X,
  Pause,
  ChevronRight,
  Volume2,
  AlertTriangle,
} from "lucide-react";
import { Engine, type Hud } from "@/game/engine";
import {
  abilities,
  missions,
  type MatchConfig,
  type MatchResult,
  type Settings,
} from "@/game/content";

const clock = (n: number) =>
  `${Math.floor(n / 60)
    .toString()
    .padStart(2, "0")}:${(n % 60).toString().padStart(2, "0")}`;

const artFor = (environment: string) => {
  switch (environment) {
    case "aquarium":
      return "/images/arena.jpg";
    case "horror":
    case "lab":
      return "/images/horror.jpg";
    case "desert":
    case "forest":
    case "snow":
      return "/images/survival.jpg";
    default:
      return "/images/campaign.jpg";
  }
};

function useIsTouch() {
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    const coarse =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: coarse)").matches;
    if (
      coarse ||
      "ontouchstart" in window ||
      /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    )
      setTouch(true);
    const onTouch = () => setTouch(true);
    window.addEventListener("touchstart", onTouch, {
      once: true,
      passive: true,
    });
    return () => window.removeEventListener("touchstart", onTouch);
  }, []);
  return touch;
}

function Joystick({ engine }: { engine: RefObject<Engine | null> }) {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const pid = useRef<number | null>(null);
  const R = 52;
  const reset = () => {
    pid.current = null;
    setActive(false);
    setKnob({ x: 0, y: 0 });
    engine.current?.setTouchMove(0, 0);
    engine.current?.setTouchSprint(false);
  };
  const update = (clientX: number, clientY: number) => {
    const rect = base.current?.getBoundingClientRect();
    if (!rect) return;
    let dx = clientX - (rect.left + rect.width / 2);
    let dy = clientY - (rect.top + rect.height / 2);
    const len = Math.hypot(dx, dy) || 1;
    const cl = Math.min(len, R);
    dx = (dx / len) * cl;
    dy = (dy / len) * cl;
    setKnob({ x: dx, y: dy });
    engine.current?.setTouchMove(dx / R, dy / R);
    engine.current?.setTouchSprint(len / R > 0.92);
  };
  return (
    <div
      ref={base}
      className={`stick-base${active ? " on" : ""}`}
      onPointerDown={(e) => {
        pid.current = e.pointerId;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        setActive(true);
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (pid.current === e.pointerId) update(e.clientX, e.clientY);
      }}
      onPointerUp={(e) => {
        if (pid.current === e.pointerId) reset();
      }}
      onPointerCancel={reset}
    >
      <div
        className="stick-knob"
        style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
      />
    </div>
  );
}

function LookLayer({ engine }: { engine: RefObject<Engine | null> }) {
  const last = useRef<{ id: number; x: number; y: number } | null>(null);
  return (
    <div
      className="touch-look"
      onPointerDown={(e) => {
        last.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
      }}
      onPointerMove={(e) => {
        const l = last.current;
        if (l && l.id === e.pointerId) {
          engine.current?.addLook(e.clientX - l.x, e.clientY - l.y);
          l.x = e.clientX;
          l.y = e.clientY;
        }
      }}
      onPointerUp={(e) => {
        if (last.current?.id === e.pointerId) last.current = null;
      }}
      onPointerCancel={() => {
        last.current = null;
      }}
    />
  );
}

function Tap({
  className,
  onTap,
  label,
  children,
}: {
  className?: string;
  onTap: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      aria-label={label}
      className={className}
      onPointerDown={(e) => {
        e.preventDefault();
        onTap();
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}

function Hold({
  className,
  onHold,
  label,
  children,
}: {
  className?: string;
  onHold: (held: boolean) => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      aria-label={label}
      className={className}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        onHold(true);
      }}
      onPointerUp={() => onHold(false)}
      onPointerCancel={() => onHold(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}

function TouchControls({
  engine,
  mode,
}: {
  engine: RefObject<Engine | null>;
  mode: string;
}) {
  const [ads, setAds] = useState(false);
  const [crouched, setCrouched] = useState(false);
  const e = () => engine.current;
  return (
    <div className="touch-ui">
      <LookLayer engine={engine} />
      <div className="touch-left">
        <Joystick engine={engine} />
        <div className="touch-row">
          <Tap
            className={`touch-btn sm${crouched ? " on" : ""}`}
            label="Toggle crouch"
            onTap={() => {
              e()?.toggleCrouch();
              setCrouched((c) => !c);
            }}
          >
            CRCH
          </Tap>
          <Tap
            className="touch-btn sm"
            label="Jump"
            onTap={() => e()?.tryJump()}
          >
            JUMP
          </Tap>
        </div>
      </div>
      <div className="touch-right">
        <div className="touch-row">
          <Tap
            className="touch-btn xs"
            label="Reload"
            onTap={() => e()?.reload()}
          >
            R
          </Tap>
          <Tap
            className="touch-btn xs"
            label="Switch weapon"
            onTap={() => e()?.switchWeapon()}
          >
            SWP
          </Tap>
          <Tap
            className="touch-btn xs"
            label="Use ability"
            onTap={() => e()?.ability()}
          >
            Q
          </Tap>
        </div>
        <div className="touch-row">
          <Tap
            className="touch-btn xs"
            label="Throw grenade"
            onTap={() => e()?.grenade()}
          >
            G
          </Tap>
          <Tap
            className="touch-btn xs"
            label="Melee"
            onTap={() => e()?.melee()}
          >
            F
          </Tap>
          {(mode === "survival" || mode === "horror") && (
            <Tap
              className="touch-btn xs"
              label="Buy supplies"
              onTap={() => e()?.upgrade()}
            >
              B
            </Tap>
          )}
        </div>
        <div className="touch-row">
          <Tap
            className={`touch-btn sm${ads ? " on" : ""}`}
            label="Toggle aim"
            onTap={() => {
              e()?.toggleAim();
              setAds((a) => !a);
            }}
          >
            ADS
          </Tap>
          <Hold
            className="touch-btn sm"
            label="Hold to interact"
            onHold={(held) => e()?.setInteract(held)}
          >
            E
          </Hold>
        </div>
        <Hold
          className="touch-btn fire"
          label="Hold to fire"
          onHold={(held) => e()?.setTouchFire(held)}
        >
          FIRE
        </Hold>
      </div>
      <div className="rotate-hint">ROTATE DEVICE FOR BEST VIEW</div>
    </div>
  );
}

export default function Game({
  config,
  settings,
  onExit,
  onResult,
}: {
  config: MatchConfig;
  settings: Settings;
  onExit: () => void;
  onResult: (r: MatchResult) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    engine = useRef<Engine | null>(null);
  const [hud, setHud] = useState<Hud | null>(null),
    [paused, setPaused] = useState(true),
    [started, setStarted] = useState(false),
    [result, setResult] = useState<MatchResult | null>(null),
    [error, setError] = useState(""),
    [restart, setRestart] = useState(0),
    [ending, setEnding] = useState("");
  const saved = useRef(false);
  const resultCallback = useRef(onResult);
  resultCallback.current = onResult;
  const isTouch = useIsTouch();
  useEffect(() => {
    if (!canvas.current) return;
    try {
      const e = new Engine(
        canvas.current,
        config,
        settings,
        setHud,
        (r) => {
          setResult(r);
          if (!(r.won && config.mode === "campaign" && config.mission === 15)) {
            saved.current = true;
            resultCallback.current(r);
          }
        },
        setPaused,
      );
      engine.current = e;
      return () => {
        e.destroy();
        engine.current = null;
      };
    } catch (e) {
      setError(e instanceof Error ? e.message : "WebGL could not initialize.");
    }
  }, [config, settings, restart]);
  const begin = () => {
    setStarted(true);
    if (isTouch) {
      try {
        document.documentElement.requestFullscreen?.().catch(() => {});
      } catch {}
      try {
        (
          navigator as Navigator & {
            wakeLock?: { request: (k: string) => Promise<unknown> };
          }
        ).wakeLock?.request("screen").catch(() => {});
      } catch {}
    }
    engine.current?.resume();
  };
  const retry = () => {
    saved.current = false;
    setResult(null);
    setStarted(false);
    setPaused(true);
    setHud(null);
    setRestart((n) => n + 1);
  };
  const choose = (choice: string) => {
    if (!result || saved.current) return;
    setEnding(choice);
    saved.current = true;
    resultCallback.current({ ...result, ending: choice });
  };
  const exit = () => {
    if (result && !saved.current) {
      saved.current = true;
      resultCallback.current(result);
    }
    onExit();
  };
  const ability =
    abilities.find((a) => a.id === config.ability) || abilities[0];
  return (
    <div className={`game-shell${settings.contrast ? " high-contrast" : ""}${isTouch ? " touch" : ""}`}>
      <canvas
        ref={canvas}
        tabIndex={0}
        aria-label="VEILBREAK 3D first-person game"
      />
      {hud && !result && (
        <div className="game-hud">
          <div className="hud-top">
            <div className="radar">
              <div className="radar-cross" />
              {hud.radar.map((b, i) => (
                <i
                  key={i}
                  className={b.friendly ? "friendly" : ""}
                  style={{
                    left: `${50 + (b.x / 70) * 100}%`,
                    top: `${50 + (b.z / 70) * 100}%`,
                  }}
                />
              ))}
              <span
                className="radar-player"
                style={{
                  left: `${50 + (hud.player.x / 70) * 100}%`,
                  top: `${50 + (hud.player.z / 70) * 100}%`,
                  transform: `rotate(${(-hud.player.yaw * 180) / Math.PI}deg)`,
                }}
              >
                ▲
              </span>
              <small>
                SECTOR {String(config.mission + 1).padStart(2, "0")}
              </small>
            </div>
            <div className="hud-mission">
              <span className="eyebrow">
                {config.mode === "arena"
                  ? "OFFLINE BOT MATCH"
                  : config.mode.toUpperCase()}
              </span>
              <h3>{config.name}</h3>
              <p>{hud.objective}</p>
              <div className="objective-track">
                <span
                  style={{
                    width: `${Math.min(100, (hud.progress / hud.target) * 100)}%`,
                  }}
                />
              </div>
            </div>
            <div className="hud-timer">
              <span>{clock(hud.time)}</span>
              <small>
                {config.mode === "survival" || config.mode === "horror"
                  ? `WAVE ${hud.wave}`
                  : `${hud.progress} / ${hud.target}`}
              </small>
              <button
                aria-label="Pause game"
                onClick={() => engine.current?.pause()}
              >
                <Pause size={18} />
              </button>
            </div>
          </div>
          <div className={`crosshair ${hud.hit ? "hit" : ""}`}>
            <i />
            <i />
            <i />
            <i />
            {hud.hit && <span>×</span>}
          </div>
          {hud.hurt && <div className="damage-vignette" />}
          {hud.interaction && (
            <div className="interaction">{hud.interaction}</div>
          )}
          {settings.subtitles && hud.message && (
            <div className="radio-message">
              <Radio size={18} />
              <span>{hud.message}</span>
            </div>
          )}
          <div className="hud-bottom">
            <div className="vitals">
              <div>
                <Shield size={18} />
                <b>{hud.armor}</b>
                <span>ARMOR</span>
              </div>
              <div className="armor-bar">
                <i style={{ width: `${hud.armor}%` }} />
              </div>
              <div>
                <span className="health-plus">+</span>
                <b>{hud.health}</b>
                <span>VITALS</span>
              </div>
              <div className="health-bar">
                <i style={{ width: `${hud.health}%` }} />
              </div>
            </div>
            <div className="hud-equipment">
              <div className={hud.abilityActive ? "active" : ""}>
                <Crosshair size={24} />
                <b>{hud.cooldown > 0 ? `${hud.cooldown}s` : "READY"}</b>
                <small>
                  <kbd>Q</kbd> {ability.name}
                </small>
              </div>
              <div>
                <span className="grenade-icon">◈</span>
                <b>{hud.grenades}</b>
                <small>
                  <kbd>G</kbd> FRAG
                </small>
              </div>
            </div>
            <div className="ammo">
              <small>{hud.weapon}</small>
              <div>
                <b>{hud.reload ? "––" : String(hud.ammo).padStart(2, "0")}</b>
                <span>/ {hud.reserve}</span>
              </div>
              <small>
                {hud.reload
                  ? "RELOADING…"
                  : isTouch
                    ? "TAP R · TAP SWP TO SWITCH"
                    : "[ R ] RELOAD  ·  [ 1 / 2 ] SWITCH"}
              </small>
            </div>
          </div>
          {isTouch && !paused && (
            <TouchControls engine={engine} mode={config.mode} />
          )}
        </div>
      )}
      {((paused && !result) || error) && (
        <div className="game-overlay">
          <div className="briefing-panel">
            <span className="eyebrow">
              <span className="orange-dot" />
              {error
                ? "SYSTEM NOTICE"
                : started
                  ? "OPERATION SUSPENDED"
                  : "VANGUARD · MISSION BRIEFING"}
            </span>
            <h1>
              {error
                ? "GRAPHICS UNAVAILABLE"
                : started
                  ? "PAUSED"
                  : config.name}
            </h1>
            <div className="briefing-meta">
              <span>{config.environment.toUpperCase()}</span>
              <span>{config.difficulty.toUpperCase()}</span>
              <span>
                {config.mode === "arena"
                  ? "OFFLINE · AI OPPONENTS"
                  : "SOLO + TACTICAL AI"}
              </span>
            </div>
            <img
              className="briefing-art"
              src={artFor(config.environment)}
              alt={`${config.environment} battlefield`}
            />
            <p>
              {error ||
                (!started && config.mode === "campaign"
                  ? missions[config.mission].briefing
                  : !started
                    ? "Your deployment is ready. Clear your objectives, watch your flanks, and make every round count."
                    : "Take a breath. Your operation is waiting.")}
            </p>
            {!error && (
              <>
                {isTouch ? (
                  <div className="control-grid touch-grid">
                    <div>
                      <kbd>LEFT STICK</kbd>
                      <span>MOVE · PUSH FAR TO SPRINT</span>
                    </div>
                    <div>
                      <kbd>DRAG RIGHT</kbd>
                      <span>LOOK / AIM</span>
                    </div>
                    <div>
                      <kbd>FIRE</kbd>
                      <span>HOLD TO SHOOT</span>
                    </div>
                    <div>
                      <kbd>ADS</kbd>
                      <span>TOGGLE AIM</span>
                    </div>
                    <div>
                      <kbd>JUMP</kbd>
                      <span>JUMP / MANTLE COVER</span>
                    </div>
                    <div>
                      <kbd>CRCH</kbd>
                      <span>TOGGLE CROUCH</span>
                    </div>
                    <div>
                      <kbd>R</kbd>
                      <span>RELOAD</span>
                    </div>
                    <div>
                      <kbd>E</kbd>
                      <span>HOLD TO INTERACT</span>
                    </div>
                    <div>
                      <kbd>Q</kbd>
                      <span>ABILITY</span>
                    </div>
                    <div>
                      <kbd>G</kbd>
                      <span>GRENADE</span>
                    </div>
                    <div>
                      <kbd>F</kbd>
                      <span>MELEE</span>
                    </div>
                    <div>
                      <kbd>SWP</kbd>
                      <span>SWITCH WEAPON</span>
                    </div>
                  </div>
                ) : (
                  <div className="control-grid">
                    <div>
                      <kbd>W A S D</kbd>
                      <span>MOVE</span>
                    </div>
                    <div>
                      <kbd>MOUSE</kbd>
                      <span>LOOK / FIRE</span>
                    </div>
                    <div>
                      <kbd>RMB</kbd>
                      <span>AIM DOWN SIGHTS</span>
                    </div>
                    <div>
                      <kbd>SHIFT</kbd>
                      <span>SPRINT</span>
                    </div>
                    <div>
                      <kbd>SPACE</kbd>
                      <span>JUMP</span>
                    </div>
                    <div>
                      <kbd>C</kbd>
                      <span>CROUCH</span>
                    </div>
                    <div>
                      <kbd>R</kbd>
                      <span>RELOAD</span>
                    </div>
                    <div>
                      <kbd>E</kbd>
                      <span>INTERACT / HOLD</span>
                    </div>
                    <div>
                      <kbd>Q</kbd>
                      <span>ABILITY</span>
                    </div>
                    <div>
                      <kbd>G</kbd>
                      <span>GRENADE</span>
                    </div>
                    <div>
                      <kbd>F</kbd>
                      <span>MELEE</span>
                    </div>
                    <div>
                      <kbd>B</kbd>
                      <span>SURVIVAL SUPPLIES</span>
                    </div>
                  </div>
                )}
                <p className="small-note">
                  <Volume2 size={14} /> Original synthesized audio · Headphones
                  recommended
                  <br />
                  {isTouch
                    ? "Rotate to landscape for the best view. Push the stick far to sprint."
                    : "If mouse capture is unavailable, hold left-click and drag to look."}
                </p>
              </>
            )}
            <div className="button-row">
              {!error && (
                <button className="button primary" onClick={begin}>
                  {started ? "RESUME OPERATION" : "DEPLOY NOW"}
                  <ArrowRight size={18} />
                </button>
              )}
              {started && !error && (
                <button className="button secondary" onClick={retry}>
                  <RotateCcw size={16} /> RESTART
                </button>
              )}
              <button className="button ghost" onClick={exit}>
                {error ? "RETURN TO OPERATIONS" : "ABORT"}
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
      {result && (
        <div className="game-overlay">
          <div className="debrief-panel">
            <span className="eyebrow">AFTER-ACTION REPORT · {config.name}</span>
            <div className={`result-emblem ${result.won ? "" : "lost"}`}>
              {result.won ? <Shield size={52} /> : <AlertTriangle size={52} />}
            </div>
            <h1>{result.won ? "MISSION COMPLETE" : "SIGNAL LOST"}</h1>
            <p>
              {result.won
                ? "You made the difference, operator."
                : "The fight is not over. Rebuild. Redeploy."}
            </p>
            <div className="result-stats">
              <div>
                <b>{result.kills}</b>
                <span>ELIMINATIONS</span>
              </div>
              <div>
                <b>{result.headshots}</b>
                <span>HEADSHOTS</span>
              </div>
              <div>
                <b>{clock(result.time)}</b>
                <span>OPERATION TIME</span>
              </div>
              <div>
                <b className="orange">+{result.xp.toLocaleString()}</b>
                <span>CAREER XP</span>
              </div>
            </div>
            {result.won &&
              config.mode === "campaign" &&
              config.mission === 15 && (
                <div className="ending">
                  <h3>THE FUTURE IS YOURS.</h3>
                  <p>
                    {ending === "release"
                      ? "The memories return. A city wakes, carrying both its grief and its hope. Lyra hears her brother’s voice one last time."
                      : ending === "destroy"
                        ? "The Chorus falls silent forever. The city is free, but the lives inside the network are lost. Rook stands beside you as the sun rises."
                        : "The Origin sentinel is down. Release the stored memories to the city, or destroy the network so it can never be used again."}
                  </p>
                  {!ending && (
                    <div className="button-row">
                      <button
                        className="button primary"
                        onClick={() => choose("release")}
                      >
                        RELEASE THE MEMORIES
                      </button>
                      <button
                        className="button secondary"
                        onClick={() => choose("destroy")}
                      >
                        DESTROY THE NETWORK
                      </button>
                    </div>
                  )}
                </div>
              )}
            <div className="button-row">
              <button className="button primary" onClick={exit}>
                RETURN TO OPERATIONS
                <ChevronRight size={17} />
              </button>
              <button className="button secondary" onClick={retry}>
                <RotateCcw size={16} /> REDEPLOY
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
