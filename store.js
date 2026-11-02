// Datenspeicher: Demo (nur dieser Browser) oder Firebase (online, für PC + Handy)
import { firebaseConfig } from './firebase-config.js';

// Müssen zu den Regeln in firestore.rules passen
export const OFFICE_EMAIL = 'buero@shk-planer.com';
const WORKER_DOMAIN = 'mitarbeiter.shk-planer.com';
const workerEmail = nr => `${nr}@${WORKER_DOMAIN}`;
// Firebase verlangt mind. 6 Zeichen. Kürzere PINs (4–5 Ziffern) bekommen intern einen festen Zusatz.
// PINs/Passwörter ab 6 Zeichen bleiben unverändert, damit bestehende Konten weiter funktionieren.
const toPassword = s => s.length >= 6 ? s : s + '#shk-pin';
export const MIN_SECRET = 4;
const byNr = (a, b) => String(a.nr).localeCompare(String(b.nr), 'de', { numeric: true });

export function createStore() {
  // Mit ?demo in der Adresse lässt sich der Planer gefahrlos ohne echte Daten ausprobieren
  const forceDemo = new URLSearchParams(location.search).has('demo');
  return firebaseConfig && !forceDemo ? firebaseStore() : demoStore();
}

// ---------------- Demo ----------------
function demoStore() {
  const KEY = 'shk-planer-demo';
  const SKEY = 'shk-planer-demo-session';
  const listeners = new Set();
  let sessionCb = () => {};

  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } };
  let db = read();
  const emit = () => listeners.forEach(f => f());
  const write = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} emit(); };
  if (!db || !db.workers) { db = seed(); write(); }
  // Änderungen aus anderen Tabs übernehmen
  addEventListener('storage', e => { if (e.key === KEY) { db = read() || db; emit(); } });
  const sub = f => { listeners.add(f); f(); return () => listeners.delete(f); };

  let session = null;
  try { session = JSON.parse(localStorage.getItem(SKEY)); } catch (e) {}
  const setSession = s => {
    session = s;
    try { s ? localStorage.setItem(SKEY, JSON.stringify(s)) : localStorage.removeItem(SKEY); } catch (e) {}
    sessionCb(s);
  };

  return {
    mode: 'demo',
    onSession(cb) { sessionCb = cb; cb(session); },
    async login(role, nr, secret) {
      if (role === 'office') {
        if (secret !== (db.officePw || 'buero')) throw new Error('Falsches Passwort.');
        setSession({ role: 'office' });
      } else {
        const w = db.workers[nr];
        if (!w || w.pin !== secret) throw new Error('Nummer oder PIN falsch.');
        setSession({ role: 'worker', nr });
      }
    },
    async logout() { setSession(null); },
    async changePassword(oldSecret, newSecret) {
      if (!session) throw new Error('Nicht angemeldet.');
      if (session.role === 'office') {
        if (oldSecret !== (db.officePw || 'buero')) throw new Error('Das bisherige Passwort stimmt nicht.');
        db.officePw = newSecret;
      } else {
        const w = db.workers[session.nr];
        if (!w || w.pin !== oldSecret) throw new Error('Die bisherige PIN stimmt nicht.');
        w.pin = newSecret;
      }
      write();
    },
    watchWorkers(cb) { return sub(() => cb(Object.values(db.workers).map(({ nr, name }) => ({ nr, name })).sort(byNr))); },
    watchWorker(nr, cb) { return sub(() => { const w = db.workers[nr]; cb(w ? { nr: w.nr, name: w.name } : null); }); },
    watchJobs(nr, cb) { return sub(() => cb(Object.values(db.jobs).filter(j => j.mitarbeiter === nr))); },
    watchAllJobs(cb) { return sub(() => cb(Object.values(db.jobs))); },
    async addJob(job) {
      const id = 'j' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      db.jobs[id] = { ...job, id }; write();
    },
    async updateJob(id, data) { db.jobs[id] = { ...db.jobs[id], ...data }; write(); },
    async deleteJob(id) { delete db.jobs[id]; write(); },
    async addWorker(nr, name, pin) {
      if (db.workers[nr]) throw new Error('Diese Nummer gibt es schon.');
      db.workers[nr] = { nr, name, pin }; write();
    },
    async deleteWorker(nr) { delete db.workers[nr]; write(); },
  };
}

