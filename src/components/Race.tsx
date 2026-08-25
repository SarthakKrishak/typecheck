import { useEffect, useState, useRef, useCallback } from "react";
import { generateWords } from "../data/words";
import { calcWpm } from "../engine/stats";

type Participant = { id: string; name: string; progress: number; wpm: number; finished: boolean; finishedAt?: number; isYou?: boolean };
type Room = { id: string; words: string[]; createdAt: number; private: boolean; limit: number; passcode?: string; ownerId?: string };

const ROOM_KEY = "typecraft_race_rooms_v1";

function getRooms(): Room[] {
  try {
    const raw = JSON.parse(localStorage.getItem(ROOM_KEY) || "[]") as Room[];
    // migrate old rooms without limit/passcode
    return raw.map((r) => ({
      ...r,
      limit: (r as unknown as { limit?: number }).limit ?? 8,
      passcode: (r as unknown as { passcode?: string }).passcode,
      ownerId: (r as unknown as { ownerId?: string }).ownerId,
    }));
  } catch { return []; }
}
function saveRoom(room: Room) {
  const rooms = getRooms();
  if (rooms.find((r) => r.id === room.id)) return;
  rooms.unshift(room);
  localStorage.setItem(ROOM_KEY, JSON.stringify(rooms.slice(0, 24)));
}

function genRoomWords(seed: string) {
  let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const rnd = () => (h = (h * 1664525 + 1013904223) >>> 0) / 0xffffffff;
  const base = generateWords(50, { punctuation: false, numbers: false });
  return [...base].sort(() => rnd() - 0.5);
}

