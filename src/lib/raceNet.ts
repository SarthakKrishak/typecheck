import { Peer, type DataConnection } from "peerjs";

/* ═══════════════════════════════════════════════════════════════════
   raceNet — production transport for Typecheck races.
   - Net mode: host-authoritative star over WebRTC (PeerJS cloud for
     signaling only; all race data is P2P, nothing stored server-side).
     Override signaling with VITE_PEER_HOST / _PORT / _PATH / _SECURE.
   - Local mode: same-device tabs via BroadcastChannel (offline fallback).
   ═══════════════════════════════════════════════════════════════════ */

export const RACE_PROTO_V = 1;
const PEER_PREFIX = "typecheck-race-";
const MAX_NAME = 24;
const MAX_WPM = 300; // plausibility cap (anti-cheat)
const MAX_PROGRESS_JUMP = 30; // per message (backspacing a word can dip)
const MIN_MSG_GAP = 80; // ms, per-guest rate limit
const HEARTBEAT_MS = 5000;
const DROP_AFTER_MS = 15000;
const DIAL_TIMEOUT_MS = 12000;

export const peerIdForRoom = (code: string) => `${PEER_PREFIX}${code.toUpperCase()}`;

function peerConf() {
  const env = import.meta.env as Record<string, string | undefined>;
  return {
    host: env.VITE_PEER_HOST || "0.peerjs.com",
    port: Number(env.VITE_PEER_PORT || 443),
    path: env.VITE_PEER_PATH || "/",
    secure: (env.VITE_PEER_SECURE ?? "true") !== "false",
    debug: 0 as const,
  };
}

export function sanitizeName(raw: string): string {
  // Strip control characters without a control-char regex (lint-clean).
  let out = "";
  const s = String(raw ?? "");
  for (const ch of s) {
    const c = ch.codePointAt(0) ?? 32;
    if (c >= 32 && c !== 127) out += ch;
    if (out.length >= MAX_NAME + 8) break;
  }
  const clean = out.trim().slice(0, MAX_NAME);
  return clean || "You";
}

export type NetPlayer = {
  id: string;
  name: string;
  progress: number; // 0..100
  wpm: number;
  finished: boolean;
  finishedAt?: number;
};

export type RaceMode = { kind: "words"; count: number } | { kind: "time"; seconds: number };

export function sanitizeMode(m: unknown): RaceMode {
  const o = (m ?? {}) as Record<string, unknown>;
  if (o.kind === "time") {
    const s = [15, 30, 60, 120].includes(o.seconds as number) ? (o.seconds as number) : 30;
    return { kind: "time", seconds: s };
  }
  const c = [10, 25, 50, 100].includes(o.count as number) ? (o.count as number) : 50;
  return { kind: "words", count: c };
}

export type RoomInfo = { limit: number; isPrivate: boolean; mode: RaceMode };

export type RaceEvents = {
  onRoster(players: NetPlayer[], youId: string): void;
  onWords(words: string[]): void;
  onRoomInfo(info: RoomInfo): void;
  onCountdown(startsAt: number): void;
  onRejected(reason: string): void;
  onHostLeft(): void;
  onDisconnected(): void;
  onError(err: string): void;
  onMode?(mode: "net" | "local"): void;
};

export interface RaceSession {
  mode: "net" | "local";
  youId: string;
  isHost: boolean;
  sendProgress(p: number, wpm: number, finished: boolean, finishedAt?: number): void;
  startRace(): void;
  leave(): void;
}

/* ── protocol ───────────────────────────────────────────────────── */

type Msg =
  | { t: "hello"; name: string; passcode: string; v: number }
  | { t: "welcome"; youId: string; roster: NetPlayer[]; words: string[]; limit: number; isPrivate: boolean; mode: RaceMode; startsAt: number | null }
  | { t: "reject"; reason: string }
  | { t: "roster"; players: NetPlayer[] }
  | { t: "countdown"; startsAt: number }
  | { t: "progress"; p: number; wpm: number; finished: boolean; finishedAt?: number }
  | { t: "bye"; id: string }
  | { t: "ping"; now: number }
  | { t: "allDone" }
  | { t: "hostLeft" };

