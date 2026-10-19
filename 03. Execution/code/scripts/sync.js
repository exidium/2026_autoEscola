// Archivo de progreso: guardado automático en un archivo del ordenador
// (File System Access API: Chrome/Edge de escritorio) y, en cualquier
// navegador, descarga/carga manual de una copia.
import * as store from './storage.js?v=3';

const FILE_NAME = 'teorico-moto-progreso.json';
const PICKER = { types: [{ description: 'Progreso Teórico Moto', accept: { 'application/json': ['.json'] } }] };

export const canAutoSave = typeof window.showSaveFilePicker === 'function';

let handle = null;
let status = 'none';        // none | ok | needs-permission | error
let lastSaved = null;
let lastError = '';
let writing = Promise.resolve();
const onChange = [];

export const getState = () => ({ status, fileName: handle?.name ?? null, lastSaved, lastError });
export const subscribe = fn => onChange.push(fn);
const emit = () => onChange.forEach(fn => fn(getState()));

// ---- IndexedDB mínima para recordar el archivo entre visitas ----
function idb(mode, fn) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('teorico-moto', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('kv');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const tx = open.result.transaction('kv', mode);
      const req = fn(tx.objectStore('kv'));
      tx.oncomplete = () => resolve(req?.result);
      tx.onerror = () => reject(tx.error);
    };
  });
}
const saveHandle = h => idb('readwrite', s => (h ? s.put(h, 'file') : s.delete('file')));
const loadHandle = () => idb('readonly', s => s.get('file'));

async function readFile(h) {
  const text = await (await h.getFile()).text();
  return text.trim() ? JSON.parse(text) : null;
}

function write() {
  if (!handle || status !== 'ok') return writing;
  writing = writing.then(async () => {
    try {
      const w = await handle.createWritable();
      await w.write(JSON.stringify(store.exportData(), null, 1));
      await w.close();
      lastSaved = Date.now();
    } catch (e) {
      status = 'error';
      lastError = e.message;
    }
    emit();
  });
  return writing;
}

// Mezcla lo que haya en el archivo con lo local y deja el archivo al día.
async function syncWith(h) {
  const data = await readFile(h);
  if (data) store.importData(data);
  handle = h;
  status = 'ok';
  await write();
}

// Al arrancar: si ya había un archivo elegido, se reconecta solo si el
// navegador mantiene el permiso; si no, hace falta un clic (reconnect()).
export async function init() {
  store.subscribe(() => write());
  if (!canAutoSave) return emit();
  try {
    const h = await loadHandle();
    if (!h) return emit();
    handle = h;
    const perm = await h.queryPermission({ mode: 'readwrite' });
    if (perm === 'granted') await syncWith(h);
    else status = 'needs-permission';
  } catch (e) {
    status = 'error';
    lastError = e.message;
  }
  emit();
}

export async function reconnect() {
  if (!handle) return;
  try {
    const perm = await handle.requestPermission({ mode: 'readwrite' });
    if (perm !== 'granted') return;
    await syncWith(handle);
  } catch (e) {
    status = 'error';
    lastError = e.message;
  }
  emit();
}

// Crear un archivo nuevo (o sobrescribir uno elegido) con el progreso actual.
export async function createFile() {
  try {
    const h = await window.showSaveFilePicker({ suggestedName: FILE_NAME, ...PICKER });
    await saveHandle(h);
    await syncWith(h);
  } catch (e) {
    if (e.name !== 'AbortError') { status = 'error'; lastError = e.message; }
  }
  emit();
}

// Abrir un archivo existente: se suma su contenido y a partir de ahí se guarda en él.
export async function openFile() {
  try {
    const [h] = await window.showOpenFilePicker({ multiple: false, ...PICKER });
    const data = await readFile(h);
    if (data && !store.isBackup(data)) throw new Error('El archivo no es una copia de Teórico Moto.');
    if ((await h.requestPermission({ mode: 'readwrite' })) !== 'granted') return;
    await saveHandle(h);
    await syncWith(h);
  } catch (e) {
    if (e.name !== 'AbortError') { status = 'error'; lastError = e.message; }
  }
  emit();
}

export async function disconnect() {
  handle = null;
  status = 'none';
  lastSaved = null;
  await saveHandle(null).catch(() => {});
  emit();
}

// ---- copia manual (cualquier navegador) ----
export function download() {
  const blob = new Blob([JSON.stringify(store.exportData(), null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `teorico-moto-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function upload() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      try {
        const file = input.files[0];
        if (!file) return resolve(null);
        resolve(store.importData(JSON.parse(await file.text())));
      } catch (e) {
        reject(e);
      }
    };
    input.click();
  });
}
