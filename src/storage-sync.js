/**
 * Storage Sync Module
 *
 * Stores notes, and carries them between profiles through
 * browser.storage.sync while sync is switched on. There is no server and no
 * account to sign in to: the browser does the carrying on its own.
 *
 * Sync is a setting (`storage.local.syncEnabled`), off until it is explicitly
 * turned on, rather than a fixed destination. Writes go to storage.sync while
 * it is on and to storage.local while it is off, but reads *union both areas*.
 * That is what makes the setting safe to flip: nothing is migrated, so nothing
 * can be half-migrated, and a note the other area still holds stays visible
 * either way. It is also what makes the default safe -- a profile that synced
 * before this setting existed goes on listing everything storage.sync holds,
 * it just stops adding to it. Turning sync on pushes the notes storage.sync
 * doesn't have yet; turning it off leaves the synced copies alone, because
 * removing them would delete them from the user's other devices too.
 *
 * The storage.sync limits below only apply to what is written there. Notes
 * written while sync is off answer to storage.local's much larger quota, so
 * the 6KB check is not applied to them.
 * - Max item size: 8KB (we enforce 6KB to be safe)
 * - Max total storage: 100KB
 * - Max items: 512
 */

const NOTE_PREFIX = 'note_';
const MAX_NOTE_SIZE = 6 * 1024; // 6KB per note
const SYNC_ENABLED_KEY = 'syncEnabled';

class NoteTooLargeError extends Error {
  constructor(actual, max) {
    super(`Note exceeds size limit: ${actual} bytes (max: ${max})`);
    this.name = 'NoteTooLargeError';
    this.actual = actual;
    this.max = max;
  }
}

class StorageLimitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StorageLimitError';
  }
}

/**
 * Whether notes are written to browser.storage.sync.
 *
 * Absent means off: the key only exists once the settings page has written it,
 * so notes stay on the device until someone asks for them to leave it. Only a
 * literal `true` counts, which keeps a half-written setting on the safe side.
 *
 * @returns {Promise<boolean>}
 */
async function isSyncEnabled() {
  const data = await browser.storage.local.get(SYNC_ENABLED_KEY);
  return data[SYNC_ENABLED_KEY] === true;
}

/**
 * The area new writes go to.
 *
 * @returns {Promise<Object>} browser.storage.sync or browser.storage.local
 */
async function writeArea() {
  return (await isSyncEnabled()) ? browser.storage.sync : browser.storage.local;
}

function toNote(stored) {
  return {
    ...stored,
    lastModified: stored.lastModified
      ? new Date(stored.lastModified)
      : new Date(),
  };
}

function toStored(note) {
  return {
    id: note.id,
    content: note.content,
    lastModified:
      note.lastModified instanceof Date
        ? note.lastModified.getTime()
        : note.lastModified,
  };
}

/**
 * Every note held in one storage area, keyed by id.
 *
 * @param {Object} area A browser.storage area
 * @returns {Promise<Map<string, Object>>}
 */
async function readNotes(area) {
  const data = await area.get(null);
  const notes = new Map();

  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith(NOTE_PREFIX) && value) {
      notes.set(key.slice(NOTE_PREFIX.length), toNote(value));
    }
  }

  return notes;
}

/**
 * Load every note, from both storage areas.
 *
 * A note can sit in either area -- or in both, with different content, if it
 * was edited on each side of a sync setting change. Newest wins, the same
 * rule the sidebar reconciles loads with; a tie goes to the synced copy,
 * which is the one the user's other devices also have.
 *
 * @returns {Promise<Array>} Array of note objects, newest first
 */
async function loadNotes() {
  const [synced, local] = await Promise.all([
    readNotes(browser.storage.sync),
    readNotes(browser.storage.local),
  ]);

  local.forEach((note, id) => {
    const rival = synced.get(id);
    if (!rival || note.lastModified > rival.lastModified) {
      synced.set(id, note);
    }
  });

  return Array.from(synced.values()).sort(
    (a, b) => b.lastModified - a.lastModified,
  );
}

/**
 * Write one note to one area.
 *
 * @param {Object} area A browser.storage area
 * @param {Object} note Note object with id, content, lastModified
 * @param {boolean} enforceSize Whether the storage.sync item limit applies
 * @throws {NoteTooLargeError} If the note exceeds the storage.sync item limit
 * @throws {StorageLimitError} If the area is full
 */
