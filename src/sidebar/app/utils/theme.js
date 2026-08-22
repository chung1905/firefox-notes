// The dark theme ships in the main bundle and is scoped to this attribute,
// so switching is a style recalculation. It used to be a separate stylesheet
// appended as a <link> after DOMContentLoaded, which showed dark-theme users
// a flash of the light theme every time the sidebar opened.
function applyTheme(theme) {
  document.documentElement.dataset.theme =
    theme === 'dark' ? 'dark' : 'default';
}

function applyThemeFromStorage() {
  return browser.storage.local
    .get(['theme'])
    .then((data) => applyTheme(data.theme));
}

applyThemeFromStorage();

chrome.runtime.onMessage.addListener((eventData) => {
  if (eventData.action === 'theme-changed') {
    applyThemeFromStorage();
  }
});
