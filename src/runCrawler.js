const Apify = require("apify");
const parseSellerDetail = require("./parseSellerDetail");
const { parseItemUrls } = require("./parseItemUrls");
const parsePaginationUrl = require("./parsePaginationUrl");
const { saveItem, getOriginUrl } = require("./utils");
const detailParser = require("./parseItemDetail");
const { log } = Apify.utils;
async function runCrawler(params) {
    const {
        $,
        request,
        requestQueue,
    } = params;

    const { label } = request.userData;
    //const urlOrigin = await getOriginUrl(request);
    // if (label === "page") {
    //     // solve pagination if on the page, now support two layouts
    //     const enqueuePagination = await parsePaginationUrl($, request);
    //     if (enqueuePagination !== false) {
    //         log.info(`Adding new pagination of search ${enqueuePagination}`);
    //         await requestQueue.addRequest({
    //             url: enqueuePagination,
    //             userData: {
    //                 label: "page",
    //                 keyword: request.userData.keyword,
    //             },
    //         });
    //     }
    //     // add items to the queue
    //     try {
    //         const items = await parseItemUrls($, request);
    //         for (const item of items) {
    //             await requestQueue.addRequest(
    //                 {
    //                     url: item.url,
    //                     userData: {
    //                         label: "detail",
    //                         keyword: request.userData.keyword,
    //                         asin: item.asin,
    //                         detailUrl: item.detailUrl,
    //                         //  sellerUrl: item.sellerUrl,
    //                     },
    //                 },
    //                 { forefront: true }
    //             );
    //         }

    //         if (items.length === 0) {
    //             await Apify.pushData({
    //                 status: "No items for this keyword.",
    //                 url: request.url,
    //                 keyword: request.userData.keyword,
    //             });
    //         }
    //     } catch (error) {
    //         await Apify.pushData({
    //             status: "No items for this keyword.",
    //             url: request.url,
    //             keyword: request.userData.keyword,
    //         });
    //     }
    //     // extract info about item and about seller offers
    // } else 
    if (label === "detail") {
        try {

            const item = await detailParser($, request);

            log.info(`Saving item url: ${request.url}`);
            await saveItem(
                "RESULT",
                request,
                item
            );

        } catch (e) {
            log.error("Detail parsing failed", e);
        }
    }
    // else if (label === "seller") {
    //     try {
    //         const item = await parseSellerDetail($, request);
    //         if (item) {
    //             let paginationUrlSeller;
    //             const paginationEle = $("ul.a-pagination li.a-last a");
    //             if (paginationEle.length !== 0) {
    //                 paginationUrlSeller =
    //                     urlOrigin + paginationEle.attr("href");
    //             } else {
    //                 paginationUrlSeller = false;
    //             }

    //             // if there is a pagination, go to another page
    //             if (paginationUrlSeller !== false) {
    //                 log.info(
    //                     `Seller detail has pagination, crawling that now -> ${paginationUrlSeller}`
    //                 );
    //                 await requestQueue.addRequest(
    //                     {
    //                         url: paginationUrlSeller,
    //                         userData: {
    //                             label: "seller",
    //                             itemDetail: request.userData.itemDetail,
    //                             keyword: request.userData.keyword,
    //                             asin: request.userData.asin,
    //                             detailUrl: request.userData.detailUrl,
    //                             sellerUrl: request.userData.sellerUrl,
    //                             sellers: item.sellers,
    //                         },
    //                     },
    //                     { forefront: true }
    //                 );
    //             } else {
    //                 log.info(`Saving item url: ${request.url}`);
    //                 await saveItem(
    //                     "RESULT",
    //                     request,
    //                     item
    //                 );
    //             }
    //         }
    //     } catch (error) {
    //         console.error(error);
    //         await saveItem(
    //             "NORESULT",
    //             request,
    //             null
    //         );
    //     }
    // }
}

module.exports = runCrawler;