async function writeNote(area, note, enforceSize) {
  const key = NOTE_PREFIX + note.id;
  const stored = toStored(note);

  if (enforceSize) {
    const size = new Blob([JSON.stringify({ [key]: stored })]).size;

    if (size > MAX_NOTE_SIZE) {
      throw new NoteTooLargeError(size, MAX_NOTE_SIZE);
    }
  }

  try {
    await area.set({ [key]: stored });
  } catch (error) {
    if (error.message && error.message.includes('QUOTA_BYTES')) {
      throw new StorageLimitError(
        browser.i18n.getMessage('insufficientStorage'),
      );
    }
    throw error;
  }
}

/**
 * Save a note to whichever area the sync setting points at
 * @param {Object} note - Note object with id, content, lastModified
 * @throws {NoteTooLargeError} If note exceeds size limit
 */
async function saveNote(note) {
  const area = await writeArea();
  await writeNote(area, note, area === browser.storage.sync);
}

/**
 * Delete a note from both areas.
 *
 * A delete has to stick whichever way the setting is pointing: leaving the
 * other area's copy behind would only mean loadNotes handing the note back on
 * the next load.
 *
 * @param {string} id - Note ID
 */
async function deleteNote(id) {
  const key = NOTE_PREFIX + id;
  await Promise.all([
    browser.storage.sync.remove(key),
    browser.storage.local.remove(key),
  ]);
}

function collectNoteChanges(changes) {
  const noteChanges = [];

  for (const [key, change] of Object.entries(changes)) {
    if (!key.startsWith(NOTE_PREFIX)) continue;

    const id = key.slice(NOTE_PREFIX.length);

    if (change.newValue && !change.oldValue) {
      noteChanges.push({ type: 'created', id, note: toNote(change.newValue) });
    } else if (change.newValue && change.oldValue) {
      noteChanges.push({ type: 'updated', id, note: toNote(change.newValue) });
    } else if (!change.newValue && change.oldValue) {
      noteChanges.push({ type: 'deleted', id });
    }
  }

  return noteChanges;
}

/**
 * Set up listener for note changes, from other devices or from a write here.
 *
 * Both areas are watched because loadNotes reads both. storage.local also
 * carries the redux cache and the settings, which is why only `note_` keys
 * count as a change.
 *
 * @param {Function} callback - Called with array of changed notes
 */
function onSyncChanged(callback) {
  [browser.storage.sync, browser.storage.local].forEach((area) => {
    area.onChanged.addListener((changes) => {
      const noteChanges = collectNoteChanges(changes);

      if (noteChanges.length > 0) {
        callback(noteChanges);
      }
    });
  });
}

/**
 * Turn syncing on or off.
 *
 * Turning it on pushes the notes storage.sync is missing or holds an older
 * copy of, so switching it on actually publishes what is already here rather
 * than only affecting notes edited from now on. Those pushes are reported
 * instead of thrown: a note too big for storage.sync must not stop the rest,
 * and it loses nothing by failing -- storage.local still has it and loadNotes
 * still reads it.
 *
 * @param {boolean} enabled
 * @returns {Promise<Array<{note: Object, error: Error}>>} Notes not pushed
 */
async function setSyncEnabled(enabled) {
  await browser.storage.local.set({ [SYNC_ENABLED_KEY]: enabled });

  if (!enabled) return [];

  const [synced, local] = await Promise.all([
    readNotes(browser.storage.sync),
    readNotes(browser.storage.local),
  ]);
  const failures = [];

  for (const [id, note] of local) {
    const rival = synced.get(id);
    if (rival && rival.lastModified >= note.lastModified) continue;

    try {
      await writeNote(browser.storage.sync, note, true);
    } catch (error) {
      failures.push({ note, error });
    }
  }

  return failures;
}

// Export for use in background.js
// Using window assignment for non-module scripts. This is everything
// background.js reaches for; the error classes stay unexported because it
// matches on error.name.
if (typeof window !== 'undefined') {
  window.storageSync = {
    loadNotes,
    saveNote,
    deleteNote,
    onSyncChanged,
    isSyncEnabled,
    setSyncEnabled,
  };
}
