// const puppeteer = require('puppeteer');
const Page = require('./helpers/page') // page wraps browser

let page;

beforeEach( async () => {
  // Use puppetier to create a browser then a browser to launch pages
  // browser = await puppeteer.launch({ headless: false })
  // page = await browser.newPage()
  page = await Page.build();
  await page.goto('http://localhost:3000')
})

afterEach( async () => {
  await page.close();
})

test('The header has the correct text', async () => {
  // const text = await page.$eval('a.brand-logo', el => el.innerHTML)
  const text = await page.getContentsOf('a.brand-logo');
  expect(text).toEqual('Blogster')
})

test('clicking login starts oauth flow', async () => {
  await page.click('.right a')
  const url = await page.url()

  expect(url).toMatch(/accounts\.google\.com/);
})


test('when signed in, shows logout button', async () => {
  await page.login()

  //const text = await page.$eval('a[href="/auth/logout"]', el => el.innerHTML)
  const text = await page.getContentsOf('a[href="/auth/logout"]')
  expect(text).toEqual('Logout')
})