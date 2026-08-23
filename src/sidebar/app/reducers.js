import { combineReducers } from 'redux';
import {
  TEXT_SAVED,
  TEXT_SYNCING,
  TEXT_SYNCED,
  NOTES_LOADED,
  CREATE_NOTE,
  UPDATE_NOTE,
  DELETE_NOTE,
  FOCUS_NOTE,
  ERROR,
  REQUEST_WELCOME_PAGE,
  SYNC_SETTING_CHANGED,
} from './utils/constants';

import { getNoteSummary } from './utils/utils';
import {
  SYNCING as NOTE_SYNCING,
  SYNCED as NOTE_SYNCED,
  SYNC_ERROR as NOTE_SYNC_ERROR,
  createStatus,
  restorePendingStatuses,
} from './utils/noteSyncState';

function toDate(value) {
  if (value instanceof Date) return value;
  return value ? new Date(value) : new Date();
}

function setNoteStatus(noteSync, id, state, detail) {
  // Actions that carry no id are round-trip acknowledgements for whatever was
  // already in flight -- there is no note to attribute them to.
  if (!id) return noteSync;

  return Object.assign({}, noteSync, { [id]: createStatus(state, detail) });
}

/**
 * Sync state per note id, so the list and the editor can show which note is
 * saved, in flight or failed. The footer's `sync` slice only knows whether
 * *something* is syncing.
 */
function noteSync(noteSync = {}, action) {
  switch (action.type) {
    case NOTES_LOADED: {
      if (!action.notes) return noteSync;
      if (action.fromCache) return restorePendingStatuses(action.noteSync);

      // Anything storage.sync just handed back is synced by definition,
      // except the notes reconcileNotes found the sidebar still holds a newer
      // copy of. Those keep the failure that explains why, or show the retry
      // notesLoaded fires for them.
      const unsynced = new Set(action.unsynced);
      const next = {};

      action.notes.forEach((note) => {
        const previous = noteSync[note.id];

        if (unsynced.has(note.id)) {
          next[note.id] =
            previous && previous.state === NOTE_SYNC_ERROR
              ? previous
              : createStatus(NOTE_SYNCING);
          return;
        }

        // A save in flight outranks the reload: onSyncChanged fires one for
        // our own writes too, and it would otherwise flash a checkmark
        // mid-save.
        next[note.id] =
          previous && previous.state === NOTE_SYNCING
            ? previous
            : createStatus(NOTE_SYNCED, {
                syncedAt: toDate(note.lastModified),
              });
      });

      return next;
    }
    case CREATE_NOTE:
    case UPDATE_NOTE:
    case TEXT_SYNCING:
      return setNoteStatus(noteSync, action.id, NOTE_SYNCING);
    case TEXT_SYNCED:
      return setNoteStatus(noteSync, action.id, NOTE_SYNCED, {
        syncedAt: toDate(action.lastModified),
      });
    case ERROR:
      return setNoteStatus(noteSync, action.id, NOTE_SYNC_ERROR, {
        message: action.message,
      });
    case DELETE_NOTE: {
      if (!action.id || !(action.id in noteSync)) return noteSync;
      const next = Object.assign({}, noteSync);
      delete next[action.id];
      return next;
    }
    default:
      return noteSync;
  }
}

function sync(sync = {}, action) {
  switch (action.type) {
    case DELETE_NOTE:
      return Object.assign({}, sync, {
        isSyncing: action.isSyncing,
        focusedNoteId:
          sync.focusedNoteId === action.id ? null : sync.focusedNoteId,
        error: null,
      });
    case UPDATE_NOTE:
      return Object.assign({}, sync, {
        isSyncing: true,
        error: null,
      });
    case TEXT_SAVED:
      return Object.assign({}, sync, {
        isSyncing: sync.isSyncing,
      });
    case TEXT_SYNCING:
      return Object.assign({}, sync, {
        isSyncing: true,
      });
    case TEXT_SYNCED:
      return Object.assign({}, sync, {
        isSyncing: false,
        lastSynced: new Date(),
      });
    case NOTES_LOADED:
      return Object.assign({}, sync, {
        isSyncing: false,
        lastSynced: new Date(),
      });
    case FOCUS_NOTE:
      return Object.assign({}, sync, {
        focusedNoteId: action.id,
      });
    case REQUEST_WELCOME_PAGE:
      return Object.assign({}, sync, {
        welcomePage: true,
      });
    case CREATE_NOTE:
      return Object.assign({}, sync, {
        welcomePage: false,
        isSyncing: !action.isSyncing,
      });
    case ERROR:
      // The save is over -- it failed. Leaving isSyncing set kept EditorPanel
      // from refreshing the note it renders, so a window that was handed the
      // refused edit went on showing the older one until it was reopened.
      return Object.assign({}, sync, {
        isSyncing: false,
        error: action.message,
      });
    default:
      return sync;
  }
}

// Whether a load has ever landed. The panels render nothing until one has,
// so the sidebar does not flash an empty note list on the way up.
function isLoaded(isLoaded = false, action) {
  switch (action.type) {
    case NOTES_LOADED:
      return true;
    default:
      return isLoaded;
  }
}

function notes(notes = [], action) {
  switch (action.type) {
    case NOTES_LOADED: {
      if (action.notes) {
        const list = Array.from(action.notes);
        list.map((note) => {
          Object.assign(note, getNoteSummary(note.content));
          if (!(note.lastModified instanceof Date)) {
            note.lastModified = note.lastModified
              ? new Date(note.lastModified)
              : new Date();
          }
        });
        return list;
      }
      return notes;
    }
    case TEXT_SYNCED: {
      if (!action.notes) return notes;

      const res = [];

      action.notes.forEach((note) => {
        res.push({
          id: note.id,
          content: note.content,
          ...getNoteSummary(note.content),
          lastModified:
            note.lastModified instanceof Date
              ? note.lastModified
              : new Date(note.lastModified),
        });
      });

      return res;
    }
    case CREATE_NOTE: {
      if (!action.id) return notes;
      const list = Array.from(notes).filter((note) => note.id !== action.id);
      list.push({
        id: action.id,
        content: action.content,
        ...getNoteSummary(action.content),
        lastModified: action.lastModified || new Date(),
      });
      return list;
    }
    case DELETE_NOTE:
      return Array.from(notes).filter((note) => note.id !== action.id);
    case UPDATE_NOTE: {
      const list = Array.from(notes);
      const note = list.find((note) => note.id === action.id);
      if (note) {
        note.content = action.content;
        Object.assign(note, getNoteSummary(action.content));
        note.lastModified = new Date(action.lastModified);
      } else {
        list.push({
          id: action.id,
          content: action.content,
          ...getNoteSummary(action.content),
          lastModified: new Date(action.lastModified),
        });
      }
      return list;
    }
    default:
      return notes;
  }
}

// Whether notes are being written to storage.sync. app.jsx seeds it from
// storage.local on open and onMessage.js keeps it current, so the default
// only stands for the moment before the first read -- and it matches
// storage-sync.js, where an absent setting means off.
function syncEnabled(syncEnabled = false, action) {
  switch (action.type) {
    case SYNC_SETTING_CHANGED:
      return action.syncEnabled === true;
    default:
      return syncEnabled;
  }
}

const noteApp = combineReducers({
  sync,
  isLoaded,
  notes,
  noteSync,
  syncEnabled,
});

export default noteApp;
