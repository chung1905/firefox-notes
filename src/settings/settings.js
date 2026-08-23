// getting elements that have text displayed and setting localized text
const themeLegend = document.getElementById('themeTitle');
const defaultThemeLabel = document.getElementById('default_label');
const darkThemeLabel = document.getElementById('dark_label');

themeLegend.innerHTML = browser.i18n.getMessage('themeLegend');
defaultThemeLabel.innerHTML = browser.i18n.getMessage('defaultThemeTitle');
darkThemeLabel.innerHTML = browser.i18n.getMessage('darkThemeTitle');

const syncTitle = document.getElementById('syncTitle');
const syncCheckbox = document.getElementById('sync_enabled');
const syncEnabledLabel = document.getElementById('sync_enabled_label');
const syncHint = document.getElementById('syncHint');

syncTitle.textContent = browser.i18n.getMessage('syncNotes') || 'Sync';
// These two have no Pontoon string yet. Translations are managed there rather
// than by PR, so the copy ships in English until it lands upstream.
syncEnabledLabel.textContent = 'Sync notes across your devices';
syncHint.textContent =
  'Copies your notes to your other devices and keeps them in step. ' +
  'Left off, notes stay on this device.';

const themeRadioBtn = document.getElementsByName('theme');

function loadSavedData(data) {
  const theme = data.theme;

  if (theme === 'default') themeRadioBtn[0].checked = true;
  else if (theme === 'dark') themeRadioBtn[1].checked = true;

  // Absent means off, the same reading storage-sync.js takes.
  syncCheckbox.checked = data.syncEnabled === true;
}

document.addEventListener('DOMContentLoaded', function () {
  const savedData = browser.storage.local.get(['theme', 'syncEnabled']);
  savedData.then(loadSavedData);
});

function getTheme() {
  let theme = '';

  for (let i = 0; i < themeRadioBtn.length; i++) {
    if (themeRadioBtn[i].checked) theme = themeRadioBtn[i].value;
    else continue;
  }

  const selectedTheme = { theme };

  return selectedTheme;
}

for (let i = 0; i < themeRadioBtn.length; i++) {
  themeRadioBtn[i].onclick = function () {
    const theme = getTheme();

    browser.storage.local.set(theme);

    // notify background.js that theme settings have changed
    browser.runtime.sendMessage({
      action: 'theme-changed',
    });
  };
}

// background.js owns this write rather than the settings page: switching sync
// on also has to push the notes storage.sync doesn't have yet, and only the
// background script has storageSync.
syncCheckbox.onchange = function () {
  browser.runtime.sendMessage({
    action: 'set-sync-enabled',
    enabled: syncCheckbox.checked,
  });
};
