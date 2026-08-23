import { SYNCED } from './noteSyncState';

function time(value) {
  const parsed = value instanceof Date ? value : new Date(value);
  const ms = parsed.getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

/**
 * Reconciles what storage.sync returned with what the sidebar already holds.
 *
 * A local copy whose lastModified is ahead of the synced one is an edit that
 * never reached storage.sync -- a save that failed the 6 KB or 100 KB limit,
 * or one still in flight when the sidebar closed. Overwriting it with the
 * older synced copy is how those edits used to disappear, so they are kept
 * and reported back as unsynced instead.
 *
 * A local copy that is *older* still loses: last write wins, exactly as
 * before, so an edit made on another device is not undone by a stale note.
 *
 * @param {Array} localNotes What the store has now.
 * @param {Object} noteSync Per-note status keyed by id.
 * @param {Array} syncedNotes What storage.sync just returned.
 * @returns {{notes: Array, unsynced: Array<string>}}
 */
export function reconcileNotes(
  localNotes = [],
  noteSync = {},
  syncedNotes = [],
) {
  const mine = new Map(localNotes.map((note) => [note.id, note]));
  const notes = [];
  const unsynced = [];

  syncedNotes.forEach((synced) => {
    const local = mine.get(synced.id);
    mine.delete(synced.id);

    if (local && time(local.lastModified) > time(synced.lastModified)) {
      notes.push(local);
      unsynced.push(local.id);
    } else {
      notes.push(synced);
    }
  });

  // What is left exists only locally. A note whose save is unfinished has
  // simply never reached storage.sync; anything else is a note deleted on
  // another device, and has to go.
  mine.forEach((local, id) => {
    const status = noteSync[id];
    if (status && status.state !== SYNCED) {
      notes.push(local);
      unsynced.push(id);
    }
  });

  return { notes, unsynced };
}