function isValidMsg(d: unknown): d is Msg {
  if (!d || typeof d !== "object") return false;
  const m = d as Record<string, unknown>;
  if (typeof m.t !== "string") return false;
  const num = (v: unknown) => typeof v === "number" && Number.isFinite(v);
  const str = (v: unknown, max: number) => typeof v === "string" && v.length <= max;
  switch (m.t) {
    case "hello": return str(m.name, 32) && str(m.passcode, 64) && m.v === RACE_PROTO_V;
    case "welcome": return str(m.youId, 64) && Array.isArray(m.roster) && Array.isArray(m.words) && num(m.limit) && (m.startsAt === null || num(m.startsAt));
    case "reject": return str(m.reason, 120);
    case "roster": return Array.isArray(m.players) && m.players.length <= 64;
    case "countdown": return num(m.startsAt);
    case "progress": return num(m.p) && num(m.wpm) && typeof m.finished === "boolean";
    case "bye": return str(m.id, 64);
    case "ping": return num(m.now);
    case "allDone":
    case "hostLeft": return true;
    default: return false;
  }
}

function validPlayer(p: unknown): p is NetPlayer {
  if (!p || typeof p !== "object") return false;
  const o = p as Record<string, unknown>;
  return typeof o.id === "string" && o.id.length <= 64 &&
    typeof o.name === "string" && typeof o.progress === "number" &&
    typeof o.wpm === "number" && typeof o.finished === "boolean";
}

function safeSend(conn: DataConnection | null | undefined, msg: Msg) {
  try { if (conn && conn.open) conn.send(msg); } catch { /* drop — heartbeat will notice */ }
}

function newPeer(id?: string): Promise<Peer> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let peer: Peer;
    try {
      peer = id ? new Peer(id, peerConf()) : new Peer(peerConf());
    } catch (e) { reject(e); return; }
    const timer = window.setTimeout(() => {
      if (!settled) { settled = true; try { peer.destroy(); } catch {} reject(new Error("signal-timeout")); }
    }, DIAL_TIMEOUT_MS);
    peer.on("open", () => { if (!settled) { settled = true; window.clearTimeout(timer); resolve(peer); } });
    peer.on("error", (err: Error & { type?: string }) => {
      if (!settled) { settled = true; window.clearTimeout(timer); try { peer.destroy(); } catch {} reject(err); }
      // errors after open are handled by the session (close/disconnect)
    });
  });
}

/* ── host ───────────────────────────────────────────────────────── */

