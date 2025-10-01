#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const { QuoteCalculator, loadUnderwritingData } = require('../quote_tool.js');

function printUsage() {
  console.log(`Usage: node scripts/run_quote.js [options]\n\n` +
    `Options (defaults in parentheses):\n` +
    `  --data <path>             Path to underwriting JSON (./carrier_underwriting.json)\n` +
    `  --age <number>            Client age (35)\n` +
    `  --gender <male|female>    Client gender (male)\n` +
    `  --state <code>            Two-letter state code (TX)\n` +
    `  --coverage <number>       Coverage amount in dollars (250000)\n` +
    `  --term <number>           Term length in years (20)\n` +
    `  --product <type>          Product type: term | whole | iul (term)\n` +
    `  --health <class>          Health class (preferred plus)\n` +
    `  --nicotine <true|false>   Nicotine use flag (false)\n` +
    `  --modality <mode>         Payment mode: monthly | annual | quarterly | semiannual (monthly)\n` +
    `  --button <text>           CTA button label (Book now)\n` +
    `  --link <url>              CTA destination URL (https://example.com/book)\n` +
    `  --help                    Show this message\n`);
}

function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      continue;
    }
    const key = arg.slice(2);
    if (key === 'help') {
      opts.help = true;
      continue;
    }
    const value = argv[i + 1];
    if (typeof value === 'undefined' || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`);
    }
    opts[key] = value;
    i += 1;
  }
  return opts;
}

function coerceBoolean(value, fallback) {
  if (typeof value === 'undefined') {
    return fallback;
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`Invalid boolean value: ${value}`);
}

(async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
      printUsage();
      return;
    }

    const dataPath = path.resolve(process.cwd(), args.data || './carrier_underwriting.json');
    if (!fs.existsSync(dataPath)) {
      throw new Error(`Cannot find underwriting file at ${dataPath}`);
    }

    const underwritingData = await loadUnderwritingData(dataPath);
    const calculator = new QuoteCalculator(underwritingData);

    const quoteRequest = {
      age: Number.parseInt(args.age || '35', 10),
      gender: (args.gender || 'male').toLowerCase(),
      state: (args.state || 'TX').toUpperCase(),
      coverageAmount: Number.parseInt(args.coverage || '250000', 10),
      termYears: Number.parseInt(args.term || '20', 10),
      productType: (args.product || 'term').toLowerCase(),
      healthClass: (args.health || 'preferred plus').toLowerCase(),
      nicotineUse: coerceBoolean(args.nicotine, false),
      modality: (args.modality || 'monthly').toLowerCase(),
      buttonText: args.button || 'Book now',
      linkUrl: args.link || 'https://example.com/book'
    };

    const quotes = calculator.calculateQuotes(quoteRequest);
    if (!quotes.length) {
      console.log('No quotes available for the supplied criteria.');
      return;
    }

    console.log('Quotes:\n');
    for (const quote of quotes) {
      console.log(`${quote.carrier} (${quote.product}) - ${quote.premium}/${quote.modality} - ${quote.buttonText}`);
      console.log(`  Link: ${quote.linkUrl}`);
    }
  } catch (error) {
    console.error(error.message);
    printUsage();
    process.exitCode = 1;
  }
})();
