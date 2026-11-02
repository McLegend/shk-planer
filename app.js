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
  map: 'M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z',
};
const icon = n => `<svg class="i" viewBox="0 0 24 24"><path d="${ICONS[n]}"/></svg>`;

// ---- Aufträge: Status, Zeiten, Adresse ----
const finishedAt = j => j.status === 'fertig' && j.fertigAm ? new Date(j.fertigAm) : null;
// Ende = Zeitpunkt des Fertig-Klicks (wenn am selben Tag)
const endMin = j => { const f = finishedAt(j); return f && ymd(f) === j.datum ? f.getHours() * 60 + f.getMinutes() : null; };
const stateOf = j => j.status === 'fertig' ? 'erledigt' : j.datum < todayKey() ? 'ueberfaellig' : 'geplant';
const STATE_LABEL = { geplant: 'Geplant', ueberfaellig: 'Überfällig', erledigt: 'Erledigt' };
const badge = j => { const s = stateOf(j); return `<span class="badge ${s}">${STATE_LABEL[s]}</span>`; };
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

// Überlappende Termine auf Spuren verteilen
function layoutLanes(list) {
  const items = list.map(j => {
    const s = toMin(j.von), end = endMin(j);
    return { j, s, e: end !== null ? Math.max(end, s + 15) : s + 60, lane: 0, lanes: 1 };
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
  session: null, workers: [], jobs: [], me: null, unsub: [],
  view: 'plan', mode: 'day', day: todayKey(), filter: '',
  listStatus: 'alle', listPast: false, search: '',
  wPage: 'termine', wTab: 'geplant',
  detailId: null, editId: null, plan: { start: 6, hw: 90 }, scrollPlan: false,
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
  ui.jobs = []; ui.workers = [];
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
  ui.unsub.push(store.watchWorkers(ws => { ui.workers = ws; refresh(); }));
  ui.unsub.push(store.watchAllJobs(js => {
    ui.jobs = sortJobs(js);
    refresh();
    if ($('#detailDlg').open) renderDetail();
  }));
  setView(lsGet('shk-view') || 'plan');
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
        <select id="filterSel" aria-label="Mitarbeiter filtern"></select>
        <label class="toggle">Vergangene Termine<input type="checkbox" id="pastToggle" ${ui.listPast ? 'checked' : ''}></label>
      </div>
      <div class="table-wrap"><table class="tbl">
        <thead><tr><th>Datum</th><th>Zeit</th><th>Status</th><th>Mitarbeiter</th><th>Auftrag</th><th class="hide-m">Ausführungsort</th></tr></thead>
        <tbody id="listBody"></tbody></table></div>
      <div class="count" id="listCount"></div>`;
    $('#statusSel').value = ui.listStatus;
  } else {
    c.innerHTML = `
      <div class="page-head"><h1>Mitarbeiter</h1></div>
      <div class="card">
        <h2>Neuen Monteur anlegen</h2>
        <form id="addWorkerForm" class="add-worker">
          <label class="field"><span>Nummer</span><input name="nr" inputmode="numeric" pattern="[0-9]{1,8}" required></label>
          <label class="field wide"><span>Name</span><input name="name" maxlength="60" required></label>
          <label class="field"><span>PIN (mind. 6 Ziffern)</span><input name="pin" inputmode="numeric" pattern="[0-9]{6,12}" required title="6 bis 12 Ziffern"></label>
          <button class="btn primary">${icon('add')}Anlegen</button>
        </form>
        <p class="err" id="workerErr" style="margin-top:8px"></p>
        <p class="hint">Mit Nummer und PIN meldet sich der Monteur auf dem Handy an. Notiere dir die PIN, sie wird danach nicht mehr angezeigt.</p>
      </div>
      <div class="table-wrap"><table class="tbl">
        <thead><tr><th>Mitarbeiter</th><th>Nummer</th><th>Offene Aufträge</th><th></th></tr></thead>
        <tbody id="workersBody"></tbody></table></div>`;
  }
  refresh();
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
    end = Math.max(end, Math.ceil(Math.max(endMin(j) ?? 0, toMin(j.von) + 60) / 60));
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
      return `<button class="pc st-${stateOf(j)}" data-id="${esc(j.id)}" style="left:${left}px;top:${6 + it.lane * 62}px;width:${width}px;height:56px">
        <span class="pc-t">${esc(titleOf(j))}</span>
        <span class="pc-s">${esc(timeRange(j))}${j.auftrag ? ' · ' + esc(j.kunde) : ''}</span>
        <span class="pc-s">${esc([j.plz, j.ort].filter(Boolean).join(' '))}</span>
        <span class="dot"></span></button>`;
    }).join('');
    return `<div class="pt-row">
      <div class="pt-who">${avatar(r.nr, r.name)}<span class="nm">${esc(r.name)}</span></div>
      <div class="pt-lane" data-nr="${esc(r.nr)}" data-day="${k}" style="width:${W}px;height:${H}px;--hw:${hw}px">${cards}${nowLine}</div>
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
      ${keys.map(k => `<div class="wk-cell" data-nr="${esc(r.nr)}" data-day="${k}">${ui.jobs
        .filter(j => j.datum === k && j.mitarbeiter === r.nr)
        .map(j => `<button class="mini st-${stateOf(j)}" data-id="${esc(j.id)}" title="${esc(titleOf(j))}"><b>${esc(j.von)}</b>${esc(titleOf(j))}</button>`)
        .join('')}</div>`).join('')}
    </div>`).join('');
  return `<div class="pt" id="ptScroll">${head}${rows}</div>`;
}

function renderList() {
  const tb = $('#listBody');
  if (!tb) return;
  const q = ui.search.trim().toLowerCase();
  const t = todayKey();
  const rows = ui.jobs.filter(j => {
    const s = stateOf(j);
    if (ui.listStatus !== 'alle' && s !== ui.listStatus) return false;
    if (ui.filter && j.mitarbeiter !== ui.filter) return false;
    if (!ui.listPast && j.datum < t && s === 'erledigt') return false;
    if (q && ![j.kunde, j.auftrag, j.strasse, j.ort, j.plz, workerName(j.mitarbeiter)].join(' ').toLowerCase().includes(q)) return false;
    return true;
  });
  tb.innerHTML = rows.length ? rows.map(j => `<tr data-id="${esc(j.id)}">
      <td class="b">${j.datum === t ? 'Heute' : parseYmd(j.datum).toLocaleDateString('de-DE')}</td>
      <td class="b">${esc(timeRange(j))}</td>
      <td>${badge(j)}</td>
      <td><span class="who-cell">${avatar(j.mitarbeiter, workerName(j.mitarbeiter))}<span class="hide-m">${esc(workerName(j.mitarbeiter))}</span></span></td>
      <td>${esc(titleOf(j))}${j.auftrag ? `<div class="sub">${esc(j.kunde)}</div>` : ''}</td>
      <td class="hide-m">${esc(address(j))}</td>
    </tr>`).join('') : '<tr><td colspan="6" class="sub" style="text-align:center;padding:30px">Keine Aufträge gefunden.</td></tr>';
  $('#listCount').textContent = `${rows.length} ${rows.length === 1 ? 'Auftrag' : 'Aufträge'}`;
}

function renderWorkersPage() {
  const tb = $('#workersBody');
  if (!tb) return;
  tb.innerHTML = ui.workers.length ? ui.workers.map(w => {
    const open = ui.jobs.filter(j => j.mitarbeiter === w.nr && j.status !== 'fertig').length;
    return `<tr><td><span class="who-cell">${avatar(w.nr, w.name)}${esc(w.name)}</span></td><td class="b">${esc(w.nr)}</td>
      <td>${open}</td><td style="text-align:right"><button class="btn danger" data-del-worker="${esc(w.nr)}">Entfernen</button></td></tr>`;
  }).join('') : '<tr><td colspan="4" class="sub" style="text-align:center;padding:30px">Noch keine Mitarbeiter angelegt.</td></tr>';
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
  }));
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
  const e = endMin(j), f = finishedAt(j);

  let work;
  if (done && e !== null && e > toMin(j.von)) {
    work = `<div class="row">${icon('clock')}<div>${esc(j.von)} – ${fromMin(e)}<br><span class="hint">${esc(dayLabel(j.datum))}</span></div><span class="r">${duration(e - toMin(j.von))}</span></div>`;
  } else if (done && f) {
    work = `<div class="row">${icon('clock')}<div>Fertig gemeldet am ${f.toLocaleDateString('de-DE')} um ${pad(f.getHours())}:${pad(f.getMinutes())} Uhr</div></div>`;
  } else {
    work = `<div class="row">${icon('clock')}<div>Beginn ${esc(j.von)} Uhr<br><span class="hint">${esc(dayLabel(j.datum))}</span></div></div>
      <div class="info">${icon('info')}<span>Die Endzeit wird automatisch eingetragen, sobald „Fertig“ gedrückt wird. Erst nach Abschluss der Arbeiten drücken.</span></div>`;
  }

  // Karte nur laden, wenn sich die Adresse geändert hat (sonst flackert sie bei Live-Updates)
  const oldFrame = $('#detailBody iframe');
  const keepFrame = oldFrame && oldFrame.dataset.addr === address(j);

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
        ${office ? `<div class="row">${avatar(j.mitarbeiter, workerName(j.mitarbeiter))}<div>${esc(workerName(j.mitarbeiter))}</div></div>` : ''}
        ${j.notiz ? `<div class="row">${icon('notes')}<div>${esc(j.notiz)}</div></div>` : ''}
      </div>
      <div class="sec">
        <div class="sec-head"><p class="sec-title">Arbeitszeit</p></div>
        ${work}
      </div>
      <button class="btn big ${done ? '' : 'green'}" id="toggleDone">${done ? 'Wieder auf offen setzen' : '✓ Fertig'}</button>
      ${office ? `<div class="sh-actions"><button class="btn danger" id="deleteJob">Löschen</button><button class="btn" id="editJob">Bearbeiten</button></div>` : ''}
    </div>`;
  if (keepFrame) $('#frameSlot').replaceWith(oldFrame);

  $('#toggleDone').onclick = async () => {
    $('#toggleDone').disabled = true;
    try {
      await store.updateJob(j.id, done ? { status: 'offen', fertigAm: null } : { status: 'fertig', fertigAm: new Date().toISOString() });
    } catch (x) {
      alert('Speichern fehlgeschlagen. Bitte Internetverbindung prüfen.');
      $('#toggleDone').disabled = false;
    }
  };
  if (office) {
    $('#editJob').onclick = () => { $('#detailDlg').close(); openForm(j); };
    $('#deleteJob').onclick = async () => {
      if (!confirm(`Auftrag „${titleOf(j)}“ wirklich löschen?`)) return;
      await store.deleteJob(j.id);
      $('#detailDlg').close();
    };
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
  const opts = ui.workers.map(w => ({ nr: w.nr, name: w.name }));
  const curNr = job ? job.mitarbeiter : preset.nr || ui.filter || '';
  if (curNr && !opts.some(o => o.nr === curNr)) opts.push({ nr: curNr, name: `Nr. ${curNr}` });
  f.elements.mitarbeiter.innerHTML = '<option value="">Monteur auswählen …</option>' +
    opts.map(o => `<option value="${esc(o.nr)}">${esc(o.name)} (${esc(o.nr)})</option>`).join('');
  f.elements.mitarbeiter.value = curNr;
  const data = job || { datum: preset.day || ui.day, von: preset.time || '08:00' };
  for (const k of ['kunde', 'auftrag', 'datum', 'telefon', 'von', 'strasse', 'plz', 'ort', 'notiz']) f.elements[k].value = data[k] || '';
  checkConflict();
  $('#formDlg').showModal();
  if (!job) (curNr ? f.elements.kunde : f.elements.mitarbeiter).focus();
}

// Warnung, wenn der Monteur zur selben Zeit schon einen offenen Auftrag hat
function checkConflict() {
  const f = $('#jobForm');
  const nr = f.elements.mitarbeiter.value, datum = f.elements.datum.value, von = f.elements.von.value;
  const hit = nr && datum && von && ui.jobs.find(j => j.id !== ui.editId && j.mitarbeiter === nr && j.datum === datum
    && j.status !== 'fertig' && Math.abs(toMin(j.von) - toMin(von)) < 60);
  $('#conflict').textContent = hit ? `Terminkonflikt: ${hit.von} Uhr „${titleOf(hit)}“` : '';
}

async function saveForm(e) {
  e.preventDefault();
  const f = e.target;
  const v = k => f.elements[k].value.trim();
  const nr = v('mitarbeiter');
  if (!nr) { $('#formErr').textContent = 'Bitte einen Monteur auswählen.'; return; }
  const w = ui.workers.find(x => x.nr === nr);
  const data = {
    mitarbeiter: nr, kunde: v('kunde'), auftrag: v('auftrag'), datum: v('datum'), von: v('von'),
    telefon: v('telefon'), strasse: v('strasse'), plz: v('plz'), ort: v('ort'), notiz: v('notiz'),
  };
  const btn = f.querySelector('.primary');
  btn.disabled = true;
  try {
    if (ui.editId) {
      const old = ui.jobs.find(j => j.id === ui.editId);
      if (old && old.mitarbeiter !== nr) data.mitarbeiterUid = w?.uid || null;
      await store.updateJob(ui.editId, data);
    } else {
      if (!w) { $('#formErr').textContent = `Mitarbeiter ${nr} ist nicht angelegt.`; return; }
      await store.addJob({ ...data, mitarbeiterUid: w.uid || null, status: 'offen', fertigAm: null });
    }
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

// ================= Ereignisse =================
function bindEvents() {
  document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => setTab(b.dataset.tab));
  $('#workerLogin').onsubmit = e => { e.preventDefault(); doLogin(e.target, 'worker', e.target.elements.nr.value.trim(), e.target.elements.pin.value.trim()); };
  $('#officeLogin').onsubmit = e => { e.preventDefault(); doLogin(e.target, 'office', null, e.target.elements.pw.value); };
  $('#showSetup').hidden = !store.setupOffice;
  $('#showSetup').onclick = () => { $('#officeLogin').hidden = true; $('#officeSetup').hidden = false; };
  $('#hideSetup').onclick = () => setTab('office');
  $('#officeSetup').onsubmit = doSetup;

  // Büro: Menü
  $('#side').onclick = e => {
    if (e.target.closest('#logoutBtn')) { store.logout(); return; }
    const b = e.target.closest('[data-view]');
    if (b) setView(b.dataset.view);
  };

  // Büro: Inhalte
  const c = $('#content');
  c.onclick = e => {
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
      if (confirm(`Mitarbeiter ${del.dataset.delWorker} entfernen? Seine Aufträge bleiben erhalten.`)) store.deleteWorker(del.dataset.delWorker);
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
    if (id === 'pastToggle') { ui.listPast = e.target.checked; renderList(); }
  };
  c.oninput = e => { if (e.target.id === 'searchIn') { ui.search = e.target.value; renderList(); } };
  c.onsubmit = e => { if (e.target.id === 'addWorkerForm') { e.preventDefault(); addWorker(e); } };

  // Monteur
  $('#workerView').onclick = e => {
    const job = e.target.closest('[data-id]');
    if (job) { openDetail(job.dataset.id); return; }
    const tab = e.target.closest('[data-wtab]');
    if (tab) { ui.wTab = tab.dataset.wtab; renderWorker(); $('#wContent').scrollTop = 0; return; }
    const page = e.target.closest('[data-wpage]');
    if (page) { ui.wPage = page.dataset.wpage; renderWorker(); return; }
    if (e.target.closest('[data-act="logout"]')) store.logout();
  };

  // Formular
  $('#jobForm').onsubmit = saveForm;
  $('#jobForm').addEventListener('input', e => { if (['mitarbeiter', 'datum', 'von'].includes(e.target.name)) checkConflict(); });
  $('#jobForm').addEventListener('change', e => { if (e.target.name === 'mitarbeiter') checkConflict(); });

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
