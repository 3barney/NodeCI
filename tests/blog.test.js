const Page = require('./helpers/page') // page wraps browser

let page;

beforeEach(async () => {
  page = await Page.build();
  await page.goto('http://localhost:3000');
})

afterEach(async () => {
  await page.close()
})

describe('When logged in', async () => {

  beforeEach(async () => {
    await page.login();
    await page.click('a.btn-floating'); // navigates to /new url for form creation
  });

  test('Can see blog create form', async () => {
    const label = await page.getContentsOf('form label')
    expect(label).toEqual('Blog Title')
  });

  describe('And using valid inputs', async () => {
    beforeEach(async() => {
      await page.type('.title input', 'My Title'); // Accept input
      await page.type('.content input', 'My Content');

      await page.click('form button'); // Submit form
    })

    test('submitting takes user to review screen', async () => {
      const text = await page.getContentsOf('h5');
      expect(text).toEqual('Please confirm your entries')
    });

    test('Submitting then saving adds blog to index page', async () => {
      await page.click('button.green')

      // Since we created a new user, we will only have one post created above
      // We have to wait for click to happen, go to server (save) and load page
      await page.waitFor('.card');

      const title = await page.getContentsOf('.card-title')
      const content = await page.getContentsOf('p');

      expect(title).toEqual('My Title');
      expect(content).toEqual('My Content');
    });
  });

  describe('And using invalid inputs', async() => {
    // Submitting form with no text in inputs
    beforeEach(async() => {
      await page.click('form button')
    })

    test('the form shows an error message', async() => {
      const titleError = await page.getContentsOf('.title .red-text');
      const contentError = await page.getContentsOf('.content .red-text');

      expect(titleError).toEqual('You must provide a value');
      expect(contentError).toEqual('You must provide a value');
    });
  });
})

describe('When User is not logged in', async () => {

  const actions = [
    {
      method: 'get',
      path: '/api/blogs'
    },
    {
      method: 'post',
      path: '/api/blogs',
      data: {
        title: 'My title',
        content: 'My Content'
      }
    }
  ];

  // This test replaces the two below, as both return errors
  test('Blog related actions are prohibited', async () => {
    const results = await page.execRequests(actions);
    for (let result of results) {
      expect(result).toEqual({ error: 'You must log in!' })
    }
  });



  test('User cannot create blog post', async () => {
    
    // puppetier strings page.evaluate() sends it to chromium which executes n returns result
    /** const result = await page.evaluate(() => {
      return fetch('/api/blogs', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'appication/json'
        },
        body: JSON.stringify({ title: 'My Title', content: 'My Content' })
      }).then(res => res.json());
    }); **/
    const result = await page.post('/api/blogs', { title: 'My Title', content: 'My Content' })

    expect(result).toEqual({ error: 'You must log in!' })
  });

  test('User cannot get a list of posts', async() => {
    /*
    const result = await page.evaluate(() => {
      return fetch('/api/blogs', {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'appication/json'
        },
      }).then(res => res.json()); 
    });*/ 
    const result = await page.get('/api/blogs');

    expect(result).toEqual({ error: 'You must log in!' })
  });
}); 