/* global $, window */
const Apify = require("apify");
let Cheerio = require("cheerio");
const CloudFlareUnBlocker = require("./unblocker");
const createSearchUrls = require("./createSearchUrls");
const createDefaultItem = require("./createDefaultItem");
const crawlAllAvailableItems = require("./crawlAllAvailableItems");
const runCrawler = require("./runCrawler");
const CheerioAdv = require('cheerio-advanced-selectors')
const cheerio = CheerioAdv.wrap(Cheerio);
cheerio.load = function () {
    const $ = Cheerio.load.apply(Cheerio, arguments);
    const fn = function (selector, context, root) {
        if (typeof selector === "string") {
            return CheerioAdv.find($, selector, context, root)
        }
        return $.apply(Cheerio, arguments)
    };
    for (let prop in Cheerio) {
        if (prop === "load" || typeof Cheerio[prop] !== "function") {
            continue
        }
        fn[prop] = function () {
            return Cheerio[prop].apply($, arguments)
        }
    }
    return fn
};

const { log } = Apify.utils;
const availableProxies = [
    //"RESIDENTIAL",
    "BUYPROXIES63748",
    "BUYPROXIES63811",
    "BUYPROXIES94952",
    "SHADER",
    "qfCaFFuCodXxAS59E",
];

// (async () => {
// //await crawlItemShippedFromAmazon("https://www.amazon.com/HP-Wireless-Printing-Replenishment-K7R96A/dp/B074P4T1FT/ref=sr_1_9");
// await crawlAllAvailableItems("https://www.amazon.com/KitchenAid-KCG0702CS-Coffee-Grinder-Contour/dp/B00XPRQZJ0/ref=sr_1_5");
// })();

Apify.main(async () => {

    const input = await Apify.getValue("INPUT");
    const rawUrls = input.search && input.search.split(",").filter(x => x.trim().length);

    if (rawUrls && rawUrls.length) {
        const urlChunks = getUrlChunks(rawUrls);

        log.info(`Total ${rawUrls.length} urls, splitted into ${urlChunks.length} chunks`);

        await Promise.all(urlChunks.map(async (rUrls) => {
            input.urls = rUrls;
            const urls = await createSearchUrls(input);
            const requestQueue = await Apify.openRequestQueue();
            await Promise.all(urls.map(async (searchUrl) => {
                //  log.info(searchUrl.url);
                await requestQueue.addRequest(searchUrl);
            }));

            const proxyConfiguration = { ...input.proxy };
            const cloudFlareUnBlocker = new CloudFlareUnBlocker({
                proxyConfiguration
            });

            const crawler = new Apify.BasicCrawler({
                requestQueue,
                useSessionPool: true,
                sessionPoolOptions: {
                    maxPoolSize: 500,
                    persistStateKeyValueStoreId: "amazon-scraper-sessions",
                    sessionOptions: {
                        maxUsageCount: 1,
                        maxErrorScore: 2
                    },
                },
                maxConcurrency: 5,
                maxRequestsPerCrawl: null,
                handlePageTimeoutSecs: 30,
                persistCookiesPerSession: true,
                maxRequestRetries: 1,
                handleRequestFunction: async ({ request, session }) => {
                    const cookies = [];
                    let exprire = new Date();
                    let shouldRunCrawler = true;
                    exprire.setHours(exprire.getHours() + 5);
                    cookies.push({ name: "session-id", value: "143-9484404-0612558", expires: new Date(exprire).toISOString() });
                    cookies.push({ name: "session-id-time", value: "2082787201l", expires: new Date(exprire).toISOString() });
                    cookies.push({ name: "ubid-main", value: "132-4806434-9795917", expires: new Date(exprire).toISOString() });

                    session.setPuppeteerCookies(cookies, request.url);

                    let response = await cloudFlareUnBlocker.unblock({
                        request,
                        session,
                    });

                    if (response.statusCode != 404) {
                        let $ = cheerio.load(response.body);
                        if (!isSuccessFullRespone(response, $)) {
                            const { success, data } = await tryGetSuccessResponse(
                                cloudFlareUnBlocker,
                                session,
                                request
                            );

                            if (success) {
                                $ = data;
                            } else {
                                session.retire();
                                if (request.retryCount == 0) {
                                    await Apify.utils.sleep(2500);
                                    throw new Error(
                                        `Failed to crawl ${request.url}. Will retry one more time.`
                                    );
                                }
                                shouldRunCrawler = false;
                            }
                        }
                        if (shouldRunCrawler) {
                            await runCrawler({
                                $,
                                request,
                                requestQueue,
                            });
                        }
                        else {
                            log.error("Failed to crawl " + request.url);
                        }

                    } else {
                        log.error("Not found." + response.url);                        
                        let item = createDefaultItem(response.url);
                        await Apify.pushData(item);
                    }
                },
                handleFailedRequestFunction: async ({ request, error }) => {
                    log.error(`${error}, Request ${request.url}`);
                },
            });
            await crawler.run();
        }));
    }
    else {
        log.info("No asin provided");
    }
});

async function tryGetSuccessResponse(cloudFlareUnBlocker, session, request) {
    var result = {
        success: false,
    };
    var proxies = availableProxies.sort(() => Math.random() - 0.5); // sort random proxies

    for (const proxy of proxies) {
        let response = await cloudFlareUnBlocker.unblockWithCustomProxy({
            session,
            request,
            proxy,
        });
        let $ = cheerio.load(response.body);
        if (isSuccessFullRespone(response, $)) {
            log.info(`SUCCEEDED WITH PROXY: ${proxy} - URL: ${request.url}`);
            result.data = $;
            result.success = true;
            return result;
        }
    }

    let resp = await Apify.utils.requestAsBrowser(request);
    let data = cheerio.load(resp.body);

    if (isSuccessFullRespone(resp, data)) {
        log.info(`SUCCEEDED WITHOUT PROXY - URL: ${request.url}`);
        result.data = data;
        result.success = true;
        return result;
    }

    return result;
}

function isSuccessFullRespone(response, $) {
    const title = $("title") ? $("title").text().trim() : "";
    const errorMsg = "To discuss automated access to Amazon data please contact api-services-support@amazon.com.";
    const asin = $("#ftSelectAsin") && $("#ftSelectAsin").first().val();

    const { statusCode } = response;
    if (
        statusCode !== 200 ||
        !asin ||
        !title.length ||
        response.body.includes(errorMsg) ||
        title.includes("Robot Check") ||
        title.includes("CAPTCHA") ||
        title.includes("Toutes nos excuses") ||
        title.includes("Tut uns Leid!") ||
        title.includes("Service Unavailable Error")
    ) {
        // log.error(response.body.substring(0,369));
        return false;
    }

    return true;
}

function getUrlChunks(rawUrls) {
    let urlChunks = [];
    let i, j, temparray, chunk = 10;

    for (i = 0, j = rawUrls.length; i < j; i += chunk) {
        temparray = rawUrls.slice(i, i + chunk);
        urlChunks.push(temparray);
    }

    return urlChunks;
}
