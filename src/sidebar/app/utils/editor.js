// const UI_LANG = browser.i18n.getUILanguage();
// const RTL_LANGS = ['ar', 'fa', 'he'];
// const LANG_DIR = RTL_LANGS.includes(UI_LANG) ? 'rtl' : 'ltr';
// const TEXT_ALIGN_DIR = LANG_DIR === 'rtl' ? 'right' : 'left';

function customizeEditor(editor) {
  const mainEditor = document.querySelector('.ck-editor__main');

  // Disable right clicks
  // Refs: https://stackoverflow.com/a/737043/186202
  document
    .querySelectorAll('.ck-toolbar, #footer-buttons, header')
    .forEach((sel) => {
      sel.addEventListener('contextmenu', (e) => {
        e.preventDefault();
      });
    });

  // Fixes an issue with CKEditor and keeping multiple Firefox windows in sync
  // Ref: https://github.com/mozilla/notes/issues/424
  document
    .querySelectorAll('.ck-heading-dropdown .ck-list__item')
    .forEach((btn) => {
      btn.addEventListener('click', () => {
        editor.fire('changesDone');
      });
    });

  document.addEventListener('dragover', () => {
    mainEditor.classList.add('drag-n-drop-focus');
  });

  document.addEventListener('dragleave', () => {
    mainEditor.classList.remove('drag-n-drop-focus');
  });

  document.addEventListener('drop', () => {
    editor.fire('changesDone');
    mainEditor.classList.remove('drag-n-drop-focus');
  });

  // prevent adding a '„' character and instead close the editor
  // when using the Notes keyboard shortcut within the editor
  // Refs: https://github.com/mozilla/notes/issues/780
  editor.keystrokes.set('Alt+Shift+W', (data, cancel) => {
    cancel();
    browser.sidebarAction.close();
  });

  // "Ctrl/Cmd + s" keystroke is ignored when a note is focused - this prevents
  // the native "Save as" popup from appearing for the adjacent webpage.
  // Refs: https://github.com/mozilla/notes/issues/955
  editor.keystrokes.set('Ctrl+S', (data, cancel) => {
    cancel();
  });

  try {
    localizeEditorButtons(editor);
  } catch (error) {
    // A missing label is cosmetic; it must not abort customizeEditor and
    // leave the Alt+Shift+W / Ctrl+S handlers above unregistered.
    console.error('Could not localize the toolbar:', error); // eslint-disable-line no-console
  }
}

// Toolbar labels, keyed by the toolbar item names in editorConfig.js. Walking
// the editor's own item collection replaces the old nth-child lookups, which
// silently broke whenever CKEditor changed its toolbar markup.
const TOOLBAR_LABELS = {
  heading: () => browser.i18n.getMessage('fontSizeTitle'),
  bold: (key) => `${browser.i18n.getMessage('boldTitle')} (${key}+B)`,
  italic: (key) => `${browser.i18n.getMessage('italicTitle')} (${key}+I)`,
  strikethrough: () => browser.i18n.getMessage('strikethroughTitle'),
  bulletedList: () => browser.i18n.getMessage('bulletedListTitle'),
  numberedList: () => browser.i18n.getMessage('numberedListTitle'),
};

function localizeEditorButtons(editor) {
  // Clear CKEditor tooltips. Fixes: https://github.com/mozilla/notes/issues/410
  document.querySelectorAll('.ck-toolbar .ck-tooltip__text').forEach((sel) => {
    sel.remove();
  });

  const userOSKey = navigator.platform.startsWith('Mac') ? '\u2318' : 'Ctrl';
  const items = editor.ui.view.toolbar?.items;
  const configured = editor.config.get('toolbar');
  const names = Array.isArray(configured) ? configured : configured?.items;

  if (!items || !names) {
    return;
  }

  // Toolbar items are created in the order given by config.toolbar.
  names.forEach((name, index) => {
    const label = TOOLBAR_LABELS[name];
    const item = items.get(index);
    // A dropdown (heading) keeps its button on `buttonView`.
    const element = item?.buttonView?.element ?? item?.element;

    if (label && element) {
      element.title = label(userOSKey);
    }
  });
}

export { customizeEditor };
