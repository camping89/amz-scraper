function createDefaultItem(url) {
    let item = {
        itemDetail: {
            instock: false,
            instockDetails: "",
            shipFrom: "",
            delivery: "",
            deliveryTo: "‌"
        },
        asin: getAsinFromUrl(url),
        detailUrl: url,
        sellers: [
            {
                price: "-$1",
                priceParsed: -1,
                condition: "New",
                sellerName: ""
            }
        ]
    }
    return item;
}

function getAsinFromUrl(url){
    let urlSegments = url.split("dp/");
    let asin = urlSegments[1].split("/")[0];

    if(asin.includes("?")){
        asin = asin.split("?")[0];
    }

    return  asin;
}

module.exports = createDefaultItem;
