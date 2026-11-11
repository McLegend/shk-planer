import { createStore } from './store.js';

// ================= Hilfsfunktionen =================
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const mondayOf = d => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const isoWeek = d => {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  return Math.ceil(((t - new Date(Date.UTC(t.getUTCFullYear(), 0, 1))) / 864e5 + 1) / 7);
};
const toMin = s => { const [h, m] = String(s || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
const fromMin = m => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
const todayKey = () => ymd(new Date());
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const narrow = matchMedia('(max-width: 760px)');
const sortJobs = js => js.sort((a, b) => (a.datum + a.von).localeCompare(b.datum + b.von));

const ICONS = {
  back: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
  left: 'M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z',
  right: 'M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
  cal: 'M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z',
  add: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  search: 'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
  turn: 'M21.71 11.29l-9-9a.996.996 0 0 0-1.41 0l-9 9a.996.996 0 0 0 0 1.41l9 9c.39.39 1.02.39 1.41 0l9-9a.996.996 0 0 0 0-1.41zM14 14.5V12h-4v3H8v-4c0-.55.45-1 1-1h5V7.5l3.5 3.5-3.5 3.5z',
  person: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
  place: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
  phone: 'M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z',
  notes: 'M3 18h12v-2H3v2zM3 6v2h18V6H3zm0 7h18v-2H3v2z',
  clock: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z',
  info: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
  edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  trash: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
  map: 'M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z',
};
ICONS.download = 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z';
const icon = n => `<svg class="i" viewBox="0 0 24 24"><path d="${ICONS[n]}"/></svg>`;

// ---- Aufträge: Status, Zeiten, Adresse ----
const finishedAt = j => j.status === 'fertig' && j.fertigAm ? new Date(j.fertigAm) : null;
// Ende = Zeitpunkt des Fertig-Klicks (wenn am selben Tag)
const endMin = j => { const f = finishedAt(j); return f && ymd(f) === j.datum ? f.getHours() * 60 + f.getMinutes() : null; };
const stateOf = j => j.status === 'fertig' ? 'erledigt' : j.datum < todayKey() ? 'ueberfaellig' : 'geplant';
const STATE_LABEL = { geplant: 'Geplant', ueberfaellig: 'Überfällig', erledigt: 'Erledigt' };
// Monteur hat „Angekommen“ gedrückt, ist aber noch nicht fertig
const onSite = j => j.status !== 'fertig' && !!j.angekommenAm;
const cardState = j => onSite(j) ? 'vorort' : stateOf(j);
const badge = j => onSite(j) ? '<span class="badge vorort">Vor Ort</span>' : (s => `<span class="badge ${s}">${STATE_LABEL[s]}</span>`)(stateOf(j));
const hm = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const arrivedAt = j => j.angekommenAm ? new Date(j.angekommenAm) : null;
// Ankunftszeit in Minuten (wenn am selben Tag)
const arrMin = j => { const a = arrivedAt(j); return a && ymd(a) === j.datum ? a.getHours() * 60 + a.getMinutes() : null; };
// Schätzung des Monteurs vor Ort: Ankunft + „dauerVorOrt“
const estEnd = j => j.dauerVorOrt && arrMin(j) !== null ? arrMin(j) + Number(j.dauerVorOrt) : null;
// Ende in der Plantafel: echte Fertig-Zeit, sonst Schätzung vor Ort, sonst Beginn + geplante Dauer (ohne Angabe 1 Std.)
const planEnd = j => endMin(j) ?? estEnd(j) ?? toMin(j.von) + (Number(j.dauer) || 60);
// Geplantes Ende laut Büro und wie viele Minuten der Monteur darüber liegt („Dauert länger“)
const plannedEnd = j => toMin(j.von) + (Number(j.dauer) || 60);
// Späte Ankunft zählt nicht mit: nur so viel, wie die Arbeit selbst länger dauert als geplant (auf 5 Min. gerundet)
const overrun = j => {
  const e = estEnd(j);
  if (j.status === 'fertig' || e === null) return 0;
  const over = Math.min(e - plannedEnd(j), Number(j.dauerVorOrt) - (Number(j.dauer) || 60));
  return over > 0 ? Math.max(5, Math.round(over / 5) * 5) : 0;
};
// Ein offener Auftrag, der durch die Verlängerung eines früheren Auftrags desselben Monteurs überschnitten wird
const clashedBy = (j, list) => j.status !== 'fertig' && list.some(o => o.id !== j.id && o.mitarbeiter === j.mitarbeiter && o.datum === j.datum
  && overrun(o) && toMin(o.von) <= toMin(j.von) && toMin(j.von) < planEnd(o));
// Wird ein Auftrag auf einen anderen Tag oder Monteur gelegt, verfallen Ankunft und Schätzung vor Ort
const resetArrival = j => j.angekommenAm || j.dauerVorOrt ? { angekommenAm: null, dauerVorOrt: null } : {};
const DUR_OPTS = [[30, '30 Min.'], [60, '1 Std.'], [90, '1,5 Std.'], [120, '2 Std.'], [180, '3 Std.'], [240, '4 Std.'], [360, '6 Std.'], [480, '8 Std.']];
const dauerText = m => m ? `ca. ${duration(Number(m))}` : '';
const shortDate = k => parseYmd(k).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
const timeRange = j => { const e = endMin(j); return e !== null && e > toMin(j.von) ? `${j.von} – ${fromMin(e)}` : j.von; };
const whenText = j => { const e = endMin(j); return `${shortDate(j.datum)} ${j.von}${e !== null && e > toMin(j.von) ? ' → ' + fromMin(e) : ''}`; };
const duration = m => m < 60 ? `${m} Min.` : `${Math.floor(m / 60)} Std.${m % 60 ? ` ${m % 60} Min.` : ''}`;
const titleOf = j => j.auftrag || j.kunde;
const address = j => [j.strasse, [j.plz, j.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ');
const googleMaps = j => 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(address(j));
const appleMaps = j => 'https://maps.apple.com/?daddr=' + encodeURIComponent(address(j));
const mapEmbed = j => 'https://maps.google.com/maps?q=' + encodeURIComponent(address(j)) + '&z=15&output=embed';
const dayLabel = k => {
  const base = shortDate(k);
  if (k === todayKey()) return `Heute, ${base}`;
  if (k === ymd(addDays(new Date(), 1))) return `Morgen, ${base}`;
  if (k === ymd(addDays(new Date(), -1))) return `Gestern, ${base}`;
  return parseYmd(k).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'short' });
};

// ---- Mitarbeiter-Kürzel ----
const AV = ['#f6d4d8', '#f7e3a1', '#cfe3f7', '#d5ecd4', '#e6d7f3', '#fde0c5'];
const initials = name => { const p = String(name || '?').trim().split(/\s+/); return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase(); };
const avatar = (nr, name, cls = '') => {
  let h = 0; for (const c of String(nr)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `<span class="av ${cls}" style="background:${AV[h % AV.length]}" title="${esc(name)}">${esc(initials(name))}</span>`;
};
const workerName = nr => ui.workers.find(w => w.nr === nr)?.name || `Nr. ${nr}`;

// ---- Team-Aufträge: ein Auftrag je Monteur, verknüpft über „gruppe“ ----
const groupOf = j => j.gruppe ? ui.jobs.filter(x => x.gruppe === j.gruppe) : [j];
const teamOf = nrs => nrs.map(nr => ({ nr, name: workerName(nr) }));
const teamSize = j => Array.isArray(j.team) ? j.team.length : 1;
const others = j => (Array.isArray(j.team) ? j.team : []).filter(t => t.nr !== j.mitarbeiter).map(t => t.name);
const newGroupId = () => 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ---- Urlaub / Krank ----
const ABS_LABEL = { urlaub: 'Urlaub', krank: 'Krank' };
const absenceOf = (nr, k) => ui.absences.find(a => a.mitarbeiter === nr && a.von <= k && k <= a.bis);
const absTag = a => `<span class="abs-tag ${esc(a.art)}">${ABS_LABEL[a.art] || 'Abwesend'}</span>`;

// Überlappende Termine auf Spuren verteilen
function layoutLanes(list) {
  const items = list.map(j => {
    const s = toMin(j.von);
    return { j, s, e: Math.max(planEnd(j), s + 15), lane: 0, lanes: 1 };
  }).sort((x, y) => x.s - y.s || y.e - x.e);
  let cluster = [], clusterEnd = -1;
  const finish = () => {
    const lanes = [];
    for (const it of cluster) {
      let k = lanes.findIndex(end => end <= it.s);
      if (k < 0) { k = lanes.length; lanes.push(0); }
      lanes[k] = it.e; it.lane = k;
    }
    cluster.forEach(it => it.lanes = lanes.length);
  };
  for (const it of items) {
    if (cluster.length && it.s >= clusterEnd) { finish(); cluster = []; clusterEnd = -1; }
    cluster.push(it); clusterEnd = Math.max(clusterEnd, it.e);
  }
  if (cluster.length) finish();
  return items;
}

// ================= Zustand =================
const ui = {
  session: null, workers: [], jobs: [], absences: [], customers: [], custEdit: null, custSearch: '', formKundeId: null, me: null, unsub: [], drag: null, suppressClick: false,
  view: 'plan', mode: 'day', day: todayKey(), filter: '',
  listStatus: 'alle', listRange: 'alle', listPast: false, search: '',
  wPage: 'termine', wTab: 'geplant',
  detailId: null, editId: null, plan: { start: 6, hw: 90 }, scrollPlan: false, teamAll: true,
};
let store;

init();

async function init() {
  try {
    store = await createStore();
  } catch (e) {
    console.error(e);
    document.body.innerHTML = '<div class="login"><div class="login-card"><h2>Keine Verbindung</h2><p>Die Datenbank ist nicht erreichbar. Prüfe die Internetverbindung.</p></div></div>';
    return;
  }
  $('#demoBanner').hidden = store.mode !== 'demo';
  // Offline-Hinweis
  const net = () => { $('#offlineBanner').hidden = navigator.onLine; };
  addEventListener('online', net); addEventListener('offline', net); net();
  // App-Dateien fürs Starten ohne Netz zwischenspeichern
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(e => console.warn(e));
  bindEvents();
  store.onSession(s => {
    ui.session = s;
    if (!s) showLogin();
    else if (s.role === 'office') enterOffice();
    else enterWorker();
  });
}

function stopWatching() { ui.unsub.forEach(f => f && f()); ui.unsub = []; }

// ================= Anmeldung =================
function showLogin() {
  stopWatching();
  ui.jobs = []; ui.workers = []; ui.absences = []; ui.customers = []; ui.jobsCtl = null;
  document.querySelectorAll('dialog[open]').forEach(d => d.close());
  $('#appView').hidden = true;
  $('#workerView').hidden = true;
  $('#loginView').hidden = false;
}

function setTab(tab) {
  document.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === tab));
  $('#workerLogin').hidden = tab !== 'worker';
  $('#officeLogin').hidden = tab !== 'office';
  $('#officeSetup').hidden = true;
}

async function doLogin(form, role, nr, secret) {
  const err = form.querySelector('.err'), btn = form.querySelector('.primary');
  err.textContent = ''; btn.disabled = true;
  try { await store.login(role, nr, secret); form.reset(); }
  catch (e) { err.textContent = e.message; }
  finally { btn.disabled = false; }
}

async function doSetup(e) {
  e.preventDefault();
  const f = e.target, err = f.querySelector('.err');
  err.textContent = '';
  if (f.elements.pw.value !== f.elements.pw2.value) { err.textContent = 'Die Passwörter stimmen nicht überein.'; return; }
  f.querySelector('.primary').disabled = true;
  try { await store.setupOffice(f.elements.pw.value); f.reset(); }
  catch (x) { err.textContent = x.message; }
  finally { f.querySelector('.primary').disabled = false; }
}

// ================= Büro =================
function enterOffice() {
  stopWatching();
  $('#loginView').hidden = true;
  $('#workerView').hidden = true;
  $('#appView').hidden = false;
  ui.day = todayKey();
  ui.mode = lsGet('shk-mode') || 'day';
  ui.purge = lsGet('shk-purge') !== todayKey() ? { jobs: false, abs: false, cust: false } : null;
  ui.unsub.push(store.watchWorkers(ws => { ui.workers = ws; refresh(); }));
  ui.unsub.push(store.watchCustomers(cs => {
    ui.customers = cs.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de'));
    fillCustomerList();
    if (ui.view === 'kunden') renderCustomersPage();
    if ($('#custDlg').open) renderCustomerDlg();
    if (ui.purge) { ui.purge.cust = true; purgeOld(); }
  }));
  ui.unsub.push(store.watchAbsences(as => {
    ui.absences = as.sort((a, b) => a.von.localeCompare(b.von));
    refresh();
    if (ui.purge) { ui.purge.abs = true; purgeOld(); }
  }));
  ui.jobsFrom = windowStart();
  ui.jobsCtl = store.watchAllJobs(js => {
    // Hinweis, wenn ein Monteur gerade „Dauert länger“ gemeldet hat
    const before = new Map(ui.jobs.map(j => [j.id, Number(j.dauerVorOrt) || 0]));
    for (const j of js) {
      if (before.has(j.id) && (Number(j.dauerVorOrt) || 0) > before.get(j.id) && overrun(j)) {
        notice(`${workerName(j.mitarbeiter)}: „${titleOf(j)}“ dauert länger – fertig ca. ${fromMin(estEnd(j))} Uhr statt ${fromMin(plannedEnd(j))} Uhr (${duration(overrun(j))} über Plan).`);
      }
    }
    ui.jobs = sortJobs(js);
    refresh();
    if ($('#detailDlg').open) renderDetail();
    if ($('#custDlg').open) renderCustomerDlg();
    if (ui.purge) { ui.purge.jobs = true; purgeOld(); }
  }, ui.jobsFrom);
  ui.unsub.push(ui.jobsCtl);
  setView(lsGet('shk-view') || 'plan');
}

// Lesezugriffe sparen: beim Start nur Aufträge der letzten Wochen, alles Kommende und alle offenen.
// Ältere Tage werden erst geladen, wenn man sie ansieht (Kalender zurückblättern, „Vergangene Termine“).
const WINDOW_DAYS = 35;
const windowStart = () => ymd(addDays(parseYmd(todayKey()), -WINDOW_DAYS));
const ALL_PAST = '0000-01-01';
function ensureJobs(day) {
  if (!ui.jobsCtl || !isDay(day) || day >= ui.jobsFrom) return;
  const start = day === ALL_PAST ? day : day.slice(0, 8) + '01'; // gleich den ganzen Monat
  ui.jobsFrom = start;
  ui.jobsCtl.loadFrom(start);
}

// Löschfristen (stehen so in datenschutz.html): Abwesenheiten 13 Monate nach Ende,
// Aufträge 5 Jahre nach dem Termin, Kunden 5 Jahre nach dem letzten Auftrag (ohne Auftrag: nach Anlage).
// Läuft einmal am Tag, wenn das Büro den Planer öffnet.
const KEEP_ABS_MONTHS = 13, KEEP_JOB_MONTHS = 60;
const isDay = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
const monthsAgo = m => { const d = new Date(); d.setMonth(d.getMonth() - m); return ymd(d); };

async function purgeOld() {
  if (!ui.purge || !ui.purge.jobs || !ui.purge.abs || !ui.purge.cust) return;
  ui.purge = null;
  const jobCut = monthsAgo(KEEP_JOB_MONTHS), absCut = monthsAgo(KEEP_ABS_MONTHS);
  // Alte Aufträge sind nicht geladen: gezielt nur die vor dem Stichtag abfragen
  let oldJobs;
  try { oldJobs = (await store.jobsBefore(jobCut)).filter(j => isDay(j.datum)); }
  catch (e) { console.warn('Löschfristen: Abfrage fehlgeschlagen', e); return; }
  if (ui.session?.role !== 'office') return;
  const oldAbs = ui.absences.filter(a => isDay(a.bis) && a.bis < absCut);
  const oldCust = ui.customers.filter(c => { const l = lastUse(c); return isDay(l) && l < jobCut; });
  if (oldJobs.length + oldAbs.length + oldCust.length) {
    // Schutz vor falsch gestellter Uhr: wenn auffällig viel weg soll, erst nachfragen
    const total = new Set([...ui.jobs, ...oldJobs].map(j => j.id)).size;
    const many = oldJobs.length > 20 && oldJobs.length > total / 2;
    if (many && !confirm(`${oldJobs.length} von ${total} Aufträgen sind laut Löschfrist älter als 5 Jahre.\n\nBitte prüfen, ob Datum und Uhrzeit dieses Geräts stimmen (heute: ${new Date().toLocaleDateString('de-DE')}).\n\nJetzt löschen?`)) return;
    oldJobs.forEach(j => store.deleteJob(j.id));
    oldAbs.forEach(a => store.deleteAbsence(a.id));
    oldCust.forEach(c => store.deleteCustomer(c.id));
    const parts = [];
    if (oldJobs.length) parts.push(`${oldJobs.length} ${oldJobs.length === 1 ? 'Auftrag' : 'Aufträge'} älter als 5 Jahre`);
    if (oldAbs.length) parts.push(`${oldAbs.length} ${oldAbs.length === 1 ? 'Abwesenheit' : 'Abwesenheiten'} älter als 13 Monate`);
    if (oldCust.length) parts.push(`${oldCust.length} ${oldCust.length === 1 ? 'Kunde' : 'Kunden'} ohne Auftrag seit 5 Jahren`);
    notice(`Gemäß Löschfristen entfernt: ${parts.join(', ')}.`);
  }
  lsSet('shk-purge', todayKey());
}

function notice(text) {
  const el = document.createElement('div');
  el.className = 'banner';
  el.setAttribute('role', 'status');
  el.textContent = text;
  document.body.prepend(el);
  setTimeout(() => el.remove(), 10000);
}

function setView(v) {
  ui.view = v;
  lsSet('shk-view', v);
  document.querySelectorAll('#side [data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === v));
  const c = $('#content');
  if (v === 'plan') {
    c.innerHTML = `
      <div class="page-head"><h1 id="title"></h1>
        <button class="btn primary" data-act="new">${icon('add')}Neuer Auftrag</button></div>
      <div class="toolbar">
        <div class="seg"><button data-mode="week">Woche</button><button data-mode="day">Tag</button></div>
        <div class="datebox">
          <button data-act="prev" aria-label="Zurück">${icon('left')}</button>
          <label class="dlabel"><span id="dateLabel"></span>${icon('cal')}<input type="date" id="dateInput" aria-label="Datum wählen"></label>
          <button data-act="next" aria-label="Weiter">${icon('right')}</button>
        </div>
        <button class="tb" data-act="today">Heute</button>
        <select id="filterSel" aria-label="Mitarbeiter filtern"></select>
      </div>
      <div id="planBody"></div>`;
    ui.scrollPlan = true;
  } else if (v === 'list') {
    c.innerHTML = `
      <div class="page-head"><h1>Aufträge</h1>
        <label class="search">${icon('search')}<input id="searchIn" placeholder="Suche" value="${esc(ui.search)}"></label>
        <button class="btn primary" data-act="new">${icon('add')}Neuer Auftrag</button></div>
      <div class="toolbar">
        <select id="statusSel" aria-label="Status filtern">
          <option value="alle">Alle</option><option value="geplant">Geplant</option>
          <option value="ueberfaellig">Überfällig</option><option value="erledigt">Erledigt</option>
        </select>
        <select id="rangeSel" aria-label="Zeitraum filtern">
          <option value="alle">Alle Tage</option><option value="heute">Heute</option><option value="morgen">Morgen</option>
          <option value="woche">Diese Woche</option><option value="naechste">Nächste Woche</option><option value="monat">Dieser Monat</option>
        </select>
        <select id="filterSel" aria-label="Mitarbeiter filtern"></select>
        <label class="toggle"${ui.listRange !== 'alle' ? ' hidden' : ''}>Vergangene Termine<input type="checkbox" id="pastToggle" ${ui.listPast ? 'checked' : ''}></label>
      </div>
      <div class="table-wrap"><table class="tbl">
        <thead><tr><th>Datum</th><th>Zeit</th><th>Status</th><th>Mitarbeiter</th><th>Auftrag</th><th class="hide-m">Ausführungsort</th></tr></thead>
        <tbody id="listBody"></tbody></table></div>
      <div class="count" id="listCount"></div>`;
    $('#statusSel').value = ui.listStatus;
    $('#rangeSel').value = ui.listRange;
  } else if (v === 'kunden') {
    ui.custEdit = null;
    c.innerHTML = `
      <div class="page-head"><h1>Kunden</h1>
        <label class="search">${icon('search')}<input id="custSearch" placeholder="Kunde suchen" value="${esc(ui.custSearch)}"></label></div>
      <div class="card">
        <h2 id="custFormTitle">Neuen Kunden anlegen</h2>
        <form id="custForm" class="cust-form">
          <label class="field c2"><span>Name *</span><input name="name" required maxlength="100"></label>
          <label class="field c2"><span>Telefon</span><input name="telefon" type="tel" maxlength="40"></label>
          <label class="field c2"><span>Straße und Hausnummer</span><input name="strasse" maxlength="120" autocomplete="off"></label>
          <label class="field"><span>PLZ</span><input name="plz" inputmode="numeric" maxlength="10" autocomplete="off"></label>
          <label class="field"><span>Ort</span><input name="ort" maxlength="80" autocomplete="off"></label>
          <label class="field c4"><span>Hinweis für Aufträge</span><input name="notiz" maxlength="200" placeholder="z. B. Schlüssel beim Nachbarn, Zugang über Hof"></label>
          <div class="c4 cust-actions">
            <button type="button" class="btn" id="custCancel" hidden>Abbrechen</button>
            <button class="btn primary">${icon('add')}<span id="custSaveLbl">Anlegen</span></button>
          </div>
        </form>
        <p class="err" id="custErr" style="margin-top:8px"></p>
        <p class="hint">Nur speichern, was für Aufträge nötig ist – keine privaten oder gesundheitlichen Angaben. Kunden ohne Auftrag seit 5 Jahren werden automatisch gelöscht.</p>
      </div>
      <div class="table-wrap"><table class="tbl">
        <thead><tr><th>Kunde</th><th class="hide-t">Adresse</th><th class="hide-t">Telefon</th><th>Letzter Auftrag</th><th></th></tr></thead>
        <tbody id="custBody"></tbody></table></div>
      <div class="count" id="custCount"></div>`;
  } else if (v === 'backup') {
    const last = lsGet('shk-backup');
    c.innerHTML = `
      <div class="page-head"><h1>Datensicherung</h1></div>
      <div class="card">
        <h2>Komplette Sicherung</h2>
        <p class="hint" style="margin-bottom:12px">Alle Aufträge, Kunden, Mitarbeiter und Abwesenheiten in einer Datei – zum Aufbewahren für den Notfall. Ein Zurückspielen per Knopf gibt es noch nicht.</p>
        <button class="btn primary" data-backup="json">${icon('download')}Sicherung herunterladen</button>
        <p class="hint" id="backupLast" style="margin-top:10px">${isDay(last) ? `Letzte Sicherung auf diesem Gerät: ${parseYmd(last).toLocaleDateString('de-DE')}` : 'Auf diesem Gerät wurde noch keine Sicherung erstellt.'}</p>
      </div>
      <div class="card">
        <h2>Als Tabelle für Excel</h2>
        <p class="hint" style="margin-bottom:12px">Zum Ansehen, Filtern oder Drucken.</p>
        <div class="bk-btns">
          <button class="btn" data-backup="jobs">${icon('download')}Aufträge (.csv)</button>
          <button class="btn" data-backup="customers">${icon('download')}Kunden (.csv)</button>
        </div>
      </div>
      <p class="err" id="backupErr"></p>
      <p class="hint">Die Dateien enthalten Kunden- und Mitarbeiterdaten. Bitte nur an einem geschützten Ort speichern und nicht weitergeben. Die Löschfristen gelten auch für Kopien: alte Sicherungen regelmäßig löschen.</p>`;
  } else {
    c.innerHTML = `
      <div class="page-head"><h1>Mitarbeiter</h1></div>
      <div class="card">
        <h2>Neuen Monteur anlegen</h2>
        <form id="addWorkerForm" class="add-worker">
          <label class="field"><span>Nummer</span><input name="nr" inputmode="numeric" pattern="[0-9]{1,8}" required></label>
          <label class="field wide"><span>Name</span><input name="name" maxlength="60" required></label>
          <label class="field"><span>PIN (mind. 4 Ziffern)</span><input name="pin" inputmode="numeric" pattern="[0-9]{4,12}" required title="4 bis 12 Ziffern"></label>
          <button class="btn primary">${icon('add')}Anlegen</button>
        </form>
        <p class="err" id="workerErr" style="margin-top:8px"></p>
        <p class="hint">Mit Nummer und PIN meldet sich der Monteur auf dem Handy an. Notiere dir die PIN, sie wird danach nicht mehr angezeigt.</p>
      </div>
      <div class="table-wrap"><table class="tbl">
        <thead><tr><th>Mitarbeiter</th><th>Nummer</th><th>Offene Aufträge</th><th></th></tr></thead>
        <tbody id="workersBody"></tbody></table></div>
      <div class="card" style="margin-top:16px">
        <h2>Urlaub / Krank eintragen</h2>
        <form id="addAbsForm" class="add-abs">
          <label class="field wide"><span>Mitarbeiter</span><select name="mitarbeiter" id="absWorker" required></select></label>
          <label class="field"><span>Art</span><select name="art"><option value="urlaub">Urlaub</option><option value="krank">Krank</option></select></label>
          <label class="field"><span>Von</span><input name="von" type="date" required></label>
          <label class="field"><span>Bis</span><input name="bis" type="date" required></label>
          <button class="btn primary">${icon('add')}Eintragen</button>
        </form>
        <p class="err" id="absErr" style="margin-top:8px"></p>
      </div>
      <div class="table-wrap"><table class="tbl">
        <thead><tr><th>Mitarbeiter</th><th>Art</th><th>Zeitraum</th><th></th></tr></thead>
        <tbody id="absBody"></tbody></table></div>`;
    const f = $('#addAbsForm');
    f.elements.von.value = f.elements.bis.value = todayKey();
  }
  noAutofill(c);
  refresh();
}

// Keine gespeicherten Browser-Vorschläge (alte Adressen, Namen …) in den Eingabefeldern.
// „off“ allein ignoriert Chrome bei Adressfeldern, ein unbekannter Wert schaltet es zuverlässig ab.
// Die eigene Kundenliste (datalist) beim Feld „Kunde“ bleibt erhalten.
function noAutofill(root) {
  [root, ...root.querySelectorAll('form')].filter(f => f.matches('form')).forEach(f => f.setAttribute('autocomplete', 'off'));
  root.querySelectorAll('input:not([type=password]):not([type=checkbox]):not([type=date]):not([type=time]), textarea')
    .forEach(el => el.setAttribute('autocomplete', 'shk-nofill'));
}

function refresh() {
  if (ui.session?.role !== 'office') return;
  const sel = $('#filterSel');
  if (sel) {
    sel.innerHTML = '<option value="">Alle Mitarbeiter</option>' +
      ui.workers.map(w => `<option value="${esc(w.nr)}">${esc(w.name)} (${esc(w.nr)})</option>`).join('');
    sel.value = ui.workers.some(w => w.nr === ui.filter) ? ui.filter : '';
  }
  if (ui.view === 'plan') renderPlan();
  else if (ui.view === 'list') renderList();
  else if (ui.view === 'kunden') renderCustomersPage();
  else renderWorkersPage();
}

// Zeilen der Plantafel: Mitarbeiter (gefiltert) + evtl. entfernte Nummern mit Aufträgen
function planRows(dayKeys) {
  let rows = ui.workers.map(w => ({ nr: w.nr, name: w.name }));
  const known = new Set(rows.map(r => r.nr));
  for (const j of ui.jobs) {
    if (dayKeys.includes(j.datum) && !known.has(j.mitarbeiter)) { known.add(j.mitarbeiter); rows.push({ nr: j.mitarbeiter, name: `Nr. ${j.mitarbeiter}` }); }
  }
  if (ui.filter) rows = rows.filter(r => r.nr === ui.filter);
  return rows;
}

function renderPlan() {
  const body = $('#planBody');
  if (!body) return;
  document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === ui.mode));
  const d = parseYmd(ui.day);
  ensureJobs(ui.mode === 'week' ? ymd(mondayOf(d)) : ui.day);
  $('#dateInput').value = ui.day;
  if (ui.mode === 'day') {
    $('#title').textContent = d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
    $('#dateLabel').textContent = `${d.toLocaleDateString('de-DE', { weekday: 'long' })}, ${d.toLocaleDateString('de-DE')}`;
  } else {
    const ws = mondayOf(d), we = addDays(ws, 6);
    $('#title').textContent = `${ws.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })} – ${we.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    $('#dateLabel').textContent = `KW ${isoWeek(ws)}`;
  }

  if (!ui.workers.length && !ui.jobs.length) {
    body.innerHTML = `<div class="empty-state">Noch keine Mitarbeiter angelegt.<br><br><button class="btn primary" data-go="workers">Mitarbeiter anlegen</button></div>`;
    return;
  }

  const prevScroll = $('#ptScroll') ? { x: $('#ptScroll').scrollLeft, y: $('#ptScroll').scrollTop } : null;
  body.innerHTML = ui.mode === 'day' ? planDay() : planWeek();
  const pt = $('#ptScroll');
  if (ui.scrollPlan && ui.mode === 'day') {
    // Beim Öffnen zur aktuellen Uhrzeit (bzw. 7 Uhr) scrollen
    ui.scrollPlan = false;
    const now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes();
    const target = ui.day === todayKey() ? nowMin - 90 : 7 * 60;
    pt.scrollLeft = Math.max(0, (target - ui.plan.start * 60) / 60 * ui.plan.hw);
  } else if (ui.scrollPlan) {
    ui.scrollPlan = false; // Wochenansicht: am Anfang der Woche beginnen
  } else if (prevScroll) {
    pt.scrollLeft = prevScroll.x; pt.scrollTop = prevScroll.y;
  }
}

function planDay() {
  const k = ui.day;
  const dayJobs = ui.jobs.filter(j => j.datum === k);
  let start = 6, end = 20;
  for (const j of dayJobs) {
    start = Math.min(start, Math.floor(toMin(j.von) / 60));
    end = Math.max(end, Math.ceil(planEnd(j) / 60));
  }
  end = Math.min(end, 24);
  const whoW = narrow.matches ? 64 : 150;
  const avail = ($('#planBody').clientWidth || 900) - whoW - 2;
  const hw = Math.max(narrow.matches ? 70 : 84, Math.floor(avail / (end - start)));
  const W = (end - start) * hw;
  ui.plan = { start, hw };

  let hours = '';
  for (let h = start; h < end; h++) hours += `<span style="left:${(h - start) * hw}px">${pad(h)}:00</span>`;
  const now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes();
  const nowLine = k === todayKey() && nowMin >= start * 60 && nowMin <= end * 60
    ? `<div class="now-v" style="left:${(nowMin - start * 60) / 60 * hw}px"></div>` : '';

  const rows = planRows([k]).map(r => {
    const items = layoutLanes(dayJobs.filter(j => j.mitarbeiter === r.nr));
    const lanes = Math.max(1, ...items.map(i => i.lanes));
    const H = Math.max(76, 12 + lanes * 62);
    const cards = items.map(it => {
      const j = it.j;
      const left = (it.s - start * 60) / 60 * hw + 2;
      const width = Math.max((it.e - it.s) / 60 * hw - 4, 64);
      const ext = overrun(j);
      return `<button class="pc st-${cardState(j)}${clashedBy(j, dayJobs) ? ' clash' : ''}" data-id="${esc(j.id)}" style="left:${left}px;top:${6 + it.lane * 62}px;width:${width}px;height:56px"${clashedBy(j, dayJobs) ? ' title="Terminkonflikt: vorheriger Auftrag dauert länger"' : ''}>
        <span class="pc-t">${esc(titleOf(j))}</span>
        <span class="pc-s">${ext ? `<span class="pc-ext">bis ${fromMin(estEnd(j))} statt ${fromMin(plannedEnd(j))}</span> · ` : ''}${teamSize(j) > 1 ? `👥${teamSize(j)} · ` : ''}${esc(timeRange(j))}${j.auftrag ? ' · ' + esc(j.kunde) : ''}</span>
        <span class="pc-s">${esc([j.plz, j.ort].filter(Boolean).join(' '))}</span>
        <span class="dot"></span></button>`;
    }).join('');
    const abs = absenceOf(r.nr, k);
    const band = abs ? `<div class="abs-band ${esc(abs.art)}"><span>${ABS_LABEL[abs.art] || 'Abwesend'}</span></div>` : '';
    return `<div class="pt-row">
      <div class="pt-who">${avatar(r.nr, r.name)}<span class="nm">${esc(r.name)}</span></div>
      <div class="pt-lane" data-nr="${esc(r.nr)}" data-day="${k}" style="width:${W}px;height:${H}px;--hw:${hw}px">${band}${cards}${nowLine}</div>
    </div>`;
  }).join('');

  return `<div class="pt" id="ptScroll">
    <div class="pt-head"><div class="pt-who corner">KW ${isoWeek(parseYmd(k))}</div><div class="pt-hours" style="width:${W}px;--hw:${hw}px">${hours}</div></div>
    ${rows || '<div class="empty-state">Keine Mitarbeiter für diesen Filter.</div>'}
  </div>`;
}

function planWeek() {
  const ws = mondayOf(parseYmd(ui.day));
  const days = [...Array(7)].map((_, i) => addDays(ws, i));
  const keys = days.map(ymd);
  const t = todayKey();
  const head = `<div class="wk-grid wk-head"><div class="pt-who corner">KW ${isoWeek(ws)}</div>${days.map(d =>
    `<div class="wk-d ${ymd(d) === t ? 'today' : ''}">${d.toLocaleDateString('de-DE', { weekday: 'short' })}<b>${d.getDate()}.${d.getMonth() + 1}.</b></div>`).join('')}</div>`;
  const rows = planRows(keys).map(r => `<div class="wk-grid">
      <div class="pt-who">${avatar(r.nr, r.name)}<span class="nm">${esc(r.name)}</span></div>
      ${keys.map(k => { const abs = absenceOf(r.nr, k); return `<div class="wk-cell ${abs ? 'abs' : ''}" data-nr="${esc(r.nr)}" data-day="${k}">${abs ? absTag(abs) : ''}${ui.jobs
        .filter(j => j.datum === k && j.mitarbeiter === r.nr)
        .map((j, _, cellJobs) => `<button class="mini st-${cardState(j)}${clashedBy(j, cellJobs) ? ' clash' : ''}" data-id="${esc(j.id)}" title="${esc(titleOf(j))}"><b>${esc(j.von)}</b>${overrun(j) ? `<span class="pc-ext">bis ${fromMin(estEnd(j))}</span>` : ''}${esc(titleOf(j))}</button>`)
        .join('')}</div>`; }).join('')}
    </div>`).join('');
  return `<div class="pt" id="ptScroll">${head}${rows}</div>`;
}

function renderList() {
  const tb = $('#listBody');
  if (!tb) return;
  const q = ui.search.trim().toLowerCase();
  const t = todayKey();
  // Zeitraum: [von, bis] als Tagesschlüssel; bei gewähltem Zeitraum zählen auch vergangene Tage darin
  const now = parseYmd(t), mon = mondayOf(now);
  const range = {
    heute: [t, t],
    morgen: [ymd(addDays(now, 1)), ymd(addDays(now, 1))],
    woche: [ymd(mon), ymd(addDays(mon, 6))],
    naechste: [ymd(addDays(mon, 7)), ymd(addDays(mon, 13))],
    monat: [ymd(new Date(now.getFullYear(), now.getMonth(), 1)), ymd(new Date(now.getFullYear(), now.getMonth() + 1, 0))],
  }[ui.listRange];
  if (range) ensureJobs(range[0]);
  else if (ui.listPast) ensureJobs(ALL_PAST);
  const rows = ui.jobs.filter(j => {
    const s = stateOf(j);
    if (ui.listStatus !== 'alle' && s !== ui.listStatus) return false;
    if (ui.filter && j.mitarbeiter !== ui.filter) return false;
    if (range && (j.datum < range[0] || j.datum > range[1])) return false;
    if (!range && !ui.listPast && j.datum < t && s === 'erledigt') return false;
    if (q && ![j.kunde, j.auftrag, j.strasse, j.ort, j.plz, workerName(j.mitarbeiter)].join(' ').toLowerCase().includes(q)) return false;
    return true;
  });
  // Reihenfolge: Überfällig (älteste zuerst) → Offen → Erledigt (neueste zuerst)
  const key = j => j.datum + j.von;
  const RANK = { ueberfaellig: 0, geplant: 1, erledigt: 2 };
  rows.sort((a, b) => {
    const ra = RANK[stateOf(a)], rb = RANK[stateOf(b)];
    if (ra !== rb) return ra - rb;
    return ra === 2 ? key(b).localeCompare(key(a)) : key(a).localeCompare(key(b));
  });
  const GROUP = { ueberfaellig: 'Überfällig', geplant: 'Offen', erledigt: 'Erledigt' };
  const counts = rows.reduce((m, j) => (m[stateOf(j)] = (m[stateOf(j)] || 0) + 1, m), {});
  const showGroups = Object.keys(counts).length > 1;
  let last = null;
  const row = j => {
    const s = stateOf(j);
    const head = showGroups && s !== last ? `<tr class="grp grp-${s}"><td colspan="6">${GROUP[s]} · ${counts[s]}</td></tr>` : '';
    last = s;
    return head + `<tr data-id="${esc(j.id)}" class="st-${s}">
      <td class="b">${j.datum === t ? 'Heute' : parseYmd(j.datum).toLocaleDateString('de-DE')}</td>
      <td class="b">${esc(timeRange(j))}</td>
      <td>${badge(j)}</td>
      <td><span class="who-cell">${avatar(j.mitarbeiter, workerName(j.mitarbeiter))}<span class="hide-m">${esc(workerName(j.mitarbeiter))}</span></span></td>
      <td>${esc(titleOf(j))}${j.auftrag ? `<div class="sub">${esc(j.kunde)}</div>` : ''}</td>
      <td class="hide-m">${esc(address(j))}</td>
    </tr>`;
  };
  tb.innerHTML = rows.length ? rows.map(row).join('') : '<tr><td colspan="6" class="sub" style="text-align:center;padding:30px">Keine Aufträge gefunden.</td></tr>';
  $('#listCount').textContent = `${rows.length} ${rows.length === 1 ? 'Auftrag' : 'Aufträge'}`
    + (!range && !ui.listPast && q ? ' · Ältere Aufträge werden erst mit „Vergangene Termine“ durchsucht.' : '');
}

function renderWorkersPage() {
  const tb = $('#workersBody');
  if (!tb) return;
  tb.innerHTML = ui.workers.length ? ui.workers.map(w => {
    const open = ui.jobs.filter(j => j.mitarbeiter === w.nr && j.status !== 'fertig').length;
    return `<tr><td><span class="who-cell">${avatar(w.nr, w.name)}${esc(w.name)}</span></td><td class="b">${esc(w.nr)}</td>
      <td>${open}</td><td style="text-align:right"><button class="btn danger" data-del-worker="${esc(w.nr)}">Entfernen</button></td></tr>`;
  }).join('') : '<tr><td colspan="4" class="sub" style="text-align:center;padding:30px">Noch keine Mitarbeiter angelegt.</td></tr>';

  // Urlaub / Krank: Auswahl und Liste (ab heute)
  const sel = $('#absWorker');
  const keep = sel.value;
  sel.innerHTML = '<option value="">Auswählen …</option>' + ui.workers.map(w => `<option value="${esc(w.nr)}">${esc(w.name)} (${esc(w.nr)})</option>`).join('');
  sel.value = keep;
  const t = todayKey();
  const list = ui.absences.filter(a => a.bis >= t);
  const fmt = k => parseYmd(k).toLocaleDateString('de-DE');
  $('#absBody').innerHTML = list.length ? list.map(a => `<tr>
      <td><span class="who-cell">${avatar(a.mitarbeiter, workerName(a.mitarbeiter))}${esc(workerName(a.mitarbeiter))}</span></td>
      <td>${absTag(a)}</td>
      <td class="b">${a.von === a.bis ? fmt(a.von) : `${fmt(a.von)} – ${fmt(a.bis)}`}</td>
      <td style="text-align:right"><button class="btn danger" data-del-abs="${esc(a.id)}">Löschen</button></td></tr>`).join('')
    : '<tr><td colspan="4" class="sub" style="text-align:center;padding:24px">Kein Urlaub und keine Krankmeldung eingetragen.</td></tr>';
}

// ================= Kunden =================
const custAddress = c => [c.strasse, [c.plz, c.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ');
const maxDay = (...ds) => ds.filter(isDay).sort().pop() || '';
// Letzter Auftrag eines Kunden (auch geplante); für die Löschfrist zählt sonst das Anlagedatum
const lastJobOf = c => maxDay(c.zuletzt, ...ui.jobs.filter(j => j.kundeId === c.id).map(j => j.datum));
const lastUse = c => maxDay(c.angelegt, lastJobOf(c));
const sameName = (a, b) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();

function renderCustomersPage() {
  const tb = $('#custBody');
  if (!tb) return;
  const q = ui.custSearch.trim().toLowerCase();
  const rows = ui.customers.filter(c => !q || [c.name, c.strasse, c.plz, c.ort, c.telefon].join(' ').toLowerCase().includes(q));
  tb.innerHTML = rows.length ? rows.map(c => {
    const last = lastJobOf(c);
    return `<tr class="cust-row${ui.custEdit === c.id ? ' editing' : ''}" data-cust-open="${esc(c.id)}" title="Kunde und Aufträge anzeigen">
      <td><b class="cust-name">${esc(c.name)}</b>${c.notiz ? `<div class="sub">${esc(c.notiz)}</div>` : ''}<div class="sub show-t">${esc([custAddress(c), c.telefon].filter(Boolean).join(' · '))}</div></td>
      <td class="hide-t">${esc(custAddress(c))}</td>
      <td class="hide-t">${c.telefon ? `<a href="tel:${esc(c.telefon.replace(/[^0-9+]/g, ''))}">${esc(c.telefon)}</a>` : ''}</td>
      <td>${last ? parseYmd(last).toLocaleDateString('de-DE') : '<span class="sub">–</span>'}</td>
      <td class="cust-btns"><div>
        <button class="btn" data-cust-job="${esc(c.id)}" title="Neuen Auftrag für diesen Kunden">${icon('add')}Auftrag</button>
        <button class="btn ico" data-cust-edit="${esc(c.id)}" title="Bearbeiten" aria-label="${esc(c.name)} bearbeiten">${icon('edit')}</button>
        <button class="btn ico danger" data-cust-del="${esc(c.id)}" title="Löschen" aria-label="${esc(c.name)} löschen">${icon('trash')}</button></div></td></tr>`;
  }).join('') : `<tr><td colspan="5" class="sub" style="text-align:center;padding:30px">${q ? 'Kein Kunde gefunden.' : 'Noch keine Kunden angelegt.'}</td></tr>`;
  $('#custCount').textContent = `${rows.length} ${rows.length === 1 ? 'Kunde' : 'Kunden'}`;
}

// Alle Aufträge eines Kunden: verknüpfte sowie ältere ohne Verknüpfung mit gleichem Namen UND gleicher Straße.
// Team-Aufträge (ein Eintrag je Monteur) erscheinen nur einmal.
function jobsOfCustomer(c) {
  const hits = ui.jobs.filter(j => j.kundeId === c.id
    || (!j.kundeId && sameName(j.kunde, c.name) && sameName(j.strasse, c.strasse)));
  const seen = new Map();
  for (const j of hits) {
    const key = j.gruppe || j.id;
    if (!seen.has(key)) seen.set(key, { job: j, nrs: [] });
    seen.get(key).nrs.push(j.mitarbeiter);
  }
  return [...seen.values()].sort((a, b) => (b.job.datum + b.job.von).localeCompare(a.job.datum + a.job.von));
}

function openCustomer(id) {
  ui.custView = id;
  // Ältere Aufträge dieses Kunden gezielt nachladen
  const c = ui.customers.find(x => x.id === id);
  if (c && ui.jobsCtl) ui.jobsCtl.loadCustomer(c);
  renderCustomerDlg();
  if (!$('#custDlg').open) $('#custDlg').showModal();
}

function renderCustomerDlg() {
  const dlg = $('#custDlg');
  const c = ui.customers.find(x => x.id === ui.custView);
  if (!c) { if (dlg.open) dlg.close(); return; }
  const list = jobsOfCustomer(c);
  const t = todayKey();
  const past = list.filter(e => e.job.datum <= t), next = list.filter(e => e.job.datum > t).pop();
  const fmt = k => parseYmd(k).toLocaleDateString('de-DE');
  const summary = list.length
    ? `${list.length} ${list.length === 1 ? 'Auftrag' : 'Aufträge'}${past.length ? ` · zuletzt am ${fmt(past[0].job.datum)}` : ''}${next ? ` · nächster Termin ${fmt(next.job.datum)}` : ''}`
    : 'Noch keine Aufträge';
  const item = ({ job: j, nrs }) => {
    const rep = (j.bericht || '').trim();
    return `<button class="hist-item" data-id="${esc(j.id)}">
      <span class="hist-date"><b>${fmt(j.datum)}</b><span class="sub">${esc(j.von)} Uhr</span></span>
      <span class="hist-main"><b>${esc(j.auftrag || 'Auftrag')}</b>
        <span class="sub">${esc(nrs.map(workerName).join(', '))}</span>
        ${rep ? `<span class="hist-rep">${esc(rep.length > 120 ? rep.slice(0, 120) + ' …' : rep)}</span>` : ''}</span>
      ${badge(j)}</button>`;
  };
  $('#custDlgBody').innerHTML = `
    <div class="sh-top"><button class="sh-back" data-close aria-label="Schließen">${icon('back')}</button></div>
    <div class="sh-body">
      <h2>${esc(c.name)}</h2>
      <div class="sec">
        <div class="sec-head"><p class="sec-title">Kontakt</p></div>
        ${custAddress(c) ? `<div class="row">${icon('place')}<div>${esc(custAddress(c))}</div></div>` : ''}
        ${c.telefon ? `<div class="row">${icon('phone')}<div><a href="tel:${esc(c.telefon.replace(/[^\d+]/g, ''))}">${esc(c.telefon)}</a></div></div>` : ''}
        ${c.notiz ? `<div class="row">${icon('notes')}<div>${esc(c.notiz)}</div></div>` : ''}
      </div>
      <div class="sh-actions">
        <button class="btn" data-cdlg="edit">${icon('edit')}Bearbeiten</button>
        <button class="btn primary" data-cdlg="job">${icon('add')}Neuer Auftrag</button>
      </div>
      <div class="sec">
        <div class="sec-head"><p class="sec-title">Aufträge</p></div>
        <p class="hint" style="margin:8px 0 2px">${summary}</p>
        <div class="hist">${list.map(item).join('')}</div>
      </div>
    </div>`;
}

function editCustomer(id) {
  const c = ui.customers.find(x => x.id === id), f = $('#custForm');
  if (!c || !f) return;
  ui.custEdit = id;
  for (const k of ['name', 'telefon', 'strasse', 'plz', 'ort', 'notiz']) f.elements[k].value = c[k] || '';
  $('#custFormTitle').textContent = `Kunde bearbeiten: ${c.name}`;
  $('#custSaveLbl').textContent = 'Speichern';
  $('#custCancel').hidden = false;
  $('#custErr').textContent = '';
  renderCustomersPage();
  f.scrollIntoView({ behavior: 'smooth', block: 'center' });
  f.elements.name.focus();
}

function resetCustomerForm() {
  const f = $('#custForm');
  if (!f) return;
  ui.custEdit = null;
  f.reset();
  $('#custFormTitle').textContent = 'Neuen Kunden anlegen';
  $('#custSaveLbl').textContent = 'Anlegen';
  $('#custCancel').hidden = true;
  $('#custErr').textContent = '';
  renderCustomersPage();
}

async function saveCustomer(e) {
  const f = e.target, err = $('#custErr');
  const v = k => f.elements[k].value.trim();
  const data = { name: v('name'), telefon: v('telefon'), strasse: v('strasse'), plz: v('plz'), ort: v('ort'), notiz: v('notiz') };
  err.textContent = '';
  if (!data.name) { err.textContent = 'Bitte einen Namen eingeben.'; return; }
  const dup = ui.customers.find(c => c.id !== ui.custEdit && sameName(c.name, data.name) && sameName(c.strasse, data.strasse));
  if (dup && !confirm(`„${dup.name}“ mit dieser Adresse gibt es schon. Trotzdem speichern?`)) return;
  const btn = f.querySelector('.primary'); btn.disabled = true;
  try {
    if (ui.custEdit) await store.updateCustomer(ui.custEdit, data);
    else store.addCustomer({ ...data, angelegt: todayKey(), zuletzt: null });
    resetCustomerForm();
  } catch (x) { err.textContent = 'Speichern fehlgeschlagen.'; }
  finally { btn.disabled = false; }
}

// Vorschläge im Auftragsformular
function fillCustomerList() {
  const dl = $('#kundenList');
  if (!dl) return;
  dl.innerHTML = ui.customers.map(c => `<option value="${esc(c.name)}">${esc(custAddress(c))}</option>`).join('');
}

// Kundenfeld im Auftrag: passt der Name genau zu einem Kunden, wird er verknüpft (und ggf. ausgefüllt)
function matchFormCustomer(fill) {
  const f = $('#jobForm');
  const hits = ui.customers.filter(c => sameName(c.name, f.elements.kunde.value));
  const c = hits.length === 1 ? hits[0] : null;
  ui.formKundeId = c ? c.id : null;
  if (c && fill) {
    for (const k of ['telefon', 'strasse', 'plz', 'ort']) f.elements[k].value = c[k] || '';
    if (c.notiz && !f.elements.notiz.value.trim()) f.elements.notiz.value = c.notiz;
  }
  updateCustomerHint();
}

function updateCustomerHint() {
  const f = $('#jobForm');
  const linked = ui.customers.find(c => c.id === ui.formKundeId);
  $('#custLinked').hidden = !linked;
  $('#custSaveWrap').hidden = !!linked || !f.elements.kunde.value.trim();
}

async function addAbsence(e) {
  const f = e.target, err = $('#absErr');
  const a = { mitarbeiter: f.elements.mitarbeiter.value, art: f.elements.art.value, von: f.elements.von.value, bis: f.elements.bis.value };
  err.textContent = '';
  if (!a.mitarbeiter) { err.textContent = 'Bitte einen Mitarbeiter auswählen.'; return; }
  if (a.bis < a.von) { err.textContent = '„Bis“ liegt vor „Von“.'; return; }
  const open = ui.jobs.filter(j => j.mitarbeiter === a.mitarbeiter && j.status !== 'fertig' && a.von <= j.datum && j.datum <= a.bis);
  if (open.length && !confirm(`${workerName(a.mitarbeiter)} hat in diesem Zeitraum ${open.length} offene${open.length === 1 ? 'n Auftrag' : ' Aufträge'}. Trotzdem eintragen? Die Aufträge bleiben bestehen und müssen ggf. verschoben werden.`)) return;
  const btn = f.querySelector('.primary'); btn.disabled = true;
  try { await store.addAbsence(a); f.elements.mitarbeiter.value = ''; }
  catch (x) { err.textContent = 'Speichern fehlgeschlagen.'; }
  finally { btn.disabled = false; }
}

async function addWorker(e) {
  const f = e.target;
  const nr = f.elements.nr.value.trim(), name = f.elements.name.value.trim(), pin = f.elements.pin.value.trim();
  $('#workerErr').textContent = '';
  const btn = f.querySelector('.primary'); btn.disabled = true;
  try { await store.addWorker(nr, name, pin); f.reset(); }
  catch (err) { $('#workerErr').textContent = err.message; }
  finally { btn.disabled = false; }
}

function stepDate(n) {
  ui.day = ymd(addDays(parseYmd(ui.day), ui.mode === 'week' ? 7 * n : n));
  renderPlan();
}

// ================= Monteur =================
function enterWorker() {
  stopWatching();
  $('#loginView').hidden = true;
  $('#appView').hidden = true;
  $('#workerView').hidden = false;
  ui.wPage = 'termine'; ui.wTab = 'geplant'; ui.me = null; ui.jobs = [];
  const nr = ui.session.nr;
  ui.unsub.push(store.watchWorker(nr, w => { ui.me = w; renderWorker(); }));
  ui.unsub.push(store.watchJobs(nr, js => {
    ui.jobs = sortJobs(js);
    renderWorker();
    if ($('#detailDlg').open) renderDetail();
  }, windowStart()));
  renderWorker();
}

function renderWorker() {
  if (ui.session?.role !== 'worker') return;
  document.querySelectorAll('[data-wpage]').forEach(b => b.classList.toggle('on', b.dataset.wpage === ui.wPage));
  const c = $('#wContent');
  const name = ui.me?.name || '';

  if (ui.wPage === 'konto') {
    c.innerHTML = `<div class="w-konto">
      <h1>Konto</h1>
      ${avatar(ui.session.nr, name || '?', 'lg')}
      <div><div class="name">${esc(name)}</div><div class="hint">Mitarbeiter-Nr. ${esc(ui.session.nr)}</div></div>
      <button class="btn" data-act="pin">PIN ändern</button>
      <button class="btn" data-act="logout">Abmelden</button>
    </div>`;
    return;
  }

  const t = todayKey();
  const lists = {
    geplant: ui.jobs.filter(j => stateOf(j) === 'geplant'),
    ueberfaellig: ui.jobs.filter(j => stateOf(j) === 'ueberfaellig'),
    erledigt: ui.jobs.filter(j => stateOf(j) === 'erledigt').reverse(),
  };
  const list = lists[ui.wTab];
  const groups = [];
  for (const j of list) {
    if (!groups.length || groups[groups.length - 1].k !== j.datum) groups.push({ k: j.datum, jobs: [] });
    groups[groups.length - 1].jobs.push(j);
  }
  const empty = { geplant: 'Keine geplanten Termine.', ueberfaellig: 'Nichts überfällig. 👍', erledigt: 'Noch nichts erledigt.' }[ui.wTab];
  const prevScroll = c.scrollTop;
  c.innerHTML = `
    <header class="w-head">
      <h1>Ihre Termine</h1>
      <div class="w-sub">${esc(name)}${name ? ' · ' : ''}Nr. ${esc(ui.session.nr)}</div>
      <div class="w-tabs">
        <button data-wtab="geplant" class="${ui.wTab === 'geplant' ? 'on' : ''}">Geplant</button>
        <button data-wtab="ueberfaellig" class="${ui.wTab === 'ueberfaellig' ? 'on' : ''}">Überfällig${lists.ueberfaellig.length ? '<span class="tdot"></span>' : ''}</button>
        <button data-wtab="erledigt" class="${ui.wTab === 'erledigt' ? 'on' : ''}">Erledigt</button>
      </div>
    </header>
    ${groups.length ? groups.map(g => `<div class="w-day">${esc(dayLabel(g.k))}</div>${g.jobs.map(j => `
      <button class="w-card" data-id="${esc(j.id)}">
        <span class="w-top"><span>${esc(whenText(j))}</span>${badge(j)}</span>
        <span class="t">${esc(titleOf(j))}</span>
        ${j.auftrag ? `<span class="k">${esc(j.kunde)}</span>` : ''}
        ${address(j) ? `<span class="a">${esc(address(j))}</span>` : ''}
        ${others(j).length ? `<span class="a">👥 mit ${esc(others(j).join(', '))}</span>` : ''}
      </button>`).join('')}`).join('') : `<div class="w-empty">${empty}</div>`}`;
  c.scrollTop = prevScroll;
  void t;
}

// ================= Termin-Detail =================
function openDetail(id) {
  ui.detailId = id;
  renderDetail();
  if (!$('#detailDlg').open) $('#detailDlg').showModal();
}

function renderDetail() {
  const j = ui.jobs.find(x => x.id === ui.detailId);
  if (!j) { $('#detailDlg').close(); return; }
  const office = ui.session.role === 'office';
  const done = j.status === 'fertig';
  const hasAddr = !!address(j);
  const f = finishedAt(j), a = arrivedAt(j);

  // Arbeitszeit: geplant → angekommen → fertig
  const fmtTime = d => d.toDateString() === parseYmd(j.datum).toDateString() ? `${hm(d)} Uhr` : `${d.toLocaleDateString('de-DE')} ${hm(d)} Uhr`;
  let work = `<div class="row">${icon('cal')}<div>Geplant ${esc(j.von)} Uhr${j.dauer ? ` · ${esc(dauerText(j.dauer))}` : ''}<br><span class="hint">${esc(dayLabel(j.datum))}</span></div></div>`;
  if (a) work += `<div class="row">${icon('place')}<div>Angekommen ${fmtTime(a)}</div></div>`;
  // Vor Ort: Monteur schätzt, wie lange es dauert
  if (a && !done) {
    const est = estEnd(j);
    const estTxt = est !== null && est < 24 * 60 ? `fertig ca. ${fromMin(est)} Uhr` : '';
    const ext = overrun(j);
    const extTxt = ext ? `<br><span class="r-ext">${esc(duration(ext))} über Plan · geplant war bis ${fromMin(plannedEnd(j))} Uhr</span>` : '';
    if (!office) {
      // Krumme Werte (z. B. von der Drehuhr) als eigene Option zeigen
      const opts = DUR_OPTS.some(([m]) => m === Number(j.dauerVorOrt)) || !j.dauerVorOrt ? DUR_OPTS : [...DUR_OPTS, [Number(j.dauerVorOrt), duration(Number(j.dauerVorOrt))]].sort((x, y) => x[0] - y[0]);
      work += `<div class="row">${icon('clock')}<div><label for="estDur">Dauert voraussichtlich</label>
        <div class="inl-row"><select class="inl" id="estDur"><option value="">bitte wählen</option>${opts.map(([m, t]) => `<option value="${m}"${Number(j.dauerVorOrt) === m ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>
        ${estTxt ? `<span class="hint">→ ${estTxt}</span>` : ''}</div>${extTxt}</div></div>`;
    } else if (j.dauerVorOrt) {
      work += `<div class="row">${icon('clock')}<div>Monteur schätzt ${esc(dauerText(j.dauerVorOrt))}${estTxt ? `<br><span class="hint">${estTxt}</span>` : ''}${extTxt}</div></div>`;
    }
  }
  if (done && f) {
    const from = a || new Date(`${j.datum}T${j.von}`);
    const mins = Math.round((f - from) / 60000);
    work += `<div class="row">${icon('clock')}<div>Fertig ${fmtTime(f)}</div>${mins > 0 && mins < 24 * 60 ? `<span class="r">${duration(mins)}${a ? '' : ' ab Plan'}</span>` : ''}</div>`;
  } else if (!office) {
    work += `<div class="info">${icon('info')}<span>${a ? 'Erst nach Abschluss der Arbeiten „Fertig“ drücken – die Uhrzeit wird automatisch eingetragen.' : 'Beim Kunden „Angekommen“ drücken, nach Abschluss „Fertig“. Die Uhrzeiten werden automatisch eingetragen.'}${others(j).length ? ' Im Team meldet sich jeder Monteur selbst fertig.' : ''}</span></div>`;
  }
  // Büro: Endzeit nachträglich eintragen oder korrigieren
  if (office) {
    work += `<div class="row">${icon('clock')}<div><label for="endTime">${done && f ? 'Endzeit ändern' : 'Endzeit nachtragen'}</label>
      <div class="inl-row"><input class="inl" type="time" id="endTime" data-job="${esc(j.id)}" value="${done && f && ymd(f) === j.datum ? hm(f) : ''}">
      <button class="btn" type="button" id="saveEnd">Speichern</button></div></div></div>`;
  }

  // Arbeitsbericht: dezent zum Aufklappen
  const rep = j.bericht || '';
  const report = office
    ? (rep ? `<div class="sec"><div class="sec-head"><p class="sec-title">Bericht</p></div><div class="row">${icon('notes')}<div>${esc(rep)}</div></div></div>` : '')
    : `<details class="report" data-job="${esc(j.id)}" ${rep ? 'open' : ''}><summary>Arbeitsbericht${rep ? '' : ' (optional)'}</summary>
        <textarea id="reportText" data-job="${esc(j.id)}" maxlength="2000" placeholder="Was wurde gemacht? Verbrauchtes Material …">${esc(rep)}</textarea>
        <div style="margin-top:6px"><button class="btn" id="saveReport" type="button">Bericht speichern</button><span class="saved" id="reportSaved"></span></div>
      </details>`;

  // Karte nur laden, wenn sich die Adresse geändert hat (sonst flackert sie bei Live-Updates)
  const oldFrame = $('#detailBody iframe');
  const keepFrame = oldFrame && oldFrame.dataset.addr === address(j);

  // Ungespeicherte Eingaben (Bericht, Endzeit) überstehen Live-Updates desselben Auftrags
  const keepInput = sel => {
    const el = $(sel);
    return el && el.dataset.job === j.id
      ? { value: el.value, dirty: el.value !== el.defaultValue, focus: document.activeElement === el, a: el.selectionStart, b: el.selectionEnd } : null;
  };
  const draftReport = keepInput('#reportText'), draftEnd = keepInput('#endTime');
  const oldDetails = $('#detailBody details.report');
  const reportOpen = !!oldDetails && oldDetails.dataset.job === j.id && oldDetails.open;
  // Team-Auftrag: Kollegen, die noch nicht fertig gemeldet sind (das Büro kann sie mit erledigen)
  const mates = office && !done ? groupOf(j).filter(g => g.id !== j.id && g.status !== 'fertig') : [];

  $('#detailBody').innerHTML = `
    ${hasAddr ? `<div class="sh-map">
      ${keepFrame ? '<div id="frameSlot" style="height:100%"></div>' : `<iframe src="${esc(mapEmbed(j))}" data-addr="${esc(address(j))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Karte"></iframe>`}
      <button class="sh-back" data-close aria-label="Schließen">${icon('back')}</button>
      <div class="sh-loc"><div><b>${esc(j.kunde)}</b><span>${esc(address(j))}</span></div>
        <a class="nav-sq" href="${esc(googleMaps(j))}" target="_blank" rel="noopener" aria-label="Navigation starten">${icon('turn')}</a></div>
    </div>` : `<div class="sh-top"><button class="sh-back" data-close aria-label="Schließen">${icon('back')}</button></div>`}
    <div class="sh-body">
      <div class="sh-when"><span>${esc(whenText(j))}</span>${badge(j)}</div>
      <h2>${esc(titleOf(j))}</h2>
      <div class="sec">
        <div class="sec-head"><p class="sec-title">Details</p></div>
        <div class="row">${icon('person')}<div>${esc(j.kunde)}</div></div>
        ${hasAddr ? `<div class="row">${icon('place')}<div>${esc(address(j))}</div></div>
          <div class="row">${icon('map')}<div><a href="${esc(googleMaps(j))}" target="_blank" rel="noopener">Google Maps</a> &nbsp;·&nbsp; <a href="${esc(appleMaps(j))}" target="_blank" rel="noopener">Apple Karten</a></div></div>` : ''}
        ${j.telefon ? `<div class="row">${icon('phone')}<div><a href="tel:${esc(j.telefon.replace(/[^\d+]/g, ''))}">${esc(j.telefon)}</a></div></div>` : ''}
        ${office ? `<div class="row">${avatar(j.mitarbeiter, workerName(j.mitarbeiter))}<div>${esc(workerName(j.mitarbeiter))}${others(j).length ? `<br><span class="hint">Team mit ${esc(others(j).join(', '))}</span>` : ''}</div></div>`
          : others(j).length ? `<div class="row">${icon('person')}<div>Zusammen mit ${esc(others(j).join(', '))}</div></div>` : ''}
        ${j.notiz ? `<div class="row">${icon('notes')}<div>${esc(j.notiz)}</div></div>` : ''}
      </div>
      <div class="sec">
        <div class="sec-head"><p class="sec-title">Arbeitszeit</p></div>
        ${work}
      </div>
      ${report}
      ${!done && !a && !office ? '<button class="btn big outline" id="arrived">Angekommen</button>' : ''}
      ${!done && a && !office ? `<button class="btn big outline orange" id="extend">${icon('clock')}Dauert länger</button>` : ''}
      ${mates.length ? `<label class="save-cust" style="margin:0"><input type="checkbox" id="teamAll"${ui.teamAll ? ' checked' : ''}> Auch für ${esc(mates.map(g => workerName(g.mitarbeiter)).join(', '))} als erledigt eintragen</label>` : ''}
      <button class="btn big ${done ? '' : 'green'}" id="toggleDone">${done ? 'Wieder auf offen setzen' : '✓ Fertig'}</button>
      ${office ? `<div class="sh-actions"><button class="btn danger" id="deleteJob">Löschen</button><button class="btn" id="editJob">Bearbeiten</button></div>` : ''}
    </div>`;
  if (keepFrame) $('#frameSlot').replaceWith(oldFrame);
  const restoreInput = (sel, d) => {
    const el = $(sel);
    if (!el || !d) return;
    if (d.dirty) el.value = d.value;
    if (d.focus) { el.focus(); try { el.setSelectionRange(d.a, d.b); } catch (e) {} }
  };
  restoreInput('#reportText', draftReport);
  restoreInput('#endTime', draftEnd);
  if (reportOpen && $('#detailBody details.report')) $('#detailBody details.report').open = true;
  if ($('#teamAll')) $('#teamAll').onchange = e => { ui.teamAll = e.target.checked; };

  // Änderungen werden sofort angezeigt; ohne Netz überträgt Firebase sie später automatisch
  const save = async (data, btn) => {
    if (btn) btn.disabled = true;
    try { await store.updateJob(j.id, data); }
    catch (x) { alert('Speichern fehlgeschlagen. Bitte erneut versuchen.'); if (btn) btn.disabled = false; }
  };
  const reportVal = () => $('#reportText') ? $('#reportText').value.trim() : null;
  // Büro: Fertig-Meldung auch für die übrigen Monteure des Team-Auftrags eintragen (wenn angehakt)
  const forTeam = data => {
    if (!mates.length || !$('#teamAll')?.checked) return;
    Promise.all(mates.map(g => store.updateJob(g.id, data))).catch(() => alert('Die Kollegen konnten nicht als erledigt eingetragen werden.'));
  };
  $('#toggleDone').onclick = () => {
    if (done) return save({ status: 'offen', fertigAm: null }, $('#toggleDone'));
    const data = { status: 'fertig', fertigAm: new Date().toISOString() };
    forTeam({ ...data });
    const r = reportVal();
    if (r !== null && r !== rep) data.bericht = r;
    save(data, $('#toggleDone'));
  };
  if ($('#arrived')) $('#arrived').onclick = () => save({ angekommenAm: new Date().toISOString() }, $('#arrived'));
  if ($('#estDur')) $('#estDur').onchange = e => save({ dauerVorOrt: Number(e.target.value) || null }, null);
  if ($('#extend')) $('#extend').onclick = () => openExtend(j);
  if ($('#saveEnd')) $('#saveEnd').onclick = () => {
    const t = $('#endTime').value;
    if (!t) { alert('Bitte eine Uhrzeit eingeben.'); return; }
    const end = new Date(`${j.datum}T${t}`);
    const start = a && ymd(a) === j.datum ? a : new Date(`${j.datum}T${j.von}`);
    if (end <= start && !confirm(`Die Endzeit ${t} Uhr liegt vor dem Beginn (${hm(start)} Uhr). Trotzdem speichern?`)) return;
    if (!done && !confirm('Der Auftrag wird damit als erledigt markiert. Fortfahren?')) return;
    forTeam({ status: 'fertig', fertigAm: end.toISOString() });
    save({ status: 'fertig', fertigAm: end.toISOString() }, $('#saveEnd'));
  };
  if ($('#saveReport')) $('#saveReport').onclick = async () => {
    await save({ bericht: reportVal() }, null);
    $('#reportSaved').textContent = navigator.onLine ? '✓ gespeichert' : '✓ wird übertragen';
  };
  if (office) {
    $('#editJob').onclick = () => { $('#detailDlg').close(); openForm(j); };
    $('#deleteJob').onclick = async () => {
      const group = groupOf(j);
      let ids;
      if (group.length > 1) {
        if (confirm(`Auftrag „${titleOf(j)}“ für alle ${group.length} Monteure löschen?\n\n(Abbrechen = nur für ${workerName(j.mitarbeiter)} löschen)`)) ids = group.map(g => g.id);
        else if (confirm(`Nur für ${workerName(j.mitarbeiter)} löschen?`)) ids = [j.id];
        else return;
      } else {
        if (!confirm(`Auftrag „${titleOf(j)}“ wirklich löschen?`)) return;
        ids = [j.id];
      }
      $('#detailDlg').close();
      const rest = group.filter(g => !ids.includes(g.id));
      await Promise.all([
        ...ids.map(id => store.deleteJob(id)),
        ...rest.map(g => store.updateJob(g.id, { team: rest.length > 1 ? teamOf(rest.map(r => r.mitarbeiter)) : null })),
      ]);
    };
  }
}

// ================= Dauert länger: Drehuhr (Monteur) =================
// Der Monteur dreht, wie viel länger es dauert (eine Runde = 1 Std., 5-Minuten-Schritte, max. 4 Std.).
// Gespeichert wird nur das bestehende Feld dauerVorOrt (Minuten ab Ankunft) – keine neuen Felder, Regeln unverändert.
const EXT = { C: 120, R: 96, MIN: 5, MAX: 240, SNAP: 5 };
const ext = { job: null, cur: 30, target: 30, last: null, raf: 0 };
const extMinutes = () => Math.max(EXT.MIN, Math.round(ext.cur / EXT.SNAP) * EXT.SNAP);

// Bisher erwartetes Ende als Zeitpunkt: Schätzung vor Ort, sonst Plan
// (Ankunft an einem anderen Tag als geplant: Ankunft + geplante Dauer).
function extPrevEnd(j) {
  const a = arrivedAt(j), dur = Number(j.dauer) || 60;
  if (a && j.dauerVorOrt) return new Date(a.getTime() + Number(j.dauerVorOrt) * 60000);
  if (a && ymd(a) !== j.datum) return new Date(a.getTime() + dur * 60000);
  const plan = new Date(`${j.datum}T${j.von}`);
  plan.setMinutes(plan.getMinutes() + dur);
  return plan;
}
// Ist das bisherige Ende schon vorbei, zählt die Verlängerung ab jetzt
const extBase = j => new Date(Math.max(extPrevEnd(j).getTime(), Date.now()));

function initExtDial() {
  const { C, R } = EXT;
  let ticks = '';
  for (let i = 0; i < 12; i++) {
    const a = i * 30 * Math.PI / 180, big = i % 3 === 0, r1 = R - (big ? 11 : 9), r2 = R + (big ? 11 : 9);
    ticks += `<line class="ext-tick" stroke-width="${big ? 2 : 1}" x1="${C + Math.sin(a) * r1}" y1="${C - Math.cos(a) * r1}" x2="${C + Math.sin(a) * r2}" y2="${C - Math.cos(a) * r2}"/>`;
  }
  $('#extTicks').innerHTML = ticks;
  const dial = $('#extDial');
  const angle = e => { const r = dial.getBoundingClientRect(); return Math.atan2(e.clientX - r.left - r.width / 2, -(e.clientY - r.top - r.height / 2)) * 180 / Math.PI; };
  dial.addEventListener('pointerdown', e => { cancelAnimationFrame(ext.raf); ext.last = angle(e); dial.setPointerCapture(e.pointerId); dial.classList.add('drag'); });
  dial.addEventListener('pointermove', e => {
    if (ext.last === null) return;
    const a = angle(e);
    let d = a - ext.last;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    ext.last = a;
    ext.cur = ext.target = Math.min(EXT.MAX, Math.max(EXT.MIN, ext.cur + d / 360 * 60));
    drawExt();
  });
  const release = () => { if (ext.last === null) return; ext.last = null; dial.classList.remove('drag'); extTo(Math.round(ext.cur / EXT.SNAP) * EXT.SNAP); };
  dial.addEventListener('pointerup', release);
  dial.addEventListener('pointercancel', release);
  // Tastatur: Pfeiltasten ± 5 Min.
  dial.tabIndex = 0;
  dial.addEventListener('keydown', e => {
    const s = { ArrowUp: 5, ArrowRight: 5, ArrowDown: -5, ArrowLeft: -5 }[e.key];
    if (s) { e.preventDefault(); extTo(extMinutes() + s); }
  });
  document.querySelectorAll('[data-ext]').forEach(b => b.onclick = () => extTo(Number(b.dataset.ext)));
  $('#extSave').onclick = saveExtend;
}

// Weich zum Zielwert gleiten (Einrasten, Schnellknöpfe)
function extTo(t) {
  ext.target = Math.min(EXT.MAX, Math.max(EXT.MIN, t));
  cancelAnimationFrame(ext.raf);
  const step = () => {
    const d = ext.target - ext.cur;
    if (Math.abs(d) < 0.3) { ext.cur = ext.target; drawExt(); return; }
    ext.cur += d * 0.22;
    drawExt();
    ext.raf = requestAnimationFrame(step);
  };
  ext.raf = requestAnimationFrame(step);
}

function drawExt() {
  const { C, R } = EXT;
  const pt = deg => { const a = deg * Math.PI / 180; return [C + Math.sin(a) * R, C - Math.cos(a) * R]; };
  const shown = (ext.cur / 60 * 360) % 360;
  const [x, y] = pt(shown), [sx, sy] = pt(0);
  $('#extArc').setAttribute('d', shown < 0.5 ? '' : `M${sx} ${sy} A${R} ${R} 0 ${shown > 180 ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)}`);
  $('#extLap').style.display = ext.cur >= 60 ? '' : 'none';
  $('#extKnob').setAttribute('cx', x.toFixed(2));
  $('#extKnob').setAttribute('cy', y.toFixed(2));
  const m = extMinutes();
  $('#extMid').textContent = '+' + duration(m);
  if (ext.job) $('#extEnd').textContent = `fertig ca. ${hm(new Date(extBase(ext.job).getTime() + m * 60000))} Uhr`;
  const full = Math.floor(ext.cur / 60);
  $('#extTurns').textContent = full ? `${full} volle Runde${full > 1 ? 'n' : ''}` : '';
  $('#extDial').setAttribute('aria-valuenow', m);
  $('#extDial').setAttribute('aria-valuetext', '+' + duration(m));
}

function openExtend(j) {
  ext.job = j;
  ext.cur = ext.target = 30;
  ext.last = null;
  $('#extErr').textContent = '';
  const prev = extPrevEnd(j), now = new Date();
  const when = d => ymd(d) === ymd(now) ? `${hm(d)} Uhr` : `${d.toLocaleDateString('de-DE')} ${hm(d)} Uhr`;
  $('#extJob').textContent = prev < now
    ? `${titleOf(j)} · Das bisherige Ende (${when(prev)}) ist schon vorbei. Die Verlängerung zählt deshalb ab jetzt (${hm(now)} Uhr).`
    : `${titleOf(j)} · bisher fertig ca. ${when(prev)}`;
  drawExt();
  $('#extDlg').showModal();
}

async function saveExtend() {
  const j = ui.jobs.find(x => x.id === ext.job?.id);
  const a = j && arrivedAt(j);
  if (!j || !a) { $('#extErr').textContent = 'Dieser Auftrag ist nicht mehr offen.'; return; }
  const end = extBase(j).getTime() + extMinutes() * 60000;
  // Sicherheitsregeln erlauben 1–1440 Minuten ab Ankunft
  const dauerVorOrt = Math.min(1440, Math.max(1, Math.round((end - a.getTime()) / 60000)));
  const btn = $('#extSave');
  btn.disabled = true;
  try {
    await store.updateJob(j.id, { dauerVorOrt });
    $('#extDlg').close();
  } catch (x) {
    $('#extErr').textContent = 'Speichern fehlgeschlagen. Bitte erneut versuchen.';
  } finally {
    btn.disabled = false;
  }
}

// ================= Auftrag anlegen / bearbeiten =================
function openForm(job, preset = {}) {
  const f = $('#jobForm');
  f.reset();
  $('#formErr').textContent = '';
  ui.editId = job ? job.id : null;
  $('#formTitle').textContent = job ? 'Auftrag bearbeiten' : 'Neuer Auftrag';
  $('#formBadge').innerHTML = job ? badge(job) : '<span class="badge">Geplant</span>';
  const curNr = job ? job.mitarbeiter : preset.nr || ui.filter || '';
  // Team: der bearbeitete Monteur zuerst, dann die übrigen
  const team = job ? [curNr, ...groupOf(job).map(g => g.mitarbeiter).filter(nr => nr !== curNr)] : [curNr];
  const opts = ui.workers.map(w => ({ nr: w.nr, name: w.name }));
  for (const nr of team) if (nr && !opts.some(o => o.nr === nr)) opts.push({ nr, name: `Nr. ${nr}` });
  const optHtml = opts.map(o => `<option value="${esc(o.nr)}">${esc(o.name)} (${esc(o.nr)})</option>`).join('');
  ['mitarbeiter', 'mitarbeiter2', 'mitarbeiter3'].forEach((n, i) => {
    f.elements[n].innerHTML = (i ? '<option value="">– keiner –</option>' : '<option value="">Monteur auswählen …</option>') + optHtml;
    f.elements[n].value = team[i] || '';
  });
  $('#m2wrap').hidden = !team[1];
  $('#m3wrap').hidden = !team[2];
  $('#addTeam').hidden = !!team[2];
  const pk = preset.kunde;
  const data = job || { datum: preset.day || ui.day, von: preset.time || '08:00',
    ...(pk ? { kunde: pk.name, telefon: pk.telefon, strasse: pk.strasse, plz: pk.plz, ort: pk.ort, notiz: pk.notiz } : {}) };
  for (const k of ['kunde', 'auftrag', 'datum', 'telefon', 'von', 'strasse', 'plz', 'ort', 'notiz']) f.elements[k].value = data[k] || '';
  ui.formKundeId = job ? (job.kundeId || null) : (pk ? pk.id : null);
  if (!ui.formKundeId) matchFormCustomer(false); else updateCustomerHint();
  f.elements.saveCust.checked = false;
  f.elements.dauer.value = data.dauer ? String(data.dauer) : '';
  if (f.elements.dauer.value === '' && data.dauer) { // ungewöhnlicher Wert: als Option ergänzen
    f.elements.dauer.insertAdjacentHTML('beforeend', `<option value="${Number(data.dauer)}">${duration(Number(data.dauer))}</option>`);
    f.elements.dauer.value = String(data.dauer);
  }
  checkConflict();
  $('#formDlg').showModal();
  if (!job) (curNr ? f.elements.kunde : f.elements.mitarbeiter).focus();
}

// Warnung, wenn der Monteur zur selben Zeit schon einen offenen Auftrag hat
function checkConflict() {
  const f = $('#jobForm');
  const datum = f.elements.datum.value, von = f.elements.von.value, dauer = Number(f.elements.dauer.value) || 60;
  const nrs = formTeam();
  const own = ui.editId ? groupOf(ui.jobs.find(j => j.id === ui.editId) || {}).map(g => g.id) : [];
  let msg = nrs.length < [f.elements.mitarbeiter, f.elements.mitarbeiter2, f.elements.mitarbeiter3].filter(s => s.value).length
    ? 'Ein Monteur ist doppelt ausgewählt.' : '';
  for (const nr of nrs) {
    if (msg) break;
    const id = ui.jobs.find(j => own.includes(j.id) && j.mitarbeiter === nr)?.id || ui.editId;
    const t = conflictText(id, nr, datum, von, dauer);
    if (t) msg = nrs.length > 1 && t.startsWith('Terminkonflikt') ? `${workerName(nr)}: ${t}` : t;
  }
  $('#conflict').textContent = msg;
}

// Ausgewählte Monteure (ohne Lücken und Doppelte)
function formTeam() {
  const f = $('#jobForm');
  return [...new Set(['mitarbeiter', 'mitarbeiter2', 'mitarbeiter3'].map(n => f.elements[n].value.trim()).filter(Boolean))];
}

// Überschneidung mit offenem Auftrag oder Urlaub/Krank
function conflictText(id, nr, datum, von, dauer) {
  if (!nr || !datum) return '';
  const abs = absenceOf(nr, datum);
  if (abs) return `Achtung: ${workerName(nr)} ist an diesem Tag ${abs.art === 'krank' ? 'krank gemeldet' : 'im Urlaub'}.`;
  if (!von) return '';
  const s = toMin(von), e = s + dauer;
  const hit = ui.jobs.find(j => j.id !== id && j.mitarbeiter === nr && j.datum === datum && j.status !== 'fertig'
    && toMin(j.von) < e && s < planEnd(j));
  return hit ? `Terminkonflikt: ${hit.von} Uhr „${titleOf(hit)}“` : '';
}

async function saveForm(e) {
  e.preventDefault();
  const f = e.target;
  const v = k => f.elements[k].value.trim();
  const err = t => { $('#formErr').textContent = t; };
  const nrs = formTeam();
  if (!nrs.length) return err('Bitte einen Monteur auswählen.');
  const worker = nr => ui.workers.find(x => x.nr === nr);
  // Gemeinsame Angaben für alle Monteure des Auftrags
  const shared = {
    kunde: v('kunde'), auftrag: v('auftrag'), datum: v('datum'), von: v('von'),
    telefon: v('telefon'), strasse: v('strasse'), plz: v('plz'), ort: v('ort'), notiz: v('notiz'),
    dauer: Number(v('dauer')) || null,
  };
  // Verknüpfung mit der Kundenliste (oder neuen Kunden anlegen, wenn angehakt)
  const linked = ui.customers.find(c => c.id === ui.formKundeId);
  let newCustomer = null;
  if (!linked && f.elements.saveCust.checked && shared.kunde) {
    newCustomer = { name: shared.kunde, telefon: shared.telefon, strasse: shared.strasse, plz: shared.plz, ort: shared.ort,
      notiz: '', angelegt: todayKey(), zuletzt: shared.datum };
  }
  shared.kundeId = linked ? linked.id : null;
  const fresh = nr => ({ ...shared, mitarbeiter: nr, mitarbeiterUid: worker(nr)?.uid || null, status: 'offen', fertigAm: null });
  const ops = [];

  if (!ui.editId) {
    const missing = nrs.find(nr => !worker(nr));
    if (missing) return err(`Mitarbeiter ${missing} ist nicht angelegt.`);
    const extra = nrs.length > 1 ? { gruppe: newGroupId(), team: teamOf(nrs) } : {};
    nrs.forEach(nr => ops.push(() => store.addJob({ ...fresh(nr), ...extra })));
  } else {
    const old = ui.jobs.find(j => j.id === ui.editId);
    if (!old) return err('Dieser Auftrag existiert nicht mehr.');
    const rest = groupOf(old).filter(g => g.id !== old.id);
    // Bisherige Aufträge den ausgewählten Monteuren zuordnen
    const docs = [old];
    for (const nr of nrs.slice(1)) {
      const hit = rest.find(g => g.mitarbeiter === nr && !docs.includes(g));
      docs.push(hit || null);
    }
    const removed = rest.filter(g => !docs.includes(g));
    const missing = nrs.find((nr, i) => !worker(nr) && !(docs[i] && docs[i].mitarbeiter === nr));
    if (missing) return err(`Mitarbeiter ${missing} ist nicht angelegt.`);
    if (removed.length && !confirm(`${removed.map(g => workerName(g.mitarbeiter)).join(', ')} aus dem Auftrag entfernen?`)) return;
    const extra = nrs.length > 1 ? { gruppe: old.gruppe || newGroupId(), team: teamOf(nrs) }
      : old.team ? { team: null } : {};
    nrs.forEach((nr, i) => {
      const d = docs[i];
      if (!d) { ops.push(() => store.addJob({ ...fresh(nr), ...extra })); return; }
      const data = { ...shared, ...extra };
      if (d.mitarbeiter !== nr) Object.assign(data, { mitarbeiter: nr, mitarbeiterUid: worker(nr)?.uid || null });
      if (d.status !== 'fertig' && (d.mitarbeiter !== nr || d.datum !== shared.datum)) Object.assign(data, resetArrival(d));
      ops.push(() => store.updateJob(d.id, { ...data, kundeId: shared.kundeId }));
    });
    removed.forEach(g => ops.push(() => store.deleteJob(g.id)));
  }

  const btn = f.querySelector('.primary');
  btn.disabled = true;
  const data = shared;
  try {
    if (newCustomer) shared.kundeId = store.addCustomer(newCustomer);
    await Promise.all(ops.map(op => op()));
    if (linked && isDay(shared.datum) && (!linked.zuletzt || shared.datum > linked.zuletzt)) store.updateCustomer(linked.id, { zuletzt: shared.datum });
    $('#formDlg').close();
    ui.day = data.datum;
    refresh();
  } catch (err) {
    console.error(err);
    $('#formErr').textContent = 'Speichern fehlgeschlagen. Bitte Internetverbindung prüfen.';
  } finally {
    btn.disabled = false;
  }
}

// ================= Verschieben per Ziehen (Büro, Maus) =================
function bindDrag() {
  const clear = () => document.querySelectorAll('.drop-ok').forEach(x => x.classList.remove('drop-ok'));
  const end = d => {
    d.ghost?.remove(); d.tip?.remove(); d.el.classList.remove('dragging'); clear();
    ui.suppressClick = true; setTimeout(() => { ui.suppressClick = false; }, 80);
  };

  $('#content').addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    const el = e.target.closest('.pc, .mini');
    const j = el && ui.jobs.find(x => x.id === el.dataset.id);
    if (!j || j.status === 'fertig') return;
    const r = el.getBoundingClientRect();
    const touch = e.pointerType === 'touch';
    const d = ui.drag = { el, j, touch, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, w: r.width, h: r.height, active: false, target: null };
    // Finger: Wischen scrollt weiterhin. Erst nach kurzem Gedrückthalten lässt sich der Auftrag ziehen.
    if (touch) d.timer = setTimeout(() => {
      if (ui.drag !== d || d.active) return;
      start(d);
      place(d);
      try { navigator.vibrate?.(15); } catch (x) {}
    }, 400);
  });

  const start = d => {
    d.active = true;
    d.ghost = d.el.cloneNode(true);
    d.ghost.classList.add('drag-ghost');
    Object.assign(d.ghost.style, { width: d.w + 'px', height: d.h + 'px', top: 0, left: 0 });
    d.tip = document.createElement('div');
    d.tip.className = 'drag-time';
    document.body.append(d.ghost, d.tip);
    d.el.classList.add('dragging');
    // Am Rand der Plantafel automatisch weiterscrollen
    const tick = () => {
      if (ui.drag !== d) return;
      const pt = $('#ptScroll');
      if (pt) {
        const r = pt.getBoundingClientRect(), who = narrow.matches ? 64 : 150;
        const vx = d.x > r.right - 40 ? 12 : d.x < r.left + who + 30 ? -12 : 0;
        const vy = d.y > r.bottom - 30 ? 10 : d.y < r.top + 50 ? -10 : 0;
        const bx = pt.scrollLeft, by = pt.scrollTop;
        if (vx) pt.scrollLeft += vx;
        if (vy) pt.scrollTop += vy;
        if (pt.scrollLeft !== bx || pt.scrollTop !== by) place(d);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  addEventListener('pointermove', e => {
    const d = ui.drag;
    if (!d) return;
    d.x = e.clientX; d.y = e.clientY;
    if (!d.active) {
      const far = Math.hypot(d.x - d.x0, d.y - d.y0);
      // Finger bewegt sich vor Ablauf der Haltezeit: das ist Scrollen, kein Verschieben
      if (d.touch) { if (far > 10) { clearTimeout(d.timer); ui.drag = null; } return; }
      if (far < 6) return;
      start(d);
    }
    e.preventDefault();
    place(d);
  });
  // Während des Ziehens mit dem Finger darf die Seite nicht mitscrollen
  document.addEventListener('touchmove', e => { if (ui.drag?.active) e.preventDefault(); }, { passive: false });
  $('#content').addEventListener('contextmenu', e => { if (ui.drag?.touch) e.preventDefault(); });

  // Geisterkarte an die Zeigerposition setzen und das Ziel darunter bestimmen
  const place = d => {
    const e = { clientX: d.x, clientY: d.y };
    d.ghost.style.transform = `translate(${e.clientX - d.dx}px, ${e.clientY - d.dy}px)`;
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const lane = under?.closest('.pt-lane'), cell = under?.closest('.wk-cell');
    clear();
    d.target = null;
    if (lane) {
      const x = e.clientX - d.dx - lane.getBoundingClientRect().left - 2; // linke Kante der Karte
      const min = Math.min(Math.max(Math.round((ui.plan.start * 60 + x / ui.plan.hw * 60) / 15) * 15, 0), 23 * 60 + 45);
      d.target = { nr: lane.dataset.nr, datum: lane.dataset.day, von: fromMin(min) };
      lane.classList.add('drop-ok');
      d.tip.textContent = `${workerName(d.target.nr)} · ${d.target.von} Uhr`;
    } else if (cell) {
      d.target = { nr: cell.dataset.nr, datum: cell.dataset.day, von: d.j.von };
      cell.classList.add('drop-ok');
      d.tip.textContent = `${workerName(d.target.nr)} · ${shortDate(d.target.datum)}`;
    }
    d.tip.hidden = !d.target;
    d.tip.style.left = e.clientX + 14 + 'px';
    d.tip.style.top = e.clientY + (d.touch ? -64 : 16) + 'px'; // beim Finger über der Karte, sonst verdeckt
  };

  addEventListener('pointerup', () => {
    const d = ui.drag;
    ui.drag = null;
    if (!d) return;
    clearTimeout(d.timer);
    if (!d.active) return;
    end(d);
    if (d.target) moveJob(d.j, d.target);
  });
  addEventListener('pointercancel', () => {
    if (ui.drag) { clearTimeout(ui.drag.timer); if (ui.drag.active) end(ui.drag); }
    ui.drag = null;
  });
  addEventListener('keydown', e => { if (e.key === 'Escape' && ui.drag?.active) { end(ui.drag); ui.drag = null; } });
}

async function moveJob(j, t) {
  if (t.nr === j.mitarbeiter && t.datum === j.datum && t.von === j.von) return;
  const w = ui.workers.find(x => x.nr === t.nr);
  if (!w) { alert(`Mitarbeiter ${t.nr} ist nicht (mehr) angelegt.`); return; }
  const group = groupOf(j);
  if (t.nr !== j.mitarbeiter && group.some(g => g.id !== j.id && g.mitarbeiter === t.nr)) {
    alert(`${w.name} ist bei diesem Auftrag schon dabei.`); return;
  }
  // Datum/Uhrzeit gelten für das ganze Team – Abwesenheiten aller prüfen
  const nrsAfter = group.map(g => g.id === j.id ? t.nr : g.mitarbeiter);
  const away = nrsAfter.map(nr => ({ nr, a: absenceOf(nr, t.datum) })).filter(x => x.a);
  if (away.length && !confirm(`${away.map(x => `${workerName(x.nr)} ist an diesem Tag ${x.a.art === 'krank' ? 'krank gemeldet' : 'im Urlaub'}`).join('\n')}.\n\nTrotzdem verschieben?`)) return;
  const team = group.length > 1 ? { team: teamOf(nrsAfter) } : {};
  const timeChanged = t.datum !== j.datum || t.von !== j.von;
  const ops = group.map(g => {
    if (g.id === j.id) {
      const data = { mitarbeiter: t.nr, datum: t.datum, von: t.von, ...team };
      if (t.nr !== j.mitarbeiter) data.mitarbeiterUid = w.uid || null;
      // Anderer Tag oder anderer Monteur: „Angekommen“ und die Schätzung gelten nicht mehr
      if (t.nr !== j.mitarbeiter || t.datum !== j.datum) Object.assign(data, resetArrival(g));
      return store.updateJob(g.id, data);
    }
    if (!timeChanged && !team.team) return null;
    return g.status === 'fertig' && !team.team ? null : store.updateJob(g.id, {
      ...(timeChanged && g.status !== 'fertig' ? { datum: t.datum, von: t.von, ...(t.datum !== g.datum ? resetArrival(g) : {}) } : {}), ...team });
  });
  try { await Promise.all(ops); }
  catch (x) { alert('Verschieben fehlgeschlagen.'); }
}

// ================= Datensicherung (Büro) =================
const csvCell = v => {
  let s = String(v ?? '');
  // Excel soll Text nie als Formel ausführen (Telefonnummern wie +49 … bleiben unverändert)
  if (/^[=@\t\r]/.test(s) || (/^[+-]/.test(s) && !/^[+-]?[\d\s()./-]+$/.test(s))) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
};
// Semikolon und BOM, damit deutsches Excel Spalten und Umlaute richtig erkennt
const toCsv = (head, rows) => '﻿' + [head, ...rows].map(r => r.map(csvCell).join(';')).join('\r\n');

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

async function doBackup(kind, btn) {
  const err = $('#backupErr');
  err.textContent = '';
  btn.disabled = true;
  try {
    const day = todayKey();
    const date = k => isDay(k) ? parseYmd(k).toLocaleDateString('de-DE') : (k || '');
    const stamp = iso => { const d = iso ? new Date(iso) : null; return d && !isNaN(d) ? `${d.toLocaleDateString('de-DE')} ${hm(d)}` : ''; };
    if (kind === 'customers') {
      download(`shk-planer-kunden-${day}.csv`, toCsv(
        ['Name', 'Telefon', 'Straße', 'PLZ', 'Ort', 'Hinweis', 'Angelegt', 'Letzter Auftrag'],
        ui.customers.map(c => [c.name, c.telefon, c.strasse, c.plz, c.ort, c.notiz, date(c.angelegt), date(lastJobOf(c))])), 'text/csv;charset=utf-8');
      return;
    }
    // Ohne Netz käme nur der zwischengespeicherte Teil – das wäre keine vollständige Sicherung
    if (store.mode === 'firebase' && !navigator.onLine) { err.textContent = 'Für die Sicherung wird eine Internetverbindung benötigt.'; return; }
    // Alle Aufträge frisch abfragen, auch ältere, die gerade nicht geladen sind
    const jobs = sortJobs(await store.jobsBefore('9999-12-31'));
    if (kind === 'jobs') {
      download(`shk-planer-auftraege-${day}.csv`, toCsv(
        ['Datum', 'Uhrzeit', 'Status', 'Mitarbeiter-Nr.', 'Mitarbeiter', 'Team', 'Kunde', 'Telefon', 'Straße', 'PLZ', 'Ort', 'Auftrag', 'Notiz',
          'Geplante Dauer (Min.)', 'Angekommen', 'Fertig', 'Arbeitsbericht'],
        jobs.map(j => [date(j.datum), j.von, STATE_LABEL[stateOf(j)], j.mitarbeiter, workerName(j.mitarbeiter),
          Array.isArray(j.team) ? j.team.map(t => t.name).join(', ') : '', j.kunde, j.telefon, j.strasse, j.plz, j.ort, j.auftrag, j.notiz,
          j.dauer || '', stamp(j.angekommenAm), stamp(j.fertigAm), j.bericht])), 'text/csv;charset=utf-8');
      return;
    }
    download(`shk-planer-sicherung-${day}.json`, JSON.stringify({
      app: 'SHK-Planer', format: 1, erstellt: new Date().toISOString(),
      mitarbeiter: ui.workers, auftraege: jobs, kunden: ui.customers, abwesenheiten: ui.absences,
    }, null, 1), 'application/json');
    lsSet('shk-backup', day);
    if ($('#backupLast')) $('#backupLast').textContent = `Letzte Sicherung auf diesem Gerät: ${date(day)} · ${jobs.length} Aufträge, ${ui.customers.length} Kunden`;
  } catch (x) {
    console.error(x);
    err.textContent = 'Sicherung fehlgeschlagen. Bitte Internetverbindung prüfen und erneut versuchen.';
  } finally {
    btn.disabled = false;
  }
}

// ================= Passwort / PIN ändern =================
function openPwDlg() {
  const office = ui.session?.role === 'office';
  const f = $('#pwForm');
  f.reset();
  $('#pwErr').textContent = '';
  $('#pwTitle').textContent = office ? 'Passwort ändern' : 'PIN ändern';
  $('#pwOldLabel').textContent = office ? 'Bisheriges Passwort' : 'Bisherige PIN';
  $('#pwNewLabel').textContent = office ? 'Neues Passwort (mind. 4 Zeichen)' : 'Neue PIN (mind. 4 Ziffern)';
  for (const n of ['old', 'neu', 'neu2']) f.elements[n].inputMode = office ? 'text' : 'numeric';
  $('#pwDlg').showModal();
}

async function savePw(e) {
  e.preventDefault();
  const office = ui.session?.role === 'office';
  const f = e.target, err = $('#pwErr');
  const oldS = f.elements.old.value, neu = f.elements.neu.value, neu2 = f.elements.neu2.value;
  err.textContent = '';
  if (office ? neu.length < 4 : !/^[0-9]{4,12}$/.test(neu)) {
    err.textContent = office ? 'Das neue Passwort braucht mindestens 4 Zeichen.' : 'Die neue PIN muss aus 4 bis 12 Ziffern bestehen.';
    return;
  }
  if (neu !== neu2) { err.textContent = 'Die neuen Eingaben stimmen nicht überein.'; return; }
  const btn = f.querySelector('.primary'); btn.disabled = true;
  try {
    await store.changePassword(oldS, neu);
    $('#pwDlg').close();
    alert(office ? 'Passwort geändert.' : 'PIN geändert.');
  } catch (x) { err.textContent = x.message; }
  finally { btn.disabled = false; }
}

// ================= Ereignisse =================
function bindEvents() {
  noAutofill($('#jobForm'));
  document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => setTab(b.dataset.tab));
  $('#workerLogin').onsubmit = e => { e.preventDefault(); doLogin(e.target, 'worker', e.target.elements.nr.value.trim(), e.target.elements.pin.value.trim()); };
  $('#officeLogin').onsubmit = e => { e.preventDefault(); doLogin(e.target, 'office', null, e.target.elements.pw.value); };
  $('#showSetup').hidden = !store.setupOffice;
  $('#showSetup').onclick = () => { $('#officeLogin').hidden = true; $('#officeSetup').hidden = false; };
  $('#hideSetup').onclick = () => setTab('office');
  $('#officeSetup').onsubmit = doSetup;
  $('#pwForm').onsubmit = savePw;

  // Büro: Menü
  $('#side').onclick = e => {
    if (e.target.closest('#logoutBtn')) { store.logout(); return; }
    if (e.target.closest('#pwBtn')) { openPwDlg(); return; }
    const b = e.target.closest('[data-view]');
    if (b) setView(b.dataset.view);
  };

  // Büro: Inhalte
  const c = $('#content');
  c.onclick = e => {
    if (ui.suppressClick) return; // Klick direkt nach dem Verschieben ignorieren
    const bk = e.target.closest('[data-backup]');
    if (bk) { doBackup(bk.dataset.backup, bk); return; }
    const delAbs = e.target.closest('[data-del-abs]');
    if (delAbs) { if (confirm('Eintrag löschen?')) store.deleteAbsence(delAbs.dataset.delAbs); return; }
    const cJob = e.target.closest('[data-cust-job]');
    if (cJob) { openForm(null, { day: todayKey(), kunde: ui.customers.find(x => x.id === cJob.dataset.custJob) }); return; }
    const cEdit = e.target.closest('[data-cust-edit]');
    if (cEdit) { editCustomer(cEdit.dataset.custEdit); return; }
    const cDel = e.target.closest('[data-cust-del]');
    if (cDel) {
      const k = ui.customers.find(x => x.id === cDel.dataset.custDel);
      if (k && confirm(`„${k.name}“ aus der Kundenliste löschen?\n\nBestehende Aufträge bleiben erhalten.`)) {
        if (ui.custEdit === k.id) resetCustomerForm();
        store.deleteCustomer(k.id);
      }
      return;
    }
    if (e.target.closest('#custCancel')) { resetCustomerForm(); return; }
    const cOpen = e.target.closest('[data-cust-open]');
    if (cOpen && !e.target.closest('a, button')) { openCustomer(cOpen.dataset.custOpen); return; }
    const job = e.target.closest('[data-id]');
    if (job) { openDetail(job.dataset.id); return; }
    const act = e.target.closest('[data-act]');
    if (act) {
      const a = act.dataset.act;
      if (a === 'new') openForm(null, { nr: ui.filter, day: ui.day });
      if (a === 'prev') stepDate(-1);
      if (a === 'next') stepDate(1);
      if (a === 'today') { ui.day = todayKey(); ui.scrollPlan = true; renderPlan(); }
      return;
    }
    const mode = e.target.closest('[data-mode]');
    if (mode) { ui.mode = mode.dataset.mode; lsSet('shk-mode', ui.mode); ui.scrollPlan = true; renderPlan(); return; }
    const go = e.target.closest('[data-go]');
    if (go) { setView(go.dataset.go); return; }
    const del = e.target.closest('[data-del-worker]');
    if (del) {
      if (confirm(`Mitarbeiter ${del.dataset.delWorker} entfernen? Seine Aufträge bleiben erhalten.`)) {
        store.deleteWorker(del.dataset.delWorker);
        if (store.mode === 'firebase') alert('Mitarbeiter entfernt.\n\nWichtig (Datenschutz): Bitte innerhalb eines Monats auch sein Anmeldekonto löschen:\nFirebase-Konsole → Authentication → Users → '
          + `${del.dataset.delWorker}@mitarbeiter.shk-planer.com → Konto löschen.`);
      }
      return;
    }
    // Klick in eine freie Stelle der Plantafel: neuer Auftrag für diesen Monteur
    const lane = e.target.closest('.pt-lane');
    if (lane) {
      const x = e.clientX - lane.getBoundingClientRect().left;
      const min = Math.floor((ui.plan.start * 60 + x / ui.plan.hw * 60) / 30) * 30;
      openForm(null, { nr: lane.dataset.nr, day: lane.dataset.day, time: fromMin(Math.min(Math.max(min, 0), 23 * 60)) });
      return;
    }
    const cell = e.target.closest('.wk-cell');
    if (cell) openForm(null, { nr: cell.dataset.nr, day: cell.dataset.day, time: '08:00' });
  };
  c.onchange = e => {
    const id = e.target.id;
    if (id === 'filterSel') { ui.filter = e.target.value; refresh(); }
    if (id === 'dateInput' && e.target.value) { ui.day = e.target.value; renderPlan(); }
    if (id === 'statusSel') { ui.listStatus = e.target.value; renderList(); }
    if (id === 'rangeSel') { ui.listRange = e.target.value; $('#pastToggle').closest('label').hidden = ui.listRange !== 'alle'; renderList(); }
    if (id === 'pastToggle') { ui.listPast = e.target.checked; renderList(); }
  };
  c.oninput = e => {
    if (e.target.id === 'searchIn') { ui.search = e.target.value; renderList(); }
    if (e.target.id === 'custSearch') { ui.custSearch = e.target.value; renderCustomersPage(); }
  };
  c.onsubmit = e => {
    if (e.target.id === 'custForm') { e.preventDefault(); saveCustomer(e); }
    if (e.target.id === 'addWorkerForm') { e.preventDefault(); addWorker(e); }
    if (e.target.id === 'addAbsForm') { e.preventDefault(); addAbsence(e); }
  };

  // Kunde mit Auftragsverlauf
  $('#custDlg').onclick = e => {
    const job = e.target.closest('[data-id]');
    if (job) { openDetail(job.dataset.id); return; }
    const a = e.target.closest('[data-cdlg]')?.dataset.cdlg;
    const c = ui.customers.find(x => x.id === ui.custView);
    if (!a || !c) return;
    if (a === 'job') openForm(null, { day: todayKey(), kunde: c });
    if (a === 'edit') { $('#custDlg').close(); editCustomer(c.id); }
  };

  // Monteur
  $('#workerView').onclick = e => {
    const job = e.target.closest('[data-id]');
    if (job) { openDetail(job.dataset.id); return; }
    const tab = e.target.closest('[data-wtab]');
    if (tab) { ui.wTab = tab.dataset.wtab; renderWorker(); $('#wContent').scrollTop = 0; return; }
    const page = e.target.closest('[data-wpage]');
    if (page) { ui.wPage = page.dataset.wpage; renderWorker(); return; }
    if (e.target.closest('[data-act="logout"]')) store.logout();
    if (e.target.closest('[data-act="pin"]')) openPwDlg();
  };

  // Formular
  $('#jobForm').onsubmit = saveForm;
  const watched = ['mitarbeiter', 'mitarbeiter2', 'mitarbeiter3', 'datum', 'von', 'dauer'];
  $('#jobForm').addEventListener('input', e => {
    if (watched.includes(e.target.name)) checkConflict();
    // Auswahl aus der Vorschlagsliste füllt Telefon und Adresse aus
    if (e.target.name === 'kunde') matchFormCustomer(!e.inputType || e.inputType === 'insertReplacementText');
  });
  $('#jobForm').addEventListener('change', e => { if (watched.includes(e.target.name)) checkConflict(); });
  $('#addTeam').onclick = () => {
    const next = $('#m2wrap').hidden ? '#m2wrap' : '#m3wrap';
    $(next).hidden = false;
    $(next + ' select').focus();
    $('#addTeam').hidden = !$('#m3wrap').hidden ? true : false;
  };

  // Büro: Aufträge in der Plantafel verschieben
  bindDrag();
  // Monteur: Drehuhr „Dauert länger“
  initExtDial();

  // Dialoge schließen
  document.addEventListener('click', e => { const x = e.target.closest('[data-close]'); if (x) x.closest('dialog').close(); });
  document.querySelectorAll('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));

  // Jetzt-Linie und Überfällig-Status regelmäßig aktualisieren
  setInterval(() => {
    if (document.hidden || !ui.session) return;
    ui.session.role === 'office' ? refresh() : renderWorker();
  }, 60000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !ui.session) return;
    ui.session.role === 'office' ? refresh() : renderWorker();
  });
  narrow.addEventListener('change', () => { if (ui.session?.role === 'office') refresh(); });
  addEventListener('resize', () => { if (ui.session?.role === 'office' && ui.view === 'plan' && ui.mode === 'day') renderPlan(); });
}
