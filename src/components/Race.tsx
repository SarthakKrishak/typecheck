import { useEffect, useState, useRef, useCallback, useMemo, memo } from "react";
import { generateWords } from "../data/words";
import { calcWpm } from "../engine/stats";
import { hostRoom, joinRoom, localSession, sanitizeMode, sanitizeName, type NetPlayer, type RaceMode, type RaceSession, type RoomInfo } from "../lib/raceNet";
import { useProfileStore } from "../store/useProfileStore";
import { Avatar } from "./ProfileModal";

type Room = { id: string; words: string[]; createdAt: number; private: boolean; limit: number; passcode?: string; ownerId?: string };

const ROOM_KEY = "typecraft_race_rooms_v1";

// Sanitize a CSV field: escape quotes and neutralize formula injection (= + - @, tab/CR).
function csvField(v: string | number): string {
  const s = String(v);
  const needsQuote = /[",\n\r]/.test(s) || /^[=+\-@\t ]/.test(s);
  const escaped = s.replace(/"/g, '""');
  const safe = /^[=+\-@]/.test(s) ? `'${escaped}` : escaped;
  return needsQuote || safe !== s ? `"${safe}"` : safe;
}

function getRooms(): Room[] {
  try {
    const raw = JSON.parse(localStorage.getItem(ROOM_KEY) || "[]") as unknown;
    if (!Array.isArray(raw)) return [];
    return (raw as Record<string, unknown>[])
      .filter((r) => r && typeof r === "object" && typeof (r as Room).id === "string" && Array.isArray((r as Room).words))
      .map((r) => {
        const room = r as unknown as Room;
        const id = String(room.id).toUpperCase().slice(0, 12);
        const words = room.words.filter((w) => typeof w === "string").map((w) => w.slice(0, 40)).slice(0, 120);
        const limit = [2, 4, 8, 16, 32].includes(room.limit) ? room.limit : 8;
        const passcode = typeof room.passcode === "string" && room.passcode.length >= 3 ? room.passcode.slice(0, 64) : undefined;
        return {
          id,
          words: words.length >= 5 ? words : genRoomWords(id),
          createdAt: Number.isFinite(room.createdAt) ? room.createdAt : Date.now(),
          private: !!room.private,
          limit,
          passcode,
          ownerId: typeof room.ownerId === "string" ? room.ownerId.slice(0, 16) : undefined,
        };
      })
      .slice(0, 24);
  } catch { return []; }
}
function saveRoom(room: Room) {
  const rooms = getRooms();
  if (rooms.find((r) => r.id === room.id)) return;
  rooms.unshift(room);
  try { localStorage.setItem(ROOM_KEY, JSON.stringify(rooms.slice(0, 24))); } catch {}
}

function genRoomWords(seed: string, count = 50) {
  let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const rnd = () => (h = (h * 1664525 + 1013904223) >>> 0) / 0xffffffff;
  const base = generateWords(Math.max(count, 50), { punctuation: false, numbers: false });
  return [...base].sort(() => rnd() - 0.5).slice(0, count);
}

function modeLabel(m: RaceMode): string {
  return m.kind === "words" ? `${m.count} words` : `${m.seconds}s race`;
}

function ModePicker({ mode, onChange }: { mode: RaceMode; onChange: (m: RaceMode) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex p-0.5 rounded-md w-fit" style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}>
        {(["words", "time"] as const).map((k) => (
          <button key={k} onClick={() => onChange(k === "words" ? { kind: "words", count: mode.kind === "words" ? mode.count : 50 } : { kind: "time", seconds: 30 })} className="px-3 py-1 rounded-[5px] text-[12px] font-medium capitalize" style={{ background: mode.kind === k ? "var(--bg-card)" : "transparent", color: mode.kind === k ? "var(--text-strong)" : "var(--text-dim)", border: mode.kind === k ? "1px solid var(--border-strong)" : "1px solid transparent" }}>
            {k === "words" ? "Words" : "Time"}
          </button>
        ))}
      </div>
      {mode.kind === "words" ? (
        <div className="flex p-0.5 rounded-md w-fit" style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}>
          {[10, 25, 50, 100].map((n) => (
            <button key={n} onClick={() => onChange({ kind: "words", count: n })} className="px-2.5 py-1 rounded-[5px] text-[11px] font-medium" style={{ background: mode.count === n ? "var(--bg-card)" : "transparent", color: mode.count === n ? "var(--text-strong)" : "var(--text-dim)", border: mode.count === n ? "1px solid var(--border-strong)" : "1px solid transparent" }}>{n}</button>
          ))}
        </div>
      ) : (
        <div className="flex p-0.5 rounded-md w-fit" style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}>
          {[15, 30, 60, 120].map((n) => (
            <button key={n} onClick={() => onChange({ kind: "time", seconds: n })} className="px-2.5 py-1 rounded-[5px] text-[11px] font-medium" style={{ background: mode.seconds === n ? "var(--bg-card)" : "transparent", color: mode.seconds === n ? "var(--text-strong)" : "var(--text-dim)", border: mode.seconds === n ? "1px solid var(--border-strong)" : "1px solid transparent" }}>{n}s</button>
          ))}
        </div>
      )}
    </div>
  );
}

const BOT_DEFS: Array<{ id: string; base: number }> = [
  { id: "bot1", base: 78 },
  { id: "bot2", base: 64 },
];

const GOOD = "#10B981"; // correct-word green (matches accuracy/coach accents)

const MEDALS = ["🥇", "🥈", "🥉"];
const PODIUM_STYLE = [
  { h: 112, bg: "linear-gradient(180deg, #E8C468, #B8912F)", ring: "#E8C468", label: "1st" },
  { h: 80, bg: "linear-gradient(180deg, #C9CCD4, #8E93A0)", ring: "#C9CCD4", label: "2nd" },
  { h: 60, bg: "linear-gradient(180deg, #D89A6A, #9A5C2C)", ring: "#D89A6A", label: "3rd" },
];

