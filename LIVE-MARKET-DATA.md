# Live market data status

Reviewed 22 November 2026.

## What is connected now

The Part Finder requests products and seller offers from the public VantaSpec hardware API when the user searches, with a 15-minute in-memory cache and a manual refresh button. VantaSpec documents its catalogue as UK PC hardware and says its public product search works without an account or key. It returns product names, retailer names, prices, stock flags, images and links.

The API response does not provide the original check timestamp for every retailer price. Rigwise shows when it fetched the API response, but cannot verify whether an individual seller price was checked in the last day. It therefore tells users to check current price and stock at checkout. This does not yet satisfy a guaranteed daily freshness requirement.

For UK offers, Rigwise links the published delivery rules found for Scan, Overclockers UK and AWD-IT. For Ireland, it applies those sellers' published ROI parcel rates where available. AWD-IT's ROI delivery price is an estimate because its site does not publish the fee. For sellers without a published destination fee, the app shows an explicitly labeled estimate based on the mean of comparable published parcel fees. For GBP prices in Ireland mode, it applies the standard VAT adjustment assumption and the dated ECB GBP/EUR rate. The page links to the policy sources and labels estimates; final checkout may differ.

The interface currently supports two country modes: UK and Republic of Ireland. The connected product source currently has UK listings only. Ireland mode prices UK shops that appear to deliver to ROI; it does not add Ireland-only or EU-only retailers.

## European source research

- **Pricelists.org:** its documentation advertises a public offer API with price, delivery, availability and update time. Direct searches on 22 November 2026 returned no offers for PC-part queries in Germany, Poland, France, Ireland or the UK, and the public Samsung query was empty too. It is not a dependable source for Rigwise today.
- **Shardware, Estonia:** hourly updated EUR prices and stock through a supplier catalogue API. The operator must provide an access code; it is one supplier, not a public multi-store feed. No access code is configured.
- **Squirrel:** publisher API claims multi-country retailer coverage. The current Starter price is £29.99 plus VAT/month for 10,000 requests. No subscription, account or paid upgrade has been made.
- **Approved affiliate feeds:** Awin, Kelkoo and individual retailer programmes can provide country-specific offers, but require publisher access/approval and review of comparison-use terms. A public programme page alone is not enough.

No permission-free, no-cost European multi-retailer source tested in this review returned usable current PC-component offers. Rigwise does not scrape retailer pages or introduce an unverified data feed as if it were licensed and current.

## Steps to exit sample mode

1. **Choose an authorized offer source.** Apply to the required retailer or network programmes, ask the provider for a product sample and written comparison/reuse terms, or approve a paid provider plan. For more EU coverage, ask for country availability and local-market feeds explicitly.
2. **Confirm the fields and usage rights.** For each offer, require GTIN/EAN or exact manufacturer part number, product URL, currency, gross/net and VAT status, in-stock/lead-time status, source update timestamp, offer expiration semantics, retailer attribution, affiliate-link rules and permission for price comparison.
3. **Prove delivered cost by destination.** Obtain parcel/order-level shipping rules or a quote for GB and each supported European market. Record threshold/free-shipping behavior, multiple-parcel rules, tax collection, and outside-EU customs treatment. A per-product shipping column is not automatically the final basket shipping fee.
4. **Keep credentials on Vercel's server.** Add source tokens as Vercel environment variables, then fetch protected feeds through Vercel functions. Do not put API keys into browser JavaScript or GitHub.
5. **Connect one shared offer adapter.** Use the same normalized, source-dated offers for Part Finder, manual Builder, questionnaire recommendations, auto-build, product comparisons and basket totals. Re-run exact product matching, compatibility, tax, delivery and stock checks before recommending a build.
6. **Refresh and reject stale data.** If the provider offers update timestamps or webhooks, retain each source timestamp and enforce a visible maximum age (daily if that is the chosen policy). A Vercel Cron refresh is only useful once an authorized source and a permitted storage/cache location are configured. If a source is missing, stale, out of stock, ambiguous or not deliverable to the selected market, show that fact and never fall back to sample prices in a live result.
7. **Publish and verify each market.** Deploy to Vercel, then inspect a real offer and its retailer checkout for UK, Ireland and every additional country before enabling that market. Keep the browser-local account ID and saved builds separate; no Supabase or user database is required for those local-only features.

Until those steps are completed, the manual builder, auto-build, compatibility optimizer's prices/stock/delivery, and comparison price panels remain sample-mode. The Part Finder is a live-source lookup with freshness and regional coverage limits, not a fully live purchasing optimizer.

## References

- [VantaSpec public API documentation](https://vantaspec.com/api-docs)
- [Scan delivery information](https://www.scan.co.uk/info/delivery) and [Scan Ireland/Europe delivery](https://www.scan.co.uk/help/orders/delivery/delivery-europe)
- [Overclockers UK delivery](https://www.overclockers.co.uk/delivery.html) and [Overclockers Republic of Ireland policy](https://help.overclockers.co.uk/hc/en-gb/articles/25405437428125-Do-you-deliver-to-Ireland)
- [AWD-IT FAQ](https://www.awd-it.co.uk/faq) and [AWD-IT Ireland delivery/VAT information](https://www.awd-it.co.uk/france-gaming-pcs)
- [ECB GBP/EUR reference rate endpoint](https://api.frankfurter.dev/v2/rate/GBP/EUR?providers=ECB)
- [Revenue Ireland current VAT rates](https://www.revenue.ie/en/vat/vat-rates/search-vat-rates/current-vat-rates.aspx)
- [Pricelists.org API documentation](https://pricelists.org/en/agent-docs)
- [Shardware partner API](https://shardware.ee/developers)
- [Squirrel API plans](https://getsquirrel.co/products/api) and [Squirrel API documentation](https://api-docs.getsquirrel.co/)
- [Awin product-feed publisher guide](https://help.awin.com/developers/docs/product-feed-publisher-guide-intro)
- [Kelkoo publisher API](https://docs.kelkoogroup.com/for-publishers)
