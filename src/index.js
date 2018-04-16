const setup = require('./starter-kit/setup');
const lighthouse = require('lighthouse');
const url = require('url');

module.exports.handler = async (event, context, callback) => {
  // For keeping the browser launch
  context.callbackWaitsForEmptyEventLoop = false;
  const browser = await setup.getBrowser();

  let response = {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*', // Required for CORS support to work
    },
  };

  try {
    let pageurl = '';

    // Allow the URL to be specified either via query string or a direct
    // argument on the lambda invocation - that is, either:
    // https://XX.execute-api.YY.amazonaws.com/ZZ?url=https://ft.com/
    // or
    // aws lambda invoke --invocation-type RequestResponse \
    // --function-name puppeteer-lambda-starter-kit-dev-test-function \
    // --region eu-west-1 --log-type Tail \
    // --payload '{"url": "http://ft.com"}' out.txt

    if (event.queryStringParameters && event.queryStringParameters.url) {
      pageurl = event.queryStringParameters.url;
    }

    if (event.url) {
      pageurl = event.url;
    }

    const result = await exports.getFinishedPage(browser, pageurl);
    response.body = JSON.stringify(result);
    callback(null, response);
  } catch (err) {
    response.body = JSON.stringify(err);
    response.statusCode = 500;
    callback(err, response);
  }
};


exports.getFinishedPage = async (browser, pageurl) => {
  let response = {};

  if (!pageurl) {
    response.message = 'No URL supplied: you must specifiy the page to audit.';
    console.log(response.message);
    return response;
  }

  let wsep = browser.wsEndpoint();
  let wsepport = url.parse(wsep).port;

  const lhr = await lighthouse(pageurl, {
    port: wsepport,
    output: 'json',
    logLevel: 'none',
  });

  console.log(response.pageTitle);
  let s = lhr.reportCategories.map((c) => c.score).join(', ');
  console.log('LH scores: ' + s);
  response.lighthousescores = s;
  return response;
};

exports.getScreenshotFromURL = async (browser) => {
  let screenshotoutput = '';
  const page = await browser.newPage();

  // Load the target web page.
  await page.goto('https://wikipedia.org',
    {waitUntil: ['domcontentloaded', 'networkidle0']}
  );

  let screenshotoptions = {};
  let tmp = require('tmp');
  let tmpobj = tmp.fileSync(
    {keep: true,
    mode: 0o600,
    prefix: 'screenshot-',
    postfix: '.png'});
  screenshotoptions.path = tmpobj.name;

  await page.screenshot(screenshotoptions)
    .then((result) => {
      screenshotoutput = screenshotoptions.path;
    })
    .catch((err) => {
      screenshotoutput = 'Error: ' + err;
      console.error(err);
    });

  return screenshotoutput;
};
