# Rigwise

An Ireland-first PC build and basket-optimisation demo. The site is a static, dependency-free JavaScript application.

## Run it

Open index.html in a modern browser, or serve this directory with any static web server. Run the built-in tests with Node.js:

    node --test

## What works in this demo

- Editable example components, budget and workload.
- Approximate county selection for all 26 Republic of Ireland counties, stored locally; demo delivery rules are intentionally county-neutral.
- Optional county-level mapped computer/electronics shop lookup on Vercel using OpenStreetMap and a public Overpass service. It is cached for six hours, makes no stock or opening-status claim, and is not available when opening the page directly from a `file://` URL; use a Vercel deployment or `vercel dev`.
- Illustrative auto-build profiles.
- Auto Build searches the sample catalogue for compatible configurations that fit the budget, then ranks them with workload, gaming resolution and frame-rate demo weights. Compact mode limits the sample board and case to micro-ATX fixtures. These weights are not benchmark or FPS predictions; candidate prices and delivery are still synthetic. The selected preferences are carried into local saves and share links.
- Status-aware compatibility checks cover processor/socket/chipset/BIOS support, memory capacity/speed, cooler fit, graphics clearance/connectors, storage interfaces, PSU fit and headroom. Missing specifications show as unverified instead of silently passing.
- Basket prices and delivery are accumulated in integer cents. The solver explores at most 10,000 complete plans and 100,000 search nodes, ordered to find promising candidates early. If either limit is reached after finding a feasible plan, it returns the best one found and labels it without claiming optimality; if no feasible plan was found, it stops with an explicit error. Unknown availability and retailers without a known shipping rule are excluded. Bundles cover their included build parts as one purchase, so overlapping bundles cannot double-count a required component.
- Expandable sample offer comparisons and lowest-total/fewest-shop strategies.
- Side-by-side example product comparisons with aligned specifications, compatibility against the current sample build, and explicitly synthetic item-price comparisons.
- Browser-local anonymous account ID, saved builds associated with that ID, share links and a light/dark theme. Download or restore a versioned JSON backup to move the ID and saved builds between browsers; clear the browser-local data from the account panel. No email, password, database, or automatic cloud sync is used; existing local builds migrate to the ID on first visit.
- Local-only Awin CSV/TSV feed review with exact GTIN/brand-MPN match counts, ambiguous rows and parse failures. The browser never uploads or saves the file, and the review cannot add prices to recommendations. `awin-feed.js` still requires separate source, match, stock, link, Ireland delivery, tax and order-shipping evidence before a feed observation could become an optimizer offer.
- A source-linked starter hardware catalogue in [components.html](components.html), with manufacturer product identifiers/specifications and one documented-fit example. It has no retailer prices or stock; the reference build's BIOS support and bundled-cooler fit/performance remain visibly unknown. This manufacturer catalogue is also used for exact Awin brand/MPN matching.
- A source-linked buyer's guide in [guides.html](guides.html) and an honest empty Deals page in [deals.html](deals.html). The Deals page summarises the reviewed Awin, Icecat, Amazon.ie and eBay data routes and links to official access/licensing references; it shows no invented offers.
- A local evidence-gated Ireland/EU checkout calculator in [cost-check.html](cost-check.html), backed by `irish-costs.js`. It uses observed item and delivery amounts, does not double-charge VAT on a verified gross price, and leaves foreign-currency totals incomplete until a separate verified exchange rate is available. Outside-EU customs charges are explained with Revenue links but are not represented as a live quote.
- Prototype privacy, cookies/storage, terms, affiliate and contact pages document current behavior and outstanding launch requirements. Operator identity and contact details are not configured; the pages do not claim legal compliance. The homepage loads no external Google Font assets.
- An evidence-gated Irish checkout/import cost calculator in irish-costs.js, with versioned rule dates, consumer charge pass-through checks, fresh dated currency conversion, and an optional verified-order-cost hook in the basket optimiser.

## Data boundary

The PC builder's prices, retailer labels, bundles, stock and delivery rules are synthetic fixtures used to demonstrate the application and test the optimiser. They are not live quotes or recommendations. The separate source-linked catalogue contains real manufacturer product identities/specification references, but no retailer offers. The optional county map search returns computer/electronics venues mapped in OpenStreetMap through a public Overpass service; it does not confirm that a venue is open, sells or repairs PCs, has stock, offers delivery, or provides collection. The page does not connect to retailer APIs, check shipping destinations, or link to purchasable listings. Saved builds remain in the current browser; there are no email accounts or cloud-synced builds.

The standalone tax calculator requires verified inputs and is not connected to live offers or the visible demo. No displayed basket is a tax-complete purchasing quote. Its rule snapshot and official sources are documented in [IRISH-TAX-RULES.md](IRISH-TAX-RULES.md).

The current retailer-source review is in [RETAILER-SOURCES.md](RETAILER-SOURCES.md). The next production milestone is authorised retailer feed access, followed by source-aware product matching, verified delivery and tax evidence, live freshness tracking, and independently checked purchasing links. Until those inputs are connected, the buying plan must not be used to place an order.

