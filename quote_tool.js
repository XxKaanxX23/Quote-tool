(function (globalScope, factory) {
  if (typeof module === "object" && typeof module.exports === "object") {
    module.exports = factory();
  } else {
    const existing = globalScope.QuoteTool;
    const api = factory();
    api.noConflict = function noConflict() {
      globalScope.QuoteTool = existing;
      return api;
    };
    globalScope.QuoteTool = api;
  }
})(typeof window !== "undefined" ? window : globalThis, function quoteToolFactory() {
  "use strict";

  const DEFAULT_MODALITY = "monthly";
  const SUPPORTED_GENDERS = new Set(["male", "female"]);

  const DEFAULTS = Object.freeze({
    currency: "USD",
    currencySymbol: "$",
    baseCoverageUnit: 1000,
    modalFactors: {
      annual: 1,
      semi_annual: 0.52,
      quarterly: 0.265,
      monthly: 0.09
    },
    buttonText: "Book now",
    linkUrl: "#"
  });

  const HEALTH_CLASS_ALIASES = Object.freeze({
    "preferred plus": "preferred_plus",
    "preferred+": "preferred_plus",
    "preferred plus non-tobacco": "preferred_plus",
    "preferred": "preferred",
    "standard plus": "standard_plus",
    "standard+": "standard_plus",
    "standard": "standard",
    "table a": "table_a",
    "table b": "table_b"
  });

  function clone(value) {
    if (!value || typeof value !== "object") return value;
    if (Array.isArray(value)) return value.map(clone);
    return Object.keys(value).reduce((acc, key) => {
      acc[key] = clone(value[key]);
      return acc;
    }, {});
  }

  function normaliseKey(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  function normaliseHealthClass(value) {
    const key = normaliseKey(value).replace(/[^a-z+ ]/g, "");
    return HEALTH_CLASS_ALIASES[key] || key.replace(/\s+/g, "_");
  }

  function assertNumber(name, value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      throw new TypeError(`${name} must be a finite number.`);
    }
    return numeric;
  }

  function formatCurrency(amount, currencySymbol) {
    const value = Number(amount);
    if (!Number.isFinite(value)) return "-";
    return `${currencySymbol}${value.toFixed(2)}`;
  }

  function resolveModalFactor(product, modality) {
    const modal = modality || DEFAULT_MODALITY;
    const factors = {
      ...DEFAULTS.modalFactors,
      ...(product && product.modal_factors ? product.modal_factors : {})
    };
    if (!Object.prototype.hasOwnProperty.call(factors, modal)) {
      throw new RangeError(`Unsupported payment modality \"${modal}\".`);
    }
    return { modal, factor: factors[modal] };
  }

  function stateAdjustment(product, state) {
    if (!product) return 1;
    if (product.state_exclusions && product.state_exclusions.includes(state)) {
      return 0;
    }
    const adjustments = product.state_factors || {};
    return Object.prototype.hasOwnProperty.call(adjustments, state)
      ? adjustments[state]
      : 1;
  }

  function findRateBand(rateTable, age) {
    if (!Array.isArray(rateTable)) {
      throw new TypeError("Product rate_table must be an array of age bands.");
    }
    return rateTable.find((band) => {
      const min = Number.isFinite(band.min_age) ? band.min_age : 0;
      const max = Number.isFinite(band.max_age) ? band.max_age : Infinity;
      return age >= min && age <= max;
    });
  }

  function guardGenderRate(rateBand, gender) {
    const normalisedGender = normaliseKey(gender);
    if (!SUPPORTED_GENDERS.has(normalisedGender)) {
      throw new RangeError(`Unsupported gender \"${gender}\". Expected: ${Array.from(SUPPORTED_GENDERS).join(", ")}`);
    }
    const rates = rateBand.rates || {};
    if (!Object.prototype.hasOwnProperty.call(rates, normalisedGender)) {
      throw new RangeError(`No rate available for gender \"${gender}\" within the selected band.`);
    }
    return rates[normalisedGender];
  }

  function resolveFactor(map, key, defaultValue = 1) {
    if (!map) return defaultValue;
    const normalised = normaliseHealthClass(key);
    if (Object.prototype.hasOwnProperty.call(map, normalised)) {
      return map[normalised];
    }
    return Object.prototype.hasOwnProperty.call(map, key)
      ? map[key]
      : defaultValue;
  }

  function buildBreakdown(details) {
    return {
      baseRatePerUnit: details.baseRatePerUnit,
      baseCoverageUnit: details.baseCoverageUnit,
      coverageAmount: details.coverageAmount,
      age: details.age,
      gender: details.gender,
      rateBand: clone(details.rateBand),
      healthClass: details.healthClass,
      nicotineUse: details.nicotineUse,
      appliedFactors: clone(details.appliedFactors),
      policyFeeAnnual: details.policyFeeAnnual,
      modality: details.modality,
      modalFactor: details.modalFactor,
      annualPremiumBeforeFees: details.annualPremiumBeforeFees,
      annualPremiumAfterFees: details.annualPremiumAfterFees,
      modalPremium: details.modalPremium
    };
  }

  class QuoteCalculator {
    constructor(underwritingData) {
      if (!underwritingData || typeof underwritingData !== "object") {
        throw new TypeError("underwritingData must be an object.");
      }
      const metadata = underwritingData.metadata || {};
      this.metadata = {
        currency: metadata.currency || DEFAULTS.currency,
        currencySymbol: metadata.currency_symbol || DEFAULTS.currencySymbol,
        baseCoverageUnit: metadata.base_coverage_unit || DEFAULTS.baseCoverageUnit
      };
      this.carriers = Array.isArray(underwritingData.carriers)
        ? underwritingData.carriers.slice()
        : [];
    }

    listCarriers() {
      return this.carriers.map((carrier) => carrier.name);
    }

    calculateQuotes(request) {
      if (!request) {
        throw new TypeError("A request object is required to calculate quotes.");
      }
      const age = assertNumber("age", request.age);
      const coverageAmount = assertNumber("coverageAmount", request.coverageAmount);
      const gender = normaliseKey(request.gender);
      const state = (request.state || "").toUpperCase();
      const healthClass = normaliseHealthClass(request.healthClass || "standard");
      const nicotineUse = Boolean(request.nicotineUse);
      const modality = request.modality || DEFAULT_MODALITY;
      const productFilter = request.productType ? normaliseKey(request.productType) : null;
      const termFilter = Number.isFinite(request.termYears) ? Number(request.termYears) : null;
      const linkUrl = request.linkUrl || DEFAULTS.linkUrl;
      const buttonText = request.buttonText || DEFAULTS.buttonText;

      if (coverageAmount <= 0) {
        throw new RangeError("coverageAmount must be greater than zero.");
      }

      const quotes = [];

      for (const carrier of this.carriers) {
        if (!carrier || typeof carrier !== "object") continue;
        const carrierName = carrier.name || "Unnamed Carrier";
        const products = Array.isArray(carrier.products) ? carrier.products : [];

        for (const product of products) {
          const productType = normaliseKey(product.type || product.product_type || product.name || "");
          const termYears = Number.isFinite(product.term_years) ? product.term_years : null;

          if (productFilter && productType !== productFilter) continue;
          if (termFilter !== null && termYears !== termFilter) continue;

          const stateFactor = stateAdjustment(product, state);
          if (stateFactor === 0) continue;

          const rateBand = findRateBand(product.rate_table || [], age);
          if (!rateBand) continue;
          const baseRatePerUnit = guardGenderRate(rateBand, gender);

          const baseCoverageUnit = product.base_coverage_unit || this.metadata.baseCoverageUnit;
          const coverageUnits = coverageAmount / baseCoverageUnit;
          if (!Number.isFinite(coverageUnits) || coverageUnits <= 0) continue;

          const healthFactor = resolveFactor(product.health_factors, healthClass, 1);
          const nicotineFactor = resolveFactor(product.nicotine_factors, nicotineUse ? "true" : "false", nicotineUse ? 1.5 : 1);
          const productFactor = Number.isFinite(product.product_factor) ? product.product_factor : 1;
          const annualPremiumBeforeFees = baseRatePerUnit * coverageUnits * healthFactor * nicotineFactor * stateFactor * productFactor;

          const policyFeeAnnual = Number.isFinite(product.policy_fee_annual) ? product.policy_fee_annual : 0;

          const { modal, factor: modalFactor } = resolveModalFactor(product, modality);

          const annualPremiumAfterFees = annualPremiumBeforeFees + policyFeeAnnual;
          const modalPremium = annualPremiumAfterFees * modalFactor;

          const formattedPremium = Number(modalPremium.toFixed(2));

          quotes.push({
            carrier: carrierName,
            product: product.name || carrierName,
            productType,
            termYears,
            coverageAmount,
            premium: formattedPremium,
            currency: this.metadata.currency,
            currencySymbol: this.metadata.currencySymbol,
            modality: modal,
            linkUrl,
            buttonText,
            breakdown: buildBreakdown({
              baseRatePerUnit,
              baseCoverageUnit,
              coverageAmount,
              age,
              gender,
              rateBand,
              healthClass,
              nicotineUse,
              appliedFactors: {
                health: healthFactor,
                nicotine: nicotineFactor,
                state: stateFactor,
                product: productFactor
              },
              policyFeeAnnual,
              modality: modal,
              modalFactor,
              annualPremiumBeforeFees,
              annualPremiumAfterFees,
              modalPremium
            })
          });
        }
      }

      quotes.sort((a, b) => a.premium - b.premium);
      return quotes;
    }
  }

  async function loadUnderwritingData(source) {
    if (!source) {
      throw new TypeError("A source is required to load underwriting data.");
    }

    if (typeof source === "object") {
      return source;
    }

    if (typeof source !== "string") {
      throw new TypeError("source must be either an object or a string path/URL.");
    }

    if (typeof window !== "undefined" && typeof window.fetch === "function") {
      const response = await window.fetch(source, { headers: { Accept: "application/json" } });
      if (!response.ok) {
        throw new Error(`Unable to load underwriting data: ${response.status} ${response.statusText}`);
      }
      return response.json();
    }

    if (typeof require === "function") {
      try {
        const fs = require("fs/promises");
        const data = await fs.readFile(source, "utf8");
        return JSON.parse(data);
      } catch (error) {
        if (error && error.code === "MODULE_NOT_FOUND") {
          throw new Error("fs/promises module is not available in this environment.");
        }
        throw error;
      }
    }

    throw new Error("Unable to load underwriting data in the current environment.");
  }

  function renderQuoteList(quotes, options) {
    if (!Array.isArray(quotes)) {
      throw new TypeError("quotes must be an array returned by calculateQuotes.");
    }
    const settings = {
      container: null,
      currencySymbol: quotes[0] ? quotes[0].currencySymbol : DEFAULTS.currencySymbol,
      onButtonClick: null,
      ...options
    };

    if (!settings.container) {
      throw new Error("A container element is required to render quotes.");
    }

    const container = settings.container;
    container.innerHTML = "";

    const list = container.ownerDocument.createElement("div");
    list.className = "quote-tool__list";

    for (const quote of quotes) {
      const item = container.ownerDocument.createElement("div");
      item.className = "quote-tool__item";

      const label = container.ownerDocument.createElement("div");
      label.className = "quote-tool__label";
      label.textContent = `${quote.carrier} - ${formatCurrency(quote.premium, settings.currencySymbol)}/${quote.modality}`;
      item.appendChild(label);

      const button = container.ownerDocument.createElement("a");
      button.className = "quote-tool__cta";
      button.href = quote.linkUrl || "#";
      button.textContent = quote.buttonText || DEFAULTS.buttonText;
      button.setAttribute("data-carrier", quote.carrier);
      button.setAttribute("data-product", quote.product);
      button.setAttribute("role", "button");

      if (typeof settings.onButtonClick === "function") {
        button.addEventListener("click", (event) => {
          settings.onButtonClick(event, quote);
        });
      }

      item.appendChild(button);
      list.appendChild(item);
    }

    container.appendChild(list);
    return container;
  }

  return {
    QuoteCalculator,
    loadUnderwritingData,
    renderQuoteList,
    formatCurrency
  };
});
