# Underwriting Data Reference

This document explains how the `carrier_underwriting.json` file is structured so you can safely adjust rates, add carriers, and understand how the quote tool interprets each field.

## Top-level keys

| Key | Description |
| --- | ----------- |
| `metadata` | Optional information about the dataset. Use it to set the default currency (`currency`), symbol (`currency_symbol`), coverage unit applied to rate tables (`base_coverage_unit`), and the period represented by each rate (`rate_table_period` / `rate_table_is_monthly`). The period defaults to monthly. |
| `carriers` | An array of carrier objects. Each carrier should contain a human-readable `name` and an array of `products`. |

## Carrier object

| Key | Required | Description |
| --- | -------- | ----------- |
| `name` | ✅ | Display name of the carrier. |
| `products` | ✅ | Array of product definitions for the carrier. Each product is evaluated individually when we calculate quotes. |

## Product object

| Key | Required | Description |
| --- | -------- | ----------- |
| `name` | ✅ | Display name of the product (e.g. `Term 20`). |
| `type` | ✅ | Product category. This value is normalised to lower-case (`term`, `whole`, `ul`, etc.) and can be used as a filter when requesting quotes. |
| `term_years` | ❌ | Numeric term length. Use `null` for permanent products. When a user requests a specific term length we only consider products with a matching value. |
| `base_coverage_unit` | ❌ | Overrides the dataset-level `base_coverage_unit` (defaults to 1,000). Rates are assumed to be *per unit*. |
| `product_factor` | ❌ | Additional multiplier applied to the rate before fees. Use it to account for product-level loadings (defaults to `1`). |
| `policy_fee_annual` | ❌ | Flat annual policy fee added before modality factors are applied (defaults to `0`). |
| `rate_table_period` | ❌ | Overrides the dataset-level interpretation of rate tables. Supported values are `monthly` and `annual`. |
| `modal_factors` | ❌ | Mapping of payment modal to a factor used to convert the base monthly premium into the requested frequency. If omitted we fall back to sensible defaults (`annual`, `semi_annual`, `quarterly`, `monthly`). Values are normalised so the monthly factor is treated as `1`. |
| `rate_table` | ✅ | Array of age bands (see below). |
| `health_factors` | ❌ | Map of health classes to multipliers. Keys are lower-case with underscores (e.g. `preferred_plus`). Unrecognised classes default to `1`. |
| `nicotine_factors` | ❌ | Map of nicotine use (`"true"` or `"false"`) to multipliers. Defaults to `1` for `false` and `1.5` for `true`. |
| `state_factors` | ❌ | Map of state abbreviations to multipliers. |
| `state_exclusions` | ❌ | Array of state abbreviations. If the applicant state is listed, the product is removed from consideration. |

### Age band structure

Each entry in `rate_table` defines the rate per coverage unit for a specific age range. Rates are interpreted as monthly amounts per unit unless you override the period via metadata or a product-level `rate_table_period`.

```json
{
  "min_age": 31,
  "max_age": 40,
  "rates": {
    "male": 0.225,
    "female": 0.215
  }
}
```

* `min_age` and `max_age` are inclusive.
* `rates` must contain keys for each supported gender (`male`, `female`).

## Adding a new carrier

1. Duplicate one of the existing carrier objects in `carrier_underwriting.json`.
2. Update the `name` and adjust the product list.
3. For each product make sure the age bands cover the entire target range of applicants.
4. Provide health, nicotine, and state adjustments if the carrier differentiates in those areas.

## Updating rates or factors

* **Rates** – update the numeric values inside each `rates` object.
* **Policy fee** – update `policy_fee_annual`.
* **Modality factors** – adjust the values in `modal_factors`. The quote tool treats the monthly factor as `1` and multiplies the base monthly premium (after adding a monthly-equivalent policy fee) by the chosen factor.

## Validation tips

* Ensure there are no overlapping or missing age bands for the same product.
* Keep rates positive. Negative or zero values will result in the product being skipped.
* If a state must be excluded, add it to `state_exclusions`. To surcharge or discount a state leave it out of exclusions and specify a multiplier in `state_factors` (e.g. `"CA": 1.07`).

## Example request payload

```js
const request = {
  age: 35,
  gender: "female",
  state: "CA",
  coverageAmount: 250000,
  termYears: 20,
  productType: "term",
  healthClass: "preferred plus",
  nicotineUse: false,
  modality: "monthly",
  buttonText: "Book now",
  linkUrl: "https://youragency.com/quote/123"
};
```

Pass this object to `QuoteCalculator#calculateQuotes()` to receive an array of ranked quotes. Each quote includes a `breakdown` object that exposes the exact multipliers that were applied so you can audit the result.

