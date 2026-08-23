import React from 'react';

import SyncIcon from './icons/SyncIcon';
import CheckIcon from './icons/CheckIcon';
import WarningIcon from './icons/WarningIcon';

import {
  SYNCING,
  SYNCED,
  SYNC_ERROR,
  describeNoteSync,
} from '../utils/noteSyncState';

function StateIcon({ state }) {
  switch (state) {
    case SYNCING:
      return <SyncIcon />;
    case SYNCED:
      return <CheckIcon />;
    case SYNC_ERROR:
      return <WarningIcon />;
    default:
      return null;
  }
}

/**
 * Icon-only indicator for a row of the note list.
 *
 * @param {{status: ?import('../utils/noteSyncState').NoteSyncStatus,
 *          syncEnabled: boolean}} props
 */
export function NoteSyncBadge({ status, syncEnabled }) {
  const described = describeNoteSync(status, syncEnabled);
  if (!described) return null;

  return (
    <span
      className={`noteSyncStatus noteSyncBadge is-${described.state}`}
      role="img"
      aria-label={described.label}
      title={described.title}
    >
      <StateIcon state={described.state} />
    </span>
  );
}

/**
 * Icon and label for the note being edited. With a status still to come the
 * element is rendered empty, so the live region exists before the first save
 * and the editor does not shift down when the indicator appears.
 *
 * @param {{status: ?import('../utils/noteSyncState').NoteSyncStatus,
 *          syncEnabled: boolean}} props
 */
export function NoteSyncBar({ status, syncEnabled }) {
  const described = describeNoteSync(status, syncEnabled);

  // That placeholder is holding room for a status about to arrive. With
  // syncing off only a failure ever arrives, so there is nothing to hold room
  // for and an empty bar is just a blank line ruled across the editor.
  if (!syncEnabled && !described) return null;

  return (
    <div
      className={
        described
          ? `noteSyncStatus noteSyncBar is-${described.state}`
          : 'noteSyncStatus noteSyncBar'
      }
      title={described ? described.title : ''}
      aria-live="polite"
    >
      {described ? (
        <>
          <StateIcon state={described.state} />
          <span>{described.label}</span>
        </>
      ) : null}
    </div>
  );
}
