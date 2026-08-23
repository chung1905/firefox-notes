import { formatFooterTime } from './utils';

/**
 * Per-note sync state, as held in the `noteSync` slice of the store.
 *
 * The footer reports one global state for the whole sidebar; these are per
 * note, so a note that failed to reach storage.sync stays flagged while the
 * rest of the list keeps syncing normally.
 */
export const SYNCING = 'syncing';
export const SYNCED = 'synced';
export const SYNC_ERROR = 'error';

/**
 * @typedef {Object} NoteSyncStatus
 * @property {string} state One of SYNCING, SYNCED, SYNC_ERROR.
 * @property {?Date} syncedAt When the note last reached storage.sync.
 * @property {?string} message Failure detail, for SYNC_ERROR.
 */

/**
 * @param {string} state
 * @param {{syncedAt: ?Date, message: ?string}} [detail]
 * @returns {NoteSyncStatus}
 */
export function createStatus(state, { syncedAt = null, message = null } = {}) {
  return { state, syncedAt, message };
}

/**
 * The statuses worth carrying over from the storage.local.redux replay.
 *
 * A note that had not reached storage.sync when the sidebar closed is still
 * unsaved when it opens again, so its flag has to survive with it. Confirmed
 * ones are dropped: the sync load that follows a moment later is what proves
 * a note synced, not a cache of what the last session believed.
 *
 * @param {Object} cached
 * @returns {Object}
 */
export function restorePendingStatuses(cached = {}) {
  const restored = {};

  Object.entries(cached).forEach(([id, status]) => {
    if (!status || status.state === SYNCED) return;
    restored[id] = createStatus(status.state, { message: status.message });
  });

  return restored;
}

/**
 * Turns a stored status into what the indicator renders. Returns null when
 * the note has no status yet, e.g. a new note that has never been saved.
 *
 * @param {?NoteSyncStatus} status
 * @param {boolean} [syncEnabled] Whether saves are reaching storage.sync.
 * @returns {?{state: string, label: string, title: string}}
 */
export function describeNoteSync(status, syncEnabled = false) {
  if (!status) return null;

  // With syncing off there is no sync to report on: the note went to this
  // device and nowhere else, and a write that stays here is done before an
  // indicator could paint it. A failure still has something to say -- a local
  // save can be refused too -- so it is the one state that survives.
  if (!syncEnabled && status.state !== SYNC_ERROR) return null;

  switch (status.state) {
    case SYNCING: {
      const label = browser.i18n.getMessage('editorLabelSyncing') || 'Syncing…';
      return { state: SYNCING, label, title: label };
    }
    case SYNCED: {
      const time = formatFooterTime(status.syncedAt);
      const label =
        browser.i18n.getMessage('savedComplete2', time) || `Saved at ${time}`;
      return { state: SYNCED, label, title: label };
    }
    case SYNC_ERROR: {
      const label = syncEnabled
        ? browser.i18n.getMessage('syncError') || 'Sync error'
        : 'Save error';
      return { state: SYNC_ERROR, label, title: status.message || label };
    }
    default:
      return null;
  }
}
