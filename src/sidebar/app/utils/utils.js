/**
 * Formats time for the Notes footer
 * @param time
 * @returns {string}
 */
function formatFooterTime(date) {
  date = date || Date.now();
  return new Date(date).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatLastModified(date) {
  if (new Date().getDate() === date.getDate()) {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return date.toLocaleDateString([], {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 *
 * @param {HTMLElement Object} parentElement
 * @returns {HTMLElement Object}
 */
function getFirstNonEmptyElement(parentElement) {
  // create an Array from parentElement's `children` (limited to 20 child elements)
  const parentElementChildrenArray = Array.prototype.filter.call(
    parentElement.children,
    (el, index) => {
      return el && index < 20;
    },
  );

  // search for first child element that is not empty and return it
  return parentElementChildrenArray.find((el) => el.textContent.trim() !== '');
}

/**
 * Parses a note's HTML once and returns both list-view summary lines.
 *
 * These used to be two exported functions, and stripHtmlWithoutFirstLine
 * called getFirstLineFromContent internally, so rendering a note cost three
 * innerHTML parses of its full content -- on every keystroke pause, inside a
 * reducer.
 *
 * @param {string} content
 * @returns {{firstLine: ?string, secondLine: ?string}}
 */
function getNoteSummary(content) {
  // assign contents to container element for later parsing
  const parentElement = document.createElement('div');
  parentElement.innerHTML = content.replace(/<\/p>|<\/li>/gi, '&nbsp;');

  const element = getFirstNonEmptyElement(parentElement);
  const firstLine = element
    ? element.textContent.trim().substring(0, 250) || null
    : null;

  let secondLine = null;
  const text = parentElement.textContent;

  if (text && firstLine && text.trim().startsWith(firstLine.trim())) {
    const rest = text.trim().substr(firstLine.trim().length);
    secondLine = rest ? rest.trim().substring(0, 250) : rest;
  }

  return { firstLine, secondLine };
}

/**
 * Formats the filename for the 'Export as HTML...' menu option.
 * Whitespace and illegal filename characters are removed, and
 * the length is shortened if longer than 200 characters.
 * @param {string} filename
 * @returns {string}
 */
function formatFilename(filename) {
  let formattedFilename = filename;
  // remove surrounding whitespace
  formattedFilename = formattedFilename.trim();
  // remove illegal filename characters
  formattedFilename = formattedFilename.replace(
    /[~#%{}[\]:\\<>/!@&?'*.+|\n\r\t]/g,
    '',
  );
  if (formattedFilename.length > 200) {
    // 200 bytes (close to filesystem max) - 5 for '.html' extension
    formattedFilename = formattedFilename.substring(0, 200);
  }
  return `${formattedFilename}.html`;
}

export {
  formatFooterTime,
  getFirstNonEmptyElement,
  formatFilename,
  getNoteSummary,
  formatLastModified,
};
