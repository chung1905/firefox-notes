/* global storageSync */
/**
 * Background script for Sidebar Notes
 *
 * Handles:
 * - Note storage, synced through browser.storage.sync unless the settings
 *   page has switched syncing off
 * - Context menu for "Send to Notes"
 * - Sidebar open/close
 */

let isEditorReady = false;
let editorConnectedDeferred;
let isEditorConnected = new Promise((resolve) => {
  editorConnectedDeferred = { resolve };
});

/**
 * Load notes and send to sidebar
 */
async function loadAndSendNotes() {
  try {
    const notes = await storageSync.loadNotes();
    browser.runtime.sendMessage({
      action: 'notes-loaded',
      notes,
    });
  } catch (e) {
    console.error('Failed to load notes:', e); // eslint-disable-line no-console
    browser.runtime.sendMessage({
      action: 'notes-loaded',
      notes: [],
    });
  }
}

/**
 * Handle messages from sidebar
 */
browser.runtime.onMessage.addListener(function (eventData) {
  switch (eventData.action) {
    case 'load-notes':
      loadAndSendNotes();
      break;

    case 'editor-ready':
      isEditorReady = true;
      break;

    case 'create-note':
      storageSync
        .saveNote({
          id: eventData.id,
          content: eventData.content,
          lastModified: eventData.lastModified || Date.now(),
        })
        .then(() => {
          browser.runtime.sendMessage({
            action: 'create-note',
            id: eventData.id,
          });
        })
        .catch((error) => {
          handleSaveError(error, {
            id: eventData.id,
            content: eventData.content,
            lastModified: eventData.lastModified,
          });
        });
      break;

    case 'update-note':
      browser.runtime.sendMessage({
        action: 'text-syncing',
        id: eventData.note.id,
      });

      storageSync
        .saveNote(eventData.note)
        .then(() => {
          browser.runtime.sendMessage({
            action: 'text-saved',
            note: eventData.note,
            from: eventData.from,
          });
          browser.runtime.sendMessage({
            action: 'text-synced',
            note: eventData.note,
            conflict: false,
            from: eventData.from,
          });
        })
        .catch((error) => {
          handleSaveError(error, eventData.note, eventData.from);
        });
      break;

    case 'delete-note':
      storageSync.deleteNote(eventData.id).then(() => {
        browser.runtime.sendMessage({
          action: 'delete-note',
          id: eventData.id,
        });
      });
      break;

    case 'theme-changed':
      browser.runtime.sendMessage({
        action: 'theme-changed',
      });
      break;

    case 'set-sync-enabled':
      applySyncSetting(eventData.enabled);
      break;
  }
});

/**
 * Handle save errors
 *
 * The note travels with the failure, not just its id. Sidebars key their
 * per-note indicator on the id, and every window has to end up holding the
 * edit storage.sync refused: they all write the same storage.local cache, so
 * a window still showing the last saved copy would write that stale copy over
 * the edit and lose it. Only success used to be broadcast, which is exactly
 * the case where nothing is at risk.
 */
function handleSaveError(error, note, from) {
  let message;

  if (error.name === 'NoteTooLargeError') {
    message =
      browser.i18n.getMessage('noteTooLarge') ||
      'Note is too large to sync. Please reduce the content size.';
  } else if (error.name === 'StorageLimitError') {
    message =
      browser.i18n.getMessage('insufficientStorage') ||
      'Storage limit reached. Please delete some notes.';
  } else {
    console.error('Save error:', error); // eslint-disable-line no-console
    message = error.message;
  }

  browser.runtime.sendMessage({
    action: 'error',
    id: note && note.id,
    note,
    from,
    message,
  });
}

/**
 * Turn syncing on or off on behalf of the settings page.
 *
 * The sidebars are told, so they stop calling a local save a sync, and the
 * list is reloaded because switching sync on can pull in notes another device
 * left in storage.sync. Notes that would not fit there are reported one by
 * one, the way a refused save is: each keeps its own flag, and none of them
 * is lost -- storage.local still holds them and loadNotes still lists them.
 */
function applySyncSetting(enabled) {
  storageSync
    .setSyncEnabled(enabled)
    .then((failures) => {
      browser.runtime.sendMessage({
        action: 'sync-setting-changed',
        syncEnabled: enabled,
      });
      failures.forEach(({ note, error }) => handleSaveError(error, note));
      loadAndSendNotes();
    })
    .catch((error) => handleSaveError(error, null));
}

/**
 * Listen for sync changes from other devices
 */
storageSync.onSyncChanged(() => {
  // Reload all notes when sync brings changes from other devices
  loadAndSendNotes();
});

/**
 * Handle sidebar connection
 */
function connected(p) {
  editorConnectedDeferred.resolve();

  p.onDisconnect.addListener(() => {
    isEditorConnected = new Promise((resolve) => {
      editorConnectedDeferred = { resolve };
    });
    isEditorReady = false;
  });
}

browser.runtime.onConnect.addListener(connected);

/**
 * Initialize theme
 */
const defaultTheme = {
  theme: 'default',
};

browser.storage.local.get().then((storedSettings) => {
  if (!storedSettings.theme) {
    browser.storage.local.set(defaultTheme);
  }
});

/**
 * Handle toolbar button click
 */
browser.browserAction.onClicked.addListener(() => {
  if (!isEditorReady) {
    browser.sidebarAction.open();
  }
});

/**
 * Context menu for 'Send to Notes'
 */
browser.contextMenus.create({
  id: 'send-to-notes',
  title: browser.i18n.getMessage('sendToNotes'),
  contexts: ['selection'],
  documentUrlPatterns: ['<all_urls>'],
});

browser.contextMenus.onClicked.addListener((info, tab) => {
  if (!isEditorReady) {
    browser.sidebarAction.open();
  }
  sendSelectionText(info.selectionText, tab.windowId);
});

/**
 * Send selected text to Notes
 */
async function sendSelectionText(selectionText, windowId) {
  await isEditorConnected;
  chrome.runtime.sendMessage({
    action: 'send-to-notes',
    windowId,
    text: selectionText,
  });
}
