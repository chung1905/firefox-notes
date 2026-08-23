import {
  NOTES_LOADED,
  TEXT_SAVED,
  TEXT_SYNCING,
  TEXT_SYNCED,
  CREATE_NOTE,
  DELETE_NOTE,
  ERROR,
  SYNC_SETTING_CHANGED,
} from './utils/constants';
// Actions
import {
  createdNote,
  deletedNote,
  saved,
  syncing,
  synced,
  notesLoaded,
  updatedNote,
  error,
  syncSettingChanged,
} from './actions';
import store from './store';

/**
 * For each event, action on redux to update UI.
 * Share state between instances.
 */

chrome.runtime.onMessage.addListener((eventData) => {
  switch (eventData.action) {
    //
    // SYNC EVENTS
    //
    case NOTES_LOADED:
      if (!eventData.notes) {
        store.dispatch(notesLoaded());
      } else {
        store.dispatch(notesLoaded(eventData.notes));
      }
      break;
    case CREATE_NOTE:
      store.dispatch(createdNote());
      setTimeout(() => {
        // createdNote() carries no id on purpose (the notes reducer would
        // re-add the note without content), so the note is marked synced here.
        store.dispatch(synced(null, eventData.id)); // stop syncing animation
      }, 750);
      break;
    case DELETE_NOTE:
      store.dispatch(deletedNote(eventData.id));
      store.dispatch(synced()); // stop syncing animation
      break;
    case TEXT_SAVED:
      browser.windows.getCurrent({ populate: true }).then((windowInfo) => {
        if (eventData.from !== windowInfo.id) {
          store.dispatch(
            saved(
              eventData.note.id,
              eventData.note.content,
              eventData.note.lastModified,
            ),
          );
        }
      });
      break;
    case TEXT_SYNCING:
      store.dispatch(syncing(eventData.id));
      break;
    case TEXT_SYNCED:
      browser.windows.getCurrent({ populate: true }).then((windowInfo) => {
        if (eventData.from !== windowInfo.id && !eventData.conflict) {
          if (eventData.note) {
            store.dispatch(
              updatedNote(
                eventData.note.id,
                eventData.note.content,
                eventData.note.lastModified,
              ),
            );
            store.dispatch(
              synced(null, eventData.note.id, eventData.note.lastModified),
            );
          }
        }
      });
      store.dispatch(
        synced(
          null,
          eventData.note && eventData.note.id,
          eventData.note && eventData.note.lastModified,
        ),
      );
      break;
    case ERROR:
      // A refused save still has to reach the other windows: their copy of
      // the note is stale from here on, and whichever sidebar writes the
      // shared storage.local cache last would otherwise erase the edit.
      browser.windows.getCurrent({ populate: true }).then((windowInfo) => {
        if (eventData.note && eventData.from !== windowInfo.id) {
          store.dispatch(
            updatedNote(
              eventData.note.id,
              eventData.note.content,
              eventData.note.lastModified,
            ),
          );
        }
        store.dispatch(error(eventData.message, eventData.id));
      });
      break;
    case SYNC_SETTING_CHANGED:
      store.dispatch(syncSettingChanged(eventData.syncEnabled));
      break;
  }
});
