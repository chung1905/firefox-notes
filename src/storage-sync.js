/**
 * Storage Sync Module
 *
 * Handles syncing notes using browser.storage.sync API.
 * This replaces the Kinto-based sync with a simpler, built-in solution.
 *
 * Limits:
 * - Max item size: 8KB (we enforce 6KB to be safe)
 * - Max total storage: 100KB
 * - Max items: 512
 */

const NOTE_PREFIX = 'note_';
const META_KEY = '_meta';
const MAX_NOTE_SIZE = 6 * 1024; // 6KB per note
const MAX_TOTAL_STORAGE = 102400; // 100KB total

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
 * Load all notes from browser.storage.sync
 * @returns {Promise<Array>} Array of note objects
 */
async function loadNotes() {
  const data = await browser.storage.sync.get(null);
  const notes = [];

  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith(NOTE_PREFIX) && value) {
      notes.push({
        ...value,
        lastModified: value.lastModified
          ? new Date(value.lastModified)
          : new Date(),
      });
    }
  }

  // Sort by lastModified descending (newest first)
  return notes.sort((a, b) => b.lastModified - a.lastModified);
}

/**
 * Save a note to browser.storage.sync
 * @param {Object} note - Note object with id, content, lastModified
 * @throws {NoteTooLargeError} If note exceeds size limit
 */
async function saveNote(note) {
  const key = NOTE_PREFIX + note.id;
  const data = {
    id: note.id,
    content: note.content,
    lastModified:
      note.lastModified instanceof Date
        ? note.lastModified.getTime()
        : note.lastModified,
  };

  // Check size before saving
  const serialized = JSON.stringify({ [key]: data });
  const size = new Blob([serialized]).size;

  if (size > MAX_NOTE_SIZE) {
    throw new NoteTooLargeError(size, MAX_NOTE_SIZE);
  }

  try {
    await browser.storage.sync.set({ [key]: data });
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
 * Delete a note from browser.storage.sync
 * @param {string} id - Note ID
 */
async function deleteNote(id) {
  const key = NOTE_PREFIX + id;
  await browser.storage.sync.remove(key);
}

/**
 * Get storage usage information
 * @returns {Promise<Object>} Usage info with used, total, percentage
 */
async function getUsage() {
  const bytesInUse = await browser.storage.sync.getBytesInUse(null);
  return {
    used: bytesInUse,
    total: MAX_TOTAL_STORAGE,
    percentage: (bytesInUse / MAX_TOTAL_STORAGE) * 100,
  };
}

/**
 * Check if sync is available (user has Firefox Account with Add-ons sync enabled)
 * Note: There's no direct API to check this, so we assume it's available
 * @returns {Promise<boolean>}
 */
async function isSyncAvailable() {
  try {
    // Try to access storage.sync - if it works, sync is available
    await browser.storage.sync.get(META_KEY);
    return true;
  } catch (error) {
    console.error('Sync not available:', error); // eslint-disable-line no-console
    return false;
  }
}

/**
 * Set up listener for sync changes from other devices
 * @param {Function} callback - Called with array of changed notes
 */
function onSyncChanged(callback) {
  browser.storage.sync.onChanged.addListener((changes) => {
    const noteChanges = [];

    for (const [key, change] of Object.entries(changes)) {
      if (key.startsWith(NOTE_PREFIX)) {
        const id = key.slice(NOTE_PREFIX.length);

        if (change.newValue && !change.oldValue) {
          // Note created on another device
          noteChanges.push({
            type: 'created',
            id,
            note: {
              ...change.newValue,
              lastModified: new Date(change.newValue.lastModified),
            },
          });
        } else if (change.newValue && change.oldValue) {
          // Note updated on another device
          noteChanges.push({
            type: 'updated',
            id,
            note: {
              ...change.newValue,
              lastModified: new Date(change.newValue.lastModified),
            },
          });
        } else if (!change.newValue && change.oldValue) {
          // Note deleted on another device
          noteChanges.push({
            type: 'deleted',
            id,
          });
        }
      }
    }

    if (noteChanges.length > 0) {
      callback(noteChanges);
    }
  });
}

/**
 * Update metadata
 * @param {Object} meta - Metadata to store
 */
async function updateMeta(meta) {
  const existing = await browser.storage.sync.get(META_KEY);
  await browser.storage.sync.set({
    [META_KEY]: {
      ...existing[META_KEY],
      ...meta,
      lastSync: Date.now(),
    },
  });
}

/**
 * Get metadata
 * @returns {Promise<Object>}
 */
async function getMeta() {
  const data = await browser.storage.sync.get(META_KEY);
  return data[META_KEY] || {};
}

// Export for use in background.js
// Using window assignment for non-module scripts
if (typeof window !== 'undefined') {
  window.storageSync = {
    loadNotes,
    saveNote,
    deleteNote,
    getUsage,
    isSyncAvailable,
    onSyncChanged,
    updateMeta,
    getMeta,
    NoteTooLargeError,
    StorageLimitError,
    MAX_NOTE_SIZE,
    MAX_TOTAL_STORAGE,
  };
}
