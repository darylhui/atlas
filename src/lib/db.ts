// Local-first persistence. Everything lives in IndexedDB on the trainer's device;
// when IndexedDB is unavailable (private mode, sandboxed previews) we fall back
// to an in-memory store so the app still works for the session.

import { createStore, del, get, set, type UseStore } from 'idb-keyval';
import type { AppData } from './types';

const DATA_KEY = 'atlas:data';
const memory = new Map<string, unknown>();
let store: UseStore | null = null;
let available: boolean | null = null;

async function idb(): Promise<UseStore | null> {
  if (available === false) return null;
  if (store) return store;
  try {
    if (typeof indexedDB === 'undefined') throw new Error('no indexedDB');
    const s = createStore('atlas', 'kv');
    await get('__probe__', s);
    store = s;
    available = true;
    return s;
  } catch {
    available = false;
    return null;
  }
}

export async function storageAvailable(): Promise<boolean> {
  return (await idb()) != null;
}

export async function loadData(): Promise<AppData | undefined> {
  const s = await idb();
  try {
    if (s) return (await get(DATA_KEY, s)) as AppData | undefined;
  } catch {
    /* fall through */
  }
  return memory.get(DATA_KEY) as AppData | undefined;
}

export async function saveData(data: AppData): Promise<void> {
  const s = await idb();
  if (s) {
    try {
      await set(DATA_KEY, data, s);
      return;
    } catch {
      /* fall through */
    }
  }
  memory.set(DATA_KEY, data);
}

export async function savePhoto(id: string, dataUrl: string): Promise<void> {
  const s = await idb();
  if (s) {
    try {
      await set(`photo:${id}`, dataUrl, s);
      return;
    } catch {
      /* fall through */
    }
  }
  memory.set(`photo:${id}`, dataUrl);
}

export async function loadPhoto(id: string): Promise<string | undefined> {
  const s = await idb();
  if (s) {
    try {
      const v = (await get(`photo:${id}`, s)) as string | undefined;
      if (v) return v;
    } catch {
      /* fall through */
    }
  }
  return memory.get(`photo:${id}`) as string | undefined;
}

export async function deletePhoto(id: string): Promise<void> {
  memory.delete(`photo:${id}`);
  const s = await idb();
  if (s) await del(`photo:${id}`, s).catch(() => undefined);
}

/** Ask the browser not to evict our data under storage pressure. */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

/** Downscale and JPEG-compress an image file so photos stay small on-device. */
export async function compressImage(file: File, maxSide = 1080, quality = 0.82): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}
