import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  DEFAULT_PRICING_CONFIG, 
  calculateWebsiteCost, 
  validateCalculatorSelections,
  generateEstimateReferenceId 
} from '../calculatorPricing.js';
import { 
  getCalculatorPricingConfig, 
  updateCalculatorPricingConfig,
  createEnquiry,
  deleteEnquiry
} from '../db.js';

test('Cost Estimator: calculateWebsiteCost calculates correct landing page cost', () => {
  const result = calculateWebsiteCost(DEFAULT_PRICING_CONFIG, {
    websiteType: 'landing-page',
    pageCount: 1,
    selectedFeatures: ['seo-setup'],
    designTier: 'Standard',
    maintenanceOption: 'None'
  });

  assert.equal(result.isCustomQuoteRequired, false);
  assert.equal(result.includedPages, 1);
  assert.equal(result.additionalPages, 0);
  assert.equal(result.additionalPagesTotal, 0);
  // Base 9999 + seo-setup 4999 = 14998
  assert.equal(result.subtotalOneTime, 14998);
  assert.equal(result.recurringMaintenance.amount, 0);
  assert.ok(result.items.length >= 2);
});

test('Cost Estimator: calculates extra pages correctly avoiding double charge on included pages', () => {
  // Business website includes 5 pages at base 19999, extra page is 1500 each.
  // 8 pages = 3 extra pages * 1500 = 4500 extra. Total = 19999 + 4500 = 24499.
  const result = calculateWebsiteCost(DEFAULT_PRICING_CONFIG, {
    websiteType: 'business-website',
    pageCount: 8,
    selectedFeatures: [],
    designTier: 'Standard',
    maintenanceOption: 'None'
  });

  assert.equal(result.includedPages, 5);
  assert.equal(result.additionalPages, 3);
  assert.equal(result.additionalPagesTotal, 4500);
  assert.equal(result.subtotalOneTime, 24499);
});

test('Cost Estimator: applies design tier adjustment', () => {
  const result = calculateWebsiteCost(DEFAULT_PRICING_CONFIG, {
    websiteType: 'business-website',
    pageCount: 5,
    selectedFeatures: [],
    designTier: 'Premium', // +7500
    maintenanceOption: 'None'
  });

  // Base 19999 + Premium 7500 = 27499
  assert.equal(result.subtotalOneTime, 27499);
  assert.equal(result.designTier.priceAdjustment, 7500);
});

test('Cost Estimator: separates recurring monthly maintenance from one-time setup total', () => {
  const result = calculateWebsiteCost(DEFAULT_PRICING_CONFIG, {
    websiteType: 'ecommerce-website',
    pageCount: 8,
    selectedFeatures: ['payment-gateway', 'customer-accounts'],
    designTier: 'Standard',
    maintenanceOption: 'Monthly' // 2499/month
  });

  assert.equal(result.recurringMaintenance.amount, 2499);
  assert.equal(result.recurringMaintenance.period, 'month');
  // One-time total: 34999 (base) + 5999 (payment-gateway) + 7999 (customer-accounts) = 48997
  assert.equal(result.subtotalOneTime, 48997);
});

test('Cost Estimator: flags custom quote if page count exceeds maxStandardPages', () => {
  const highPageResult = calculateWebsiteCost(DEFAULT_PRICING_CONFIG, {
    websiteType: 'business-website',
    pageCount: 45,
    selectedFeatures: [],
    designTier: 'Standard',
    maintenanceOption: 'None'
  });

  assert.equal(highPageResult.isCustomQuoteRequired, true);
  assert.ok(highPageResult.customQuoteReasons.some(r => r.includes('exceeds')));
});

test('Cost Estimator: generates unique estimate reference ID format', () => {
  const ref1 = generateEstimateReferenceId();
  const ref2 = generateEstimateReferenceId();
  assert.match(ref1, /^DNX-EST-\d{8}-[A-Z0-9]{4}$/);
  assert.notEqual(ref1, ref2);
});

test('Cost Estimator: validates selections against invalid inputs', () => {
  const valid = validateCalculatorSelections({
    websiteType: 'portfolio-website',
    pageCount: 4,
    designTier: 'Custom',
    selectedFeatures: ['seo-setup'],
    maintenanceOption: 'Monthly'
  });
  assert.equal(valid.valid, true);

  const invalidPages = validateCalculatorSelections({
    websiteType: 'business-website',
    pageCount: -3,
    designTier: 'Standard',
    selectedFeatures: [],
    maintenanceOption: 'None'
  });
  assert.equal(invalidPages.valid, false);
});

test('Cost Estimator DB: updates and retrieves calculator pricing config', async () => {
  const currentConfig = await getCalculatorPricingConfig();
  assert.ok(Array.isArray(currentConfig.websiteTypes));
  assert.ok(currentConfig.websiteTypes.some(t => t.id === 'business-website'));

  // Modify maxStandardPages and update
  const updated = await updateCalculatorPricingConfig({
    ...currentConfig,
    maxStandardPages: 35
  });

  assert.equal(updated.maxStandardPages, 35);

  // Restore
  await updateCalculatorPricingConfig({
    ...currentConfig,
    maxStandardPages: 30
  });
});

test('Cost Estimator DB: persists estimate_ref_id and estimate_data in enquiries table', async () => {
  const testRefId = generateEstimateReferenceId();
  const testEstimate = {
    selections: { websiteType: 'business-website', pageCount: 5 },
    breakdown: { subtotalOneTime: 19999, isCustomQuoteRequired: false }
  };

  const enq = await createEnquiry({
    full_name: 'Estimator Test User',
    email: 'estimator-test@dawnexus.in',
    phone: '+91 9999999999',
    business_name: 'Estimator Corp',
    requested_services: ['Website Cost Estimator'],
    budget: '₹19,999 (Estimate Reference: ' + testRefId + ')',
    project_details: 'Test inquiry generated by automated test suite',
    estimate_ref_id: testRefId,
    estimate_data: JSON.stringify(testEstimate)
  });

  try {
    assert.ok(enq.id > 0);
    assert.equal(enq.estimate_ref_id, testRefId);
    assert.ok(enq.estimate_data);
    const parsedData = typeof enq.estimate_data === 'string' ? JSON.parse(enq.estimate_data) : enq.estimate_data;
    assert.equal(parsedData.breakdown.subtotalOneTime, 19999);
  } finally {
    if (enq && enq.id) {
      deleteEnquiry(enq.id);
    }
  }
});