function Podium({ top, youId }: { top: Array<NetPlayer & { isYou?: boolean }>; youId: string }) {
  const order = [top[1], top[0], top[2]].filter(Boolean) as Array<NetPlayer & { isYou?: boolean }>;
  const rankOf = (p: NetPlayer) => top.findIndex((t) => t.id === p.id) + 1;
  return (
    <div className="mt-4 rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--bg-subtle)" }}>
      <div className="px-4 pt-3 pb-1 text-center">
        <div className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-dim)" }}>🏁 Final results</div>
      </div>
      <div className="flex items-end justify-center gap-3 px-4 pt-2">
        {order.map((p) => {
          const r = rankOf(p) - 1;
          const st = PODIUM_STYLE[r];
          const isYou = p.id === youId;
          return (
            <div key={p.id} className="flex flex-col items-center gap-1.5 w-[110px]">
              <span className="text-[22px] leading-none">{MEDALS[r]}</span>
              <span className="text-[12px] font-semibold truncate max-w-full" style={{ color: isYou ? "var(--primary)" : "var(--text-strong)" }}>
                {p.name}{isYou ? " (you)" : ""}
              </span>
              <span className="text-[11px] font-mono -mt-1" style={{ color: "var(--text-dim)" }}>{Math.round(p.wpm)} WPM</span>
              <div
                className="w-full rounded-t-md border-x border-t flex items-start justify-center pt-1.5"
                style={{ height: st.h, background: st.bg, borderColor: `${st.ring}66` }}
              >
                <span className="font-mono text-[20px] font-bold" style={{ color: "rgba(0,0,0,0.55)" }}>{r + 1}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-4 py-2 text-center border-t" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
        <span className="text-[12px] font-medium" style={{ color: "var(--text-strong)" }}>
          {top[0]?.id === youId ? "Victory — you took 1st place 🎉" : `You placed #${Math.max(1, top.findIndex((t) => t.id === youId) + 1)}${top.findIndex((t) => t.id === youId) === -1 ? " (practice bot round)" : ""}`}
        </span>
      </div>
    </div>
  );
}

const StandingsRow = memo(function StandingsRow({ p, rank }: { p: NetPlayer & { isYou?: boolean }; rank: number }) {
  const isBot = p.id.startsWith("bot");
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-mono w-7" style={{ color: "var(--text-faint)" }}>#{rank}</span>
      <span className="text-[11px] font-mono w-14" style={{ color: p.isYou ? "var(--primary)" : "var(--text-dim)" }}>{Math.round(p.wpm)} WPM</span>
      <div className="flex-1 h-2.5 rounded-full overflow-hidden relative" style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}>
        <div className="h-full transition-all duration-300" style={{ width: `${Math.round(p.progress)}%`, background: p.isYou ? "var(--primary)" : p.finished ? "var(--success)" : "var(--border-strong)" }} />
        {p.isYou && <span className="absolute inset-y-0 w-0.5" style={{ left: `${Math.round(p.progress)}%`, background: "white", opacity: 0.6 }} />}
      </div>
      <span className="text-[12px] font-medium min-w-[110px] text-right truncate flex items-center justify-end gap-1" style={{ color: p.isYou ? "var(--text-strong)" : "var(--text-dim)" }}>
        {p.name}{isBot ? " 🤖" : ""} {p.finished && <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--success)" }} />}
      </span>
      <span className="text-[11px] font-mono w-10 text-right" style={{ color: "var(--text-faint)" }}>{Math.round(p.progress)}%</span>
    </div>
  );
});

