import React from 'react';

import ListPanel from './components/ListPanel';
import EditorPanel from './components/EditorPanel';

// The sidebar has three views, no URL bar and no back button, so
// react-router-dom (plus its history dependency) was 12 KB gzipped spent on
// a variable. Paths are kept as-is, and the `history` and `match` props keep
// their shapes, so the panels are unchanged.
const NOTE_WITH_ID = /^\/note\/(.+)$/;

function parsePath(path) {
  const withId = NOTE_WITH_ID.exec(path);

  if (withId) {
    return { view: 'note', id: withId[1] };
  }

  if (path === '/note') {
    return { view: 'note', id: null };
  }

  return { view: 'list', id: null };
}

const styles = {
  container: {
    flex: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
};

class Router extends React.Component {
  constructor(props) {
    super(props);

    this.state = parsePath('/');
    this.history = {
      push: (path) => this.setState(parsePath(path)),
    };
  }

  render() {
    const { view, id } = this.state;

    if (view === 'list') {
      return (
        <div style={styles.container}>
          <ListPanel history={this.history} />
        </div>
      );
    }

    return (
      <div style={styles.container}>
        <EditorPanel
          // Matches the old routing, where /note and /note/:id were separate
          // Routes and moving between them remounted the panel, while moving
          // between two ids did not.
          key={id ? 'note' : 'new-note'}
          history={this.history}
          match={{ params: { id } }}
        />
      </div>
    );
  }
}

export default Router;
