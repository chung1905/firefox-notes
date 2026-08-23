import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

import store from './store';
import {
  notesLoadedFromCache,
  requestWelcomeNote,
  syncSettingChanged,
} from './actions';

import Router from './router';
import Footer from './components/Footer';

import './utils/theme.js'; // addListener theming
import '../static/scss/styles.scss';
// After styles.scss: @use may not appear mid-file, so the cascade order the
// dark theme depends on is expressed here instead.
import '../static/scss/dark.scss';

// AddListener on chrome.runtime.onMessage
import './onMessage.js';

// Create a connection with the background script to handle open and
// close events.
browser.runtime.connect();

const styles = {
  container: {
    flex: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
};

// We load store saved by store.js on all events
browser.storage.local.get().then((result) => {
  // If no redux, it means user never used the app before.
  // we display initial content to introduce Note
  if (!result.redux) {
    store.dispatch(requestWelcomeNote());
  }

  // Seeded before the first render: the setting is not part of the cached
  // store, and the footer would otherwise open claiming a sync that is off.
  store.dispatch(syncSettingChanged(result.syncEnabled === true));

  const state = JSON.parse(result.redux || '{}');

  if (state.notes) {
    store.dispatch(notesLoadedFromCache(state));
  }

  // Render root DOM element
  createRoot(document.getElementById('notes')).render(
    <Provider store={store}>
      <div style={styles.container}>
        <Router />
        <Footer />
      </div>
    </Provider>,
  );
});

// Request sync on load
chrome.runtime.sendMessage({
  action: 'load-notes',
});
