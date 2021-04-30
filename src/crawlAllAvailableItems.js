//const puppeteer = require('puppeteer')
const Apify = require("apify");
const parsePrice = require("parse-price");
const availableProxies = [
    //"RESIDENTIAL",
    "BUYPROXIES63748",
    "BUYPROXIES63811",
    "BUYPROXIES94952",
    "SHADER",
    "qfCaFFuCodXxAS59E",
];

async function crawlAllAvailableItems(url) {
   // try {
        const cookies = [];
    let exprire = new Date();
    const t = exprire.setHours(exprire.getHours() + 5);
    cookies.push({ name: "session-id", value: "143-9484404-0612558", expires: t });
    cookies.push({ name: "session-id-time", value: "2082787201l", expires: t });
    cookies.push({ name: "ubid-main", value: "132-4806434-9795917", expires: t, session: false, domain: ".amazon.com", });

    //console.log(url);
   const proxyUrl = getProxyUrl();
  // const browser = await puppeteer.launch({
   const browser = await Apify.launchPuppeteer( {headless: true,

        // args: [
        //     proxyUrl
        // ],
        slowMo: 250
    });
    const page = await browser.newPage();
    await page.goto(url);
    const cookiesSet = await page.cookies(url);
    const cookiesToDelete = cookiesSet.filter(x => x.name == 'sp-cdn' || x.name == 'session-id-time' || x.name == 'ubid-main' || x.name == 'session-id');
    await page.deleteCookie(...cookiesToDelete)
    await page.setCookie(...cookies);
    await page.setViewport({
        width: 1920,
        height: 1280
    });
    await page.reload();
    await page.waitForSelector('span.a-declarative[data-action="show-all-offers-display"]');
    await page.click('span.a-declarative[data-action="show-all-offers-display"]'); //click to show all items
    await page.waitForSelector('#all-offers-display-scroller');
    //await page.screenshot({ path: 'example1.png' });

    const items = await getlAllAvailableItems(page);
    browser.close();

    // await page.waitForSelector('#nav-global-location-data-modal-action');
    // await page.click('#nav-global-location-data-modal-action');
    // await page.waitForSelector('#GLUXZipUpdateInput', '90001');
    // await page.type('#GLUXZipUpdateInput', '90001');
    // await page.click('#GLUXZipUpdate .a-button-input');
    // await page.click('span.a-declarative[data-action="show-all-offers-display"]');
    // await page.waitForSelector('#all-offers-display');
    //await page.screenshot({ path: 'example3.png' });

    console.log(items);

    return items;

    // } catch (error) {
    //     console.log('cannot crawl all available items')
    //     return [];
    // }
}

function getProxyUrl() {
    return Apify.getApifyProxyUrl({
        groups: availableProxies,
    });
}

async function getlAllAvailableItems(page) {
    console.log('starting scrolling');

    const items = await page.evaluate(async () => {
        const scrollableSection = document.querySelector('#all-offers-display-scroller');
        let end = false;
        const endOfResults = document.querySelector('#aod-end-of-results');
        let time = 1;
        let distance = 2000;

        while (!end && time < 5000) {
            scrollableSection.scrollTop = distance;
            time++;
            distance += 2000;

            await new Promise(function (resolve) {
                setTimeout(resolve, 1000)
            });
            const endOfResultVisible = window.getComputedStyle(endOfResults).getPropertyValue('display') !== 'none';
            if (endOfResultVisible) {
                end = true;
            }
        }

        let results = [];
        let pinnedOffer = document.querySelector('#aod-pinned-offer');
        if (pinnedOffer) {
            const pinnedCondition = pinnedOffer.querySelector('#aod-offer-heading h5').textContent.replace(/(\r\n|\n|\r)/gm, "");
            const pinnedPrice = pinnedOffer.querySelector('#pinned-offer-top-id .a-price .a-offscreen').textContent.replace(/(\r\n|\n|\r)/gm, "");
            const pinnedShipFrom = pinnedOffer.querySelector('#aod-offer-shipsFrom .a-fixed-left-grid-col.a-col-right').textContent.replace(/(\r\n|\n|\r)/gm, "");

            results.push({
                condition: pinnedCondition,
                price: pinnedPrice,
                shipFrom: pinnedShipFrom,
                sellerName: ""
            });
        }


        const elements = Array.from(document.querySelectorAll('#aod-offer'));
        const offers = (elements.map(element => {
            const condition = element.querySelector('#aod-offer-heading h5').textContent.replace(/(\r\n|\n|\r)/gm, "");
            const price = element.querySelector('#aod-offer-price .a-price .a-offscreen').textContent.replace(/(\r\n|\n|\r)/gm, "");
            const shipFrom = element.querySelector('#aod-offer-shipsFrom .a-fixed-left-grid-col.a-col-right').textContent.replace(/(\r\n|\n|\r)/gm, "");
            //const sellerName = element.querySelector('#aod-offer-soldBy .a-fixed-left-grid-col.a-col-right').textContent.replace(/(\r\n|\n|\r)/gm, "");

            return { condition, price, shipFrom, sellerName: '' }
        }));

        results.push(...offers);
        return results;
    });

    const finalResults = items.map(item => {
        return { ...item, priceParsed: parsePrice(item.price) }
    });

    return finalResults;
}

module.exports = crawlAllAvailableItems;
