const Apify = require("apify");
const parsePrice = require("parse-price");
const { logSystemInfo } = require("apify/build/utils");
const { stringifyUrl } = require("query-string");
const crawlAllAvailableItems = require("./crawlAllAvailableItems");

const { log } = Apify.utils;

async function parseItemDetail($, request) {
    const { detailUrl } = request.userData;
    const item = { itemDetail: {} };

    const asin = $("#ftSelectAsin") && $("#ftSelectAsin").first().val();
    getInStockValue($, asin, item);
    item.itemDetail.delivery = $("#delivery-message") && $("#delivery-message").first().text().trim().replace(/(\r\n|\n|\r)/gm, "");
    item.asin = asin;
    item.itemDetail.deliveryTo = $("#contextualIngressPtLabel_deliveryShortLine span:last-child").text().trim();
    item.detailUrl = detailUrl;
    item.sellers = extractSellers($);

if(!item.itemDetail.instock){
    const availableItems = await crawlAllAvailableItems(item.detailUrl);
    const itemsShippedFromAmazon = availableItems.filter(x => x.shipFrom.toLowerCase() == "amazon" || x.shipFrom.toLowerCase() == "amazon.com")
    if(itemsShippedFromAmazon.length){
        item.itemDetail.instock = true;
        item.sellers = itemsShippedFromAmazon;
    }
}

    return item;
}

function getInStockValue($, asin, item) {
    //console.log($("body").html());
    let result = false;

    const value = $("#availability span.a-size-medium") && $("#availability span.a-size-medium").first().text().toLowerCase().trim().replace(/(\r\n|\n|\r)/gm, "");
    let shipFrom = $("#tabular-buybox-container #tabular-buybox-truncate-0 .tabular-buybox-text") &&
        $("#tabular-buybox-container #tabular-buybox-truncate-0 .tabular-buybox-text").first().text().toLowerCase().trim().replace(/(\r\n|\n|\r)/gm, "");

    if (!shipFrom || !shipFrom.length) {
        shipFrom = $("#shipsFromSoldBy_feature_div") && $("#shipsFromSoldBy_feature_div").first().text().toLowerCase().trim().replace(/(\r\n|\n|\r)/gm, "");
    }


    if (shipFrom == "amazon" || shipFrom == "amazon.com" || shipFrom == "ships from and sold by amazon.com.") {
        if (value) {
            if (value.includes("in stock.")) {
                const regex = /only \d+ left in stock.*$/;
                if (regex.test(value)) {
                    const quantity = parseInt(value.match(/\d+/)[0]);
                    result = quantity >= 20;
                } else {
                    result = value.endsWith("in stock.");
                }
            }
            //  log.info(`${asin} ${value} => in stock is ${result}`);
        }
    }

    item.itemDetail.instock = result;
    item.itemDetail.instockDetails = value;
    item.itemDetail.shipFrom = shipFrom;
    return result;
}

function extractSellers($) {
    const sellers = [];
    let price = null;
    let priceParsed = null;
    const condition = "New";
    const sellerName = "";

    let rawPrice = ($("#price_inside_buybox") && $("#price_inside_buybox").first().text()) ||
        ($("#priceblock_ourprice_row #priceblock_ourprice") && $("#priceblock_ourprice_row #priceblock_ourprice").first().text()) ||
        ($("#priceblock_dealprice_row .priceBlockDealPriceString") && $("#priceblock_dealprice_row .priceBlockDealPriceString").first().text()) ||
        ($("#priceblock_pospromoprice_row #priceblock_pospromoprice") && $("#priceblock_pospromoprice_row #priceblock_pospromoprice").first().text())

    if (rawPrice != null) {
        price = rawPrice.trim().replace("Rs.", "Rs");
        priceParsed = parsePrice(price);
    }

    sellers.push({
        price,
        priceParsed,
        condition,
        sellerName,
    });

    return sellers;
}

module.exports = parseItemDetail;
