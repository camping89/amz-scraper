const Apify = require("apify");

async function deleteCookies(params) {
    const { domain } = params;
    const browser = await Apify.launchPuppeteer({
        headless: true,
        slowMo: 200,
    });
    const page = await browser.newPage();
    const navigationPromise = page.waitForNavigation();
    await page.goto(domain);
    const cookies = await page.cookies();
    console.log(cookies);
    for (const cookie of cookies) {
        if (cookie.name === "sp-cdn") {
            await page.deleteCookie(cookie);
        }
    }

    await navigationPromise;

    return cookies ? cookies : await page.cookies();
}

module.exports = deleteCookies;