export async function hostRoom(opts: {
  code: string; words: string[]; limit: number; passcode?: string;
  mode: RaceMode; name: string; youId: string; events: RaceEvents;
}): Promise<RaceSession> {
  const { code, events } = opts;
  const words = opts.words.filter((w) => typeof w === "string").slice(0, 150);
  const limit = [2, 4, 8, 16, 32].includes(opts.limit) ? opts.limit : 8;
  const mode = sanitizeMode(opts.mode);
  const passcode = opts.passcode?.trim().slice(0, 64) || undefined;
  const peer = await newPeer(peerIdForRoom(code)); // throws unavailable-id on collision

  const players = new Map<string, NetPlayer>();
  const conns = new Map<string, DataConnection>();
  const lastSeen = new Map<string, number>();
  const lastMsgAt = new Map<string, number>();
  let startsAt: number | null = null;
  let rosterTimer: number | null = null;
  let dirty = false;
  let dead = false;

  const me: NetPlayer = { id: opts.youId, name: sanitizeName(opts.name), progress: 0, wpm: 0, finished: false };
  players.set(me.id, me);

  const emitRoster = () => {
    const list = [...players.values()];
    events.onRoster(list, me.id);
    for (const [, c] of conns) safeSend(c, { t: "roster", players: list });
  };
  const markDirty = () => { dirty = true; };
  rosterTimer = window.setInterval(() => {
    if (dead) return;
    if (dirty) { dirty = false; emitRoster(); }
    // drop silent guests
    const now = Date.now();
    let changed = false;
    for (const [id, t] of lastSeen) {
      if (now - t > DROP_AFTER_MS) {
        lastSeen.delete(id); lastMsgAt.delete(id);
        const c = conns.get(id); try { c?.close(); } catch {}
        conns.delete(id);
        if (players.delete(id)) changed = true;
      }
    }
    if (changed) emitRoster();
    else for (const [, c] of conns) safeSend(c, { t: "ping", now });
  }, 1000);
  // heartbeat listener restarts the clock via lastSeen updates below

  peer.on("connection", (conn) => {
    if (dead) return;
    let authed = false;
    let guestId = "";
    const helloTimer = window.setTimeout(() => { if (!authed) { try { conn.close(); } catch {} } }, 8000);
    conn.on("open", () => {
      conn.on("data", (raw) => {
        if (!isValidMsg(raw)) return;
        if (!authed) {
          if (raw.t !== "hello") return;
          window.clearTimeout(helloTimer);
          // capacity gate (host counts as 1)
          if (players.size >= limit) { safeSend(conn, { t: "reject", reason: `Room is full (${players.size}/${limit})` }); window.setTimeout(() => { try { conn.close(); } catch {} }, 300); return; }
          if (passcode && raw.passcode !== passcode) { safeSend(conn, { t: "reject", reason: "Wrong passcode" }); window.setTimeout(() => { try { conn.close(); } catch {} }, 300); return; }
          authed = true;
          guestId = conn.peer;
          const p: NetPlayer = { id: guestId, name: sanitizeName(raw.name), progress: 0, wpm: 0, finished: false };
          players.set(guestId, p);
          conns.set(guestId, conn);
          lastSeen.set(guestId, Date.now());
          safeSend(conn, { t: "welcome", youId: guestId, roster: [...players.values()], words, limit, isPrivate: !!passcode, mode, startsAt });
          emitRoster();
          return;
        }
        if (conn.peer !== guestId) return;
        lastSeen.set(guestId, Date.now());
        if (raw.t === "progress") {
          // rate limit + plausibility (anti-cheat)
          const now = Date.now();
          if (now - (lastMsgAt.get(guestId) ?? 0) < MIN_MSG_GAP) return;
          lastMsgAt.set(guestId, now);
          const cur = players.get(guestId);
          if (!cur || cur.finished) return;
          const p = Math.max(0, Math.min(100, Math.round(raw.p)));
          const wpm = Math.max(0, Math.min(MAX_WPM, Math.round(raw.wpm)));
          if (Math.abs(p - cur.progress) > MAX_PROGRESS_JUMP && !(raw.finished && p >= 99)) return;
          cur.progress = raw.finished ? 100 : p;
          cur.wpm = wpm;
          if (raw.finished) { cur.finished = true; cur.finishedAt = Number.isFinite(raw.finishedAt) ? raw.finishedAt as number : now; }
          markDirty();
          if (raw.finished) { dirty = false; emitRoster(); checkAllDone(); }
        } else if (raw.t === "bye") {
          dropGuest(guestId);
        } else if (raw.t === "ping") {
          safeSend(conn, { t: "ping", now: raw.now });
        }
      });
      conn.on("close", () => { if (authed) dropGuest(guestId); });
      conn.on("error", () => { if (authed) dropGuest(guestId); });
    });
  });
  peer.on("disconnected", () => { try { peer.reconnect(); } catch {} });
  peer.on("error", (err: Error & { type?: string }) => {
    if (err?.type === "network" || err?.type === "server-error" || err?.type === "socket-closed") events.onError("Connection to signaling lost — lobby stays visible to tabs on this device.");
  });

  function dropGuest(id: string) {
    if (!players.has(id)) return;
    players.delete(id);
    const c = conns.get(id); try { c?.close(); } catch {}
    conns.delete(id); lastSeen.delete(id); lastMsgAt.delete(id);
    emitRoster();
  }
  function checkAllDone() {
    const list = [...players.values()];
    if (list.length > 0 && list.every((p) => p.finished)) {
      for (const [, c] of conns) safeSend(c, { t: "allDone" });
    }
  }

  // announce net mode + initial state
  events.onMode?.("net");
  events.onWords(words);
  events.onRoomInfo({ limit, isPrivate: !!passcode, mode });
  emitRoster();

  let lastPartial = 0;
  return {
    mode: "net",
    youId: me.id,
    isHost: true,
    sendProgress(p, wpm, finished, finishedAt) {
      me.progress = finished ? 100 : Math.max(0, Math.min(100, Math.round(p)));
      me.wpm = Math.max(0, Math.min(MAX_WPM, Math.round(wpm)));
      if (finished && !me.finished) { me.finished = true; me.finishedAt = finishedAt ?? Date.now(); }
      // host roster fan-out is throttled (350ms) except finishes
      if (finished) { dirty = false; emitRoster(); checkAllDone(); }
      else {
        const now = Date.now();
        if (now - lastPartial > 350) { lastPartial = now; dirty = false; emitRoster(); }
        else markDirty();
      }
    },
    startRace() {
      startsAt = Date.now() + 3200;
      me.progress = 0; me.wpm = 0; me.finished = false; delete me.finishedAt;
      for (const pl of players.values()) if (pl.id !== me.id) { pl.progress = 0; pl.wpm = 0; pl.finished = false; delete pl.finishedAt; }
      for (const [, c] of conns) safeSend(c, { t: "countdown", startsAt });
      events.onCountdown(startsAt);
      dirty = false; emitRoster();
    },
    leave() {
      dead = true;
      for (const [, c] of conns) { safeSend(c, { t: "hostLeft" }); try { c.close(); } catch {} }
      if (rosterTimer) window.clearInterval(rosterTimer);
      try { peer.destroy(); } catch {}
    },
  };
}

