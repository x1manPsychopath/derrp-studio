/* Derrp Studio — client application.
   One rich client-side page: all state persists in localStorage, and the only
   network traffic is to the household's Mochi bridge (tailnet) when a host
   profile is configured. No credentials are baked in; the bridge token is
   entered by the user and stored only in this browser. */

const $ = (id) => document.getElementById(id);
const TZ = 'America/New_York';

/* ---------- tiny storage helpers ---------- */
const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode etc. */ }
  },
};

const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);

async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    if (btn) { const old = btn.textContent; btn.textContent = 'Copied ✓'; setTimeout(() => (btn.textContent = old), 1400); }
  } catch { /* clipboard unavailable; user can select manually */ }
}

/* ---------- Eastern-time household pattern ---------- */
const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/* The ruled household pattern, keyed by JS weekday (0 = Sunday). */
const PATTERN = {
  0: { who: 'AmaDerrp', series: 'Art n Goose Shenanigans', kind: 'Art', time: '5:00–10:00 PM ET' },
  1: { who: 'NeoDerrp', series: 'Main Quest Monday', kind: 'Gaming', time: '5:00–10:00 PM ET' },
  2: { who: 'AmaDerrp', series: 'Adventure Tuesday', kind: 'Art', time: '5:00–10:00 PM ET' },
  3: { who: 'NeoDerrp', series: 'Unfinished Business', kind: 'Gaming', time: '5:00–10:00 PM ET' },
  4: { who: 'AmaDerrp', series: 'Thursday Art (flex)', kind: 'Art', time: '5:00–10:00 PM ET' },
  5: { who: 'NeoDerrp', series: 'Community Quest Friday', kind: 'Gaming', time: '5:00–10:00 PM ET' },
  6: { who: 'Household', series: 'Family Day', kind: 'No streams', time: 'All day' },
};

/** Today's date in America/New_York as {y, m, d, dow}. */
function etToday() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t).value;
  return { y: +get('year'), m: +get('month'), d: +get('day'), dow: DOW_SHORT.indexOf(get('weekday')) };
}

/* Noon-UTC dates keep day arithmetic safe across DST edges. */
const utcDate = (y, m, d) => new Date(Date.UTC(y, m - 1, d, 12));
const addDays = (date, n) => new Date(date.getTime() + n * 86400000);
const isoOf = (date) => date.toISOString().slice(0, 10);
const labelOf = (date) =>
  date.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' });

function renderStatusStrip() {
  const t = etToday();
  const today = PATTERN[t.dow];
  if (t.dow === 6) {
    $('stripTonight').textContent = 'Family day';
    $('stripTonightSub').textContent = 'Saturday is guarded — no streams scheduled.';
  } else {
    $('stripTonight').textContent = `${today.who} — ${today.series}`;
    $('stripTonightSub').textContent = `${today.kind} · ${today.time}`;
  }
  /* Next non-Saturday slot, scanning forward. */
  const base = utcDate(t.y, t.m, t.d);
  for (let i = 1; i <= 7; i++) {
    const d = addDays(base, i);
    const dow = d.getUTCDay();
    if (dow === 6) continue;
    const p = PATTERN[dow];
    $('stripNext').textContent = `${p.who} — ${p.series}`;
    $('stripNextSub').textContent = `${labelOf(d)} · ${p.time}`;
    break;
  }
}

/* ---------- module navigation ---------- */
function initNav() {
  $('mainNav').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-module]');
    if (!btn) return;
    document.querySelectorAll('.nav-btn').forEach((b) => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.module').forEach((m) => m.classList.toggle('active', m.id === `module-${btn.dataset.module}`));
    if (btn.dataset.module === 'mochi' && activeProfile()) {
      checkBridge();
    }
  });
}

/* ================= COPY STUDIO ================= */

const SERIES = {
  neo: [
    { id: 'mqm', name: 'Main Quest Monday', mark: '⚔️' },
    { id: 'ub', name: 'Unfinished Business', mark: '🔍' },
    { id: 'cqf', name: 'Community Quest Friday', mark: '🎲' },
  ],
  ama: [
    { id: 'at', name: 'Adventure Tuesday', mark: '🎨' },
    { id: 'thu', name: 'Thursday Flex', mark: '🪿' },
    { id: 'ags', name: 'Art n Goose Shenanigans', mark: '🌙' },
  ],
  duo: [{ id: 'duo', name: 'Duo Stream', mark: '🌙' }],
};
const CREATOR_NAME = { neo: 'NeoDerrp', ama: 'AmaDerrp', duo: 'NeoDerrp + AmaDerrp' };

/* The current generated copy set — Promo & Social reads this. */
let currentCopy = { creator: 'neo', title: '', category: '', goLive: '', welcome: '', discord: '', hook: '', game: '', series: '' };
/* Outputs the user has hand-edited stop auto-regenerating until creator/series changes. */
const manualOverride = { title: false, goLive: false, welcome: false, discord: false };