export function RaceSection() {
  const [tab, setTab] = useState<"free" | "private">("free");
  const [rooms, setRooms] = useState<Room[]>(() => getRooms());
  const [activeRoom, setActiveRoom] = useState<Room | null>(() => {
    try {
      const url = new URLSearchParams(window.location.search);
      const code = url.get("race")?.trim().toUpperCase();
      if (code) {
        const found = getRooms().find((r) => r.id === code);
        if (found) return found;
        return { id: code, words: genRoomWords(code), createdAt: Date.now(), private: true, limit: 8 };
      }
    } catch {}
    return null;
  });
  const [joinCode, setJoinCode] = useState("");
  const [joinPass, setJoinPass] = useState("");
  const [name, setName] = useState(() => {
    try { return localStorage.getItem("typecraft_name") || "You"; } catch { return "You"; }
  });
  const [inRace, setInRace] = useState(false);
  const [assignmentText, setAssignmentText] = useState("");
  const [freeLimit, setFreeLimit] = useState<number>(8);
  const [privateLimit, setPrivateLimit] = useState<number>(4);
  const [privatePasscode, setPrivatePasscode] = useState("");
  const [promptId, setPromptId] = useState<string | null>(null);
  const [promptPass, setPromptPass] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [wordIdx, setWordIdx] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [extra, setExtra] = useState<string[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [liveWpm, setLiveWpm] = useState(0);
  const [correctChars, setCorrectChars] = useState(0);
  const [wordStats, setWordStats] = useState<{ c: number; ic: number }[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [copied, setCopied] = useState(false);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const myIdRef = useRef<string>(Math.random().toString(36).slice(2, 7).toUpperCase());

  const words = activeRoom?.words ?? [];

  // keep rooms in sync across tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === ROOM_KEY) setRooms(getRooms()); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => { try { localStorage.setItem("typecraft_name", name); } catch {} }, [name]);

  // BroadcastChannel lifecycle
  useEffect(() => {
    if (!activeRoom) return;
    // always have a channel for lobby sync, not only inRace
    const ch = new BroadcastChannel(`race-${activeRoom.id}`);
    channelRef.current = ch;
    const onMsg = (e: MessageEvent) => {
      const data = e.data as { type: "join" | "update" | "leave"; payload: Participant };
      // Validate incoming message shape — reject malformed/foreign messages
      if (!data || typeof data !== "object" || !data.type || !data.payload) return;
      if (!["join", "update", "leave"].includes(data.type)) return;
      const p = data.payload;
      if (typeof p.id !== "string" || typeof p.name !== "string" || typeof p.progress !== "number" || typeof p.wpm !== "number") return;
      if (p.id === myIdRef.current) return; // ignore echo
      if (p.name.length > 24) return; // reject overly long names
      if (p.progress < 0 || p.progress > 100) return;
      if (data.type === "join") {
        setParticipants((prev) => (prev.find((p) => p.id === data.payload.id) ? prev : [...prev, data.payload]));
      } else if (data.type === "update") {
        setParticipants((prev) => {
          const idx = prev.findIndex((p) => p.id === data.payload.id);
          if (idx === -1) return [...prev, data.payload];
          const copy = [...prev]; copy[idx] = data.payload; return copy;
        });
      } else if (data.type === "leave") {
        setParticipants((prev) => prev.filter((p) => p.id !== data.payload.id));
      }
    };
    ch.addEventListener("message", onMsg);
    const me: Participant = { id: myIdRef.current, name, progress: inRace ? 0 : 0, wpm: liveWpm, finished: false, isYou: true };
    // announce presence in lobby
    ch.postMessage({ type: "join", payload: me });
    setParticipants((prev) => {
      const exists = prev.find((p) => p.id === me.id);
      if (exists) return prev.map((p) => (p.id === me.id ? { ...p, name } : p));
      return [...prev, me];
    });
    return () => { 
      ch.postMessage({ type: "leave", payload: me });
      ch.close(); 
      channelRef.current = null; 
    };
  }, [activeRoom, inRace, name, liveWpm]);

  // bots only when inRace and alone (keep lobby clean)
  useEffect(() => {
    if (!inRace || !activeRoom) return;
    if (participants.filter((p) => !p.id.startsWith("bot")).length > 1) return;
    // add 2 bots if only you
    if (participants.length <= 1) {
      const bots: Participant[] = [
        { id: "bot1", name: "Alex â€¢ 78 WPM", progress: 0, wpm: 78, finished: false },
        { id: "bot2", name: "Sam â€¢ 64 WPM", progress: 0, wpm: 64, finished: false },
      ];
      setParticipants((prev) => [...prev, ...bots]);
    }
    const iv = setInterval(() => {
      setParticipants((prev) => prev.map((p) => (p.id.startsWith("bot") ? { ...p, progress: Math.min(100, p.progress + Math.random() * 5 + 1.2), wpm: p.wpm + (Math.random() - 0.5) * 1.5 } : p)));
    }, 750);
    return () => clearInterval(iv);
  }, [inRace, activeRoom, participants]);

  const broadcast = useCallback((p: Participant) => {
    channelRef.current?.postMessage({ type: "update", payload: p });
  }, []);

  const createRoom = (isPrivate: boolean) => {
    const limit = isPrivate ? privateLimit : freeLimit;
    const passcode = isPrivate ? privatePasscode.trim() : undefined;
    if (isPrivate && !passcode) { setJoinError("Set a passcode for private room"); setTimeout(() => setJoinError(null), 2500); return; }
    if (passcode && passcode.length < 3) { setJoinError("Passcode at least 3 chars"); setTimeout(() => setJoinError(null), 2500); return; }
    const id = Math.random().toString(36).slice(2, 8).toUpperCase();
    const w = assignmentText.trim() && assignmentText.trim().split(/\s+/).filter(Boolean).length >= 5
      ? assignmentText.trim().split(/\s+/).slice(0, 50)
      : genRoomWords(id);
    const room: Room = { id, words: w, createdAt: Date.now(), private: isPrivate, limit, passcode: passcode || undefined, ownerId: myIdRef.current };
    saveRoom(room);
    setRooms(getRooms());
    setActiveRoom(room);
    setInRace(false);
    setWordIdx(0); setInput(""); setHistory([]); setExtra([]); setWordStats([]); setCorrectChars(0); setLiveWpm(0);
    setJoinError(null);
    const url = new URL(window.location.href);
    url.searchParams.set("race", id);
    window.history.replaceState({}, "", url.toString());
    navigator.clipboard.writeText(url.toString()).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }).catch(() => {});
    if (isPrivate) setPrivatePasscode("");
  };

  const joinRoom = (id: string, pass?: string) => {
    const clean = id.trim().toUpperCase();
    if (!clean || clean.length < 3) return;
    let room = getRooms().find((r) => r.id === clean);
    if (!room) {
      // ephemeral â€” treat as private with no passcode check (or use provided pass as its passcode)
      room = { id: clean, words: genRoomWords(clean), createdAt: Date.now(), private: true, limit: 8, passcode: pass?.trim() || undefined };
      saveRoom(room);
      setRooms(getRooms());
    } else if (room.private && room.passcode) {
      const attempt = (pass ?? joinPass ?? promptPass ?? "").trim();
      if (attempt !== room.passcode) {
        setJoinError(`Wrong passcode for ${clean}`);
        setTimeout(() => setJoinError(null), 2500);
        return;
      }
    }
    // limit check â€” simple local check based on current participants for this room
    // (cross-tab count via BroadcastChannel will show full after join, but we check here optimistically)
    // allow join, limit enforced after join via lobby display
    setActiveRoom(room);
    setInRace(false);
    setWordIdx(0); setInput(""); setHistory([]); setExtra([]); setWordStats([]); setCorrectChars(0); setLiveWpm(0);
    setJoinError(null); setPromptId(null); setPromptPass("");
    const url = new URL(window.location.href);
    url.searchParams.set("race", clean);
    window.history.replaceState({}, "", url.toString());
  };

  const tryJoinFromList = (room: Room) => {
    if (room.private && room.passcode) {
      if (promptId === room.id) {
        // second click â†’ verify
        joinRoom(room.id, promptPass);
      } else {
        setPromptId(room.id);
        setPromptPass("");
        setJoinError(null);
      }
    } else {
      // public or private without passcode
      joinRoom(room.id);
    }
  };

  const doStart = () => {
    // 3-2-1 countdown
    setCountdown(3);
    setWordIdx(0); setInput(""); setHistory([]); setExtra([]); setWordStats([]); setCorrectChars(0); setLiveWpm(0); setStartTime(null);
    let n = 3;
    const iv = setInterval(() => {
      n -= 1;
      if (n > 0) setCountdown(n);
      else if (n === 0) { setCountdown(0); }
      else { clearInterval(iv); setCountdown(null); setInRace(true); setStartTime(Date.now()); setTimeout(() => inputRef.current?.focus(), 30); }
    }, 700);
  };

  const leave = () => {
    const me: Participant = { id: myIdRef.current, name, progress: 0, wpm: liveWpm, finished: false, isYou: true };
    channelRef.current?.postMessage({ type: "leave", payload: me });
    setInRace(false);
    setActiveRoom(null);
    setWordIdx(0); setInput(""); setHistory([]); setExtra([]); setWordStats([]); setCorrectChars(0); setLiveWpm(0); setStartTime(null); setCountdown(null);
    const u = new URL(window.location.href);
    u.searchParams.delete("race");
    window.history.replaceState({}, "", u.toString());
    setParticipants((prev) => prev.filter((p) => !p.isYou));
  };

  const handleInput = (val: string) => {
    if (!activeRoom || !inRace) return;
    if (!startTime) setStartTime(Date.now());
    // space â†’ commit word
    if (val.endsWith(" ")) {
      const target = words[wordIdx] ?? "";
      const typed = input;
      // allow empty space? ignore
      if (typed.length === 0) { setInput(""); return; }
      let c = 0, ic = 0;
      for (let i = 0; i < Math.min(typed.length, target.length); i++) if (typed[i] === target[i]) c++; else ic++;
      const newCorrect = correctChars + c + 1; // + space
      setCorrectChars(newCorrect);
      setWordStats((ws) => [...ws, { c, ic }]);
      setHistory((h) => [...h, typed]);
      setExtra((e) => { const copy = [...e]; copy[wordIdx] = typed.slice(target.length); return copy; });
      const nextIdx = wordIdx + 1;
      setWordIdx(nextIdx);
      setInput("");
      const elapsed = startTime ? (Date.now() - startTime) / 1000 : 1;
      const wpm = calcWpm(newCorrect, elapsed);
      setLiveWpm(wpm);
      const prog = Math.min(100, (nextIdx / words.length) * 100);
      const finished = nextIdx >= words.length;
      const me: Participant = { id: myIdRef.current, name, progress: finished ? 100 : prog, wpm, finished, finishedAt: finished ? Date.now() : undefined, isYou: true };
      setParticipants((prev) => prev.map((p) => (p.id === me.id ? me : p)));
      broadcast(me);
      if (finished) {
        // keep inRace true to show finish, but input disabled
      }
      return;
    }
    // handle backspace to previous word (if at word start and empty)
    // This is handled via keyDown below, here just update input
    const cur = words[wordIdx] ?? "";
    if (val.length > cur.length + 7) { setInput(val.slice(0, cur.length + 7)); return; }
    setInput(val);
    // live partial progress + wpm
    const prog = Math.min(100, ((wordIdx + val.length / (cur.length || 5)) / words.length) * 100);
    const elapsed = startTime ? (Date.now() - startTime) / 1000 : 1;
    const wpm = calcWpm(correctChars, elapsed);
    setLiveWpm(wpm);
    const me: Participant = { id: myIdRef.current, name, progress: prog, wpm, finished: false, isYou: true };
    broadcast(me);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Backspace") return;
    const isCtrl = e.ctrlKey || e.metaKey;
    if (isCtrl) {
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

  const shareLink = activeRoom ? `${window.location.origin}${window.location.pathname}?race=${activeRoom.id}` : "";
  const sorted = [...participants].sort((a, b) => b.progress - a.progress || (a.finishedAt ?? 9e15) - (b.finishedAt ?? 9e15));
  const you = participants.find((p) => p.isYou);
  const finished = you?.finished;
  const winner = sorted[0];

  // auto-focus input when race starts
  useEffect(() => { if (inRace && !countdown) setTimeout(() => inputRef.current?.focus(), 40); }, [inRace, countdown]);

  if (activeRoom && inRace) {
    return (
      <div data-tour="race" className="w-full max-w-[740px] mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold tracking-widest uppercase flex items-center gap-2" style={{ color: "var(--text-dim)" }}>
            Race â€¢ {activeRoom.id} â€¢ {activeRoom.private ? "Private" : "Free"} â€¢ {finished ? "Finished" : "Live"}
            {countdown !== null && <span className="px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: "var(--primary)", color: "white" }}>{countdown === 0 ? "GO!" : countdown}</span>}
          </span>
          <button onClick={leave} className="text-[11px] font-medium px-2.5 py-1 rounded-md border" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-dim)" }}>Leave</button>
        </div>

        <div className="panel p-4 mb-4">
          <div className="text-[11px] font-semibold tracking-widest uppercase mb-3" style={{ color: "var(--text-dim)" }}>Live standings</div>
          <div className="space-y-2">
            {sorted.length === 0 ? (
              <div className="text-[12px] py-2" style={{ color: "var(--text-dim)" }}>Waiting for playersâ€¦ Share the link to invite.</div>
            ) : sorted.map((p, idx) => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="text-[11px] font-mono w-7" style={{ color: "var(--text-faint)" }}>#{idx + 1}</span>
                <span className="text-[11px] font-mono w-14" style={{ color: p.isYou ? "var(--primary)" : "var(--text-dim)" }}>{Math.round(p.wpm)} WPM</span>
                <div className="flex-1 h-2.5 rounded-full overflow-hidden relative" style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}>
                  <div className="h-full transition-all duration-300" style={{ width: `${p.progress}%`, background: p.isYou ? "var(--primary)" : p.finished ? "var(--success)" : "var(--border-strong)" }} />
                  {p.isYou && <span className="absolute inset-y-0 w-0.5" style={{ left: `${p.progress}%`, background: "white", opacity: 0.6 }} />}
                </div>
                <span className="text-[12px] font-medium min-w-[110px] text-right truncate flex items-center justify-end gap-1" style={{ color: p.isYou ? "var(--text-strong)" : "var(--text-dim)" }}>
                  {p.name} {p.finished && <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--success)" }} />}
                </span>
                <span className="text-[11px] font-mono w-10 text-right" style={{ color: "var(--text-faint)" }}>{Math.round(p.progress)}%</span>
              </div>
            ))}
          </div>
          {finished && winner && (
            <div className="mt-4 p-3 rounded-md border text-center" style={{ background: winner.isYou ? "var(--primary-soft)" : "var(--bg-subtle)", borderColor: winner.isYou ? "var(--primary-border)" : "var(--border)" }}>
              <span className="text-[13px] font-semibold" style={{ color: "var(--text-strong)" }}>
                {winner.isYou ? "Victory — first place" : `First place: ${winner.name} · ${Math.round(winner.wpm)} WPM`}
              </span>
              <span className="block text-[11px] mt-1" style={{ color: "var(--text-dim)" }}>{finished ? "Race complete â€” you can leave or start a new race." : ""}</span>
              <button
                onClick={() => {
                  const header = "rank,name,wpm,progress,finished\n";
                  const rows = sorted.map((p, i) => `${i + 1},"${p.name}",${Math.round(p.wpm)},${Math.round(p.progress)},${p.finished}`).join("\n");
                  const blob = new Blob([header + rows], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a"); a.href = url; a.download = `race-${activeRoom.id}-results.csv`; a.click(); URL.revokeObjectURL(url);
                }}
                className="mt-2 h-7 px-3 rounded-md text-[11px] font-medium border"
                style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-strong)" }}
              >
                Export race CSV (per-student)
              </button>
            </div>
          )}
        </div>

        <div className="panel p-4 relative">
          {countdown !== null && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg" style={{ background: "color-mix(in srgb, var(--bg) 78%, transparent)", backdropFilter: "blur(2px)" }}>
              <span className="text-[48px] font-bold tracking-tighter" style={{ color: "var(--text-strong)" }}>{countdown === 0 ? "GO!" : countdown}</span>
            </div>
          )}
          <div className="text-[11px] font-mono mb-3 flex items-center justify-between" style={{ color: "var(--text-dim)" }}>
            <span>{wordIdx} / {words.length} words â€¢ {liveWpm} WPM {finished && "â€¢ Finished"}</span>
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
                <span key={i} className="px-1 rounded" style={{ background: isPast ? (isCorrect ? "transparent" : "rgba(229,72,77,0.10)") : isCurrent ? "var(--bg-subtle)" : "transparent", borderBottom: isCurrent ? "1px solid var(--border-strong)" : "1px solid transparent", color: isPast ? (isCorrect ? "var(--text-strong)" : "var(--danger)") : isCurrent ? "var(--text-strong)" : "var(--text-faint)", opacity: isPast && !isCorrect ? 1 : 1 }}>
                  <span>
                    {w.split("").map((ch, ci) => {
                      let cls: string = "";
                      if (isPast) cls = past[ci] === ch ? "" : "underline decoration-[var(--danger)] underline-offset-4";
                      else if (isCurrent && input[ci] !== undefined) cls = input[ci] === ch ? "text-[var(--text-strong)]" : "text-[var(--danger)] underline";
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
            disabled={!!finished || countdown !== null}
            autoFocus
            placeholder={finished ? "Race finished!" : countdown !== null ? "Get readyâ€¦" : "Type here, space to next word"}
            className="mt-4 w-full h-10 rounded-md border px-3 text-[14px] disabled:opacity-60"
            style={{ background: "var(--bg-subtle)", borderColor: "var(--border)", color: "var(--text-strong)", fontFamily: "var(--font-mono)" }}
          />
          <div className="text-[11px] mt-2 flex items-center justify-between" style={{ color: "var(--text-dim)" }}>
            <span>Progress syncs live to other tabs with same link â€¢ BroadcastChannel (no server)</span>
            <span className="hidden sm:inline font-mono">{wordIdx}/{words.length}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-tour="race" className="w-full max-w-[740px] mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[15px] font-semibold tracking-tight" style={{ color: "var(--text-strong)" }}>Race</h2>
        <span className="text-[11px] font-mono px-2 py-1 rounded-md border" style={{ background: "var(--bg-muted)", borderColor: "var(--border)", color: "var(--text-dim)" }}>Free & Private rooms â€¢ Cross-tab live</span>
      </div>

      <div className="flex p-0.5 rounded-md w-fit mb-4" style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}>
        <button onClick={() => setTab("free")} className="px-3 py-1.5 rounded-[5px] text-[12px] font-medium" style={{ background: tab === "free" ? "var(--bg-card)" : "transparent", color: tab === "free" ? "var(--text-strong)" : "var(--text-dim)", border: tab === "free" ? "1px solid var(--border-strong)" : "1px solid transparent" }}>Free races</button>
        <button onClick={() => setTab("private")} className="px-3 py-1.5 rounded-[5px] text-[12px] font-medium" style={{ background: tab === "private" ? "var(--bg-card)" : "transparent", color: tab === "private" ? "var(--text-strong)" : "var(--text-dim)", border: tab === "private" ? "1px solid var(--border-strong)" : "1px solid transparent" }}>Private room</button>
      </div>

      {tab === "free" ? (
        <div className="space-y-3">
          <div className="panel p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[13px] font-medium" style={{ color: "var(--text-strong)" }}>Public race</div>
                <div className="text-[11px] mt-0.5" style={{ color: "var(--text-dim)" }}>Visible to anyone â€¢ 50 words â€¢ Owner sets limit</div>
              </div>
              <span className="text-[11px] font-mono px-2 py-1 rounded-md border" style={{ background: "var(--bg-muted)", borderColor: "var(--border)", color: "var(--text-dim)" }}>limit {freeLimit} â€¢ visible</span>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-[11px] font-medium" style={{ color: "var(--text-dim)" }}>Limit:</span>
              <div className="flex p-0.5 rounded-md" style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}>
                {[2, 4, 8, 16, 32].map((n) => (
                  <button key={n} onClick={() => setFreeLimit(n)} className="px-2.5 py-1 rounded-[5px] text-[11px] font-medium" style={{ background: freeLimit === n ? "var(--bg-card)" : "transparent", color: freeLimit === n ? "var(--text-strong)" : "var(--text-dim)", border: freeLimit === n ? "1px solid var(--border-strong)" : "1px solid transparent" }}>{n}</button>
                ))}
              </div>
              <button onClick={() => createRoom(false)} className="ml-auto h-8 px-4 rounded-md text-[12px] font-medium" style={{ background: "var(--text-strong)", color: "var(--bg)" }}>Create public race</button>
            </div>
          </div>

          {joinError && <div className="text-[11px] px-3 py-2 rounded-md border" style={{ background: "color-mix(in srgb, var(--danger) 10%, var(--bg-card))", borderColor: "color-mix(in srgb, var(--danger) 30%, var(--border))", color: "var(--danger)" }}>{joinError}</div>}

          {rooms.length === 0 ? (
            <div className="panel p-8 text-center border-dashed" style={{ borderColor: "var(--border)" }}>
              <div className="text-[13px] font-medium" style={{ color: "var(--text-strong)" }}>No rooms yet</div>
              <div className="text-[11px] mt-1" style={{ color: "var(--text-dim)" }}>Public and private rooms appear here. Private needs passcode to join.</div>
            </div>
          ) : (
            rooms.map((r) => (
              <div key={r.id} className="panel p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[12px]" style={{ color: r.private ? "var(--warning)" : "var(--success)" }}>{r.private ? "LOCKED" : "OPEN"}</span>
                    <span className="font-mono text-[13px] font-medium truncate" style={{ color: "var(--text-strong)" }}>{r.id}</span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded border font-mono" style={{ background: "var(--bg-muted)", borderColor: "var(--border)", color: "var(--text-dim)" }}>{r.private ? "Private" : "Public"} â€¢ limit {r.limit} â€¢ {new Date(r.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    {r.passcode && <span className="hidden sm:inline text-[11px] font-mono px-1.5 py-0.5 rounded" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-faint)" }}>passcode set</span>}
                  </div>
                  <span className="text-[11px] font-mono hidden md:inline" style={{ color: "var(--text-faint)" }}>{r.words.slice(0, 2).join(" ")}â€¦</span>
                  <button onClick={() => tryJoinFromList(r)} className="h-7 px-3 rounded-md text-[12px] font-medium border shrink-0" style={{ background: r.private ? "var(--primary-soft)" : "var(--bg-card)", borderColor: r.private ? "var(--primary-border)" : "var(--border)", color: r.private ? "var(--primary)" : "var(--text-strong)" }}>{r.private ? "LOCKED" : "OPEN"}</button>
                </div>
                {promptId === r.id && r.private && (
                  <div className="mt-3 flex items-center gap-2">
                    <input autoFocus value={promptPass} onChange={(e) => setPromptPass(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") tryJoinFromList(r); }} placeholder="Enter passcode" className="flex-1 h-8 rounded-md border px-3 text-[12px]" style={{ background: "var(--bg-subtle)", borderColor: "var(--border)", color: "var(--text-strong)" }} />
                    <button onClick={() => tryJoinFromList(r)} className="h-8 px-3 rounded-md text-[12px] font-medium" style={{ background: "var(--primary)", color: "white" }}>Unlock</button>
                    <button onClick={() => { setPromptId(null); setPromptPass(""); }} className="h-8 px-2 rounded-md text-[11px] border" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-dim)" }}>Cancel</button>
                  </div>
                )}
                <div className="text-[11px] mt-1 font-mono truncate" style={{ color: "var(--text-faint)" }}>{r.words.slice(0, 5).join(" ")}â€¦ â€¢ 50 words</div>
              </div>
            ))
          )}

          {activeRoom && !inRace && (
            <div className="panel p-4" style={{ background: "color-mix(in srgb, var(--primary) 6%, var(--bg-card))", borderColor: "var(--primary-border)" }}>
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold flex items-center gap-1.5" style={{ color: "var(--text-strong)" }}>{activeRoom.private ? "LOCKED" : "OPEN"} Ready â€¢ {activeRoom.id} â€¢ limit {activeRoom.limit} {activeRoom.passcode ? "â€¢ passcode set" : ""}</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: participants.length >= (activeRoom.limit ?? 8) ? "var(--danger)" : "var(--text-dim)" }}>{participants.length} / {activeRoom.limit} in lobby {participants.length >= activeRoom.limit ? "â€¢ Full" : ""}</span>
              </div>
              <div className="text-[11px] mt-1 break-all font-mono p-2 rounded-md border mt-2" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-strong)" }}>{shareLink}</div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => { navigator.clipboard.writeText(shareLink); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="h-7 px-3 rounded-md text-[12px] font-medium border" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-strong)" }}>{copied ? "Copied!" : "Copy link"}</button>
                <button onClick={doStart} disabled={participants.length > activeRoom.limit} className="h-7 px-3 rounded-md text-[12px] font-medium disabled:opacity-50" style={{ background: "var(--primary)", color: "white" }}>Start race (3-2-1)</button>
              </div>
              <div className="text-[11px] mt-2" style={{ color: "var(--text-dim)" }}>Public rooms are visible to all â€” owner set limit {activeRoom.limit}. Private rooms also visible here but need passcode (set on creation).</div>
              <div className="mt-3 space-y-1">
                {participants.map((p) => (
                  <div key={p.id} className="text-[11px] font-mono flex items-center gap-2" style={{ color: p.isYou ? "var(--primary)" : "var(--text-dim)" }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: p.isYou ? "var(--primary)" : "var(--border-strong)" }} />{p.name} {p.isYou ? "(You, owner)" : ""}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="panel p-4">
            <div className="text-[11px] font-semibold tracking-widest uppercase mb-2" style={{ color: "var(--text-dim)" }}>Your name</div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" className="w-full h-8 rounded-md border px-3 text-[13px]" style={{ background: "var(--bg-subtle)", borderColor: "var(--border)", color: "var(--text-strong)" }} />
            <div className="text-[11px] mt-1" style={{ color: "var(--text-faint)" }}>Shown in live standings</div>
          </div>
          <div className="panel p-4">
            <div className="text-[11px] font-semibold tracking-widest uppercase mb-2" style={{ color: "var(--text-dim)" }}>Assignment (classroom) â€” optional</div>
            <textarea value={assignmentText} onChange={(e) => setAssignmentText(e.target.value)} placeholder="Paste assignment passage (e.g., hiring test text). Leave empty for random 50 words." className="w-full min-h-[64px] rounded-md border p-2 text-[12px] resize-y" style={{ background: "var(--bg-subtle)", borderColor: "var(--border)", color: "var(--text-strong)", fontFamily: "var(--font-mono)" }} />
            <div className="text-[11px] mt-1 font-mono" style={{ color: "var(--text-faint)" }}>{assignmentText.trim() ? `${assignmentText.trim().split(/\s+/).filter(Boolean).length} words â€¢ will be race text` : "Empty = random words"}</div>
          </div>
          <div className="panel p-4">
            <div className="text-[11px] font-semibold tracking-widest uppercase mb-2" style={{ color: "var(--text-dim)" }}>Create private room â€” visible to all, needs passcode</div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[11px] font-medium" style={{ color: "var(--text-dim)" }}>Limit:</span>
              <div className="flex p-0.5 rounded-md" style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}>
                {[2, 4, 8, 16, 32].map((n) => (
                  <button key={n} onClick={() => setPrivateLimit(n)} className="px-2.5 py-1 rounded-[5px] text-[11px] font-medium" style={{ background: privateLimit === n ? "var(--bg-card)" : "transparent", color: privateLimit === n ? "var(--text-strong)" : "var(--text-dim)", border: privateLimit === n ? "1px solid var(--border-strong)" : "1px solid transparent" }}>{n}</button>
                ))}
              </div>
            </div>
            <input value={privatePasscode} onChange={(e) => setPrivatePasscode(e.target.value)} placeholder="Set passcode (min 3 chars, share with friends)" className="w-full h-8 rounded-md border px-3 text-[12px] mb-2" style={{ background: "var(--bg-subtle)", borderColor: "var(--border)", color: "var(--text-strong)" }} />
            <button onClick={() => createRoom(true)} className="h-8 px-4 rounded-md text-[12px] font-medium" style={{ background: "var(--text-strong)", color: "var(--bg)" }}>Create private race (visible + locked)</button>
            {joinError && <div className="mt-2 text-[11px] px-2 py-1 rounded-md border" style={{ background: "color-mix(in srgb, var(--danger) 10%, var(--bg-card))", borderColor: "var(--danger)", color: "var(--danger)" }}>{joinError}</div>}
            {activeRoom?.private && activeRoom.passcode && <div className="mt-3 text-[11px] font-mono break-all p-2 rounded-md border flex items-center justify-between gap-2" style={{ background: "var(--bg-subtle)", borderColor: "var(--border)", color: "var(--text-strong)" }}><span>{shareLink} â€¢ passcode: {activeRoom.passcode}</span><button onClick={() => { navigator.clipboard.writeText(shareLink); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="text-[11px] font-medium px-2 py-1 rounded border shrink-0" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>{copied ? "Copied" : "Copy"}</button></div>}
          </div>
          <div className="panel p-4">
            <div className="text-[11px] font-semibold tracking-widest uppercase mb-2" style={{ color: "var(--text-dim)" }}>Join private room by code</div>
            <div className="flex gap-2">
              <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="CODE" className="w-20 h-8 rounded-md border px-3 text-[13px] font-mono uppercase tracking-widest text-center" style={{ background: "var(--bg-subtle)", borderColor: "var(--border)", color: "var(--text-strong)" }} />
              <input value={joinPass} onChange={(e) => setJoinPass(e.target.value)} placeholder="Passcode" className="flex-1 h-8 rounded-md border px-3 text-[12px]" style={{ background: "var(--bg-subtle)", borderColor: "var(--border)", color: "var(--text-strong)" }} />
              <button onClick={() => joinRoom(joinCode, joinPass)} className="h-8 px-4 rounded-md text-[12px] font-medium border" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-strong)" }}>Join</button>
            </div>
            {joinError && <div className="mt-2 text-[11px] px-2 py-1 rounded-md border" style={{ background: "color-mix(in srgb, var(--danger) 10%, transparent)", borderColor: "var(--danger)", color: "var(--danger)" }}>{joinError}</div>}
          </div>
          {activeRoom && !inRace && (
            <div className="panel p-4 flex items-center justify-between gap-3" style={{ borderColor: "var(--primary-border)", background: "color-mix(in srgb, var(--primary) 6%, var(--bg-card))" }}>
              <span className="text-[13px] font-medium" style={{ color: "var(--text-strong)" }}>Room {activeRoom.id} ready â€¢ {participants.length}/{activeRoom.limit} joined {activeRoom.passcode ? "â€¢ locked" : ""}</span>
              <button onClick={doStart} disabled={participants.length > activeRoom.limit} className="h-7 px-3 rounded-md text-[12px] font-medium disabled:opacity-40" style={{ background: "var(--primary)", color: "white" }}>Start 3-2-1</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
