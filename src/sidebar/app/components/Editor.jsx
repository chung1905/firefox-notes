import React from 'react';
import { connect } from 'react-redux';

import loadEditor from '../utils/loadEditor';
import { FROM_BLANK_NOTE } from '../utils/constants';
import { customizeEditor } from '../utils/editor';
import { textToNoteHtml } from '../utils/utils';

import {
  updateNote,
  createNote,
  deleteNote,
  setFocusedNote,
  takeSelections,
} from '../actions';

const styles = {
  container: {
    flex: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
};

class Editor extends React.Component {
  constructor(props) {
    super(props);
    this.props = props;
    this.editor = null; // Editor object
    this.ignoreChange = false;
    this.delayUpdateNote = null;
    this.isUnmounted = false;
    this.pageListeners = new AbortController();

    this.saveContent = () => {
      const content = this.editor.getData();

      if (content !== '' && content !== '<p>&nbsp;</p>') {
        if (!this.props.note.id) {
          this.props
            .dispatch(createNote(content, this.props.origin))
            .then((id) => {
              this.props.dispatch(setFocusedNote(id));
            });
        } else {
          this.props.dispatch(updateNote(this.props.note.id, content));
        }
      } else if (this.props.note.id) {
        this.props.dispatch(deleteNote(this.props.note.id, FROM_BLANK_NOTE));
      }
    };

    // Text queued while CKEditor loads waits for it. The save is made here,
    // not left to the change handler: that one only saves a focused editor,
    // and after a context-menu click the focus is on the page.
    this.insertSelections = () => {
      if (!this.editor) return;

      const texts = this.props.dispatch(takeSelections());
      if (texts.length === 0) return;

      let content = this.editor.getData();
      if (content === '<p>&nbsp;</p>') content = '';
      this.editor.setData(content + texts.map(textToNoteHtml).join(''));

      clearTimeout(this.delayUpdateNote);
      this.delayUpdateNote = null;
      this.saveContent();
    };
  }

  componentDidMount() {
    loadEditor(this.node)
      .then((editor) => {
        if (!editor) {
          return;
        }
        if (this.isUnmounted) {
          editor.destroy();
          return;
        }
        this.editor = editor;

        customizeEditor(editor, this.pageListeners.signal);

        // Focus the text editor
        this.editor.editing.view.focus();

        editor.model.document.on('change', (eventInfo, name) => {
          // Cache update event in case of multi-change event (copy pasting trigger many).
          clearTimeout(this.delayUpdateNote);
          this.delayUpdateNote = setTimeout(() => {
            const isFocused = document
              .querySelector('.ck-editor__editable')
              .classList.contains('ck-focused');
            // Only use the focused editor or handle 'rename' events to set the data into storage.
            if (
              isFocused ||
              name === 'rename' ||
              name === 'insert' ||
              (name.type && name.type === 'transparent')
            ) {
              if (!this.ignoreChange) {
                this.saveContent();
              }
              this.ignoreChange = false;
            }
            this.delayUpdateNote = null;
          }, 50);
        });

        this.insertSelections();
      })
      .catch((error) => {
        console.error(error); // eslint-disable-line no-console
      });
  }

  // This is triggered when redux update state.
  componentDidUpdate(prevProps) {
    this.insertSelections();

    if (
      this.editor &&
      prevProps.note &&
      this.editor.getData() !== this.props.note.content
    ) {
      if (this.props.note.id !== prevProps.note.id) {
        this.ignoreChange = true;
      }
      if (!this.delayUpdateNote) {
        // If no delay waiting, we apply modification
        this.ignoreChange = true;
        this.editor.setData(this.props.note.content || '<p></p>');
        this.editor.editing.view.focus();
      }
    }
  }

  componentWillUnmount() {
    this.isUnmounted = true;
    this.pageListeners.abort();

    if (this.editor) {
      this.editor.destroy();
    }
  }

  render() {
    return (
      <div style={styles.container}>
        <div className="editorWrapper">
          <div
            id="editor"
            ref={(node) => {
              this.node = node;
            }}
            // Preact assigns __html to innerHTML as-is, so a new note's
            // undefined content would render as the text "undefined".
            dangerouslySetInnerHTML={{
              __html: this.props.note?.content ?? '',
            }}
          ></div>
        </div>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    state,
  };
}

export default connect(mapStateToProps)(Editor);
