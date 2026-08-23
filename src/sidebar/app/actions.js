import {
  NOTES_LOADED,
  TEXT_SAVED,
  TEXT_SYNCING,
  TEXT_SYNCED,
  EXPORT_HTML,
  CREATE_NOTE,
  UPDATE_NOTE,
  DELETE_NOTE,
  FOCUS_NOTE,
  ERROR,
  REQUEST_WELCOME_PAGE,
} from './utils/constants';

import INITIAL_CONTENT from './data/initialContent';
import { reconcileNotes } from './utils/reconcileNotes';
import { getFirstNonEmptyElement, formatFilename } from './utils/utils';
import { saveFile } from './utils/download';

/*
 * action creators
 */
export function updatedNote(id, content, lastModified) {
  return { type: UPDATE_NOTE, id, content, lastModified };
}

export function updateNote(id, content) {
  const lastModified = new Date();
  if (
    content.replace(/&nbsp;/g, '\xa0') !==
    INITIAL_CONTENT.replace(/\s\s+/g, ' ')
  ) {
    browser.windows.getCurrent({ populate: true }).then((windowInfo) => {
      chrome.runtime.sendMessage({
        action: UPDATE_NOTE,
        from: windowInfo.id,
        note: {
          id,
          content,
          lastModified,
        },
      });
    });
  }
  return { type: UPDATE_NOTE, id, content, lastModified };
}

export function saved(id, content, lastModified) {
  return { type: TEXT_SAVED, id, content, lastModified };
}

export function syncing(id) {
  return { type: TEXT_SYNCING, id };
}

// `id` and `lastModified` describe the note that just reached storage.sync;
// they are what the per-note indicator keys off. Calls that only mean "stop
// the global spinner" pass neither.
export function synced(notes, id, lastModified) {
  return { type: TEXT_SYNCED, notes, id, lastModified };
}

/**
 * A load straight from storage.sync.
 *
 * The incoming notes are reconciled against what the sidebar already has
 * rather than replacing it: an edit that never made it to storage.sync would
 * otherwise be overwritten here by the older synced copy, which is how a
 * failed save used to vanish on the next sidebar open. Whatever is still
 * unsynced afterwards is retried, so a failure that has since become saveable
 * -- a full store the user has cleared, say -- resolves itself.
 */
export function notesLoaded(notes) {
  if (!notes) return { type: NOTES_LOADED };

  return (dispatch, getState) => {
    const state = getState();
    const { notes: merged, unsynced } = reconcileNotes(
      state.notes,
      state.noteSync,
      notes,
    );

    dispatch({ type: NOTES_LOADED, notes: merged, unsynced });

    const byId = new Map(merged.map((note) => [note.id, note]));
    unsynced.forEach((id) => dispatch(retryNoteSync(byId.get(id))));
  };
}

// The replay of storage.local.redux that paints the sidebar before sync
// answers. Those notes are whatever was on screen last time rather than
// anything storage.sync has confirmed, so only unfinished statuses carry
// over; the load that follows settles the rest.
export function notesLoadedFromCache(cached) {
  return {
    type: NOTES_LOADED,
    notes: cached.notes,
    noteSync: cached.noteSync,
    fromCache: true,
  };
}

// Re-sends a note storage.sync never accepted. It keeps the note's own
// lastModified: this is the same edit reaching for storage again, not a new
// one, and bumping the timestamp would let it win a conflict it should lose.
export function retryNoteSync(note) {
  return () =>
    browser.windows.getCurrent({ populate: true }).then((windowInfo) => {
      chrome.runtime.sendMessage({
        action: UPDATE_NOTE,
        from: windowInfo.id,
        note: {
          id: note.id,
          content: note.content,
          lastModified: note.lastModified,
        },
      });
    });
}

// The note was already added optimistically by the createNote thunk, so this
// only acknowledges the round-trip. The reducer ignores it without an id.
export function createdNote() {
  return { type: CREATE_NOTE, isSyncing: false };
}

export function createNote(content = '', origin, id) {
  if (!id) {
    id = crypto.randomUUID();
  }

  // Send create request to storage.sync
  chrome.runtime.sendMessage({
    action: 'create-note',
    id,
    content,
    origin,
    lastModified: new Date(),
  });

  // Return id to callback using promises
  const fct = (dispatch) => {
    return new Promise((resolve) => {
      dispatch({ type: CREATE_NOTE, id, content });
      resolve(id);
    });
  };

  return fct;
}

export function deletedNote(id) {
  return { type: DELETE_NOTE, id, isSyncing: false };
}

export function deleteNote(id, origin) {
  chrome.runtime.sendMessage({ action: 'delete-note', id, origin });
  return { type: DELETE_NOTE, id, isSyncing: true };
}

// EXPORT HTML
export function exportHTML(content) {
  // get Notes content
  const notesContent = content || '';
  // assign contents to container element for later parsing
  const parentElement = document.createElement('div');
  parentElement.innerHTML = notesContent;

  let exportFileName = 'blank.html';
  // get the first child element with text
  const nonEmptyChildElement = getFirstNonEmptyElement(parentElement);

  // if non-empty child element exists, set the filename to the element's `textContent`
  if (nonEmptyChildElement) {
    exportFileName = formatFilename(nonEmptyChildElement.textContent);
  }

  const exportFileType = 'text/html';
  const data = new Blob(
    [
      `
    <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <title>Notes</title>
        </head>
      <body>${notesContent}</body>
    </html>`.trim(),
    ],
    { type: exportFileType },
  );

  saveFile(data, exportFileName);

  return { type: EXPORT_HTML, content };
}

export function setFocusedNote(id) {
  return { type: FOCUS_NOTE, id };
}

export function requestWelcomeNote() {
  return { type: REQUEST_WELCOME_PAGE };
}

export function error(message, id) {
  return { type: ERROR, message, id };
}
