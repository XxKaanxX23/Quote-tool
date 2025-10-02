#!/usr/bin/env node
const assert = require('node:assert/strict');
const { QuoteCalculator } = require('../quote_tool.js');
const dataset = require('./fixtures/regression_dataset.json');

const calculator = new QuoteCalculator(dataset);
const quotes = calculator.calculateQuotes({
  age: 78,
  gender: 'male',
  state: 'TX',
  coverageAmount: 10000,
  productType: 'fe',
  healthClass: 'standard',
  nicotineUse: false,
  modality: 'monthly'
});

if (!quotes.length) {
  throw new Error('No quotes produced for the regression scenario.');
}

const premium = quotes[0].premium;
assert.ok(Math.abs(premium - 119.92) < 0.01, `Expected monthly premium close to 119.92 but received ${premium}`);

console.log(`Regression scenario premium: ${premium.toFixed(2)}`);
