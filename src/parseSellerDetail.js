/* global $ */
const parsePrice = require("parse-price");
const { getCurrency } = require("./utils.js");

function extractInfo($) {
    const h1 = $("h1");
    return {
        title: h1.length !== 0 ? h1.text().trim() : null,
    };
}

function extractSellers($, request) {
    const sellers = [];
    $("div.olpOffer").each(function () {
        const priceElem = $(this).find("span.olpOfferPrice");
        const pricePerUnitElem = $(this).find("span.pricePerUnit");
        const sellerNameEle = $(this).find("h3.olpSellerName img");

        let price = null;
        let priceParsed = null;

        if (priceElem.length !== 0) {
            price = priceElem.text().trim().replace("Rs.", "Rs");
            priceParsed = parsePrice(price);
        } else {
            price = "price not displayed";
        }
        if (pricePerUnitElem.length !== 0) {
            pricePerUnit = pricePerUnitElem.text();
        }
        let condition;
        const sellerName =
            sellerNameEle.length !== 0
                ? sellerNameEle.attr("alt")
                : $(this).find("h3.olpSellerName").text().trim();

        const offerConditionEle = $(this).find("div#offerCondition");
        const olpConditionEle = $(this).find("span.olpCondition");

        if (offerConditionEle.length !== 0) {
            condition = offerConditionEle.text().replace(/\s\s+/g, " ").trim();
        } else if (olpConditionEle.length !== 0) {
            condition = olpConditionEle.text().replace(/\s\s+/g, " ").trim();
        } else {
            condition = "condition unknown";
        }

        sellers.push({
            price,
            priceParsed,
            condition,
            sellerName,
        });
    });
    return sellers;
}

// to in a way to make sense what they are doing, so this one should be
// called parseSellerDetails
async function parseSellerDetail($, request) {
    const sellers = await extractSellers($, request);
    const item = await extractInfo($);
    const currency = await getCurrency(request);

    if (request.userData.sellers) {
        item.sellers = request.userData.sellers.concat(sellers);
    } else {
        item.sellers = sellers;
    }
    const { keyword, asin, detailUrl, country, itemDetail } = request.userData;
    item.keyword = keyword;
    item.asin = asin;
    item.itemDetailUrl = detailUrl;
    item.country = country;
    item.currency = currency;
    item.itemDetail = itemDetail;
    if (item.title === null) {
        item.status = "This ASIN is not available for this country.";
    }
    return item;
}

module.exports = parseSellerDetail;
