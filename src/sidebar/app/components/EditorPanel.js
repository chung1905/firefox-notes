/* eslint-disable react/jsx-key */
import React from 'react';
import { connect } from 'react-redux';
import { FROM_LIST_VIEW, FROM_IN_NOTE } from '../utils/constants';

import Header from './Header';
import Editor from './Editor';

import { setFocusedNote } from '../actions';

class EditorPanel extends React.Component {
  constructor(props) {
    super(props);
    this.props = props;

    this.origin = FROM_LIST_VIEW; // used while sending 'new-note' metric

    this.note = {}; // Note should be reference to state.
    this.lastFocusedNoteId = props.state.sync.focusedNoteId;

    if (props.match.params.id) {
      this.note =
        props.state.notes.find((note) => {
          return note.id === props.match.params.id;
        }) || {};
    }

    this.onNewNoteEvent = () => {
      this.origin = FROM_IN_NOTE;
      this.props.dispatch(setFocusedNote());
      props.history.push('/note');
    };
  }

  componentDidMount() {
    if (this.props.match.params.id) {
      this.props.dispatch(setFocusedNote(this.props.match.params.id));
    }
  }

  // Derived during render rather than in componentWillReceiveProps, which
  // React 19 removed. While a save is in flight the previous note object is
  // deliberately kept, so the editor is not reset mid-sync.
  syncNoteFromState() {
    const { sync, notes } = this.props.state;
    const focusChanged = this.lastFocusedNoteId !== sync.focusedNoteId;

    if (focusChanged || !sync.isSyncing) {
      this.lastFocusedNoteId = sync.focusedNoteId;
      this.note = notes.find((note) => note.id === sync.focusedNoteId) || {};
    }
  }

  render() {
    this.syncNoteFromState();

    return [
      <Header
        key="header"
        history={this.props.history}
        note={this.note}
        onNewNoteEvent={this.onNewNoteEvent}
      />,
      <Editor
        key="editor"
        history={this.props.history}
        note={this.note}
        origin={this.origin}
      />,
    ];
  }
}

function mapStateToProps(state) {
  return {
    state,
  };
}

export default connect(mapStateToProps)(EditorPanel);
