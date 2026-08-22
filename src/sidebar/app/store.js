import { createStore, applyMiddleware } from 'redux';
import thunkMiddleware from 'redux-thunk';
import notesApp from './reducers';

// Persisting on every action meant a JSON.stringify of every note's full HTML
// on each keystroke pause. The cache only exists to make the sidebar open
// fast, so coalescing writes costs nothing and takes the serialisation off
// the typing path.
const PERSIST_DELAY = 500;

const storeState = (store) => {
  let pending = null;

  const flush = () => {
    pending = null;
    browser.storage.local.set({
      redux: JSON.stringify(store.getState()),
    });
  };

  // The sidebar can be torn down between a keystroke and the next flush.
  window.addEventListener('pagehide', () => {
    if (pending) {
      clearTimeout(pending);
      flush();
    }
  });

  return (next) => (action) => {
    const result = next(action);

    if (!pending) {
      pending = setTimeout(flush, PERSIST_DELAY);
    }

    return result;
  };
};

const store = createStore(
  notesApp,
  applyMiddleware(storeState, thunkMiddleware),
);

export default store;
