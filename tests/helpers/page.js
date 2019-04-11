const puppeteer = require('puppeteer');

const sessionFactory = require('../factories/sessionFactory')
const userFactory = require('../factories/userFactory');

class CustomPage {
  // build gen a new puppeteer page, create new instance of custom page,
  // combine the two with proxy object and return that
  static async build() {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
    const page = await browser.newPage();
    const customPage = new CustomPage(page);

    // target == CustomPage
    return new Proxy(customPage, {
      get: function(target, property) {
        // Look if func is in 1. CustomPage then 2. page, then 3. browser
        return customPage[property] || browser[property] || page[property];
      }
    })
  }

  constructor(page) {
    this.page = page;
  }

  async login() {
    const user = await userFactory(); /* wait user to be saved in db n get promise back */
    const { session, sig } = sessionFactory(user)
    
    await this.page.setCookie({ name: 'session', value: session})
    await this.page.setCookie({ name: 'session.sig', value: sig })

    // Refresh page to simulate login
    await this.page.goto('http://localhost:3000/blogs');

    // Wait for anchor tag to be available
    await this.page.waitFor('a[href="/auth/logout"]');
  }

  async getContentsOf(selector) {
    return this.page.$eval(selector, el => el.innerHTML)
  }

  // Can be used to mask all our get requests
  get(path) {
    return this.page.evaluate((_path) => {
      return fetch(_path, {
        method: 'GET',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }
      }).then(res => res.json());
    }, path);
    // path is passed as a variable to evaluate, n we ref it as _path above
  }

  post(path, data) {
    return this.page.evaluate((_path, _data) => {
      return fetch(_path, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'appication/json' },
        body: JSON.stringify(_data)
      }).then(res => res.json());
    }, path, data)
  }

  execRequests(actions) {
    // Map over array of actions, each returns a promise so we wait for all
    // promises to resolve

    return Promise.all(
      // Destructure method, path, data, method name of func to call
      actions.map(({ method, path, data }) => {
        // this[method] =  (post or get above) it will execute either method get or post 
        return this[method](path, data); // pass args to our method
      })
    );
  }
}

module.exports = CustomPage