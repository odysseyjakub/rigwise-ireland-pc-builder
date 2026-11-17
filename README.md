# Rigwise

An Ireland-first PC build and basket-optimisation demo. The site is a static, dependency-free JavaScript application.

## Run it

Open index.html in a modern browser, or serve this directory with any static web server. Run the built-in tests with Node.js:

    node --test

## What works in this demo

- Editable example components, budget and workload.
- Approximate county selection for all 26 Republic of Ireland counties, stored locally; demo delivery rules are intentionally county-neutral.
- Illustrative auto-build profiles.
- Status-aware compatibility checks cover processor/socket/chipset/BIOS support, memory capacity/speed, cooler fit, graphics clearance/connectors, storage interfaces, PSU fit and headroom. Missing specifications show as unverified instead of silently passing.
- An exact exhaustive search over demo offers and bundles, including per-order free-shipping thresholds and per-item delivery fees. Unknown availability and retailers without a known shipping rule are excluded. Bundles cover their included build parts as one purchase, so overlapping bundles cannot double-count a required component.
- Expandable sample offer comparisons and lowest-total/fewest-shop strategies.
- Local browser saving, share links and a light/dark theme.

## Data boundary

Prices, retailer labels, bundles, stock and delivery rules are synthetic fixtures used to demonstrate the application and test the optimiser. They are not live quotes or recommendations. The demo does not connect to retailer APIs, check shipping destinations, identify Irish shops, estimate VAT/import charges, or link to purchasable listings. No physical collection is represented. Saved builds remain in the current browser; there are no user accounts or cloud-synced builds.

The current retailer-source review is in [RETAILER-SOURCES.md](RETAILER-SOURCES.md). The next production milestone is access to an authorised retailer feed, followed by source-aware product matching, verified delivery and tax rules, freshness tracking, and independently checked purchasing links. Until those exist, the buying plan must not be used to place an order.

