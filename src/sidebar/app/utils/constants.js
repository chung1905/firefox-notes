// Url to open in firefox to give feedback
export const SURVEY_PATH = 'https://qsurvey.mozilla.com/s3/notes?ref=sidebar';

// Actions
// These are Redux action types *and* the browser.runtime message names
// background.js broadcasts: changing one changes both the wire protocol and
// the reducer that reads it.
export const NOTES_LOADED = 'notes-loaded';
export const TEXT_SAVED = 'text-saved';
export const TEXT_SYNCING = 'text-syncing';
export const TEXT_SYNCED = 'text-synced';
export const SEND_TO_NOTES = 'send-to-notes';
export const EXPORT_HTML = 'export-html';

// CRUD actions on note
export const CREATE_NOTE = 'create-note';
export const UPDATE_NOTE = 'update-note';
export const DELETE_NOTE = 'delete-note';

export const FOCUS_NOTE = 'focus-note';
export const ERROR = 'error';
export const REQUEST_WELCOME_PAGE = 'request-welcome-page';

export const FROM_IN_NOTE = 'in-note';
export const FROM_LIST_VIEW = 'list-view';
export const FROM_BLANK_NOTE = 'blank-note';
export const FROM_SEND_TO_NOTE = 'send-to-note';