/* ── guest ──────────────────────────────────────────────────────── */

export async function joinRoom(opts: {
  code: string; name: string; passcode?: string; youId: string; events: RaceEvents;
}): Promise<RaceSession> {
  const { events } = opts;
  const code = opts.code.trim().toUpperCase();
  const peer = await newPeer();
  const hostId = peerIdForRoom(code);
  const conn = peer.connect(hostId, { reliable: true, label: "race" });
  let dead = false;
  let welcomed = false;
  let lastHostSeen = Date.now();
  let hbTimer: number | null = null;
  let lastPartial = 0;
  const self: NetPlayer = { id: opts.youId, name: sanitizeName(opts.name), progress: 0, wpm: 0, finished: false };

  const session: RaceSession = {
    mode: "net",
    youId: self.id, // replaced by host-assigned id on welcome
    isHost: false,
    sendProgress(p, wpm, finished, finishedAt) {
      if (!welcomed || dead) return;
      const now = Date.now();
      if (!finished && now - lastPartial < 250) return; // throttle partials; commits/finish always send
      lastPartial = now;
      safeSend(conn, { t: "progress", p: Math.max(0, Math.min(100, Math.round(p))), wpm: Math.max(0, Math.min(MAX_WPM, Math.round(wpm))), finished, finishedAt });
    },
    startRace() { /* guests can't start */ },
    leave() {
      dead = true;
      safeSend(conn, { t: "bye", id: session.youId });
      if (hbTimer) window.clearInterval(hbTimer);
      try { conn.close(); } catch {}
      try { peer.destroy(); } catch {}
    },
  };

  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => { cleanup(); reject(new Error("join-timeout")); }, DIAL_TIMEOUT_MS);
    const cleanup = () => { window.clearTimeout(timer); };
    conn.on("open", () => {
      safeSend(conn, { t: "hello", name: self.name, passcode: opts.passcode?.trim().slice(0, 64) ?? "", v: RACE_PROTO_V });
    });
    conn.on("data", (raw) => {
      if (!isValidMsg(raw)) return;
      if (!welcomed) {
        if (raw.t === "welcome") {
          welcomed = true;
          cleanup();
          session.youId = raw.youId;
          lastHostSeen = Date.now();
          events.onMode?.("net");
          events.onWords(raw.words.filter((w) => typeof w === "string").slice(0, 150));
          events.onRoomInfo({ limit: [2, 4, 8, 16, 32].includes(raw.limit) ? raw.limit : 8, isPrivate: !!raw.isPrivate, mode: sanitizeMode(raw.mode) });
          events.onRoster(raw.roster.filter(validPlayer), raw.youId);
          if (raw.startsAt) events.onCountdown(raw.startsAt);
          hbTimer = window.setInterval(() => {
            if (dead) return;
            if (Date.now() - lastHostSeen > DROP_AFTER_MS) { events.onDisconnected(); session.leave(); return; }
            safeSend(conn, { t: "ping", now: Date.now() });
          }, HEARTBEAT_MS);
          resolve();
        } else if (raw.t === "reject") {
          cleanup();
          reject(new Error(raw.reason));
        }
        return;
      }
      lastHostSeen = Date.now();
      if (raw.t === "roster") events.onRoster(raw.players.filter(validPlayer), session.youId);
      else if (raw.t === "countdown") events.onCountdown(raw.startsAt);
      else if (raw.t === "allDone") { /* standings already final via roster — UI derives all-done from it */ }
      else if (raw.t === "hostLeft") events.onHostLeft();
    });
    conn.on("error", () => { if (!welcomed) { cleanup(); reject(new Error("connect-failed")); } });
    peer.on("error", (err: Error & { type?: string }) => {
      if (!welcomed) {
        cleanup();
        if (err?.type === "peer-unavailable") reject(new Error("Room not found — host may be offline"));
        else reject(err);
      }
    });
  }).catch((e) => {
    try { conn.close(); } catch {}
    try { peer.destroy(); } catch {}
    throw e;
  });

  return session;
}

