# Rigwise

An Ireland-first PC build and basket-optimisation demo. The site is a static, dependency-free JavaScript application.

## Run it

Open index.html in a modern browser, or serve this directory with any static web server. Run the built-in tests with Node.js:

    node --test

## What works in this demo

- Editable example components, budget and workload.
- Illustrative auto-build profiles.
- Live compatibility checks for sockets, memory generation, case fit and power.
- An exact exhaustive search over the demo offers, including per-order free-shipping thresholds and per-item delivery fees.
- Expandable sample offer comparisons and lowest-total/fewest-shop strategies.
- Local browser saving, share links and a light/dark theme.

## Data boundary

Prices, retailer labels, stock and delivery rules are synthetic fixtures used to demonstrate the application and test the optimiser. They are not live quotes or recommendations. The demo does not connect to retailer APIs, check shipping destinations, identify Irish shops, estimate VAT/import charges, or link to purchasable listings. No physical collection is represented.

The next production milestone is a source-by-source retailer integration review, followed by permitted product and offer feeds, delivery and tax rules, freshness tracking, and independently verified purchasing links. Until those exist, the buying plan must not be used to place an order.
