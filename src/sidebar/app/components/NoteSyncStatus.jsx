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
 * @param {{status: ?import('../utils/noteSyncState').NoteSyncStatus}} props
 */
export function NoteSyncBadge({ status }) {
  const described = describeNoteSync(status);
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
 * Icon and label for the note being edited. The element is rendered even
 * with no status so the live region exists before the first save, and so the
 * editor does not shift down when the indicator appears.
 *
 * @param {{status: ?import('../utils/noteSyncState').NoteSyncStatus}} props
 */
export function NoteSyncBar({ status }) {
  const described = describeNoteSync(status);

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
