/**
 * Storage Sync Module
 *
 * Handles syncing notes using browser.storage.sync API. There is no server
 * and no account to sign in to: the browser carries the notes between
 * profiles on its own.
 *
 * Limits:
 * - Max item size: 8KB (we enforce 6KB to be safe)
 * - Max total storage: 100KB
 * - Max items: 512
 */

const NOTE_PREFIX = 'note_';
const MAX_NOTE_SIZE = 6 * 1024; // 6KB per note

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
  };
}
