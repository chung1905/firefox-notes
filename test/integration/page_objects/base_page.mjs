import { By, until, Key } from 'selenium-webdriver';

// Page-object tracing, off unless UI_TEST_LOGGING names a level that includes
// info. The ordering mirrors winston's npm levels, which this replaced.
const LEVELS = ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'];
const threshold = LEVELS.indexOf(process.env.UI_TEST_LOGGING || 'silent');

const logger = {
  info(message) {
    if (threshold >= LEVELS.indexOf('info')) {
      console.log(`info: ${message}`);
    }
  },
};

export default class BasePage {

  constructor(driver, timeout, root) {
    this.timeout = (timeout) ? timeout : 10000;
    this.driver = driver;
    this.by = By;
    this.key = Key;
    this.logger = logger;
    this.root = root;
    this.until = until;
    this.wait = driver.wait;
  }

  /**
  * @function waitForPageToLoad
  * @param  {string} locator CSS Selector of Element.
  * @returns {Object} An object representing the page.
  * @throws ElementNotFound
  */
  async waitForPageToLoad(locator) {
    let element = await this.findElement(locator);
    await this.driver.wait(this
      .until
      .elementIsVisable(element), this.timeout);
    return this;
  }

  /**
  * @function findElement
  * @param  {string} locator CSS Selector of Element.
  * @returns {Object} A WebElement object for element matching selector.
  * @throws ElementNotFound
  */
  async findElement(locator) {
    this.logger.info(`Looking for element ${locator}`);
    this.waitForElement(locator);
    this.logger.info(`Found element ${locator}, returning it.`);
    if (this.root) {
      let root = this.driver.findElement(this.by.css(this.root));
      let element = root.findElement(this.by.css(locator));
      return element;
    } else {
      let element = await this.driver.findElement(this.by.css(locator));
      return element;
    }
  }

  /**
  * @function findElements
  * @param  {string} locator CSS Selector of Element.
  * @returns {Object} A list of WebElements.
  * @throws ElementNotFound
  */
  async findElements(locator) {
    this.logger.info(`Looking for element ${locator}`);
    this.waitForElement(locator);
    this.logger.info(`Found element ${locator}, returning it.`);
    if (this.root) {
      let root = this.driver.findElement(this.by.css(this.root));
      let elements = root.findElements(this.by.css(locator));
      return elements;
    }
    return await this.driver.findElements(this.by.css(locator));
  }

  /**
  * @function waitForElement
  * @param  {string} locator CSS Selector of Element.
  * @throws ElementNotFound
  */
  async waitForElement(locator) {
    this.logger.info(`Waiting for locator ${locator} to appear`);
    await this.driver.wait(this
      .until
      .elementLocated(this
        .by
        .css(locator)), this.timeout
    );
    this.logger.info(`Locator ${locator} appeared, returning it.`);
  }
}
