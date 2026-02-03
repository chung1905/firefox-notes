/* global storageSync */
/**
 * Background script for Firefox Notes
 *
 * Handles:
 * - Note sync via browser.storage.sync
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
      action: 'kinto-loaded', // Keep action name for compatibility
      notes,
    });
  } catch (e) {
    console.error('Failed to load notes:', e); // eslint-disable-line no-console
    browser.runtime.sendMessage({
      action: 'kinto-loaded',
      notes: [],
    });
  }
}

/**
 * Handle messages from sidebar
 */
browser.runtime.onMessage.addListener(function (eventData) {
  switch (eventData.action) {
    case 'authenticate':
      // With storage.sync, we don't need authentication
      // Just load notes directly
      browser.runtime.sendMessage({
        action: 'sync-authenticated',
        profile: { email: '' }, // No email needed
      });
      loadAndSendNotes();
      break;

    case 'disconnected':
      // With storage.sync, disconnect just clears local state
      // Notes remain in storage.sync
      browser.runtime.sendMessage({
        action: 'disconnected',
      });
      break;

    case 'kinto-load':
    case 'kinto-sync':
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
          handleSaveError(error);
        });
      break;

    case 'update-note':
      browser.runtime.sendMessage({
        action: 'text-syncing',
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
          handleSaveError(error);
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

    case 'fetch-email':
      // No email to fetch with storage.sync
      browser.runtime.sendMessage({
        action: 'sync-authenticated',
        profile: { email: '' },
      });
      break;

    case 'get-storage-usage':
      storageSync.getUsage().then((usage) => {
        browser.runtime.sendMessage({
          action: 'storage-usage',
          usage,
        });
      });
      break;
  }
});

/**
 * Handle save errors
 */
function handleSaveError(error) {
  if (error.name === 'NoteTooLargeError') {
    browser.runtime.sendMessage({
      action: 'error',
      message:
        browser.i18n.getMessage('noteTooLarge') ||
        'Note is too large to sync. Please reduce the content size.',
    });
  } else if (error.name === 'StorageLimitError') {
    browser.runtime.sendMessage({
      action: 'error',
      message:
        browser.i18n.getMessage('insufficientStorage') ||
        'Storage limit reached. Please delete some notes.',
    });
  } else {
    console.error('Save error:', error); // eslint-disable-line no-console
    browser.runtime.sendMessage({
      action: 'error',
      message: error.message,
    });
  }
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
