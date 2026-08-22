import { ClassicEditor } from 'ckeditor5';
import 'ckeditor5/ckeditor5.css';

import INITIAL_CONFIG from '../data/editorConfig';

// Everything CKEditor is reached only through this module, which is pulled in
// by the dynamic import in loadEditor.js. The imports here are static and
// named so that webpack can still tree-shake the ckeditor5 barrel: importing
// the package namespace via import('ckeditor5') instead defeats tree-shaking
// and drags in every plugin (tables, images, mentions, ...).
export default function createEditor(node) {
  return ClassicEditor.create(node, INITIAL_CONFIG);
}