export function RaceSection() {
  const [tab, setTab] = useState<"free" | "private">("free");
  const [rooms, setRooms] = useState<Room[]>(() => getRooms());
  // Nickname is global (profile) — set once at first visit, used everywhere.
  const name = useProfileStore((s) => s.name) || "You";
  const profileAvatar = useProfileStore((s) => s.avatarId);
  const myIdRef = useRef<string>(Math.random().toString(36).slice(2, 7).toUpperCase());

  // session state
  const sessionRef = useRef<RaceSession | null>(null);
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [amHost, setAmHost] = useState(false);
  const [netMode, setNetMode] = useState<"net" | "local">("net");
  const [roster, setRoster] = useState<NetPlayer[]>([]);
  const [youId, setYouId] = useState<string>(() => myIdRef.current);
  const [words, setWords] = useState<string[]>([]);
  const [roomMeta, setRoomMeta] = useState<RoomInfo | null>(null);
  const [startsAt, setStartsAt] = useState<number | null>(null);
  const [inRace, setInRace] = useState(false);
  const [countdownN, setCountdownN] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null); // transient banner (offline fallback, host-left…)
  const [joinError, setJoinError] = useState<string | null>(null);

  // join form
  const [joinCode, setJoinCode] = useState(() => {
    try { return new URLSearchParams(window.location.search).get("race")?.trim().toUpperCase() ?? ""; } catch { return ""; }
  });
  const [joinPass, setJoinPass] = useState("");
  const [promptId, setPromptId] = useState<string | null>(null);
  const [promptPass, setPromptPass] = useState("");

  // create form
  const [assignmentText, setAssignmentText] = useState("");
  const [freeLimit, setFreeLimit] = useState(8);
  const [privateLimit, setPrivateLimit] = useState(4);
  const [privatePasscode, setPrivatePasscode] = useState("");
  const [freeMode, setFreeMode] = useState<RaceMode>({ kind: "words", count: 50 });
  const [privateMode, setPrivateMode] = useState<RaceMode>({ kind: "words", count: 50 });

  // typing state
  const [input, setInput] = useState("");
  const [wordIdx, setWordIdx] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [extra, setExtra] = useState<string[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [liveWpm, setLiveWpm] = useState(0);
  const [correctChars, setCorrectChars] = useState(0);
  const [wordStats, setWordStats] = useState<Array<{ c: number; ic: number }>>([]);
  const [copied, setCopied] = useState(false);
  const [bots, setBots] = useState<NetPlayer[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeUpRef = useRef(false); // time-mode auto-finish guard
  const [nowTick, setNowTick] = useState(0); // 500ms ticker for the time-mode clock

  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === ROOM_KEY) setRooms(getRooms()); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  // cleanup session on unmount
  useEffect(() => () => { sessionRef.current?.leave(); sessionRef.current = null; }, []);

  const flash = (msg: string) => { setNotice(msg); window.setTimeout(() => setNotice((n) => (n === msg ? null : n)), 5000); };
  const fail = (msg: string) => { setJoinError(msg); window.setTimeout(() => setJoinError((j) => (j === msg ? null : j)), 3500); };

  const resetTyping = useCallback(() => {
    timeUpRef.current = false;
    setWordIdx(0); setInput(""); setHistory([]); setExtra([]); setWordStats([]);
    setCorrectChars(0); setLiveWpm(0); setStartTime(null); setInRace(false); setBots([]);
  }, []);

  const attachSession = useCallback((session: RaceSession, code: string, meta: RoomInfo, host: boolean) => {
    sessionRef.current?.leave();
    sessionRef.current = session;
    setActiveCode(code);
    setAmHost(host || session.isHost);
    setNetMode(session.mode);
    setRoomMeta(meta);
    resetTyping();
    setStartsAt(null); setCountdownN(null);
    const url = new URL(window.location.href);
    url.searchParams.set("race", code);
    window.history.replaceState({}, "", url.toString());
    if (session.mode === "local") flash("Offline demo — progress syncs between tabs on this device only.");
  }, [resetTyping]);

  /* ── create ── */
  const createRoom = async (isPrivate: boolean) => {
    if (busy) return;
    const limit = isPrivate ? privateLimit : freeLimit;
    const passcode = isPrivate ? privatePasscode.trim() : "";
    if (isPrivate && passcode.length < 3) { fail("Set a passcode (min 3 chars) for private room"); return; }
    setBusy(true); setJoinError(null);
    // unique code (retry once on host-id collision)
    let code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const mode = sanitizeMode(isPrivate ? privateMode : freeMode);
    const need = mode.kind === "words" ? mode.count : 150; // time races need a long runway
    const custom = assignmentText.trim() && assignmentText.trim().split(/\s+/).filter(Boolean).length >= 5
      ? assignmentText.trim().split(/\s+/).slice(0, need)
      : null;
    const w = custom ?? genRoomWords(code, need);
    const events = makeEvents();
    try {
      try {
        const s = await hostRoom({ code, words: w, limit, passcode: passcode || undefined, mode, name, youId: myIdRef.current, events });
        finishCreate(s, code, isPrivate, limit, passcode || undefined, w, mode);
      } catch (e) {
        if ((e as Error)?.message?.includes("unavailable-id") || String(e).includes("taken")) {
          code = Math.random().toString(36).slice(2, 8).toUpperCase();
          const words2 = custom ?? genRoomWords(code, need);
          const s = await hostRoom({ code, words: words2, limit, passcode: passcode || undefined, mode, name, youId: myIdRef.current, events });
          finishCreate(s, code, isPrivate, limit, passcode || undefined, words2, mode);
        } else throw e;
      }
    } catch (e) {
      // signaling unreachable → offline demo lobby on this device
      const msg = (e as Error)?.message ?? "";
      if (/signal-timeout|network|server|socket|failed|unavailable/i.test(msg)) {
        const s = localSession({ roomId: code, name, youId: myIdRef.current, events, words: w, limit, isPrivate, mode });
        finishCreate(s, code, isPrivate, limit, passcode || undefined, w, mode);
      } else fail(`Couldn't create room (${msg || "unknown error"})`);
    } finally { setBusy(false); }
  };

  const finishCreate = (s: RaceSession, code: string, isPrivate: boolean, limit: number, passcode: string | undefined, finalWords: string[], mode: RaceMode) => {
    saveRoom({ id: code, words: finalWords, createdAt: Date.now(), private: isPrivate, limit, passcode, ownerId: myIdRef.current });
    setRooms(getRooms());
    attachSession(s, code, { limit, isPrivate, mode }, true);
    setPrivatePasscode("");
    const url = new URL(window.location.href);
    url.searchParams.set("race", code);
    try { navigator.clipboard.writeText(url.toString()).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }).catch(() => {}); } catch {}
  };

  /* ── join ── */
  const joinByCode = async (rawCode: string, pass?: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!code || code.length < 3 || busy) return;
    setBusy(true); setJoinError(null);
    const events = makeEvents();
    try {
      const s = await joinRoom({ code, name, passcode: pass, youId: myIdRef.current, events });
      saveRoom({ id: code, words: genRoomWords(code), createdAt: Date.now(), private: !!(pass ?? joinPass), limit: 8 });
      setRooms(getRooms());
      // real limit/mode arrive via onRoomInfo from the host's welcome (see makeEvents)
      attachSession(s, code, { limit: 8, isPrivate: !!(pass ?? joinPass), mode: { kind: "words", count: 50 } }, false);
      setPromptId(null); setPromptPass("");
    } catch (e) {
      const msg = (e as Error)?.message ?? "join failed";
      if (/Room not found|host may be offline|join-timeout|peer-unavailable/i.test(msg)) {
        // maybe a same-device room? fall back to local lobby
        const known = getRooms().find((r) => r.id === code);
        if (known) {
          if (known.private && known.passcode && (pass ?? joinPass ?? promptPass).trim() !== known.passcode) {
            fail(`Wrong passcode for ${code}`);
          } else {
            const s = localSession({ roomId: code, name, youId: myIdRef.current, events, words: known.words, limit: known.limit, isPrivate: known.private, mode: { kind: "words", count: Math.min(100, known.words.length) } });
            attachSession(s, code, { limit: known.limit, isPrivate: known.private, mode: { kind: "words", count: Math.min(100, known.words.length) } }, false);
            setPromptId(null); setPromptPass("");
          }
        } else fail("Room not found — check the code or ask the host for a fresh link");
      } else fail(msg);
    } finally { setBusy(false); }
  };

  const makeEvents = () => ({
    onRoster: (players: NetPlayer[], id: string) => { setRoster(players); setYouId(id); },
    onWords: (w: string[]) => setWords(w),
    onRoomInfo: (info: RoomInfo) => setRoomMeta(info), // host's real limit/mode — fixes stale guest meta
    onCountdown: (at: number) => {
      resetTyping();
      setStartsAt(at);
    },
    onRejected: (reason: string) => fail(reason),
    onHostLeft: () => { flash("Host left — standings frozen. You can export or leave."); },
    onDisconnected: () => { flash("Lost connection to host. Check your network, then rejoin."); },
    onError: (err: string) => flash(err),
    onMode: (m: "net" | "local") => setNetMode(m),
  });

  const tryJoinFromList = (room: Room) => {
    if (room.private && room.passcode) {
      if (promptId === room.id) joinByCode(room.id, promptPass);
      else { setPromptId(room.id); setPromptPass(""); setJoinError(null); }
    } else joinByCode(room.id, room.passcode);
  };

  /* ── countdown sync ── */
  useEffect(() => {
    if (startsAt === null) return;
    if (startsAt <= Date.now()) { // late join — go immediately
      setStartsAt(null); setCountdownN(null); setInRace(true);
      const now = Date.now(); setStartTime(now); setNowTick(now);
      setTimeout(() => inputRef.current?.focus(), 30);
      return;
    }
    setCountdownN(Math.max(1, Math.ceil((startsAt - Date.now()) / 1000)));
    const iv = window.setInterval(() => {
      const remain = startsAt - Date.now();
      if (remain <= 0) {
        window.clearInterval(iv);
        setStartsAt(null); setCountdownN(null); setInRace(true);
        const now = Date.now(); setStartTime(now); setNowTick(now);
        setTimeout(() => inputRef.current?.focus(), 30);
      } else setCountdownN(Math.ceil(remain / 1000));
    }, 100);
    return () => window.clearInterval(iv);
  }, [startsAt]);

  const leave = () => {
    sessionRef.current?.leave(); sessionRef.current = null;
    setActiveCode(null); setRoster([]); setWords([]); setRoomMeta(null);
    setStartsAt(null); setCountdownN(null);
    resetTyping(); setJoinError(null);
    const u = new URL(window.location.href);
    u.searchParams.delete("race");
    window.history.replaceState({}, "", u.toString());
  };

  /* ── bots (explicit solo practice, clearly labeled) ── */
  const realOthers = roster.filter((p) => p.id !== youId && !p.id.startsWith("bot")).length;
  useEffect(() => { if (realOthers > 0) setBots([]); }, [realOthers]);
  useEffect(() => {
    if (!inRace || bots.length === 0) return;
    const iv = window.setInterval(() => {
      setBots((prev) => prev.map((p) => ({ ...p, progress: Math.min(100, p.progress + Math.random() * 5 + 1.2), wpm: Math.max(0, p.wpm + (Math.random() - 0.5) * 1.5) })));
    }, 750);
    return () => window.clearInterval(iv);
  }, [inRace, bots.length]);
  const addBots = () => setBots(BOT_DEFS.map((b) => ({ id: b.id, name: b.id === "bot1" ? "Alex • 78 WPM" : "Sam • 64 WPM", progress: 0, wpm: b.base, finished: false })));

  /* ── typing ── */
  const pushSelf = useCallback((next: NetPlayer) => {
    setRoster((prev) => prev.map((p) => (p.id === next.id ? next : p)));
    sessionRef.current?.sendProgress(next.progress, next.wpm, next.finished, next.finishedAt);
  }, []);

  // keep session roster fresh even between keystrokes (name edits handled by re-create)
  const youRef = useRef<NetPlayer | null>(null);
  youRef.current = roster.find((p) => p.id === youId) ?? null;

  const handleInput = (val: string) => {
    if (!activeCode || !inRace || countdownN !== null) return;
    const now = Date.now();
    if (!startTime) setStartTime(now);
    if (val.endsWith(" ")) {
      const target = words[wordIdx] ?? "";
      const typed = input;
      if (typed.length === 0) { setInput(""); return; }
      let c = 0, ic = 0;
      for (let i = 0; i < Math.min(typed.length, target.length); i++) { if (typed[i] === target[i]) c++; else ic++; }
      const newCorrect = correctChars + c + 1;
      setCorrectChars(newCorrect);
      setWordStats((ws) => [...ws, { c, ic }]);
      setHistory((h) => [...h, typed]);
      setExtra((e) => { const copy = [...e]; copy[wordIdx] = typed.slice(target.length); return copy; });
      const nextIdx = wordIdx + 1;
      setWordIdx(nextIdx);
      setInput("");
      const elapsed = startTime ? (now - startTime) / 1000 : 1;
      const wpm = calcWpm(newCorrect, Math.max(0.5, elapsed));
      setLiveWpm(wpm);
      const prog = Math.min(100, (nextIdx / Math.max(1, words.length)) * 100);
      const fin = nextIdx >= words.length;
      const me: NetPlayer = { id: youId, name: sanitizeName(name), progress: fin ? 100 : prog, wpm, finished: fin, finishedAt: fin ? now : undefined };
      pushSelf(me);
      return;
    }
    const cur = words[wordIdx] ?? "";
    const next = val.length > cur.length + 7 ? val.slice(0, cur.length + 7) : val;
    // Last-letter finish in words races — same Monkeytype-parity rule as solo
    // tests: no trailing space needed, none counted.
    if (raceMode.kind === "words" && cur.length > 0 && wordIdx === words.length - 1 && next === cur) {
      const newCorrect = correctChars + cur.length;
      setCorrectChars(newCorrect);
      setWordStats((ws) => [...ws, { c: cur.length, ic: 0 }]);
      setHistory((h) => [...h, next]);
      setExtra((e) => { const copy = [...e]; copy[wordIdx] = ""; return copy; });
      setWordIdx(wordIdx + 1);
      setInput("");
      const elapsed2 = startTime ? (now - startTime) / 1000 : 1;
      const wpm2 = calcWpm(newCorrect, Math.max(0.5, elapsed2));
      setLiveWpm(wpm2);
      pushSelf({ id: youId, name: sanitizeName(name), progress: 100, wpm: wpm2, finished: true, finishedAt: now });
      return;
    }
    if (val.length > cur.length + 7) { setInput(next); return; }
    setInput(val);
    const prog = Math.min(100, ((wordIdx + val.length / (cur.length || 5)) / Math.max(1, words.length)) * 100);
    const elapsed = startTime ? (now - startTime) / 1000 : 1;
    const wpm = calcWpm(correctChars, Math.max(0.5, elapsed));
    setLiveWpm(wpm);
    const me: NetPlayer = { id: youId, name: sanitizeName(name), progress: prog, wpm, finished: false };
    pushSelf(me);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Backspace") return;
    if (e.ctrlKey || e.metaKey) {
      if (input.length > 0) { e.preventDefault(); setInput(""); }
      return;
    }
    if (input.length === 0 && wordIdx > 0) {
      e.preventDefault();
      const prevIdx = wordIdx - 1;
      const prevTyped = history[prevIdx] ?? "";
      const st = wordStats[prevIdx];
      if (st) setCorrectChars((x) => x - st.c - 1);
      setHistory((h) => h.slice(0, -1));
      setExtra((ex) => ex.slice(0, prevIdx));
      setWordStats((ws) => ws.slice(0, -1));
      setWordIdx(prevIdx);
      setInput(prevTyped);
    }
  };

  const shareLink = activeCode ? `${window.location.origin}${window.location.pathname}?race=${activeCode}` : "";
  const allPlayers = [...roster.map((p) => ({ ...p, isYou: p.id === youId })), ...bots.map((b) => ({ ...b, isYou: false }))];
  const sorted = [...allPlayers].sort((a, b) => b.progress - a.progress || (a.finishedAt ?? 9e15) - (b.finishedAt ?? 9e15));
  const you = roster.find((p) => p.id === youId);
  const finished = you?.finished;
  const allDone = roster.length > 0 && roster.every((p) => p.finished);
  const raceMode: RaceMode = useMemo(
    () => roomMeta?.mode ?? { kind: "words", count: words.length },
    // words.length only: the array identity churns on extension, mode must stay stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roomMeta],
  );
  const isTimeMode = raceMode.kind === "time";

  // Time mode: shared clock + auto-finish (same duration for everyone)
  useEffect(() => {
    if (!inRace || !isTimeMode || !startTime || raceMode.kind !== "time") return;
    const durationMs = raceMode.seconds * 1000;
    const iv = window.setInterval(() => {
      const now = Date.now();
      setNowTick(now);
      if (!timeUpRef.current && now - startTime >= durationMs) {
        timeUpRef.current = true;
        // Score the uncommitted partial word — same rule as solo tests.
        let addC = 0;
        const curW = words[wordIdx] ?? "";
        for (let i = 0; i < input.length && i < curW.length; i++) if (input[i] === curW[i]) addC++;
        const total = correctChars + addC;
        const elapsed = Math.max(0.5, (now - startTime) / 1000);
        const wpm = calcWpm(total, elapsed);
        setLiveWpm(wpm);
        const prog = Math.min(100, (wordIdx / Math.max(1, words.length)) * 100);
        pushSelf({ id: youId, name: sanitizeName(name), progress: prog, wpm, finished: true, finishedAt: now });
      }
    }, 250);
    return () => window.clearInterval(iv);
  }, [inRace, isTimeMode, startTime, raceMode, correctChars, wordIdx, words, words.length, youId, name, pushSelf, input]);

  const timeLeft = isTimeMode && startTime && raceMode.kind === "time"
    ? Math.max(0, Math.ceil((raceMode.seconds * 1000 - (nowTick - startTime)) / 1000))
    : null;

  useEffect(() => { if (inRace && countdownN === null) setTimeout(() => inputRef.current?.focus(), 40); }, [inRace, countdownN]);

  const inLobby = activeCode !== null && !inRace && startsAt === null;

  const copyShare = () => { try { navigator.clipboard.writeText(shareLink).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {}); } catch {} };

  /* ── in-race view ── */
  if (activeCode && (inRace || startsAt !== null)) {
    return (
      <div data-tour="race" className="w-full max-w-[740px] mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold tracking-widest uppercase flex items-center gap-2" style={{ color: "var(--text-dim)" }}>
            Race • {activeCode} • {roomMeta?.isPrivate ? "Private" : "Open"} • {roomMeta ? modeLabel(roomMeta.mode) : ""} • {finished ? "Finished" : "Live"} • {netMode === "net" ? "Online" : "Offline demo"}
            {countdownN !== null && <span className="px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: "var(--primary)", color: "var(--on-primary)" }}>{countdownN === 0 ? "GO!" : countdownN}</span>}
          </span>
          <button onClick={leave} className="text-[11px] font-medium px-2.5 py-1 rounded-md border" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-dim)" }}>Leave</button>
        </div>

        <div className="panel p-4 mb-4">
          <div className="text-[11px] font-semibold tracking-widest uppercase mb-3" style={{ color: "var(--text-dim)" }}>Live standings</div>
          <div className="space-y-2">
            {sorted.length === 0 ? (
              <div className="text-[12px] py-2" style={{ color: "var(--text-dim)" }}>Waiting for players… Share the link to invite.</div>
            ) : sorted.map((p, idx) => <StandingsRow key={p.id} p={p} rank={idx + 1} />)}
          </div>
          {allDone && sorted.length > 0 ? (
            <>
              <Podium top={sorted.slice(0, 3)} youId={youId} />
              <div className="mt-3 text-center">
                <button
                  onClick={() => {
                    const header = "rank,name,wpm,progress,finished\n";
                    const rows = sorted.map((p, i) => `${i + 1},${csvField(p.name)},${Math.round(p.wpm)},${Math.round(p.progress)},${p.finished}`).join("\n");
                    const blob = new Blob([header + rows], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a"); a.href = url; a.download = `race-${activeCode}-results.csv`; a.click(); URL.revokeObjectURL(url);
                  }}
                  className="h-7 px-3 rounded-md text-[11px] font-medium border"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-strong)" }}
                >
                  Export race CSV
                </button>
                <button onClick={leave} className="ml-2 h-7 px-3 rounded-md text-[11px] font-medium" style={{ background: "var(--text-strong)", color: "var(--bg)" }}>Back to races</button>
              </div>
            </>
          ) : finished ? (
            <div className="mt-4 p-3 rounded-md border text-center" style={{ background: "var(--bg-subtle)", borderColor: "var(--border)" }}>
              <span className="text-[13px] font-semibold" style={{ color: GOOD }}>Finished — {liveWpm} WPM ✓</span>
              <span className="block text-[11px] mt-1" style={{ color: "var(--text-dim)" }}>Waiting for others to finish — podium appears when everyone is done.</span>
            </div>
          ) : null}
        </div>

        <div className="panel p-4 relative">
          {startsAt !== null && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg" style={{ background: "color-mix(in srgb, var(--bg) 78%, transparent)", backdropFilter: "blur(2px)" }}>
              <span className="text-[48px] font-bold tracking-tighter" style={{ color: "var(--text-strong)" }}>{countdownN === 0 || countdownN === null ? "GO!" : countdownN}</span>
            </div>
          )}
          <div className="text-[11px] font-mono mb-3 flex items-center justify-between" style={{ color: "var(--text-dim)" }}>
            <span>{isTimeMode && timeLeft !== null ? `${timeLeft}s left • ` : ""}{wordIdx} / {raceMode.kind === "words" ? raceMode.count : words.length} words • {liveWpm} WPM {finished && "• Finished"}</span>
            <span>{startTime ? Math.round((Date.now() - startTime) / 1000) + "s" : "0s"}</span>
          </div>
          <div className="flex flex-wrap gap-x-1.5 gap-y-1 leading-relaxed select-none" style={{ fontFamily: "var(--font-mono)", fontSize: 17, lineHeight: 1.7 }}>
            {words.map((w, i) => {
              const isCurrent = i === wordIdx;
              const isPast = i < wordIdx;
              const past = history[i] ?? "";
              const isCorrect = isPast && past === w;
              const extraStr = isPast ? (extra[i] ?? "") : isCurrent ? input.slice(w.length) : "";
              return (
                <span key={i} className="px-1 rounded" style={{ background: isPast ? (isCorrect ? "rgba(16,185,129,0.10)" : "rgba(229,72,77,0.10)") : isCurrent ? "var(--bg-subtle)" : "transparent", borderBottom: isCurrent ? "1px solid var(--border-strong)" : "1px solid transparent", color: isPast ? (isCorrect ? GOOD : "var(--danger)") : isCurrent ? "var(--text-strong)" : "var(--text-faint)" }}>
                  <span>
                    {w.split("").map((ch, ci) => {
                      let cls = "";
                      if (isPast) cls = past[ci] === ch ? "" : "underline decoration-[var(--danger)] underline-offset-4";
                      else if (isCurrent && input[ci] !== undefined) cls = input[ci] === ch ? "text-[#10B981]" : "text-[var(--danger)] underline";
                      return <span key={ci} className={cls}>{ch}</span>;
                    })}
                  </span>
                  {extraStr && <span className="text-[var(--danger)] opacity-60 ml-0.5">{extraStr}</span>}
                </span>
              );
            })}
          </div>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!!finished || startsAt !== null}
            autoFocus
            autoCapitalize="off" autoComplete="off" autoCorrect="off" spellCheck={false}
            aria-label="race typing input"
            placeholder={finished ? "Race finished!" : startsAt !== null ? "Get ready…" : "Type here, space to next word"}
            className="mt-4 w-full h-10 rounded-md border px-3 text-[14px] disabled:opacity-60"
            style={{ background: "var(--bg-subtle)", borderColor: "var(--border)", color: "var(--text-strong)", fontFamily: "var(--font-mono)" }}
          />
          <div className="text-[11px] mt-2 flex items-center justify-between" style={{ color: "var(--text-dim)" }}>
            <span>{netMode === "net" ? "Live over peer-to-peer • updates ~4×/sec" : "Offline demo — same-device tabs only"}</span>
            <span className="hidden sm:inline font-mono">{wordIdx}/{words.length}</span>
          </div>
        </div>
      </div>
    );
  }

  /* ── lobby view (one dedicated screen — no hunting through lists) ── */
  if (inLobby) {
    const full = roster.length >= (roomMeta?.limit ?? 8);
    return (
      <div data-tour="race" className="w-full max-w-[740px] mx-auto px-4 py-6">
        <button onClick={leave} className="text-[11px] font-medium hover:underline mb-3" style={{ color: "var(--text-dim)" }}>← All races</button>
        {notice && <div className="text-[11px] px-3 py-2 rounded-md border mb-3" style={{ background: "var(--bg-subtle)", borderColor: "var(--border)", color: "var(--text-dim)" }}>{notice}</div>}
        <div className="panel p-5" style={{ background: "color-mix(in srgb, var(--primary) 5%, var(--bg-card))", borderColor: "var(--primary-border)" }}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-dim)" }}>{roomMeta?.isPrivate ? "Private room" : "Open race"} lobby</div>
              <div className="font-mono text-[28px] font-bold tracking-[0.2em] mt-1" style={{ color: "var(--text-strong)" }}>{activeCode}</div>
            </div>
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-full border" style={{ background: "var(--bg-card)", borderColor: full ? "var(--danger)" : "var(--border)", color: full ? "var(--danger)" : "var(--text-dim)" }}>
              {roster.length} / {roomMeta?.limit ?? 8} joined{full ? " • Full" : ""}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2 text-[11px]" style={{ color: "var(--text-dim)" }}>
            <span className="px-1.5 py-0.5 rounded border font-mono" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>{netMode === "net" ? "● Online" : "● Offline demo"}</span>
            <span className="px-1.5 py-0.5 rounded border font-mono" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>{roomMeta?.isPrivate ? "🔒 Passcode on" : "Open link"}</span>
            <span className="px-1.5 py-0.5 rounded border font-mono" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>{roomMeta ? modeLabel(roomMeta.mode) : `${words.length} words`}</span>
          </div>
          <div className="text-[11px] break-all font-mono p-2 rounded-md border mt-3" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-strong)" }}>{shareLink}</div>
          <div className="text-[11px] mt-1 font-mono truncate" style={{ color: "var(--text-faint)" }}>Text: {words.slice(0, 6).join(" ")}…</div>
          <div className="flex gap-2 mt-3 flex-wrap">
            <button onClick={copyShare} className="h-8 px-4 rounded-md text-[12px] font-medium border" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-strong)" }}>{copied ? "Copied!" : "Copy invite link"}</button>
            {(amHost || netMode === "local") && (
              <button onClick={() => sessionRef.current?.startRace()} title={full ? "Room is full — but you can still start with current players" : "Start the race for everyone"} className="h-8 px-4 rounded-md text-[12px] font-semibold" style={{ background: "var(--primary)", color: "var(--on-primary)" }}>Start race →</button>
            )}
            {realOthers === 0 && bots.length === 0 && (
              <button onClick={addBots} className="h-8 px-4 rounded-md text-[12px] font-medium border" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-dim)" }}>Practice vs bots 🤖</button>
            )}
          </div>
          <div className="text-[11px] mt-2" style={{ color: "var(--text-dim)" }}>
            {amHost ? "You're the host — everyone starts together on your countdown." : "Waiting for the host to start. Keep this tab open."}
          </div>
        </div>

        <div className="panel p-4 mt-3">
          <div className="text-[11px] font-semibold tracking-widest uppercase mb-3" style={{ color: "var(--text-dim)" }}>Players</div>
          <div className="space-y-1.5">
            {roster.length === 0 && <div className="text-[12px]" style={{ color: "var(--text-dim)" }}>Just you so far — share the invite link.</div>}
            {roster.map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-[12px] font-medium" style={{ color: p.id === youId ? "var(--text-strong)" : "var(--text-dim)" }}>
                <span className="w-2 h-2 rounded-full" style={{ background: p.id === youId ? "var(--primary)" : "var(--border-strong)" }} />
                <span className="truncate">{p.name}</span>
                {p.id === youId && <span className="text-[10px] font-mono px-1.5 py-px rounded border" style={{ borderColor: "var(--primary-border)", background: "var(--primary-soft)", color: "var(--primary)" }}>{amHost ? "HOST • YOU" : "YOU"}</span>}
              </div>
            ))}
          </div>
          <button onClick={leave} className="mt-4 text-[11px] font-medium hover:underline" style={{ color: "var(--text-dim)" }}>Leave room</button>
        </div>
      </div>
    );
  }

  /* ── discovery view (create / join / recent) ── */
  return (
    <div data-tour="race" className="w-full max-w-[740px] mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[15px] font-semibold tracking-tight" style={{ color: "var(--text-strong)" }}>Race</h2>
        <span className="text-[11px] font-mono px-2 py-1 rounded-md border" style={{ background: "var(--bg-muted)", borderColor: "var(--border)", color: "var(--text-dim)" }}>Real-time • peer-to-peer • no login</span>
      </div>

      {notice && <div className="text-[11px] px-3 py-2 rounded-md border mb-3" style={{ background: "var(--bg-subtle)", borderColor: "var(--border)", color: "var(--text-dim)" }}>{notice}</div>}

      <div className="panel p-4 mb-4 flex items-center gap-3">
        <Avatar name={name} avatarId={profileAvatar} size={36} />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-dim)" }}>Racing as</div>
          <div className="text-[14px] font-semibold truncate" style={{ color: "var(--text-strong)" }}>{name}</div>
        </div>
        <button onClick={() => window.dispatchEvent(new CustomEvent("typecheck:open-profile"))} className="h-7 px-3 rounded-md text-[11px] font-medium border shrink-0" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-dim)" }}>Edit profile</button>
      </div>

      <div className="flex p-0.5 rounded-md w-fit mb-4" style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}>
        <button onClick={() => setTab("free")} className="px-3 py-1.5 rounded-[5px] text-[12px] font-medium" style={{ background: tab === "free" ? "var(--bg-card)" : "transparent", color: tab === "free" ? "var(--text-strong)" : "var(--text-dim)", border: tab === "free" ? "1px solid var(--border-strong)" : "1px solid transparent" }}>Open race</button>
        <button onClick={() => setTab("private")} className="px-3 py-1.5 rounded-[5px] text-[12px] font-medium" style={{ background: tab === "private" ? "var(--bg-card)" : "transparent", color: tab === "private" ? "var(--text-strong)" : "var(--text-dim)", border: tab === "private" ? "1px solid var(--border-strong)" : "1px solid transparent" }}>Private room</button>
      </div>

      {tab === "free" ? (
        <div className="space-y-3">
          {joinError && <div className="text-[11px] px-3 py-2 rounded-md border" style={{ background: "color-mix(in srgb, var(--danger) 10%, var(--bg-card))", borderColor: "color-mix(in srgb, var(--danger) 30%, var(--border))", color: "var(--danger)" }}>{joinError}</div>}

          <div className="grid md:grid-cols-2 gap-3">
            {/* STEP 1 — create */}
            <div className="panel p-4 flex flex-col">
              <span className="text-[10px] font-bold tracking-widest font-mono px-1.5 py-0.5 rounded border w-fit" style={{ background: "var(--primary-soft)", borderColor: "var(--primary-border)", color: "var(--primary)" }}>STEP 1 • HOST</span>
              <div className="text-[13px] font-semibold mt-2" style={{ color: "var(--text-strong)" }}>Start a new race</div>
              <div className="text-[11px] mt-0.5 mb-3" style={{ color: "var(--text-dim)" }}>You become host • share the link to invite</div>
              <span className="text-[11px] font-medium mb-1.5" style={{ color: "var(--text-dim)" }}>Race type:</span>
              <div className="mb-3"><ModePicker mode={freeMode} onChange={setFreeMode} /></div>
              <span className="text-[11px] font-medium mb-1.5" style={{ color: "var(--text-dim)" }}>Max players (including you):</span>
              <div className="flex p-0.5 rounded-md w-fit mb-3" style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}>
                {[2, 4, 8, 16, 32].map((n) => (
                  <button key={n} onClick={() => setFreeLimit(n)} className="px-2.5 py-1 rounded-[5px] text-[11px] font-medium" style={{ background: freeLimit === n ? "var(--bg-card)" : "transparent", color: freeLimit === n ? "var(--text-strong)" : "var(--text-dim)", border: freeLimit === n ? "1px solid var(--border-strong)" : "1px solid transparent" }}>{n}</button>
                ))}
              </div>
              <button onClick={() => createRoom(false)} disabled={busy} className="mt-auto h-8 px-4 rounded-md text-[12px] font-semibold disabled:opacity-50" style={{ background: "var(--text-strong)", color: "var(--bg)" }}>{busy ? "Creating…" : "Create race →"}</button>
            </div>

            {/* STEP 2 — join */}
            <div className="panel p-4 flex flex-col">
              <span className="text-[10px] font-bold tracking-widest font-mono px-1.5 py-0.5 rounded border w-fit" style={{ background: "var(--bg-muted)", borderColor: "var(--border)", color: "var(--text-dim)" }}>STEP 2 • JOIN</span>
              <div className="text-[13px] font-semibold mt-2" style={{ color: "var(--text-strong)" }}>Join with a code</div>
              <div className="text-[11px] mt-0.5 mb-3" style={{ color: "var(--text-dim)" }}>Got an invite link? The code fills in automatically.</div>
              <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 12))} placeholder="CODE — e.g. X7K2PQ" className="w-full h-9 rounded-md border px-3 text-[14px] font-mono uppercase tracking-[0.2em] text-center mb-2" style={{ background: "var(--bg-subtle)", borderColor: "var(--border)", color: "var(--text-strong)" }} />
              <input value={joinPass} onChange={(e) => setJoinPass(e.target.value)} placeholder="Passcode — only for 🔒 rooms" type="password" className="w-full h-8 rounded-md border px-3 text-[12px] mb-3" style={{ background: "var(--bg-subtle)", borderColor: "var(--border)", color: "var(--text-strong)" }} />
              <button onClick={() => joinByCode(joinCode, joinPass)} disabled={busy} className="mt-auto h-8 px-4 rounded-md text-[12px] font-semibold border disabled:opacity-50" style={{ background: "var(--primary)", borderColor: "var(--primary)", color: "var(--on-primary)" }}>{busy ? "Joining…" : "Join race →"}</button>
            </div>
          </div>

          <div className="panel p-4">
            <div className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-dim)" }}>Recent rooms on this device</div>
            <div className="text-[11px] mt-0.5 mb-3" style={{ color: "var(--text-faint)" }}>Rooms you created or joined — tap Join to re-enter.</div>

          {rooms.length === 0 ? (
            <div className="py-6 text-center rounded-md border border-dashed" style={{ borderColor: "var(--border)", background: "var(--bg-subtle)" }}>
              <div className="text-[13px] font-medium" style={{ color: "var(--text-strong)" }}>No rooms yet</div>
              <div className="text-[11px] mt-1" style={{ color: "var(--text-dim)" }}>Use Step 1 above to host your first race.</div>
            </div>
          ) : (
            <div className="space-y-2">
            {rooms.map((r) => (
              <div key={r.id} className="panel p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[12px]" style={{ color: r.private ? "var(--warning)" : "var(--success)" }}>{r.private ? "🔒" : "●"}</span>
                    <span className="font-mono text-[13px] font-medium truncate" style={{ color: "var(--text-strong)" }}>{r.id}</span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded border font-mono" style={{ background: "var(--bg-muted)", borderColor: "var(--border)", color: "var(--text-dim)" }}>{r.private ? "Private" : "Public"} • limit {r.limit} • {new Date(r.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <button onClick={() => tryJoinFromList(r)} disabled={busy} className="h-7 px-3 rounded-md text-[12px] font-medium border shrink-0 disabled:opacity-50" style={{ background: r.private ? "var(--primary-soft)" : "var(--bg-card)", borderColor: r.private ? "var(--primary-border)" : "var(--border)", color: r.private ? "var(--primary)" : "var(--text-strong)" }}>{promptId === r.id && r.private ? "Unlock →" : r.private ? "Join (locked)" : "Join"}</button>
                </div>
                {promptId === r.id && r.private && (
                  <div className="mt-3 flex items-center gap-2">
                    <input autoFocus value={promptPass} onChange={(e) => setPromptPass(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") tryJoinFromList(r); }} placeholder="Enter passcode" type="password" className="flex-1 h-8 rounded-md border px-3 text-[12px]" style={{ background: "var(--bg-subtle)", borderColor: "var(--border)", color: "var(--text-strong)" }} />
                    <button onClick={() => tryJoinFromList(r)} disabled={busy} className="h-8 px-3 rounded-md text-[12px] font-medium disabled:opacity-50" style={{ background: "var(--primary)", color: "var(--on-primary)" }}>Unlock</button>
                    <button onClick={() => { setPromptId(null); setPromptPass(""); }} className="h-8 px-2 rounded-md text-[11px] border" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-dim)" }}>Cancel</button>
                  </div>
                )}
                <div className="text-[11px] mt-1 font-mono truncate" style={{ color: "var(--text-faint)" }}>{r.words.slice(0, 5).join(" ")}… • {r.words.length} words</div>
              </div>
            ))}
            </div>
          )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="panel p-4">
            <div className="text-[11px] font-semibold tracking-widest uppercase mb-2" style={{ color: "var(--text-dim)" }}>Assignment (classroom) — optional</div>
            <textarea value={assignmentText} onChange={(e) => setAssignmentText(e.target.value)} placeholder="Paste assignment passage (e.g., hiring test text). Leave empty for random 50 words — guests receive your exact text." className="w-full min-h-[64px] rounded-md border p-2 text-[12px] resize-y" style={{ background: "var(--bg-subtle)", borderColor: "var(--border)", color: "var(--text-strong)", fontFamily: "var(--font-mono)" }} />
            <div className="text-[11px] mt-1 font-mono" style={{ color: "var(--text-faint)" }}>{assignmentText.trim() ? `${assignmentText.trim().split(/\s+/).filter(Boolean).length} words • sent to all guests` : "Empty = random words"}</div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="panel p-4 flex flex-col">
              <span className="text-[10px] font-bold tracking-widest font-mono px-1.5 py-0.5 rounded border w-fit" style={{ background: "var(--primary-soft)", borderColor: "var(--primary-border)", color: "var(--primary)" }}>STEP 1 • HOST</span>
              <div className="text-[13px] font-semibold mt-2" style={{ color: "var(--text-strong)" }}>Create a private room</div>
              <div className="text-[11px] mt-0.5 mb-3" style={{ color: "var(--text-dim)" }}>Only players with your passcode get in.</div>
              <span className="text-[11px] font-medium mb-1.5" style={{ color: "var(--text-dim)" }}>Race type:</span>
              <div className="mb-3"><ModePicker mode={privateMode} onChange={setPrivateMode} /></div>
              <span className="text-[11px] font-medium mb-1.5" style={{ color: "var(--text-dim)" }}>Max players (including you):</span>
              <div className="flex p-0.5 rounded-md w-fit mb-3" style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}>
                {[2, 4, 8, 16, 32].map((n) => (
                  <button key={n} onClick={() => setPrivateLimit(n)} className="px-2.5 py-1 rounded-[5px] text-[11px] font-medium" style={{ background: privateLimit === n ? "var(--bg-card)" : "transparent", color: privateLimit === n ? "var(--text-strong)" : "var(--text-dim)", border: privateLimit === n ? "1px solid var(--border-strong)" : "1px solid transparent" }}>{n}</button>
                ))}
              </div>
              <input value={privatePasscode} onChange={(e) => setPrivatePasscode(e.target.value)} placeholder="Set passcode (min 3 chars)" type="password" className="w-full h-8 rounded-md border px-3 text-[12px] mb-3" style={{ background: "var(--bg-subtle)", borderColor: "var(--border)", color: "var(--text-strong)" }} />
              <button onClick={() => createRoom(true)} disabled={busy} className="mt-auto h-8 px-4 rounded-md text-[12px] font-semibold disabled:opacity-50" style={{ background: "var(--text-strong)", color: "var(--bg)" }}>{busy ? "Creating…" : "Create private room →"}</button>
            </div>
            <div className="panel p-4 flex flex-col">
              <span className="text-[10px] font-bold tracking-widest font-mono px-1.5 py-0.5 rounded border w-fit" style={{ background: "var(--bg-muted)", borderColor: "var(--border)", color: "var(--text-dim)" }}>STEP 2 • JOIN</span>
              <div className="text-[13px] font-semibold mt-2" style={{ color: "var(--text-strong)" }}>Join a private room</div>
              <div className="text-[11px] mt-0.5 mb-3" style={{ color: "var(--text-dim)" }}>Enter the code + passcode from your friend.</div>
              <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 12))} placeholder="CODE — e.g. X7K2PQ" className="w-full h-9 rounded-md border px-3 text-[14px] font-mono uppercase tracking-[0.2em] text-center mb-2" style={{ background: "var(--bg-subtle)", borderColor: "var(--border)", color: "var(--text-strong)" }} />
              <input value={joinPass} onChange={(e) => setJoinPass(e.target.value)} placeholder="Passcode" type="password" className="w-full h-8 rounded-md border px-3 text-[12px] mb-3" style={{ background: "var(--bg-subtle)", borderColor: "var(--border)", color: "var(--text-strong)" }} />
              <button onClick={() => joinByCode(joinCode, joinPass)} disabled={busy} className="mt-auto h-8 px-4 rounded-md text-[12px] font-semibold border disabled:opacity-50" style={{ background: "var(--primary)", borderColor: "var(--primary)", color: "var(--on-primary)" }}>{busy ? "Joining…" : "Join room →"}</button>
            </div>
          </div>
          {joinError && <div className="text-[11px] px-3 py-2 rounded-md border" style={{ background: "color-mix(in srgb, var(--danger) 10%, transparent)", borderColor: "var(--danger)", color: "var(--danger)" }}>{joinError}</div>}
        </div>
      )}
    </div>
  );
}
