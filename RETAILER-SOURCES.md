# Retailer data access review

Reviewed 17 November 2026. This is a source-access review, not proof that any offer, stock level, delivery charge, or checkout is currently available. No retailer integration is enabled in the app.

| Candidate | Evidence checked | Access status | Required before live comparison |
| --- | --- | --- | --- |
| BuyItDirect.ie through Awin, programme 74722 | Awin lists computing products, service across the UK and Ireland, and a product feed updated four times daily. Awin's publisher feed specification includes product IDs, names, price/currency, EAN/MPN, stock flags, deep links, delivery fields and source update times. | Candidate only. Feed access is through the Awin publisher platform and depends on the advertiser feed and partnership being available to the account. No account feed URL, credentials, or permission is configured here. | Obtain an approved publisher partnership and feed; inspect the actual advertiser fields and terms; verify exact PC component identity, EUR/VAT treatment, Ireland delivery, stock, link validity, and freshness before enabling offers. |
| Paradigit.ie through Awin, programme 8912 | Paradigit's current site lists components and says it ships only to Republic of Ireland addresses for a flat €9.95 per online order, with the order fee covering multiple items. Its Awin profile says a product feed is available. | Strong feed candidate, but account approval and actual feed access are not configured. Awin's public profile still advertises free shipping over €400, which conflicts with Paradigit's current shipping page. Neither rule is used by the app. | Obtain approved feed access and current terms; resolve the shipping-rule conflict; inspect actual product fields, tax/dispatch data, and affiliate link rules; verify each exact offer and checkout. |
| Currys IE through Awin, programme 5297 | Currys has an official component catalogue including graphics cards, memory, motherboards, processors, coolers, power supplies and cases, with delivery and store collection filters. Its Awin programme describes a daily product feed and says commissions apply to Ireland transactions. | Strong feed candidate, but publisher application, advertiser approval and feed access are not configured. An Awin programme listing does not establish permission to use the feed for price comparison or prove per-item Irish delivery/collection eligibility. | Obtain programme and feed approval; review feed and comparison-use terms; map exact products, availability, tax and destination fields; verify collection branch stock and item-specific delivery before enabling offers. |
| Elara | Its official About page identifies it as an Irish e-commerce retailer selling computer components and says product information draws on manufacturer data feeds. | Candidate only. The pages reviewed do not establish a permitted public offer feed or API for this project. | Ask Elara for an authorised feed or API and confirm price, availability, delivery, reuse, and attribution terms. |
| MemoryC | Its official company information describes its component catalogue, Irish and US operations, and European fulfilment. An Awin affiliate programme exists for MemoryC, but the public evidence checked did not confirm an Irish-specific feed or its availability to this publisher. | Candidate only. No account feed URL, credentials, approval, or permission is configured. | Confirm programme eligibility, product-feed access and comparison-use terms; verify which fulfilment location, currency, VAT treatment and delivery terms apply to each Irish offer. |

## Sources

- [Awin BuyItDirect.ie programme](https://ui.awin.com/merchant-profile/74722)
- [Awin Paradigit.ie programme](https://ui.awin.com/merchant-profile/8912)
- [Paradigit shipping methods](https://www.paradigit.ie/customer-service/order-delivery/shipping-methods/)
- [Awin Currys IE programme](https://ui.awin.com/merchant-profile/5297)
- [Currys IE component catalogue](https://www.currys.ie/computing/components-and-upgrades)
- [Awin product data feed FAQ](https://success.awin.com/articles/en_US/Knowledge/Product-Data-Feed-FAQ)
- [Awin publisher feed columns and hosting](https://help.awin.com/developers/docs/hosting-feeds)
- [Awin publisher product-feed guide](https://help.awin.com/developers/docs/product-feed-publisher-guide-intro)
- [Elara About Us](https://www.elara.ie/aboutus.aspx)
- [MemoryC company information](https://www.memoryc.ie/help/company_info.html)

## Current boundary

The current app uses only synthetic fixtures. A retailer's existence, product catalogue, or published programme does not make its offers live or eligible. A feed marked "available" is a lead to check access and licence terms, not blanket permission for every use. Do not add a retailer to comparison results until the required feed access and offer-level delivery and tax evidence have been validated.

## Feed import groundwork

awin-feed.js accepts a licensed Awin CSV/TSV export as text and normalises its source fields, including item price, currency, stock, identifiers, deep links, delivery fields, and timestamps. The site's collapsed feed-review panel runs that parser locally in the visitor's browser; the file is not uploaded or saved. It counts exact GTIN/brand-MPN matches, ambiguous rows, unmatched rows and parser rejects against the current demo catalogue. It does not request feeds, verify publisher credentials, or change the offers used by the builder. Imported records remain ineligible for the app's cheapest-price results unless separate evidence confirms publisher permission, a unique exact product match, fresh stock and price data, an exact listing link, Irish delivery, the retailer's order-level shipping rule, and tax treatment. The feed's per-product delivery field is retained as source evidence; it is not assumed to be the final consolidated order charge.

