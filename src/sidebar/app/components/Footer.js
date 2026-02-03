import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import SyncIcon from './icons/SyncIcon';
import MoreIcon from './icons/MoreIcon';
import WarningIcon from './icons/WarningIcon';

import { formatFooterTime } from '../utils/utils';

import { exportHTML } from '../actions';

class Footer extends React.Component {
  constructor(props) {
    super(props);
    this.props = props;

    this.STATES = {
      ERROR: {
        yellowBackground: true,
        isClickable: false,
      },
      SYNCING: {
        animateSyncIcon: true,
        text: () => browser.i18n.getMessage('syncProgress'),
      },
      SYNCED: {
        isClickable: true,
        text: () =>
          browser.i18n.getMessage(
            'syncComplete3',
            formatFooterTime(this.props.state.sync.lastSynced),
          ),
      },
      READY: {
        isClickable: true,
        text: () => browser.i18n.getMessage('syncReady') || 'Ready to sync',
      },
    };

    this.getFooterState = (state) => {
      if (state.sync.error) {
        const errorState = this.STATES.ERROR;
        errorState.text = () => state.sync.error;
        return errorState;
      } else if (state.sync.isSyncing) {
        return this.STATES.SYNCING;
      } else if (state.sync.lastSynced) {
        return this.STATES.SYNCED;
      } else {
        return this.STATES.READY;
      }
    };

    this.currentState = this.getFooterState(props.state);

    // Event used on window.addEventListener
    this.onCloseListener = () => {
      if (this.menu) {
        this.menu.classList.replace('open', 'close');
      }
      window.removeEventListener('keydown', this.handleKeyPress);
      this.contextMenuBtn.blur();
    };

    // Open and close menu
    this.toggleMenu = () => {
      if (this.menu.classList.contains('close')) {
        this.menu.classList.replace('close', 'open');
        setTimeout(() => {
          window.addEventListener('click', this.onCloseListener, {
            once: true,
          });
          window.addEventListener('keydown', this.handleKeyPress);
        }, 10);
        this.indexFocusedButton = null;
      } else {
        this.onCloseListener();
        window.removeEventListener('click', this.onCloseListener);
      }
    };

    // Handles "Export All Notes" functionality
    this.exportAll = () => {
      let output = '';
      for (const note of this.props.state.notes) {
        output += note.content;
        output += '<br/><hr/><br/>';
      }
      exportHTML(output);
    };

    // Handle keyboard navigation on menu
    this.handleKeyPress = (event) => {
      switch (event.key) {
        case 'ArrowUp':
          if (this.indexFocusedButton === null) {
            this.indexFocusedButton = this.buttons.length - 1;
          } else {
            this.indexFocusedButton =
              (this.indexFocusedButton - 1) % this.buttons.length;
            if (this.indexFocusedButton < 0) {
              this.indexFocusedButton = this.buttons.length - 1;
            }
          }
          this.buttons[this.indexFocusedButton].focus();
          break;
        case 'ArrowDown':
          if (this.indexFocusedButton === null) {
            this.indexFocusedButton = 0;
          } else {
            this.indexFocusedButton =
              (this.indexFocusedButton + 1) % this.buttons.length;
          }
          this.buttons[this.indexFocusedButton].focus();
          break;
        case 'Escape':
          if (this.menu.classList.contains('open')) {
            this.toggleMenu(event);
          }
          break;
      }
    };

    this.triggerSync = () => {
      if (!this.currentState.isClickable) return;
      browser.runtime.sendMessage({
        action: 'kinto-sync',
      });
    };
  }

  componentWillReceiveProps(nextProps) {
    this.currentState = this.getFooterState(nextProps.state);
  }

  render() {
    if (!this.props.state.kinto.isLoaded) return '';

    const footerClass = classNames({
      warning: this.currentState.yellowBackground,
      animateSyncIcon: this.currentState.animateSyncIcon,
    });

    this.buttons = [];

    return (
      <footer
        id="footer-buttons"
        ref={(footerbuttons) => (this.footerbuttons = footerbuttons)}
        className={footerClass}
      >
        <div id="footerButtons">
          {this.currentState.yellowBackground ? (
            <button
              className="fullWidth"
              title={this.currentState.text ? this.currentState.text() : ''}
              onClick={(e) => this.triggerSync(e)}
            >
              <WarningIcon />
              <span>{this.currentState.text()}</span>
            </button>
          ) : (
            <div
              className={
                this.currentState.isClickable
                  ? 'isClickable btnWrapper'
                  : 'btnWrapper'
              }
            >
              <button
                id="trigger-sync"
                disabled={!this.currentState.isClickable}
                onClick={(e) => this.triggerSync(e)}
                title={browser.i18n.getMessage('syncNotes') || 'Sync notes'}
                className="iconBtn"
              >
                <SyncIcon />
              </button>
              <p>{this.currentState.text()}</p>
            </div>
          )}

          <div
            className="photon-menu close top left"
            ref={(menu) => (this.menu = menu)}
          >
            <button
              ref={(contextMenuBtn) => (this.contextMenuBtn = contextMenuBtn)}
              className="iconBtn"
              onClick={(e) => this.toggleMenu(e)}
            >
              <MoreIcon />
            </button>
            <div className="wrapper">
              <ul role="menu">
                <li>
                  <button
                    role="menuitem"
                    onKeyDown={this.exportAll}
                    ref={(btn) => (btn ? this.buttons.push(btn) : null)}
                    title="Export All Notes"
                    onClick={this.exportAll}
                  >
                    Export All Notes
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    );
  }
}

function mapStateToProps(state) {
  return {
    state,
  };
}

Footer.propTypes = {
  state: PropTypes.object.isRequired,
  dispatch: PropTypes.func.isRequired,
};

export default connect(mapStateToProps)(Footer);
