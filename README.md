# Quote Tool

A drop-in JavaScript quoting helper that reads a carrier underwriting data file and returns formatted life insurance quotes. The widget is designed so you can embed it on any site and customise the call-to-action that appears next to each quote.

## Project structure

```
.
├── carrier_underwriting.json   # Rate tables and product metadata
├── quote_tool.js               # UMD module that calculates and renders quotes
└── UNDERWRITING_REFERENCE.md   # Documentation for the JSON structure
```

## Getting started

1. Update `carrier_underwriting.json` with your carrier rates.
2. Load `quote_tool.js` on your site and initialise the calculator.
3. Pass a request describing your client to `calculateQuotes`.
4. Render the results next to your CTA button using `renderQuoteList`.

### Visual demo

For a ready-to-run UI, open `index.html` from this repository with a local static server:

```bash
# from the repository root
npx serve .
# ...or...
python -m http.server 8000
```

Then browse to the reported URL (for Python the default is http://localhost:8000/index.html). The demo mirrors the single-screen layout shown in the mock-up, automatically loads `carrier_underwriting.json`, and lets you:

* adjust coverage, age, state, and gender;
* toggle nicotine use and health conditions (the widget maps these to a reasonable health class automatically); and
* customise the CTA label/link per quote.

Click **Get Quotes** to render the results list. Every row includes the carrier, product, formatted modal premium, and your configured button.
### Browser example

```html
<div id="quote-output"></div>
<script src="/path/to/quote_tool.js"></script>
<script>
  (async function () {
    const data = await QuoteTool.loadUnderwritingData('/path/to/carrier_underwriting.json');
    const calculator = new QuoteTool.QuoteCalculator(data);
    const quotes = calculator.calculateQuotes({
      age: 37,
      gender: 'male',
      state: 'TX',
      coverageAmount: 500000,
      termYears: 20,
      productType: 'term',
      healthClass: 'preferred plus',
      nicotineUse: false,
      modality: 'monthly',
      buttonText: 'Book now',
      linkUrl: 'https://youragency.com/appointments'
    });

    const container = document.getElementById('quote-output');
    QuoteTool.renderQuoteList(quotes, { container });
  }());
</script>
```

### Node usage

```js
const { QuoteCalculator, loadUnderwritingData } = require('./quote_tool.js');

(async () => {
  const data = await loadUnderwritingData('./carrier_underwriting.json');
  const calculator = new QuoteCalculator(data);
  const quotes = calculator.calculateQuotes({
    age: 45,
    gender: 'female',
    state: 'CA',
    coverageAmount: 300000,
    productType: 'term',
    termYears: 20,
    healthClass: 'preferred',
    nicotineUse: false,
    modality: 'monthly',
    buttonText: 'Apply now',
    linkUrl: 'https://example.com/apply'
  });

console.log(quotes.map((quote) => `${quote.carrier} - ${quote.premium}/${quote.modality}`));
})();
```

### Quick CLI test

For a fast sanity check without writing your own script, run the bundled helper:

```bash
node scripts/run_quote.js --age 40 --gender female --state CA --coverage 300000 --term 20 --health "preferred" --button "Book now" --link "https://example.com/book"
```

Omit any flags to fall back to the defaults shown in the usage output. The script prints each matching quote in the format `Carrier (Product) - Premium/modality - Button text`, followed by the CTA link so you can confirm everything is wired correctly before embedding the widget.

### Customising the call-to-action

When you call `calculateQuotes`, include `buttonText` and `linkUrl` properties. These values are copied to each quote so the rendered node can use any destination and label you choose.

### Quote breakdowns

Every quote returned from `calculateQuotes` includes a `breakdown` object with:

* the base age band that was matched,
* the multipliers that were applied (health, nicotine, state, product), and
* the monthly premium before/after policy fees alongside the modal conversion that produced the returned price.

Use this to debug results or display additional information to the end user.

## License

MIT

