# Retailer data access review

Reviewed 17 November 2026. This is a source-access review, not proof that any offer, stock level, delivery charge, or checkout is currently available. No retailer integration is enabled in the app.

| Candidate | Evidence checked | Access status | Required before live comparison |
| --- | --- | --- | --- |
| BuyItDirect.ie through Awin, programme 74722 | Awin lists computing products, service across the UK and Ireland, and a product feed updated four times daily. Awin's publisher feed specification includes product IDs, names, price/currency, EAN/MPN, stock flags, deep links, delivery fields and source update times. | Candidate only. Feed access is through the Awin publisher platform and depends on the advertiser feed and partnership being available to the account. No account feed URL, credentials, or permission is configured here. | Obtain an approved publisher partnership and feed; inspect the actual advertiser fields and terms; verify exact PC component identity, EUR/VAT treatment, Ireland delivery, stock, link validity, and freshness before enabling offers. |
| Elara | Its official About page identifies it as an Irish e-commerce retailer selling computer components and says product information draws on manufacturer data feeds. | Candidate only. The pages reviewed do not establish a permitted public offer feed or API for this project. | Ask Elara for an authorised feed or API and confirm price, availability, delivery, reuse, and attribution terms. |
| MemoryC | Its official company information describes its component catalogue, Irish and US operations, and European fulfilment. | Candidate only. The pages reviewed do not establish a permitted public offer feed or API for this project. | Obtain written feed/API permission or a licensed partner source; confirm which fulfillment location and delivery/tax treatment applies to each Irish order. |

## Sources

- [Awin BuyItDirect.ie programme](https://ui.awin.com/merchant-profile/74722)
- [Awin product data feed FAQ](https://success.awin.com/articles/en_US/Knowledge/Product-Data-Feed-FAQ)
- [Awin publisher feed columns and hosting](https://help.awin.com/developers/docs/hosting-feeds)
- [Awin publisher product-feed guide](https://help.awin.com/developers/docs/product-feed-publisher-guide-intro)
- [Elara About Us](https://www.elara.ie/aboutus.aspx)
- [MemoryC company information](https://www.memoryc.ie/help/company_info.html)

## Current boundary

The current app uses only synthetic fixtures. A retailer's existence, product catalogue, or published programme does not make its offers live or eligible. Do not add a retailer to comparison results until the required feed access and offer-level delivery and tax evidence have been validated.

## Feed import groundwork

awin-feed.js accepts a licensed Awin CSV/TSV export as text and normalises its source fields, including item price, currency, stock, identifiers, deep links, delivery fields, and timestamps. It does not request feeds or handle publisher credentials. Imported records remain ineligible for the app's cheapest-price results unless separate evidence confirms publisher permission, a unique exact product match, fresh stock and price data, an exact listing link, Irish delivery, the retailer's order-level shipping rule, and tax treatment. The feed's per-product delivery field is retained as source evidence; it is not assumed to be the final consolidated order charge.