// Beispieldaten für den Demo-Modus
function seed() {
  const d = n => { const x = new Date(); x.setDate(x.getDate() + n); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
  const job = (id, nr, tag, von, bis, kunde, auftrag, strasse, plz, ort, telefon = '', notiz = '') =>
    [id, { id, mitarbeiter: nr, datum: d(tag), von, kunde, auftrag, strasse, plz, ort, telefon, notiz, status: 'offen', fertigAm: null }];
  return {
    workers: {
      '101': { nr: '101', name: 'Max Muster', pin: '123456' },
      '102': { nr: '102', name: 'Lisa Beispiel', pin: '654321' },
      '103': { nr: '103', name: 'Rainer Bauer', pin: '111111' },
    },
    jobs: Object.fromEntries([
      job('d1', '101', 0, '08:00', '09:30', 'Familie Schneider', 'Heizungswartung', 'Musterstraße 12', '79539', 'Lörrach', '07621 000000', 'Schlüssel beim Nachbarn'),
      job('d2', '101', 0, '10:30', '12:00', 'Bäckerei Krüger', 'Wasserhahn tropft', 'Beispielweg 3', '79540', 'Lörrach'),
      job('d3', '101', 0, '13:30', '15:00', 'Herr Wagner', 'Therme zeigt Störung F28', 'Am Testplatz 7', '79576', 'Weil am Rhein'),
      job('d4', '101', 1, '09:00', '11:00', 'Praxis Dr. Klein', 'Klimaanlage prüfen', 'Hauptstraße 100', '79618', 'Rheinfelden'),
      job('d5', '102', 0, '08:30', '10:00', 'Frau Hoffmann', 'Badsanierung Aufmaß', 'Lindenallee 5', '79539', 'Lörrach'),
      job('d6', '102', 0, '13:00', '', 'Autohaus Berger', 'Heizkörper tauschen', 'Gewerbestraße 8', '79576', 'Weil am Rhein'),
      job('d7', '101', -1, '15:00', '', 'Familie Roth', 'Spülkasten defekt', 'Rosenweg 2', '79539', 'Lörrach'),
      job('d8', '103', 1, '07:30', '', 'Schule am Park', 'Wartung Lüftungsanlage', 'Parkstraße 20', '79540', 'Lörrach'),
    ]),
  };
}

// ---------------- Firebase ----------------
async function firebaseStore() {
  const base = 'https://www.gstatic.com/firebasejs/10.12.2/';
  const { initializeApp, deleteApp } = await import(base + 'firebase-app.js');
  const A = await import(base + 'firebase-auth.js');
  const F = await import(base + 'firebase-firestore.js');

  const app = initializeApp(firebaseConfig);
  const auth = A.getAuth(app);
  const db = F.getFirestore(app);

  const toSession = u => !u ? null
    : u.email === OFFICE_EMAIL ? { role: 'office' }
    : { role: 'worker', nr: u.email.split('@')[0] };

  const authError = e => {
    const c = e.code || '';
    if (/invalid-credential|wrong-password|user-not-found|invalid-email/.test(c)) return new Error('Anmeldedaten falsch.');
    if (c.includes('too-many-requests')) return new Error('Zu viele Versuche. Bitte kurz warten.');
    if (c.includes('network')) return new Error('Keine Internetverbindung.');
    return new Error('Anmeldung fehlgeschlagen.');
  };
  const list = (q, cb) => F.onSnapshot(q,
    snap => cb(snap.docs.map(d => ({ ...d.data(), id: d.id }))),
    err => console.error(err));

  return {
    mode: 'firebase',
    onSession(cb) { A.onAuthStateChanged(auth, u => cb(toSession(u))); },
    async login(role, nr, secret) {
      try { await A.signInWithEmailAndPassword(auth, role === 'office' ? OFFICE_EMAIL : workerEmail(nr), toPassword(secret)); }
      catch (e) { throw authError(e); }
    },
    // Einmalig: Büro-Konto mit eigenem Passwort anlegen (danach ist man direkt angemeldet)
    async setupOffice(pw) {
      try { await A.createUserWithEmailAndPassword(auth, OFFICE_EMAIL, toPassword(pw)); }
      catch (e) {
        const c = e.code || '';
        if (c.includes('email-already-in-use')) throw new Error('Das Büro-Konto gibt es schon. Bitte normal anmelden.');
        if (c.includes('weak-password')) throw new Error('Das Passwort muss mindestens 4 Zeichen haben.');
        if (c.includes('operation-not-allowed')) throw new Error('In Firebase ist "E-Mail-Adresse/Passwort" noch nicht aktiviert.');
        throw new Error('Büro-Konto konnte nicht angelegt werden.');
      }
    },
    logout: () => A.signOut(auth),
    // Eigenes Passwort bzw. eigene PIN ändern (Firebase verlangt dafür die bisherige)
    async changePassword(oldSecret, newSecret) {
      const u = auth.currentUser;
      if (!u) throw new Error('Nicht angemeldet.');
      const isOffice = u.email === OFFICE_EMAIL;
      try {
        await A.reauthenticateWithCredential(u, A.EmailAuthProvider.credential(u.email, toPassword(oldSecret)));
      } catch (e) {
        const c = e.code || '';
        if (c.includes('too-many-requests')) throw new Error('Zu viele Versuche. Bitte kurz warten.');
        if (c.includes('network')) throw new Error('Keine Internetverbindung.');
        throw new Error(isOffice ? 'Das bisherige Passwort stimmt nicht.' : 'Die bisherige PIN stimmt nicht.');
      }
      try { await A.updatePassword(u, toPassword(newSecret)); }
      catch (e) { throw new Error('Ändern fehlgeschlagen. Bitte erneut versuchen.'); }
    },
    watchWorkers(cb) {
      return list(F.collection(db, 'mitarbeiter'), ws => cb(ws.map(({ nr, name, uid }) => ({ nr, name, uid })).sort(byNr)));
    },
    // Nur fürs Büro: alle Aufträge aller Mitarbeiter (Plantafel)
    watchAllJobs(cb) {
      return list(F.collection(db, 'auftraege'), cb);
    },
    watchWorker(nr, cb) {
      return F.onSnapshot(F.doc(db, 'mitarbeiter', nr), d => cb(d.exists() ? d.data() : null), () => cb(null));
    },
    watchJobs(nr, cb) {
      const u = auth.currentUser;
      // Mitarbeiter fragen über ihre Konto-ID ab (so verlangen es die Sicherheitsregeln)
      const filter = u && u.email !== OFFICE_EMAIL
        ? F.where('mitarbeiterUid', '==', u.uid)
        : F.where('mitarbeiter', '==', nr);
      return list(F.query(F.collection(db, 'auftraege'), filter), cb);
    },
    addJob: job => F.addDoc(F.collection(db, 'auftraege'), job),
    updateJob: (id, data) => F.updateDoc(F.doc(db, 'auftraege', id), data),
    deleteJob: id => F.deleteDoc(F.doc(db, 'auftraege', id)),
    async addWorker(nr, name, pin) {
      const ref = F.doc(db, 'mitarbeiter', nr);
      if ((await F.getDoc(ref)).exists()) throw new Error('Diese Nummer gibt es schon.');
      // Zweite App-Instanz, damit das Büro beim Anlegen angemeldet bleibt
      const tmp = initializeApp(firebaseConfig, 'neu-' + Date.now());
      const tmpAuth = A.getAuth(tmp);
      let uid;
      try {
        uid = (await A.createUserWithEmailAndPassword(tmpAuth, workerEmail(nr), toPassword(pin))).user.uid;
      } catch (e) {
        const c = e.code || '';
        if (c.includes('email-already-in-use')) throw new Error('Für diese Nummer gibt es schon ein Konto. Lösche es in Firebase unter Authentication → Users.');
        if (c.includes('weak-password')) throw new Error('Die PIN muss mindestens 4 Ziffern haben.');
        throw new Error('Konto konnte nicht angelegt werden.');
      } finally {
        await A.signOut(tmpAuth).catch(() => {});
        await deleteApp(tmp).catch(() => {});
      }
      // Der Mitarbeiter ist fest an genau dieses Konto gebunden
      await F.setDoc(ref, { nr, name, uid });
      // Bereits vorhandene Aufträge dieser Nummer dem neuen Konto zuordnen
      const old = await F.getDocs(F.query(F.collection(db, 'auftraege'), F.where('mitarbeiter', '==', nr)));
      if (!old.empty) {
        const batch = F.writeBatch(db);
        old.forEach(d => batch.update(d.ref, { mitarbeiterUid: uid }));
        await batch.commit();
      }
    },
    deleteWorker: nr => F.deleteDoc(F.doc(db, 'mitarbeiter', nr)),
  };
}
