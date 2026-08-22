// CKEditor is the bulk of the sidebar bundle, and the note list does not need
// it. Keeping it in its own chunk means opening the sidebar to the list no
// longer parses and executes the whole editor.
export default async function loadEditor(node) {
  const { default: createEditor } = await import(
    /* webpackChunkName: "ckeditor" */ './editorBundle'
  );

  return createEditor(node);
}
