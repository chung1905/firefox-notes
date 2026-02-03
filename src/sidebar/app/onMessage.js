import {
  SYNC_AUTHENTICATED,
  KINTO_LOADED,
  TEXT_SAVED,
  TEXT_SYNCING,
  TEXT_SYNCED,
  CREATE_NOTE,
  DELETE_NOTE,
  DISCONNECTED,
  ERROR,
} from './utils/constants';
// Actions
import {
  authenticate,
  disconnect,
  createdNote,
  deletedNote,
  saved,
  syncing,
  synced,
  kintoLoad,
  updatedNote,
  error,
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
    case SYNC_AUTHENTICATED:
      store.dispatch(authenticate());
      break;
    case KINTO_LOADED:
      if (!eventData.notes) {
        store.dispatch(kintoLoad());
      } else {
        store.dispatch(kintoLoad(eventData.notes));
      }
      break;
    case CREATE_NOTE:
      store.dispatch(
        createdNote(eventData.id, eventData.content, eventData.lastModified),
      );
      setTimeout(() => {
        store.dispatch(synced()); // stop syncing animation
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
      store.dispatch(syncing());
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
            store.dispatch(synced());
          }
        }
      });
      store.dispatch(synced());
      break;
    case ERROR:
      store.dispatch(error(eventData.message));
      break;
    case DISCONNECTED:
      store.dispatch(disconnect());
      break;
  }
});
