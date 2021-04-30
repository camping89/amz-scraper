const Apify = require("apify");

const { log } = Apify.utils;

function getBaseUrl(country) {
    const baseUrls = {
        US: "https://www.amazon.com/",
        UK: "https://www.amazon.co.uk/",
        DE: "https://www.amazon.de/",
        ES: "https://www.amazon.es/",
        FR: "https://www.amazon.fr/",
        IT: "https://www.amazon.it/",
        IN: "https://www.amazon.in/",
        CA: "https://www.amazon.ca/",
        JP: "https://www.amazon.co.jp/",
        AE: "https://www.amazon.ae/",
        SA: "https://www.amazon.sa/",
        BR: "https://www.amazon.com.br/",
        MX: "https://www.amazon.com.mx/",
        SG: "https://www.amazon.sg/",
        TR: "https://www.amazon.com.tr/",
        NL: "https://www.amazon.nl/",
        AU: "https://www.amazon.com.au/",
    };
    const url = baseUrls[country];
    if (!url) throw new Error("Selected country is not supported, contact us.");
    return url;
}

async function createSearchUrls(input) {
    
    const urlsToProcess = [];

    if (!input.country) {
        throw new Error("Country required");
    }
    if (!input.search) {
        throw new Error("Urls required");
    }

    try {
        for (const url of input.urls) {
            const searchUrlBase = getBaseUrl(input.country);
           // const sellerUrl = `${searchUrlBase}gp/offer-listing/${asin.trim()}`;
           // const detailUrl = `${searchUrlBase}dp/${asin.trim()}`;
            const detailUrl = url.trim();
            urlsToProcess.push({
                url: detailUrl,
                userData: {
                    label: "detail",
                   // asin: asin.trim(),
                    detailUrl,
                   // sellerUrl,
                    country: input.country,
                    domain: searchUrlBase,
                },
            });
        }
    } catch (e) {}

    if (urlsToProcess.length !== 0) {
        log.info(
            `Going to enqueue ${urlsToProcess.length} requests from input.`
        );
        return urlsToProcess;
    }

    throw new Error("Can't add any requests, check your input.");
}

module.exports = createSearchUrls;