/** Strip everything a TTS voice should never see: links, emoji, markdown. */
function ttsSanitize(text) {
  return text
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{FE0F}]/gu, '')
    .replace(/[#*_`>[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Keep at most three sentences, TTS-safe. */
function ttsWelcome(text) {
  const clean = ttsSanitize(text);
  const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean];
  return sentences.slice(0, 3).join(' ').trim();
}

function setCount(el, len, okAt, warnAt, hardAt) {
  el.textContent = `${len} chars`;
  el.className = 'count' + (len > hardAt ? ' over' : len > warnAt ? ' warn' : '');
  return len <= hardAt;
}

function renderCopy() {
  const creator = $('csCreator').value;
  const seriesSel = $('csSeries');
  const series = SERIES[creator].find((s) => s.id === seriesSel.value) || SERIES[creator][0];
  const hook = $('csHook').value.trim();
  const game = $('csGame').value.trim();
  const category = $('csCategory').value.trim() || game;
  const lastTime = $('csLastTime').value.trim();
  const name = CREATOR_NAME[creator];

  /* Title: `Hook | Game | Series` + one trailing series mark. */
  const title = [hook, game, `${series.name} ${series.mark}`].filter(Boolean).join(' | ');

  /* Go-live: hook-first, lurkers welcome, hard cap 90. */
  let goLive = `${name} is LIVE: ${hook} — come hang out, lurkers welcome!`;
  if (goLive.length > 90) goLive = goLive.slice(0, 87).trimEnd() + '…';

  /* Welcome: TTS-safe, ≤3 sentences; recap-led when "Last time" is given. */
  let welcomeRaw = `Welcome in, everyone! Tonight ${name} is live with ${game || 'something fun'} for ${series.name}. Settle in, say hi in chat, and enjoy the show.`;
  if (lastTime) welcomeRaw = `Welcome back! Last time, ${lastTime}. Tonight ${name} continues with ${game} for ${series.name}.`;
  const welcome = ttsWelcome(welcomeRaw);

  /* Discord: mission line first; invite only when cross-posting. */
  const mission = hook || `${series.name} with ${name}`;
  let discord = `🎯 Tonight: ${mission}\n${title}\n${name} is live 5:00–10:00 PM ET — lurkers welcome, come say hi!`;
  if ($('csCrossPost').checked && $('csInvite').value.trim()) {
    discord += `\nJoin the Discord: ${$('csInvite').value.trim()}`;
  }

  if (!manualOverride.title) $('outTitle').value = title;
  if (!manualOverride.goLive) $('outGoLive').value = goLive;
  if (!manualOverride.welcome) $('outWelcome').value = welcome;
  if (!manualOverride.discord) $('outDiscord').value = discord;

  currentCopy = {
    creator,
    title: $('outTitle').value,
    category,
    goLive: $('outGoLive').value,
    welcome: $('outWelcome').value,
    discord: $('outDiscord').value,
    hook, game, series: series.name,
  };

  /* Counters + standards feedback. Neo hook guidance: verb-first, ~50–70 chars. */
  const hookLen = hook.length;
  const hc = $('csHookCount');
  hc.textContent = creator === 'neo'
    ? `${hookLen} chars (guide: 50–70, verb-first)`
    : `${hookLen} chars`;
  hc.className = 'count' + (creator === 'neo' && (hookLen < 50 || hookLen > 70) && hookLen > 0 ? ' warn' : '');

  setCount($('outTitleCount'), currentCopy.title.length, 110, 110, 140);
  setCount($('outGoLiveCount'), currentCopy.goLive.length, 90, 90, 90);
  $('outWelcomeCount').textContent = `${currentCopy.welcome.length} chars · TTS-safe plain text`;

  const errors = [];
  if (currentCopy.title.length > 140) errors.push('Title is over the 140-char hard limit.');
  if (currentCopy.goLive.length > 90) errors.push('Go-live message is over 90 chars.');
  if (!hook) errors.push('Add a hook to generate a title.');
  if (!game) errors.push('Add the game / project for the title and category.');
  $('csErrors').textContent = errors.join(' ');
}

function refreshSeriesOptions(keepId) {
  const creator = $('csCreator').value;
  const sel = $('csSeries');
  sel.innerHTML = SERIES[creator].map((s) => `<option value="${s.id}">${s.name} ${s.mark}</option>`).join('');
  if (keepId && SERIES[creator].some((s) => s.id === keepId)) sel.value = keepId;
  $('csGameLabel').textContent = creator === 'ama' ? 'Project / Category' : 'Game / Project';
}

function initCopyStudio() {
  refreshSeriesOptions();
  const rerender = () => renderCopy();
  ['csHook', 'csGame', 'csCategory', 'csLastTime', 'csInvite'].forEach((id) => $(id).addEventListener('input', rerender));
  $('csCrossPost').addEventListener('change', rerender);
  $('csSeries').addEventListener('change', rerender);
  $('csCreator').addEventListener('change', () => {
    Object.keys(manualOverride).forEach((k) => (manualOverride[k] = false));
    refreshSeriesOptions();
    renderCopy();
  });
  [['outTitle', 'title'], ['outGoLive', 'goLive'], ['outWelcome', 'welcome'], ['outDiscord', 'discord']]
    .forEach(([id, key]) => $(id).addEventListener('input', () => { manualOverride[key] = true; renderCopy(); }));

  /* Welcome field: re-sanitize on blur so pasted text can never break TTS. */
  $('outWelcome').addEventListener('blur', () => { $('outWelcome').value = ttsWelcome($('outWelcome').value); renderCopy(); });

  /* Drafts (localStorage). */
  const renderDrafts = () => {
    const drafts = store.get('ds.drafts.v1', []);
    $('csDraftList').innerHTML = drafts.map((d) => `
      <li>
        <span class="grow"><strong>${escapeHtml(d.name)}</strong> <span class="meta">${CREATOR_NAME[d.creator] || ''} · ${escapeHtml(d.seriesName || '')}</span></span>
        <button class="btn small secondary" data-load-draft="${d.id}">Load</button>
        <button class="btn small danger" data-del-draft="${d.id}">Delete</button>
      </li>`).join('') || '<li><span class="note">No drafts saved yet.</span></li>';
  };
  $('csSaveDraft').addEventListener('click', () => {
    const drafts = store.get('ds.drafts.v1', []);
    const series = SERIES[$('csCreator').value].find((s) => s.id === $('csSeries').value);
    drafts.push({
      id: uid(),
      name: $('csDraftName').value.trim() || `${series.name} — ${new Date().toLocaleDateString('en-US')}`,
      creator: $('csCreator').value, seriesId: $('csSeries').value, seriesName: series.name,
      hook: $('csHook').value, game: $('csGame').value, category: $('csCategory').value,
      lastTime: $('csLastTime').value, invite: $('csInvite').value, crossPost: $('csCrossPost').checked,
      outputs: { title: $('outTitle').value, goLive: $('outGoLive').value, welcome: $('outWelcome').value, discord: $('outDiscord').value },
    });
    store.set('ds.drafts.v1', drafts);
    $('csDraftName').value = '';
    renderDrafts();
  });
  $('csDraftList').addEventListener('click', (e) => {
    const loadId = e.target.dataset.loadDraft;
    const delId = e.target.dataset.delDraft;
    let drafts = store.get('ds.drafts.v1', []);
    if (delId) { store.set('ds.drafts.v1', drafts.filter((d) => d.id !== delId)); renderDrafts(); }
    if (loadId) {
      const d = drafts.find((x) => x.id === loadId);
      if (!d) return;
      $('csCreator').value = d.creator;
      refreshSeriesOptions(d.seriesId);
      $('csHook').value = d.hook; $('csGame').value = d.game; $('csCategory').value = d.category;
      $('csLastTime').value = d.lastTime; $('csInvite').value = d.invite; $('csCrossPost').checked = d.crossPost;
      Object.keys(manualOverride).forEach((k) => (manualOverride[k] = true));
      $('outTitle').value = d.outputs.title; $('outGoLive').value = d.outputs.goLive;
      $('outWelcome').value = d.outputs.welcome; $('outDiscord').value = d.outputs.discord;
      renderCopy();
    }
  });

  /* Export: EXACTLY the five keys the Mochi stream stack's stream-config.json uses. */
  $('csExport').addEventListener('click', () => {
    const payload = {
      twitchTitle: $('outTitle').value,
      twitchCategory: currentCopy.category,
      goLiveMessage: $('outGoLive').value,
      welcomeMessage: $('outWelcome').value,
      discordMessage: $('outDiscord').value,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'stream-config.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });
  $('csCopyAll').addEventListener('click', (e) => copyText($('outDiscord').value, e.target));

  renderDrafts();
  renderCopy();
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ================= MOCHI BRIDGE =================
   Contract: Derrp-Studio-Tailscale-Bridge-Spec.md.
   GET /health, GET /status, GET /session, config reads (GET /config,
   GET /config/item?id=<id>); control-class writes (POST /config/item,
   POST /config/revert) only when the bridge reports control unlocked.
   Route contract verified against bridge v1 source 2026-11-23.
   The Studio NEVER fabricates status: no bridge, no data. */

const STACK = [
  { key: 'mochi_core', name: 'Mochi Core', port: 8000, role: 'Mochi brain — chat, memory, research routing', match: 'core' },
  { key: 'candidate', name: 'Command Center API', port: 8100, role: 'Session lifecycle + control candidate (rc)', match: 'command' },
  { key: 'voice_sidecar', name: 'Voice sidecar', port: 8770, role: 'Speech path: Core → Voicebox → stream mix', match: 'sidecar' },
  { key: 'voicebox', name: 'Voicebox', port: 17493, role: 'TTS engine hosting the “Mochi” voice profile', match: 'voicebox' },
  { key: 'research', name: 'Research service', port: 8765, role: 'Grounding / research for chat answers', match: 'research' },
  { key: 'streamerbot', name: 'Streamer.bot', port: 8081, role: 'Twitch events + action bridge (WebSocket)', match: 'streamer' },
  { key: 'speakerbot', name: 'Speaker.bot', port: 7681, role: 'Legacy speech surface (not probed by the bridge)', match: 'speaker' },
  { key: 'obs_ws', name: 'OBS WebSocket', port: 4455, role: 'Scene / source control + status', match: 'obs' },
];

/* mode: 'none' | 'unreachable' | 'readonly' | 'live' */
const bridge = {
  mode: 'none',
  detail: '',
  status: null,
  session: null,
  launchers: null,
  launcherUnlocked: false,
  launcherHost: null,
  launcherFeedback: {},
  launcherPolling: {},
  configFiles: [],
  openFile: null,
};

function clearLauncherPolls() {
  Object.keys(bridge.launcherPolling).forEach((id) => {
    const p = bridge.launcherPolling[id];
    if (p && p.timerId) clearTimeout(p.timerId);
  });
  bridge.launcherPolling = {};
}

const getHosts = () => store.get('ds.hosts.v1', { profiles: [], activeId: null });
const activeProfile = () => {
  const h = getHosts();
  return h.profiles.find((p) => p.id === h.activeId) || h.profiles[0] || null;
};

async function bridgeFetch(path, opts = {}) {
  const p = activeProfile();
  if (!p) throw new Error('No active host profile');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(p.url.replace(/\/+$/, '') + path, {
      ...opts,
      headers: { Authorization: `Bearer ${p.token}`, Accept: 'application/json', ...(opts.headers || {}) },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`Bridge returned HTTP ${res.status}`);
    const text = await res.text();
    try { return JSON.parse(text); } catch { return { raw: text }; }
  } finally {
    clearTimeout(timer);
  }
}

async function bridgePostLauncher(path) {
  const p = activeProfile();
  if (!p) throw new Error('No active host profile');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(p.url.replace(/\/+$/, '') + path, {
      method: 'POST',
      headers: { Authorization: `Bearer ${p.token}`, Accept: 'application/json' },
      signal: ctrl.signal,
    });
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    return { ok: res.ok, status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

/** Control is live ONLY when the bridge itself says so — never inferred locally. */
function controlUnlocked(status) {
  if (!status) return false;
  return status.controlUnlocked === true || status.control?.unlocked === true || status.control?.enabled === true;
}

async function fetchLaunchers() {
  const res = await bridgeFetch('/launchers');
  const list = Array.isArray(res?.launchers) ? res.launchers.slice() : [];
  list.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  bridge.launchers = list;
  bridge.launcherUnlocked = Boolean(res?.launcher_unlocked);
  bridge.launcherHost = res?.host || null;
  return res;
}

async function checkBridge() {
  const p = activeProfile();
  if (!p) {
    clearLauncherPolls();
    bridge.mode = 'none';
    bridge.detail = 'No host profile configured yet. Add one below to connect to a bridge.';
    bridge.status = null; bridge.session = null; bridge.launchers = null; bridge.launcherUnlocked = false;
    bridge.launcherFeedback = {};
    renderBridge();
    return;
  }
  bridge.detail = `Checking ${p.label} (${p.url})…`;
  renderBridge();
  try {
    await bridgeFetch('/health');
  } catch (err) {
    clearLauncherPolls();
    bridge.mode = 'unreachable';
    bridge.detail = `Unreachable — ${err.message}. The PC may be asleep, the bridge stopped, or this device is off the tailnet.`;
    bridge.status = null; bridge.session = null; bridge.launchers = null; bridge.launcherUnlocked = false;
    renderBridge();
    return;
  }
  try {
    bridge.status = await bridgeFetch('/status');
  } catch {
    bridge.status = null;
  }
  try {
    bridge.session = await bridgeFetch('/session');
  } catch {
    bridge.session = null;
  }
  try {
    await fetchLaunchers();
  } catch {
    bridge.launchers = null;
    bridge.launcherUnlocked = false;
  }
  bridge.mode = controlUnlocked(bridge.status) ? 'live' : 'readonly';
  bridge.detail = bridge.mode === 'live'
    ? `Connected to ${p.label} — live control reported by the bridge.`
    : `Connected to ${p.label} — read-only (bridge v1). Control unlocks only when the bridge reports it.`;
  renderBridge();
}

function componentState(comp) {
  const s = bridge.status;
  if (!s) return null;
  const comps = s.components || s.stack || s.services || s;
  let entry = null;
  if (Array.isArray(comps)) {
    entry = comps.find((c) => c.port === comp.port || String(c.name || c.id || '').toLowerCase().includes(comp.match));
  } else if (comps && typeof comps === 'object') {
    entry = comps[comp.key] || comps[String(comp.port)] || null;
  }
  if (!entry || typeof entry !== 'object') return null;
  const up = entry.up ?? entry.ok ?? entry.online ??
    (typeof entry.status === 'string' ? /up|ok|online|reachable|running/i.test(entry.status) : undefined);
  if (up === undefined) return null;
  return { up: Boolean(up), latency: entry.latencyMs ?? entry.latency_ms ?? entry.latency ?? null };
}

function renderBridge() {
  const chip = $('bridgeStateChip');
  const labels = {
    none: 'Bridge not connected',
    unreachable: 'Bridge unreachable',
    readonly: 'Connected — read-only',
    live: 'Connected — live control',
  };
  $('bridgeStateText').textContent = labels[bridge.mode];
  chip.className = 'chip ' + (bridge.mode === 'live' || bridge.mode === 'readonly' ? 'ok' : bridge.mode === 'unreachable' ? 'bad' : 'warn');
  $('bridgeDetail').textContent = bridge.detail;
  $('stripBridge').textContent = labels[bridge.mode];
  $('stripBridgeSub').textContent =
    bridge.mode === 'none' ? 'Configure a host profile under Mochi & Sessions.' : bridge.detail;

  /* Stack cards. */
  $('stackGrid').innerHTML = STACK.map((c) => {
    const st = bridge.mode === 'readonly' || bridge.mode === 'live' ? componentState(c) : null;
    const dot = st === null ? '' : st.up ? 'ok' : 'bad';
    const stateText = st === null
      ? (bridge.mode === 'none' || bridge.mode === 'unreachable' ? 'status unknown' : 'not reported')
      : st.up ? `up${st.latency != null ? ` · ${st.latency} ms` : ''}` : 'DOWN';
    return `<div class="stack-card">
      <div class="name"><span>${c.name}</span><span class="chip ${dot}"><span class="dot"></span>${stateText}</span></div>
      <div class="role">${c.role}</div>
      <div class="port">:${c.port}</div>
    </div>`;
  }).join('');

  /* Bridge session state (read-only proxy of the candidate). */
  if (bridge.session) {
    $('sessionBridgeNote').textContent = 'Live session state from the bridge (GET /session):';
    $('sessionBridgeBox').textContent = JSON.stringify(bridge.session, null, 2);
  } else {
    $('sessionBridgeNote').textContent = 'Session state from the bridge (GET /session) will appear here when connected.';
    $('sessionBridgeBox').textContent = bridge.mode === 'unreachable'
      ? 'Bridge unreachable — no live session state available.'
      : 'Bridge not connected — no live session state available.';
  }

  /* Config panel gating: list needs a connection; editing needs live control. */
  const connected = bridge.mode === 'readonly' || bridge.mode === 'live';
  $('cfgLoad').disabled = !connected;
  $('cfgState').textContent = connected
    ? 'Connected — load the allowlisted config files from the bridge.'
    : 'Connect a bridge to browse config files.';
  const canEdit = bridge.mode === 'live' && Boolean(bridge.openFile);
  $('cfgContent').disabled = !canEdit;
  $('cfgSave').disabled = !canEdit;
  $('cfgRevert').disabled = !canEdit;
  $('cfgLockNote').textContent = bridge.mode === 'live'
    ? 'Control is live: edits are written via the bridge, backup-first and validated, and can be reverted.'
    : 'Editing is locked: writes require a connected bridge with control unlocked.';

  renderLaunchpad();
}

function launcherStatusChip(status, pollAction) {
  if (pollAction === 'launch') return { cls: 'warn', text: 'starting…' };
  if (pollAction === 'stop') return { cls: 'warn', text: 'stopping…' };
  if (status === 'Running') return { cls: 'ok', text: 'Running' };
  if (status === 'Partial') return { cls: 'warn', text: 'Partial' };
  if (status === 'Stopped') return { cls: 'bad', text: 'Stopped' };
  return { cls: '', text: status || 'Unknown' };
}

function renderLaunchpad() {
  const lockChip = $('launchpadLockChip');
  const lockText = $('launchpadLockText');
  const refreshBtn = $('launchpadRefresh');
  const stateEl = $('launchpadState');
  const grid = $('launchpadGrid');
  if (!grid) return;

  const connected = bridge.mode === 'readonly' || bridge.mode === 'live';
  refreshBtn.disabled = !connected;

  if (bridge.mode === 'none') {
    lockChip.className = 'chip warn';
    lockText.textContent = 'Bridge not connected';
    stateEl.textContent = 'Configure and select a host profile above to load the launcher registry from the bridge.';
    grid.innerHTML = `<div class="stack-card">
      <div class="name"><span>Launchpad</span><span class="chip"><span class="dot"></span>status unknown</span></div>
      <div class="role">No host profile connected — launcher cards appear once a bridge is configured.</div>
    </div>`;
    return;
  }

  if (bridge.mode === 'unreachable') {
    lockChip.className = 'chip bad';
    lockText.textContent = 'Bridge unreachable';
    stateEl.textContent = 'Bridge unreachable — no live launcher registry or stack status available.';
    grid.innerHTML = `<div class="stack-card">
      <div class="name"><span>Launchpad</span><span class="chip bad"><span class="dot"></span>status unknown</span></div>
      <div class="role">Bridge unreachable — launcher data is never shown from stale state when the bridge is down.</div>
    </div>`;
    return;
  }

  if (!bridge.launchers) {
    lockChip.className = 'chip warn';
    lockText.textContent = 'Launcher unavailable';
    stateEl.textContent = 'Connected to bridge, but GET /launchers did not return a registry list.';
    grid.innerHTML = `<div class="stack-card">
      <div class="name"><span>Launchpad</span><span class="chip warn"><span class="dot"></span>not reported</span></div>
      <div class="role">Could not read GET /launchers from this bridge.</div>
    </div>`;
    return;
  }

  if (bridge.launcherUnlocked) {
    lockChip.className = 'chip ok';
    lockText.textContent = 'Launcher unlocked';
    stateEl.textContent = `Showing ${bridge.launchers.length} registry entries from ${bridge.launcherHost || 'bridge'} (launcher_unlocked=true).`;
  } else {
    lockChip.className = 'chip warn';
    lockText.textContent = 'Launcher locked';
    stateEl.textContent = `Showing ${bridge.launchers.length} registry entries from ${bridge.launcherHost || 'bridge'} — Launcher locked on the bridge (launcher_unlocked=false).`;
  }

  grid.innerHTML = bridge.launchers.map((entry) => {
    const id = String(entry.id || '');
    const poll = bridge.launcherPolling[id];
    const pill = launcherStatusChip(entry.status, poll?.action);
    const ports = Array.isArray(entry.ports) ? entry.ports : [];
    const portStatus = entry.port_status && typeof entry.port_status === 'object' ? entry.port_status : {};

    const portsHtml = ports.map((port) => {
      const up = portStatus[String(port)];
      const pCls = up === true ? 'ok' : up === false ? 'bad' : '';
      const pTxt = up === true ? 'up' : up === false ? 'down' : '?';
      return `<span class="port-pill ${pCls}"><span class="dot"></span>:${escapeHtml(port)} ${pTxt}</span>`;
    }).join('');

    const procHtml = entry.probe_process
      ? `<span class="port-pill ${entry.process_up === true ? 'ok' : entry.process_up === false ? 'bad' : ''}"><span class="dot"></span>${escapeHtml(entry.probe_process)} ${entry.process_up === true ? 'up' : entry.process_up === false ? 'down' : '?'}</span>`
      : '';

    const probeRow = (portsHtml || procHtml)
      ? `<div class="l-ports">${portsHtml}${procHtml}</div>`
      : '';

    const metaParts = [];
    if (entry.last_result) metaParts.push(`Last result: ${entry.last_result}`);
    if (entry.last_launch_at) metaParts.push(`Last launch: ${entry.last_launch_at}`);
    if (entry.last_stop_at) metaParts.push(`Last stop: ${entry.last_stop_at}`);
    const metaHtml = metaParts.length
      ? `<div class="l-meta">${escapeHtml(metaParts.join(' · '))}</div>`
      : '';

    const fb = bridge.launcherFeedback[id];
    const fbHtml = fb && fb.text
      ? `<div class="l-feedback ${escapeHtml(fb.tone || 'info')}">${escapeHtml(fb.text)}</div>`
      : '';

    let actionsHtml = '';
    if (entry.launchable === true) {
      const busy = Boolean(poll);
      const launchLabel = poll?.action === 'launch' ? 'Starting…' : 'Launch';
      const stopLabel = poll?.action === 'stop' ? 'Stopping…' : 'Stop';
      const hasStop = entry.stop_script !== null && entry.stop_script !== undefined && entry.stop_script !== '';
      actionsHtml = `<div class="l-actions">
        <button class="btn small" data-launch-action="launch" data-launch-id="${escapeHtml(id)}" ${busy ? 'disabled' : ''}>${launchLabel}</button>
        ${hasStop ? `<button class="btn small danger" data-launch-action="stop" data-launch-id="${escapeHtml(id)}" ${busy ? 'disabled' : ''}>${stopLabel}</button>` : ''}
      </div>`;
    } else {
      actionsHtml = `<div class="l-actions">
        <span class="l-reason">${escapeHtml(entry.state_label || entry.state || 'Not launchable')}</span>
      </div>`;
    }

    return `<div class="launcher-card" data-launcher-card="${escapeHtml(id)}">
      <div class="l-head">
        <div class="l-title">${escapeHtml(entry.label || id)}</div>
        <span class="chip ${pill.cls}"><span class="dot"></span>${escapeHtml(pill.text)}</span>
      </div>
      <div class="l-desc" title="${escapeHtml(entry.description || '')}">${escapeHtml(entry.description || '')}</div>
      <div class="l-state">${escapeHtml(entry.state_label || entry.state || '')}</div>
      ${probeRow}
      ${metaHtml}
      ${fbHtml}
      ${actionsHtml}
    </div>`;
  }).join('');
}

function startLauncherConvergencePoll(entryId, action) {
  if (bridge.launcherPolling[entryId]?.timerId) {
    clearTimeout(bridge.launcherPolling[entryId].timerId);
  }
  const startedAt = Date.now();
  const maxDurationMs = 180000;
  const intervalMs = 3000;

  const tick = async () => {
    try {
      await fetchLaunchers();
      try { bridge.status = await bridgeFetch('/status'); } catch { /* keep going */ }
    } catch (err) {
      delete bridge.launcherPolling[entryId];
      bridge.mode = 'unreachable';
      bridge.detail = `Unreachable — ${err.message}. The PC may be asleep, the bridge stopped, or this device is off the tailnet.`;
      bridge.status = null; bridge.session = null; bridge.launchers = null;
      renderBridge();
      return;
    }

    const entry = (bridge.launchers || []).find((x) => x.id === entryId);
    if (!entry) {
      delete bridge.launcherPolling[entryId];
      renderBridge();
      return;
    }

    const ports = Array.isArray(entry.ports) ? entry.ports : [];
    const pMap = entry.port_status && typeof entry.port_status === 'object' ? entry.port_status : {};
    const downPorts = ports.filter((p) => pMap[String(p)] !== true).map((p) => `:${p}`);
    const upPorts = ports.filter((p) => pMap[String(p)] === true).map((p) => `:${p}`);
    const elapsedSec = Math.round((Date.now() - startedAt) / 1000);

    if (action === 'launch') {
      if (entry.status === 'Running') {
        delete bridge.launcherPolling[entryId];
        bridge.launcherFeedback[entryId] = {
          tone: 'ok',
          text: `Running — all probed ports are up (${ports.map((p) => `:${p}`).join(', ') || 'verified'}).`,
        };
        renderBridge();
        return;
      }
      if (Date.now() - startedAt >= maxDurationMs) {
        delete bridge.launcherPolling[entryId];
        const stillDown = downPorts.length ? downPorts.join(', ') : 'process probe still down';
        bridge.launcherFeedback[entryId] = {
          tone: 'warn',
          text: `Timed out after 180s (status: ${entry.status}). Still down: ${stillDown}.`,
        };
        renderBridge();
        return;
      }
      bridge.launcherFeedback[entryId] = {
        tone: 'info',
        text: `starting… (${elapsedSec}s / 180s) — status: ${entry.status}${downPorts.length ? ` · waiting on ${downPorts.join(', ')}` : ''}`,
      };
    } else {
      const allPortsDark = ports.every((p) => pMap[String(p)] === false);
      if (entry.status === 'Stopped' && allPortsDark) {
        delete bridge.launcherPolling[entryId];
        bridge.launcherFeedback[entryId] = {
          tone: 'ok',
          text: 'Stopped — all probed ports are dark.',
        };
        renderBridge();
        return;
      }
      if (Date.now() - startedAt >= maxDurationMs) {
        delete bridge.launcherPolling[entryId];
        const stillUp = upPorts.length ? upPorts.join(', ') : 'process probe still up';
        bridge.launcherFeedback[entryId] = {
          tone: 'warn',
          text: `Stop timed out after 180s (status: ${entry.status}). Still up: ${stillUp}.`,
        };
        renderBridge();
        return;
      }
      bridge.launcherFeedback[entryId] = {
        tone: 'info',
        text: `stopping… (${elapsedSec}s / 180s) — status: ${entry.status}${upPorts.length ? ` · still up: ${upPorts.join(', ')}` : ''}`,
      };
    }

    renderBridge();
    bridge.launcherPolling[entryId].timerId = setTimeout(tick, intervalMs);
  };

  bridge.launcherPolling[entryId] = {
    action,
    startedAt,
    timerId: setTimeout(tick, intervalMs),
  };
  renderBridge();
}

async function handleLauncherAction(entryId, action) {
  const list = bridge.launchers || [];
  const entry = list.find((x) => x.id === entryId);
  if (!entry || entry.launchable !== true) return;

  const label = entry.label || entry.id;
  if (action === 'stop') {
    if (!window.confirm(`Stop ${label}? This will run its registered stop script on ${entry.host || 'the host'}.`)) {
      return;
    }
  } else if (action === 'launch' && entry.confirm === true) {
    if (!window.confirm(`Launch ${label} on ${entry.host || 'the host'}?`)) {
      return;
    }
  }

  const route = action === 'stop'
    ? `/launch/${encodeURIComponent(entry.id)}/stop`
    : `/launch/${encodeURIComponent(entry.id)}`;

  bridge.launcherFeedback[entry.id] = {
    tone: 'info',
    text: action === 'stop' ? 'Sending stop request to bridge…' : 'Sending launch request to bridge…',
  };
  renderLaunchpad();

  let res;
  try {
    res = await bridgePostLauncher(route);
  } catch (err) {
    clearLauncherPolls();
    bridge.mode = 'unreachable';
    bridge.detail = `Unreachable — ${err.message}. The PC may be asleep, the bridge stopped, or this device is off the tailnet.`;
    bridge.status = null; bridge.session = null; bridge.launchers = null;
    renderBridge();
    return;
  }

  const data = res.data || {};
  if (res.status === 403 && data.error === 'launcher_locked') {
    bridge.launcherUnlocked = false;
    bridge.launcherFeedback[entry.id] = {
      tone: 'info',
      text: 'Launcher locked on the bridge (launcher_unlocked=false)',
    };
    renderLaunchpad();
    return;
  }

  if (!res.ok) {
    const code = data.error ? `${data.error}: ` : '';
    const msg = data.message || `Bridge returned HTTP ${res.status}`;
    bridge.launcherFeedback[entry.id] = {
      tone: 'bad',
      text: `${code}${msg}`,
    };
    try { await fetchLaunchers(); } catch { /* ignore */ }
    renderLaunchpad();
    return;
  }

  if (data.result === 'already_running') {
    bridge.launcherFeedback[entry.id] = {
      tone: 'info',
      text: `Already running (result: already_running — no duplicate process spawned).`,
    };
    try { await fetchLaunchers(); } catch { /* ignore */ }
    renderLaunchpad();
    return;
  }

  if (data.result === 'already_stopped') {
    bridge.launcherFeedback[entry.id] = {
      tone: 'info',
      text: `Already stopped (result: already_stopped).`,
    };
    try { await fetchLaunchers(); } catch { /* ignore */ }
    renderLaunchpad();
    return;
  }

  if (action === 'launch') {
    bridge.launcherFeedback[entry.id] = {
      tone: 'info',
      text: 'starting… polling GET /launchers every 3s (up to 180s) for ports to converge.',
    };
    try { await fetchLaunchers(); } catch { /* ignore */ }
    startLauncherConvergencePoll(entry.id, 'launch');
  } else {
    bridge.launcherFeedback[entry.id] = {
      tone: 'info',
      text: 'stopping… polling GET /launchers every 3s (up to 180s) until Stopped and ports dark.',
    };
    try { await fetchLaunchers(); } catch { /* ignore */ }
    startLauncherConvergencePoll(entry.id, 'stop');
  }
}

function initLaunchpad() {
  $('launchpadRefresh').addEventListener('click', async () => {
    if (bridge.mode !== 'readonly' && bridge.mode !== 'live') return;
    $('launchpadState').textContent = 'Refreshing launcher registry…';
    try {
      await fetchLaunchers();
      renderLaunchpad();
    } catch (err) {
      clearLauncherPolls();
      bridge.mode = 'unreachable';
      bridge.detail = `Unreachable — ${err.message}. The PC may be asleep, the bridge stopped, or this device is off the tailnet.`;
      bridge.status = null; bridge.session = null; bridge.launchers = null;
      renderBridge();
    }
  });

  $('launchpadGrid').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-launch-action]');
    if (!btn || btn.disabled) return;
    const action = btn.dataset.launchAction;
    const id = btn.dataset.launchId;
    if (!id || (action !== 'launch' && action !== 'stop')) return;
    handleLauncherAction(id, action);
  });
}

function renderHosts() {
  const h = getHosts();
  const sel = $('hostActive');
  sel.innerHTML = h.profiles.length
    ? h.profiles.map((p) => `<option value="${p.id}">${escapeHtml(p.label)} — ${escapeHtml(p.url)}</option>`).join('')
    : '<option value="">No profiles yet</option>';
  if (h.activeId) sel.value = h.activeId;
  const p = activeProfile();
  if (p) { $('hostLabel').value = p.label; $('hostUrl').value = p.url; $('hostToken').value = p.token; }
}

function initHosts() {
  renderHosts();
  $('hostActive').addEventListener('change', () => {
    const h = getHosts();
    h.activeId = $('hostActive').value || null;
    store.set('ds.hosts.v1', h);
    renderHosts();
    clearLauncherPolls();
    bridge.launcherFeedback = {};
    checkBridge();
  });
  $('hostSave').addEventListener('click', () => {
    const label = $('hostLabel').value.trim();
    const url = $('hostUrl').value.trim();
    const token = $('hostToken').value.trim();
    if (!label || !url || !token) { $('bridgeDetail').textContent = 'Label, bridge URL, and token are all required.'; return; }
    const h = getHosts();
    const existing = h.profiles.find((p) => p.id === h.activeId);
    if (existing && existing.label === label) {
      existing.url = url; existing.token = token;
    } else {
      const p = { id: uid(), label, url, token };
      h.profiles.push(p);
      h.activeId = p.id;
    }
    store.set('ds.hosts.v1', h);
    renderHosts();
    clearLauncherPolls();
    bridge.launcherFeedback = {};
    checkBridge();
  });
  $('hostDelete').addEventListener('click', () => {
    const h = getHosts();
    if (!h.activeId) return;
    h.profiles = h.profiles.filter((p) => p.id !== h.activeId);
    h.activeId = h.profiles[0]?.id ?? null;
    store.set('ds.hosts.v1', h);
    $('hostLabel').value = ''; $('hostUrl').value = ''; $('hostToken').value = '';
    renderHosts();
    clearLauncherPolls();
    bridge.launcherFeedback = {};
    if (activeProfile()) {
      checkBridge();
    } else {
      bridge.mode = 'none';
      bridge.detail = 'Profile deleted. Add a host profile to connect to a bridge.';
      bridge.status = null; bridge.session = null; bridge.launchers = null; bridge.launcherUnlocked = false;
      renderBridge();
    }
  });
  $('bridgeCheck').addEventListener('click', checkBridge);
  $('bridgeRefresh').addEventListener('click', checkBridge);
  renderBridge();
  if (activeProfile()) checkBridge();
}

/* ---------- config panel ---------- */
function initConfig() {
  $('cfgLoad').addEventListener('click', async () => {
    $('cfgState').textContent = 'Loading config list…';
    try {
      const res = await bridgeFetch('/config');
      const files = res.items || res.files || (Array.isArray(res) ? res : []);
      bridge.configFiles = files;
      $('cfgList').innerHTML = files.map((f, i) => {
        const name = f.id || f.name || f.path || `file-${i}`;
        const meta = [f.sha256 ? `sha ${String(f.sha256).slice(0, 10)}…` : f.hash ? `sha ${String(f.hash).slice(0, 10)}…` : '', f.last_modified || f.modified || f.lastModified || '', f.effective_when || f.effectiveWhen ? `effective: ${f.effective_when || f.effectiveWhen}` : '']
          .filter(Boolean).join(' · ');
        return `<li><span class="grow"><strong>${escapeHtml(name)}</strong>${meta ? ` <span class="meta">${escapeHtml(meta)}</span>` : ''}</span>
          <button class="btn small secondary" data-cfg-view="${i}">View</button></li>`;
      }).join('') || '<li><span class="note">The bridge returned no config files.</span></li>';
      $('cfgState').textContent = `${files.length} config file(s) available from the bridge.`;
    } catch (err) {
      $('cfgState').textContent = `Config list failed: ${err.message}`;
    }
  });

  $('cfgList').addEventListener('click', async (e) => {
    const idx = e.target.dataset.cfgView;
    if (idx === undefined) return;
    const f = bridge.configFiles[+idx];
    if (!f) return;
    const id = f.id || f.path || f.name;
    try {
      const res = await bridgeFetch(`/config/item?id=${encodeURIComponent(id)}`);
      bridge.openFile = id;
      $('cfgContent').value = typeof res === 'string' ? res : res.content ?? res.raw ?? JSON.stringify(res, null, 2);
      renderBridge(); /* re-gates the editor based on live control */
      $('cfgState').textContent = `Viewing ${id}.`;
    } catch (err) {
      $('cfgState').textContent = `Could not load ${id}: ${err.message}`;
    }
  });

  /* Writes are control-class: the buttons stay disabled unless the bridge
     reports live control (see renderBridge), so these handlers only run then.
     The bridge performs backup-first + validation + audit on its side. */
  $('cfgSave').addEventListener('click', async () => {
    if (!bridge.openFile) return;
    try {
      await bridgeFetch(`/config/item?id=${encodeURIComponent(bridge.openFile)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: $('cfgContent').value }),
      });
      $('cfgState').textContent = `Saved ${bridge.openFile} via the bridge (backup taken bridge-side).`;
    } catch (err) {
      $('cfgState').textContent = `Save failed: ${err.message}`;
    }
  });
  $('cfgRevert').addEventListener('click', async () => {
    if (!bridge.openFile) return;
    try {
      await bridgeFetch('/config/revert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: bridge.openFile }),
      });
      $('cfgState').textContent = `Reverted ${bridge.openFile} to the bridge's most recent backup.`;
    } catch (err) {
      $('cfgState').textContent = `Revert failed: ${err.message}`;
    }
  });
}

/* ================= SESSIONS (nine-stage lifecycle) ================= */

const STAGES = [
  { name: 'Prepare Session', items: ['Copy set generated in Copy Studio', 'stream-config.json exported or sent to the bridge', 'Game + category confirmed', 'Discord post ready'] },
  { name: 'Pre-Flight Validation', items: ['Mic + game audio levels checked in OBS', 'Mochi stack status green (bridge /status or manual check)', 'Voice path test heard on the stream mix', 'Starting Soon scene set'] },
  { name: 'Go Live', items: ['Go-live message posted', 'Title + category verified on the live channel', 'Welcome message sent'] },
  { name: 'Active Stream Operations', items: ['Chat monitored', 'Mochi responding in character', 'Breaks announced before stepping away'] },
  { name: 'Break / Intermission', items: ['BRB scene up', 'Microphone muted on BRB', 'Return mentioned in chat'] },
  { name: 'Community Interaction', items: ['Shoutouts / raids handled', 'Requests or prompts pulled from the queue', 'Cross-promo posted'] },
  { name: 'End Stream', items: ['Raid-out chosen', 'Goodbye message posted', 'Stream ended in OBS'] },
  { name: 'Post-Stream Review', items: ['Review notes written below', 'Clips / moments flagged', 'VOD state checked'] },
  { name: 'Archive & Backup', items: ['VOD pulled / archived', 'Session files backed up', 'Planner updated for the next stream'] },
];

const getSessions = () => store.get('ds.sessions.v1', []);
const saveSessions = (s) => store.set('ds.sessions.v1', s);
let activeSessionId = store.get('ds.sessions.active', null);

function activeSession() {
  const all = getSessions();
  return all.find((s) => s.id === activeSessionId) || all[0] || null;
}

function renderSessions() {
  const all = getSessions();
  const sel = $('sessActive');
  sel.innerHTML = all.length
    ? all.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')
    : '<option value="">No sessions yet</option>';
  const s = activeSession();
  if (s) sel.value = s.id;

  if (!s) {
    $('stageList').innerHTML = '<li class="note">Create a session to start the lifecycle checklist.</li>';
    $('sessNotes').value = '';
    return;
  }
  activeSessionId = s.id;
  $('stageList').innerHTML = STAGES.map((stage, si) => {
    const checks = s.checks[si] || [];
    const done = stage.items.every((_, ii) => checks[ii]);
    const isCurrent = !done && STAGES.slice(0, si).every((prev, pi) => prev.items.every((_, ii) => (s.checks[pi] || [])[ii]));
    return `<li class="stage ${done ? 'done' : ''} ${isCurrent ? 'current' : ''}">
      <div class="stage-head">
        <span class="stage-name">${si + 1}. ${stage.name}</span>
        <span class="chip ${done ? 'ok' : isCurrent ? 'warn' : ''}"><span class="dot"></span>${done ? 'Done' : isCurrent ? 'Current' : 'Pending'}</span>
      </div>
      <ul>${stage.items.map((item, ii) => `
        <li><label><input type="checkbox" data-stage="${si}" data-item="${ii}" ${checks[ii] ? 'checked' : ''} /> <span>${item}</span></label></li>`).join('')}
      </ul>
    </li>`;
  }).join('');
  $('sessNotes').value = s.notes || '';
}

function initSessions() {
  $('sessCreate').addEventListener('click', () => {
    const name = $('sessName').value.trim() || `Session — ${new Date().toLocaleDateString('en-US')}`;
    const s = { id: uid(), name, createdAt: Date.now(), checks: STAGES.map((st) => st.items.map(() => false)), notes: '' };
    const all = getSessions();
    all.unshift(s);
    saveSessions(all);
    activeSessionId = s.id;
    store.set('ds.sessions.active', s.id);
    $('sessName').value = '';
    renderSessions();
  });
  $('sessActive').addEventListener('change', () => {
    activeSessionId = $('sessActive').value;
    store.set('ds.sessions.active', activeSessionId);
    renderSessions();
  });
  $('sessDelete').addEventListener('click', () => {
    const s = activeSession();
    if (!s) return;
    saveSessions(getSessions().filter((x) => x.id !== s.id));
    activeSessionId = null;
    store.set('ds.sessions.active', null);
    renderSessions();
  });
  $('stageList').addEventListener('change', (e) => {
    const s = activeSession();
    if (!s || !e.target.matches('input[type="checkbox"]')) return;
    const si = +e.target.dataset.stage;
    const ii = +e.target.dataset.item;
    s.checks[si][ii] = e.target.checked;
    saveSessions(getSessions().map((x) => (x.id === s.id ? s : x)));
    renderSessions();
  });
  $('sessNotes').addEventListener('input', () => {
    const s = activeSession();
    if (!s) return;
    s.notes = $('sessNotes').value;
    saveSessions(getSessions().map((x) => (x.id === s.id ? s : x)));
  });
  renderSessions();
}

/* ================= WEEK PLANNER ================= */

function renderPlanner() {
  const t = etToday();
  const todayUtc = utcDate(t.y, t.m, t.d);
  const monday = addDays(todayUtc, -((t.dow + 6) % 7)); /* Monday of this ET week */
  const entries = store.get('ds.planner.v1', {});
  const first = labelOf(monday);
  const last = labelOf(addDays(monday, 6));
  $('plannerRange').textContent =
    `Week of ${first} – ${last}. The ruled Mon–Sun pattern, pre-filled on real dates. Saturday is family day: scheduling anything there requires a typed override note — no exceptions.`;

  $('weekGrid').innerHTML = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    const dow = date.getUTCDay();
    const iso = isoOf(date);
    const p = PATTERN[dow];
    const entry = entries[iso] || { text: '', note: '' };
    const isToday = iso === isoOf(todayUtc);
    return `<div class="day-card ${isToday ? 'today' : ''}">
      <div class="dow">${DOW_LONG[dow]} <span class="meta" style="color:var(--ink-faint);font-size:0.8rem;">${labelOf(date)}${isToday ? ' · today' : ''}</span></div>
      <div class="pat">${p.who} — ${p.series}<br />${p.time}</div>
      <textarea data-day="${iso}" placeholder="${dow === 6 ? 'Family day — override note required' : 'Plan for this day…'}">${escapeHtml(entry.text)}</textarea>
      ${dow === 6 ? `<input type="text" data-day-note="${iso}" placeholder="Saturday override note (required)" value="${escapeHtml(entry.note || '')}" style="margin-top:0.4rem;" />` : ''}
      <div class="row" style="margin-top:0.45rem;"><button class="btn small" data-day-save="${iso}" data-dow="${dow}">Save</button></div>
    </div>`;
  }).join('');
}

function initPlanner() {
  renderPlanner();
  $('weekGrid').addEventListener('click', (e) => {
    const iso = e.target.dataset.daySave;
    if (!iso) return;
    const dow = +e.target.dataset.dow;
    const text = document.querySelector(`textarea[data-day="${iso}"]`).value.trim();
    const noteEl = document.querySelector(`input[data-day-note="${iso}"]`);
    const note = noteEl ? noteEl.value.trim() : '';
    /* Hard Saturday guard: no note, no save — by household rule. */
    if (dow === 6 && text && !note) {
      $('plannerError').textContent = 'Saturday is family day. Type an override note to schedule anything on Saturday.';
      return;
    }
    $('plannerError').textContent = '';
    const entries = store.get('ds.planner.v1', {});
    entries[iso] = { text, note };
    store.set('ds.planner.v1', entries);
    e.target.textContent = 'Saved ✓';
    setTimeout(() => (e.target.textContent = 'Save'), 1200);
  });
}

/* ================= QUEUE & PROMPTS ================= */

function renderQueue() {
  const anon = $('queueAnon').checked;
  const q = store.get('ds.queue.v1', []);
  $('qList').innerHTML = q.map((item) => `
    <li>
      <input type="checkbox" data-q-done="${item.id}" ${item.done ? 'checked' : ''} style="accent-color:var(--teal);width:1rem;height:1rem;" />
      <span class="grow" ${item.done ? 'style="text-decoration:line-through;opacity:0.65;"' : ''}>
        ${escapeHtml(item.item)} <span class="meta">— ${anon ? 'Anonymous requester' : escapeHtml(item.requester || 'Unknown')}</span>
      </span>
      <button class="btn small danger" data-q-del="${item.id}">Delete</button>
    </li>`).join('') || '<li><span class="note">Queue is empty.</span></li>';
}

function initQueue() {
  $('queueAnon').addEventListener('change', renderQueue);
  $('qAdd').addEventListener('click', () => {
    const item = $('qItem').value.trim();
    if (!item) return;
    const q = store.get('ds.queue.v1', []);
    q.push({ id: uid(), requester: $('qRequester').value.trim(), item, done: false });
    store.set('ds.queue.v1', q);
    $('qItem').value = ''; $('qRequester').value = '';
    renderQueue();
  });
  $('qList').addEventListener('click', (e) => {
    const del = e.target.dataset.qDel;
    if (del) { store.set('ds.queue.v1', store.get('ds.queue.v1', []).filter((x) => x.id !== del)); renderQueue(); }
  });
  $('qList').addEventListener('change', (e) => {
    const id = e.target.dataset.qDone;
    if (!id) return;
    const q = store.get('ds.queue.v1', []);
    const item = q.find((x) => x.id === id);
    if (item) { item.done = e.target.checked; store.set('ds.queue.v1', q); renderQueue(); }
  });
  renderQueue();

  /* Prompt Jar. */
  const renderJar = () => {
    const jar = store.get('ds.jar.v1', []);
    $('jarList').innerHTML = jar.map((p, i) => `
      <li><span class="grow">${escapeHtml(p)}</span><button class="btn small danger" data-jar-del="${i}">Remove</button></li>`).join('')
      || '<li><span class="note">The jar is empty — add some prompts.</span></li>';
  };
  $('jarAdd').addEventListener('click', () => {
    const v = $('jarInput').value.trim();
    if (!v) return;
    const jar = store.get('ds.jar.v1', []);
    jar.push(v);
    store.set('ds.jar.v1', jar);
    $('jarInput').value = '';
    renderJar();
  });
  $('jarDraw').addEventListener('click', () => {
    const jar = store.get('ds.jar.v1', []);
    $('jarResult').textContent = jar.length
      ? `🎨 ${jar[Math.floor(Math.random() * jar.length)]}`
      : 'The jar is empty — nothing to draw yet.';
  });
  $('jarList').addEventListener('click', (e) => {
    const idx = e.target.dataset.jarDel;
    if (idx === undefined) return;
    const jar = store.get('ds.jar.v1', []);
    jar.splice(+idx, 1);
    store.set('ds.jar.v1', jar);
    renderJar();
  });
  renderJar();
}

/* ================= COMMISSION PREP ================= */

const CP_TYPES = { headshot: 'Headshot', bust: 'Bust-up', full: 'Full body' };
const CP_PRICES = { headshot: 30, bust: 50, full: 80 };

function renderPrep() {
  const anon = $('cpAnon').checked;
  const type = $('cpType').value;
  const showPrices = $('cpShowPrices').checked;
  $('cpPrices').style.display = showPrices ? 'block' : 'none';
  $('cpPriceNote').textContent = showPrices
    ? 'Prices shown — remember the commercial-licence note for stream/business use.'
    : 'Prices hidden — copy points to the VGen page.';
  const lines = [
    `Commission prep — ${CP_TYPES[type]}`,
    `Client: ${anon ? 'Anonymous' : $('cpClient').value.trim() || '—'}`,
    `Subject: ${$('cpSubject').value.trim() || '—'}`,
    `Details: ${$('cpDetails').value.trim() || '—'}`,
    `Deadline: ${$('cpDeadline').value.trim() || '—'}`,
    showPrices ? `Price: from $${CP_PRICES[type]} (see VGen for full terms)` : 'Pricing & booking: https://vgen.co/amaderrp',
  ];
  $('cpSheet').textContent = lines.join('\n');
}

function initPrep() {
  ['cpAnon', 'cpType', 'cpShowPrices'].forEach((id) => $(id).addEventListener('change', renderPrep));
  ['cpClient', 'cpSubject', 'cpDetails', 'cpDeadline'].forEach((id) => $(id).addEventListener('input', renderPrep));
  $('cpCopy').addEventListener('click', (e) => copyText($('cpSheet').textContent, e.target));
  renderPrep();
}

/* ================= PROMO & SOCIAL ================= */

function initPromo() {
  const saved = store.get('ds.promo.v1', {});
  if (saved.derrps) $('promoInviteDerrps').value = saved.derrps;
  if (saved.gloop) $('promoInviteGloop').value = saved.gloop;
  const persist = () => store.set('ds.promo.v1', {
    derrps: $('promoInviteDerrps').value.trim(),
    gloop: $('promoInviteGloop').value.trim(),
  });
  $('promoInviteDerrps').addEventListener('input', persist);
  $('promoInviteGloop').addEventListener('input', persist);

  $('promoGenerate').addEventListener('click', () => {
    const c = currentCopy;
    const derrpsInvite = $('promoInviteDerrps').value.trim();
    const gloopInvite = $('promoInviteGloop').value.trim();
    const name = CREATOR_NAME[c.creator] || 'NeoDerrp';

    $('promoDerrps').textContent =
      `${c.discord}${derrpsInvite ? `\nJoin us: ${derrpsInvite}` : ''}`;

    /* Art Gloop variant: art-first framing, invite only if the user pasted one. */
    $('promoGloop').textContent =
      `🪿 ${name} is live — ${c.hook || c.series}!\nArt, requests, and goose shenanigans, 5:00–10:00 PM ET. Commissions via VGen: https://vgen.co/amaderrp${gloopInvite ? `\nJoin Art Gloop: ${gloopInvite}` : ''}`;

    $('promoYoutube').textContent =
      `${c.title}\n\n${c.goLive}\n\n${c.welcome}\n\nWatch live on Twitch — ${name}.${derrpsInvite ? `\nDiscord: ${derrpsInvite}` : ''}`;

    $('promoShorts').textContent =
      `${c.hook || c.title} 🎬 Full stream tonight 5–10 PM ET on Twitch — ${name} · ${c.series}`;

    $('promoInsta').textContent =
      `${c.title}\n\n${c.hook}\nLive tonight 5:00–10:00 PM ET on Twitch.\nLurkers welcome — come say hi!${derrpsInvite ? `\nDiscord: ${derrpsInvite}` : ''}`;

    $('promoState').textContent = gloopInvite
      ? 'Generated from the current copy set, with both invites.'
      : 'Generated. Heads-up: no Art Gloop invite is set, so that variant has no join link.';
    $('promoState').className = gloopInvite ? 'note' : 'error-text';
  });
}

/* ================= METAPHOR COMPANION HUB =================
   Configurable link hub only: all three URLs ship empty and persist per-browser
   in localStorage. No hardcoded addresses, no iframe, no status polling, and
   the Launcher slot (spec entry #4) stays disabled until built under Gate L. */

function appendOverlaySafeParams(baseUrl) {
  const raw = baseUrl.trim();
  if (!raw) return '';
  if (raw.includes('panels=enemy,recs')) return raw;
  const hashIdx = raw.indexOf('#');
  const beforeHash = hashIdx === -1 ? raw : raw.slice(0, hashIdx);
  const hash = hashIdx === -1 ? '' : raw.slice(hashIdx);
  const sep = beforeHash.includes('?') ? (beforeHash.endsWith('?') || beforeHash.endsWith('&') ? '' : '&') : '?';
  return `${beforeHash}${sep}panels=enemy,recs${hash}`;
}

function initCompanion() {
  const saved = store.get('ds.companion.v1', {});
  if (saved.tracker) $('compTrackerUrl').value = saved.tracker;
  if (saved.local) $('compLocalUrl').value = saved.local;
  if (saved.overlay) $('compOverlayUrl').value = saved.overlay;

  const syncCard = (inputId, openId, noteId) => {
    const val = $(inputId).value.trim();
    const hasUrl = Boolean(val);
    $(openId).disabled = !hasUrl;
    $(noteId).textContent = hasUrl ? 'Opens stored address in a new tab.' : 'No address set yet';
    return val;
  };

  const renderCompanion = () => {
    const tracker = syncCard('compTrackerUrl', 'compTrackerOpen', 'compTrackerNote');
    const local = syncCard('compLocalUrl', 'compLocalOpen', 'compLocalNote');
    const overlay = syncCard('compOverlayUrl', 'compOverlayOpen', 'compOverlayNote');

    store.set('ds.companion.v1', { tracker, local, overlay });

    const hasOverlay = Boolean(overlay);
    $('compOverlayReadout').textContent = hasOverlay ? overlay : 'No address set yet';
    $('compOverlayCopySafe').disabled = !hasOverlay;
    $('compOverlayCopyBase').disabled = !hasOverlay;
  };

  ['compTrackerUrl', 'compLocalUrl', 'compOverlayUrl'].forEach((id) =>
    $(id).addEventListener('input', renderCompanion)
  );

  const openStored = (inputId) => {
    const val = $(inputId).value.trim();
    if (!val) return;
    window.open(val, '_blank', 'noopener');
  };

  $('compTrackerOpen').addEventListener('click', () => openStored('compTrackerUrl'));
  $('compLocalOpen').addEventListener('click', () => openStored('compLocalUrl'));
  $('compOverlayOpen').addEventListener('click', () => openStored('compOverlayUrl'));

  $('compOverlayCopySafe').addEventListener('click', (e) => {
    const val = $('compOverlayUrl').value.trim();
    if (!val) return;
    copyText(appendOverlaySafeParams(val), e.target);
  });

  $('compOverlayCopyBase').addEventListener('click', (e) => {
    const val = $('compOverlayUrl').value.trim();
    if (!val) return;
    copyText(val, e.target);
  });

  renderCompanion();
}

/* ================= boot ================= */
initNav();
renderStatusStrip();
setInterval(renderStatusStrip, 60000);
initCopyStudio();
initLaunchpad();
initHosts();
initConfig();
initSessions();
initPlanner();
initQueue();
initPrep();
initPromo();
initCompanion();