/* ── local fallback (offline / signaling unreachable) ───────────── */

export function localSession(opts: {
  roomId: string; name: string; youId: string; events: RaceEvents; words: string[];
  limit: number; isPrivate: boolean; mode: RaceMode;
}): RaceSession {
  const { roomId, events } = opts;
  const ch = new BroadcastChannel(`race-${roomId}`);
  const me: NetPlayer = { id: opts.youId, name: sanitizeName(opts.name), progress: 0, wpm: 0, finished: false };
  const others = new Map<string, NetPlayer>();
  let dead = false;
  const emit = () => events.onRoster([me, ...others.values()], me.id);

  ch.onmessage = (e) => {
    const d = e.data as { type?: string; payload?: unknown };
    if (!d || typeof d !== "object" || !validPlayer(d.payload)) return;
    const p = d.payload as NetPlayer;
    if (p.id === me.id || p.name.length > 32) return;
    if (d.type === "leave") { if (others.delete(p.id)) emit(); return; }
    if (d.type === "countdown" && typeof (p as unknown as { startsAt?: number }).startsAt === "number") {
      events.onCountdown((p as unknown as { startsAt: number }).startsAt);
      return;
    }
    others.set(p.id, { ...p, progress: Math.max(0, Math.min(100, p.progress)), wpm: Math.max(0, Math.min(MAX_WPM, p.wpm)) });
    emit();
  };
  try { ch.postMessage({ type: "join", payload: me }); } catch {}
  const limit = [2, 4, 8, 16, 32].includes(opts.limit) ? opts.limit : 8;
  const info = { limit, isPrivate: !!opts.isPrivate, mode: sanitizeMode(opts.mode) };
  events.onMode?.("local");
  events.onWords(opts.words);
  events.onRoomInfo(info);
  emit();

  let lastPartial = 0;
  return {
    mode: "local",
    youId: me.id,
    isHost: true, // anyone may start locally
    sendProgress(p, wpm, finished, finishedAt) {
      if (dead) return;
      me.progress = finished ? 100 : Math.max(0, Math.min(100, Math.round(p)));
      me.wpm = Math.max(0, Math.min(MAX_WPM, Math.round(wpm)));
      if (finished) me.finished = true;
      if (finished) me.finishedAt = finishedAt ?? Date.now();
      const now = Date.now();
      if (!finished && now - lastPartial < 250) { emit(); return; }
      lastPartial = now;
      try { ch.postMessage({ type: "update", payload: me }); } catch {}
      emit();
    },
    startRace() {
      const startsAt = Date.now() + 3200;
      try { ch.postMessage({ type: "countdown", payload: { ...me, startsAt } as unknown as NetPlayer }); } catch {}
      events.onCountdown(startsAt);
    },
    leave() {
      dead = true;
      try { ch.postMessage({ type: "leave", payload: me }); } catch {}
      try { ch.close(); } catch {}
    },
  };
}
