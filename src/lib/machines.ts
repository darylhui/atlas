import { compressImage, deletePhoto, savePhoto } from './db';
import { sized, type CatalogMachine } from './seed/machines';
import { actions, useStore } from './store';
import type { ID, Machine } from './types';
import { uid } from './util';

export const photoKey = (id: ID) => `machine-${id}`;

/** Save a picture for a machine on this device; false when it couldn't be read. */
export async function setMachinePhoto(id: ID, file: Blob): Promise<boolean> {
  try {
    await savePhoto(photoKey(id), await compressImage(file, 900));
    // The machine may have been removed while its picture was loading.
    if (!useStore.getState().data.machines.some((m) => m.id === id)) {
      await deletePhoto(photoKey(id));
      return false;
    }
    actions().patch('machines', id, { photoAt: new Date().toISOString() });
    return true;
  } catch {
    return false;
  }
}

/** Copy a catalogue picture onto the device so it also works offline. */
export async function fetchMachinePhoto(m: Pick<Machine, 'id' | 'imageUrl'>): Promise<boolean> {
  if (!m.imageUrl) return false;
  try {
    const r = await fetch(sized(m.imageUrl, 900), { referrerPolicy: 'no-referrer' });
    if (!r.ok) return false;
    return await setMachinePhoto(m.id, await r.blob());
  } catch {
    return false;
  }
}

/** Add catalogue machines to a location and save their pictures. Resolves to how many pictures were saved. */
export async function addFromCatalog(studioId: ID, picks: CatalogMachine[]): Promise<number> {
  const added = picks.map(
    (c): Machine => ({ id: uid(), studioId, name: c.name, brand: c.brand || undefined, category: c.category, quantity: 1, status: 'ok', catalogId: c.id, imageUrl: c.imageUrl, sourceUrl: c.sourceUrl }),
  );
  for (const m of added) actions().upsert('machines', m);
  let saved = 0;
  // One at a time, to go easy on the store's server.
  for (const m of added) if (await fetchMachinePhoto(m)) saved++;
  return saved;
}

export async function removeMachine(id: ID) {
  actions().remove('machines', id);
  await deletePhoto(photoKey(id));
}

/** Remove a location together with its machines; past classes keep their history. */
export async function removeLocation(studioId: ID) {
  const ids = useStore.getState().data.machines.filter((m) => m.studioId === studioId).map((m) => m.id);
  actions().remove('studios', studioId);
  for (const id of ids) await removeMachine(id);
}
