# Irish checkout and import cost rules

Rule snapshot: **2026-11-17**. Amounts in the calculator use EUR cents and explicit evidence supplied by its caller. This file records a software rule snapshot; it is not tax or customs advice.

## Domestic and EU checkout prices

- Ireland's standard VAT rate is 23% from 1 January 2026. The applicable VAT treatment and rate still need to be verified for a particular seller and listing.
- A verified VAT-inclusive checkout amount is not charged VAT a second time.
- A net amount can be made consumer-comparable only when its applicable VAT rate is verified.
- Dispatch from an EU fiscal territory does not add import duty or the Union Handling Fee in this model. Seller VAT treatment remains a separate checkout check.
- An EU non-fiscal territory is left incomplete for separate assessment.

## Goods dispatched from outside the EU

The import calculator covers a verified business-to-consumer consignment dispatched to Ireland. It needs an observed checkout total, actual customs dispatch territory, intrinsic value, item-level customs values, tariff classifications and origins, transport costs, and evidence showing how each charge reaches the consumer. A seller's `.ie` domain, EUR price, or brand location does not establish EU dispatch.

- Since 1 July 2026, Revenue describes a €3 customs duty for each distinct item type in most e-commerce consignments with intrinsic value of €150 or less. The rule snapshot uses an explicit applicability field so preferential or other exceptions are not silently ignored. The cited relief is scheduled to expire on 1 July 2028.
- Above €150, the caller must supply the verified tariff duty rate for every distinct product line. Rates and origin-based preferences are not guessed by this app.
- Since 1 November 2026, the €2 Union Handling Fee applies per distinct item to online goods entering from outside the EU, regardless of value, subject to Revenue's scope and exceptions. It does not apply to dispatches from Ireland, Northern Ireland, or another EU member state.
- For import VAT collected on delivery, the model uses the customs value, applicable customs duties, Union Handling Fee, and verified post-entry transport/handling/insurance in the VAT base. The caller must use the applicable verified Irish VAT rate.
- Where the seller or platform collects a charge at checkout, includes it in the checkout price, or absorbs it, the caller must attest to that collection treatment. Unknown pass-through and carrier fees make the consumer total incomplete.
- Customs lines represent distinct product/tariff groupings. Quantity does not multiply the €3 duty or €2 handling fee when multiple units share one distinct item type.

`calculateIrishImportCharges()` reports statutory charges separately from the consumer's verified pass-through. `calculateIrishCheckoutTotal()` prevents a verified gross amount from receiving VAT twice. `convertToEurMinor()` requires a dated, fresh, verified rational exchange rate; it does not fetch rates. `optimizeBasket()` accepts an optional order-cost evaluator and excludes candidate baskets whose retailer costs are incomplete.

These functions are not wired to live retailer data or the visible demo offers. The live page continues to show synthetic fixture prices, and it does not publish tax-complete buying totals. Do not use the fixture basket as a purchase quote.

## Official Revenue sources

- [Current VAT rates](https://www.revenue.ie/en/vat/vat-rates/search-vat-rates/current-vat-rates.aspx)
- [Purchases from EU countries](https://www.revenue.ie/en/customs/individuals/buying-online-personal/from-eu.aspx)
- [Buying online from outside the EU](https://www.revenue.ie/en/customs/individuals/buying-online-personal/outside-eu.aspx)
- [When import VAT is payable](https://www.revenue.ie/en/vat/goods-and-services-to-and-from-abroad/imports/when-is-vat-payable-on-importation.aspx)
- [Low-value consignment relief and €3 duty](https://www.revenue.ie/en/customs/individuals/relief-low-value-consignments/index.aspx)
- [Union Handling Fee](https://www.revenue.ie/en/customs/individuals/union-handling-fee/index.aspx)
- [How the Union Handling Fee applies](https://www.revenue.ie/en/customs/individuals/union-handling-fee/how-the-fee-applies.aspx)
- [What the Union Handling Fee means for consumers](https://www.revenue.ie/en/customs/individuals/union-handling-fee/what-does-this-mean.aspx)

