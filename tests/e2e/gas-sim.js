/* Simulador de Google Apps Script en memoria: ejecuta el código REAL de apps-script/*.gs con
   hoja de cálculo, calendario, correo, propiedades, caché y bloqueo simulados.
   Las fórmulas de las hojas se guardan pero no se calculan (eso se verificó aparte en LibreOffice). */
const fs = require('fs'), vm = require('vm'), path = require('path');
const TZ = 'America/Santiago';

function partes(d, tz) {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const o = {}; f.formatToParts(d).forEach((p) => { o[p.type] = p.value; }); return o;
}
function formatDate(d, tz, fmt) {
  const p = partes(d, tz);
  return fmt.replace('yyyy', p.year).replace('MM', p.month).replace('dd', p.day).replace('HH', p.hour).replace('mm', p.minute).replace(/\bH\b/, String(Number(p.hour))).replace(/\bm\b/, String(Number(p.minute)));
}
const ctxRef = {};
function parseDate(s, tz, fmt) {
  const m = /(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}))?/.exec(s);
  const asUtc = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
  let guess = asUtc;
  for (let i = 0; i < 3; i++) { const p = partes(new Date(guess), tz); guess += asUtc - Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute); }
  return new ctxRef.ctx.Date(guess);
}

function crear() {
  const ctx = { console, setTimeout, clearTimeout }; vm.createContext(ctx); ctxRef.ctx = ctx;
  const estado = { copias: [], correos: [], whatsapp: [], eventos: [], props: {}, cache: {}, hojas: {}, triggers: [], carpetas: {}, ids: 0 };
  /* --- hoja de cálculo --- */
  function Hoja(nombre) {
    const h = { nombre, filas: [], ancho: 0 };
    const val = (r, c) => { const x = (h.filas[r - 1] || [])[c - 1]; return x === undefined || x === null ? '' : x; };
    const colorOk = new Proxy({}, { get: () => () => colorOk });
    function Rango(r, c, nr, nc) {
      const R = {
        getValues: () => { const o = []; for (let i = 0; i < nr; i++) { const f = []; for (let j = 0; j < nc; j++) { const x = val(r + i, c + j); f.push(typeof x === 'string' && x[0] === '=' ? 0 : x); } o.push(f); } return o; },
        getValue: () => val(r, c),
        setValues: (m) => { m.forEach((fila, i) => fila.forEach((x, j) => put(r + i, c + j, x))); return R; },
        setValue: (x) => { for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) put(r + i, c + j, x); return R; },
        setFormula: (f) => { put(r, c, f); return R; },
        getFormula: () => { const x = val(r, c); return typeof x === 'string' && x[0] === '=' ? x : ''; },
        getRow: () => r, getColumn: () => c, getSheet: () => h.api,
        setNumberFormat: () => R, setFontWeight: () => R, setBackground: () => R, setFontColor: () => R, setWrap: () => R, setDataValidation: () => R, setHorizontalAlignment: () => R, setFontSize: () => R, setFontStyle: () => R, merge: () => R, setNotes: () => R, setNote: () => R, protect: () => ({ setWarningOnly: () => {} }),
      };
      return R;
    }
    function put(r, c, x) { while (h.filas.length < r) h.filas.push([]); const f = h.filas[r - 1]; while (f.length < c) f.push(''); f[c - 1] = x; h.ancho = Math.max(h.ancho, c); }
    h.api = {
      getName: () => h.nombre, setName: (n) => { delete estado.hojas[h.nombre]; h.nombre = n; estado.hojas[n] = h; return h.api; },
      getRange: (r, c, nr, nc) => {
        if (typeof r === 'string') { const m = /^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/.exec(r); const col = (x) => x.split('').reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0); const c1 = col(m[1]), r1 = +m[2]; return Rango(r1, c1, m[4] ? +m[4] - r1 + 1 : 1, m[3] ? col(m[3]) - c1 + 1 : 1); }
        return Rango(r, c, nr || 1, nc || 1); },
      getLastRow: () => { let u = 0; h.filas.forEach((f, i) => { if (f.some((x) => x !== '' && x !== null && x !== undefined)) u = i + 1; }); return u; },
      getLastColumn: () => h.ancho, getMaxRows: () => 1000,
      appendRow: (fila) => { let r = h.api.getLastRow() + 1; fila.forEach((x, j) => put(r, j + 1, x)); return h.api; },
      deleteRow: (r) => { h.filas.splice(r - 1, 1); }, insertRowAfter: () => h.api,
      setFrozenRows: () => {}, setColumnWidth: () => {}, setRowHeight: () => {}, autoResizeColumns: () => {}, hideSheet: () => {}, setTabColor: () => {}, clearConditionalFormatRules: () => {}, setConditionalFormatRules: () => {}, getConditionalFormatRules: () => [], protect: () => ({ setWarningOnly: () => {} }), setHiddenGridlines: () => {},
      clear: () => { h.filas = []; }, getSheetId: () => 1,
      createTextFinder: (t) => {
        let exacta = false;
        const F = { matchEntireCell: (b) => { exacta = b; return F; }, matchCase: () => F, findNext: () => {
          for (let i = 0; i < h.filas.length; i++) for (let j = 0; j < h.filas[i].length; j++) { const x = String(h.filas[i][j]); if (exacta ? x === t : x.indexOf(t) >= 0) return { getRow: () => i + 1, getColumn: () => j + 1 }; }
          return null; } };
        return F;
      },
    };
    return h;
  }
  const ss = {
    id: 'SHEET_SIM', nombre: 'Rockerío · Datos',
    getSheetByName: (n) => (estado.hojas[n] ? estado.hojas[n].api : null),
    insertSheet: (n) => { estado.hojas[n] = Hoja(n); return estado.hojas[n].api; },
    getSheets: () => Object.keys(estado.hojas).map((n) => estado.hojas[n].api),
    getUrl: () => 'https://docs.google.com/spreadsheets/d/SHEET_SIM', getId: () => 'SHEET_SIM', getName: () => ss.nombre,
    setSpreadsheetTimeZone: () => {}, setSpreadsheetLocale: () => {}, setActiveSheet: () => {}, moveActiveSheet: () => {}, deleteSheet: () => {}, rename: () => {},
    getSheetId: () => 1, getSpreadsheetTimeZone: () => TZ,
  };
  /* --- calendario --- */
  const cal = {
    getName: () => 'Rockerío · Agenda', getTimeZone: () => TZ, getId: () => 'CAL_SIM',
    getEvents: (a, b) => estado.eventos.filter((e) => !e.borrado && e.fin > a && e.ini < b).map((e) => e.api),
    createEvent: (titulo, ini, fin, op) => {
      const e = { id: 'EV' + (++estado.ids), titulo, ini, fin, op: op || {}, color: '', borrado: false };
      e.api = { getId: () => e.id, getTitle: () => e.titulo, setTitle: (t) => { e.titulo = t; return e.api; }, getStartTime: () => e.ini, getEndTime: () => e.fin, isAllDayEvent: () => !!e.todo,
        setColor: (c) => { e.color = c; return e.api; }, setDescription: (d) => { e.op.description = d; return e.api; }, getDescription: () => e.op.description || '', deleteEvent: () => { e.borrado = true; }, setTime: (a, b) => { e.ini = a; e.fin = b; return e.api; },
        getAllDayStartDate: () => e.ini, getAllDayEndDate: () => e.fin };
      estado.eventos.push(e); return e.api;
    },
    createAllDayEvent: (titulo, ini, fin) => { const e = cal.createEvent(titulo, ini, fin || new Date(ini.getTime() + 86400000)); estado.eventos[estado.eventos.length - 1].todo = true; return e; },
    getEventById: (id) => { const e = estado.eventos.find((x) => x.id === id); return e ? e.api : null; }, // como Google: un evento borrado igual se devuelve por su código
  };
  /* --- servicios de Google --- */
  const props = { getProperty: (k) => (k in estado.props ? estado.props[k] : null), setProperty: (k, v) => { estado.props[k] = String(v); return props; }, setProperties: (o) => { Object.assign(estado.props, o); return props; }, deleteProperty: (k) => { delete estado.props[k]; return props; }, getProperties: () => Object.assign({}, estado.props) };
  ctx.PropertiesService = { getScriptProperties: () => props };
  ctx.CacheService = { getScriptCache: () => ({ get: (k) => (k in estado.cache ? estado.cache[k] : null), put: (k, v) => { estado.cache[k] = v; }, remove: (k) => { delete estado.cache[k]; }, removeAll: () => { estado.cache = {}; } }) };
  ctx.LockService = { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {}, tryLock: () => true }) };
  ctx.SpreadsheetApp = { create: (n) => { ss.nombre = n; if (!Object.keys(estado.hojas).length) estado.hojas['Hoja 1'] = Hoja('Hoja 1'); return ss; }, openById: () => ss, getActiveSpreadsheet: () => ss, flush: () => {}, newDataValidation: () => { const v = new Proxy({}, { get: (_, k) => (k === 'build' ? () => ({}) : () => v) }); return v; } };
  ctx.CalendarApp = { createCalendar: () => cal, getCalendarById: () => cal, getDefaultCalendar: () => cal, EventColor: { YELLOW: '5', GREEN: '10', RED: '11', GRAY: '8', ORANGE: '6', PALE_GREEN: '2', CYAN: '7', BLUE: '9', MAUVE: '3', PALE_RED: '4' } };
  ctx.MailApp = { sendEmail: (o) => { estado.correos.push(o); }, getRemainingDailyQuota: () => 100 };
  ctx.GmailApp = ctx.MailApp;
  ctx.Session = { getEffectiveUser: () => ({ getEmail: () => 'rockerioestudio@gmail.com' }), getActiveUser: () => ({ getEmail: () => 'rockerioestudio@gmail.com' }) };
  ctx.Utilities = { base64Decode: (t) => Array.from(Buffer.from(t, 'base64')).map((x) => (x > 127 ? x - 256 : x)), newBlob: (b, t, n) => ({ b, t, n }), formatDate, parseDate, getUuid: () => require('crypto').randomUUID() };
  ctx.ContentService = { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ t, setMimeType() { return this; }, getContent() { return this.t; }, getContentText() { return this.t; } }) };
  ctx.HtmlService = { createHtmlOutput: (t) => ({ t, setTitle() { return this; }, addMetaTag() { return this; }, getContent() { return this.t; } }), createHtmlOutputFromFile: () => ({ setTitle() { return this; }, addMetaTag() { return this; }, getContent: () => 'ADMIN' }) };
  ctx.ScriptApp = {
    getProjectTriggers: () => estado.triggers.slice(), deleteTrigger: (t) => { estado.triggers = estado.triggers.filter((x) => x !== t); },
    newTrigger: (fn) => { const t = { fn, getHandlerFunction: () => fn }; const b = new Proxy({}, { get: (_, k) => (k === 'create' ? () => { estado.triggers.push(t); return t; } : () => b) }); return b; },
  };
  ctx.UrlFetchApp = { fetch: (url, o) => { if (/^https:\/\/api\.mercadopago\.com/.test(url)) { const r = estado.mp ? estado.mp(url, o) : { c: 401, j: {} }; return { getResponseCode: () => r.c, getContentText: () => JSON.stringify(r.j) }; } const ms = /^https:\/\/sitio\.test\/([^?]*)/.exec(url); if (ms) { const fl = path.join(__dirname, '..', '..', ms[1]); return fs.existsSync(fl) ? { getResponseCode: () => 200, getContentText: () => fs.readFileSync(fl, 'utf8') } : { getResponseCode: () => 404, getContentText: () => '' }; } estado.whatsapp.push({ url, o }); return { getResponseCode: () => 200, getContentText: () => '{"messages":[{"id":"wamid.SIM"}]}' }; } };
  ctx.DriveApp = { createFolder: (n) => { const c = { n, url: 'https://drive.google.com/drive/folders/' + (++estado.ids), getUrl: () => c.url, getId: () => c.url, getName: () => n, getFiles: () => { const l = (estado.copias || []).filter((f) => !f.papelera); let i = 0; return { hasNext: () => i < l.length, next: () => l[i++] }; }, setSharing() { return c; }, createFile: (b) => { const id = 'F' + (++estado.ids) + 'abc'; (estado.archivos = estado.archivos || []).push({ id, n: b.n, tipo: b.t, bytes: b.b }); return { getId: () => id, setSharing() {} }; } }; estado.carpetas[n] = c; return c; }, getFoldersByName: (n) => { const c = estado.carpetas[n]; let usado = !c; return { hasNext: () => !usado, next: () => { usado = true; return c; } }; }, getFileById: () => ({ setTrashed() {}, getName: () => 'x', makeCopy: (n) => { estado.copias = estado.copias || []; const f = { n, creado: new Date(), getName: () => n, getDateCreated: () => f.creado, setTrashed: () => { f.papelera = true; } }; estado.copias.push(f); return f; } }), Access: { ANYONE_WITH_LINK: 1 }, Permission: { VIEW: 1 } };
  ctx.Logger = { log() {} };
  /* reloj controlable */
  const Real = Date; let desfase = 0;
  vm.runInContext('(function(R){ globalThis.__R = R; })', ctx)(Real);
  ctx.__ahora = () => Date.now() + desfase;
  vm.runInContext(`(function(){ var Orig = Date; function F(a,b,c,d,e,f,g){ var n=arguments.length; if(n===0) return new Orig(__ahora()); if(n===1) return new Orig(a); return new Orig(a,b,c||1,d||0,e||0,f||0,g||0);} F.prototype=Orig.prototype; F.UTC=Orig.UTC; F.parse=Orig.parse; F.now=function(){return __ahora();}; Date=F; })()`, ctx);
  const dir = path.join(__dirname, '../../apps-script');
  ['Reglas', 'Code', 'AdminApi', 'Contenido', 'Planes', 'Ventas', 'Socios', 'Contabilidad', 'Ajustes', 'WhatsApp', 'Sitio', 'Pagos'].forEach((f) => vm.runInContext(fs.readFileSync(path.join(dir, f + '.gs'), 'utf8'), ctx, { filename: f + '.gs' }));
  const J = (o) => JSON.parse(JSON.stringify(o));
  const api = {
    ctx, estado, cal, ss,
    avanzar: (ms) => { desfase += ms; estado.cache = {}; },
    get: (p) => JSON.parse(ctx.doGet({ parameter: p }).getContent()),
    post: (o) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(o) } }).getContent()),
    admin: (fn, ...a) => J(ctx[fn](...a)),
    hoja: (n) => estado.hojas[n] && estado.hojas[n].filas.map((f) => f.slice()),
    correosA: (para) => estado.correos.filter((c) => c.to === para),
    instalar: () => { ctx.instalar(); },
  };
  return api;
}
module.exports = { crear };
