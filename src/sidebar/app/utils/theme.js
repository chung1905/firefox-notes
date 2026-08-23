// The dark theme ships in the main bundle and is scoped to this attribute,
// so switching is a style recalculation. It used to be a separate stylesheet
// appended as a <link> after DOMContentLoaded, which showed dark-theme users
// a flash of the light theme every time the sidebar opened.
//
// Bundling removed the stylesheet fetch, not the flash: storage.local is
// promise-based, so the attribute could only ever land after the first paint.
// The last applied theme is mirrored into localStorage, which is synchronous
// and so readable before that paint. storage.local stays the source of truth;
// the mirror is a guess it corrects a tick later. settings/settings.js writes
// it too -- the pages share an origin -- so changing the theme while no
// sidebar is open still leaves the right value behind.
const THEME_CACHE_KEY = 'theme';

function applyTheme(theme) {
  const value = theme === 'dark' ? 'dark' : 'default';
  document.documentElement.dataset.theme = value;
  localStorage.setItem(THEME_CACHE_KEY, value);
}

function applyThemeFromStorage() {
  return browser.storage.local
    .get(['theme'])
    .then((data) => applyTheme(data.theme));
}

applyTheme(localStorage.getItem(THEME_CACHE_KEY));
applyThemeFromStorage();

chrome.runtime.onMessage.addListener((eventData) => {
  if (eventData.action === 'theme-changed') {
    applyThemeFromStorage();
  }
});
