import {
  Bold,
  Essentials,
  Heading,
  Italic,
  List,
  Paragraph,
  Strikethrough,
} from 'ckeditor5';

// Only the features Notes actually exposes in its toolbar. The old prebuilt
// classic build also carried image upload, CKFinder, CloudServices,
// EasyImage, media embed, tables, links, block quote, indent and
// paste-from-office, none of which were reachable from the UI.
const config = {
  licenseKey: 'GPL',
  plugins: [Essentials, Paragraph, Heading, Bold, Italic, Strikethrough, List],
  heading: {
    options: [
      {
        model: 'heading1',
        view: 'h1',
        title: browser.i18n.getMessage('title1'),
        class: 'ck-heading_heading1',
      },
      {
        model: 'heading2',
        view: 'h2',
        title: browser.i18n.getMessage('title2'),
        class: 'ck-heading_heading2',
      },
      {
        model: 'heading3',
        view: 'h3',
        title: browser.i18n.getMessage('title3'),
        class: 'ck-heading_heading3',
      },
      {
        model: 'paragraph',
        title: browser.i18n.getMessage('paragraph'),
        class: 'ck-heading_paragraph',
      },
    ],
  },
  toolbar: [
    'heading',
    'bold',
    'italic',
    'strikethrough',
    'bulletedList',
    'numberedList',
  ],
};

export default config;
