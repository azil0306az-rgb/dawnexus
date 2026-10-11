import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifySearchIntent,
  calculateOpportunityScore,
  checkExistingCoverage,
  getRecommendedInternalLinks,
  generateBlogPromptTemplate,
  encryptPayload,
  decryptPayload
} from '../routes/seoResearch.js';

test('Intent Classification: Correctly identifies search intents deterministically', () => {
  assert.equal(classifySearchIntent('cost of website design for small business'), 'Commercial');
  assert.equal(classifySearchIntent('hire best digital marketing agency'), 'Commercial');
  assert.equal(classifySearchIntent('download seo audit checklist'), 'Transactional');
  assert.equal(classifySearchIntent('dawnexus client login portal'), 'Navigational');
  assert.equal(classifySearchIntent('how to structure google ads campaign'), 'Informational');
  assert.equal(classifySearchIntent('what is ai video production'), 'Informational');
});

test('Opportunity Scoring: Striking distance queries receive high priority scores', () => {
  // Query ranking position 9.4 with 840 impressions and 5% CTR
  const result1 = calculateOpportunityScore({
    query: 'ai video production company coimbatore',
    clicks: 42,
    impressions: 840,
    ctr: 0.05,
    position: 9.4
  });

  assert.ok(result1.score >= 70, `Score should be >= 70, got ${result1.score}`);
  assert.equal(result1.opportunityType, 'Striking Distance');

  // Query ranking position 2 with 50 impressions
  const result2 = calculateOpportunityScore({
    query: 'dawnexus brand query',
    clicks: 20,
    impressions: 50,
    ctr: 0.40,
    position: 1.5
  });

  assert.ok(result2.score <= result1.score, 'Top position queries should have lower expansion score than striking distance queries');
});

test('Cannibalization Detection: Identifies existing blogs covering the target topic', () => {
  const existingBlogs = [
    { title: 'Website Design Costs in Coimbatore: What Businesses Should Know in 2026', slug: 'website-design-cost-coimbatore', primary_keyword: 'website design costs in coimbatore' },
    { title: 'Local SEO Playbook for Google Maps', slug: 'local-seo-google-maps-playbook', primary_keyword: 'local seo google maps' }
  ];

  const matchExact = checkExistingCoverage('website design costs in coimbatore', existingBlogs);
  assert.equal(matchExact.covered, true);
  assert.equal(matchExact.slug, 'website-design-cost-coimbatore');
  assert.equal(matchExact.matchType, 'Exact Keyword');

  const matchTitle = checkExistingCoverage('Google Maps', existingBlogs);
  assert.equal(matchTitle.covered, true);
  assert.equal(matchTitle.slug, 'local-seo-google-maps-playbook');

  const noMatch = checkExistingCoverage('unrelated aerospace engineering topic', existingBlogs);
  assert.equal(noMatch.covered, false);
});

test('Internal Links: Maps queries to canonical service URLs without hallucinatory links', () => {
  const webLinks = getRecommendedInternalLinks('modern web design agency');
  assert.ok(webLinks.some(l => l.url === 'https://dawnexus.in/services/website-design'));

  const seoLinks = getRecommendedInternalLinks('rank higher on google search');
  assert.ok(seoLinks.some(l => l.url === 'https://dawnexus.in/services/seo-services'));

  const videoLinks = getRecommendedInternalLinks('create reels with ai tools');
  assert.ok(videoLinks.some(l => l.url === 'https://dawnexus.in/services/ai-video-creation'));
});

test('Prompt Generator: Emits structured, copy-ready prompt with required sections', () => {
  const prompt = generateBlogPromptTemplate({
    targetKeyword: 'ai video production company coimbatore',
    searchIntent: 'Commercial',
    articleType: 'Comprehensive Guide & Service Breakdown',
    secondaryKeywords: ['ai video cost coimbatore', 'commercial video marketing'],
    opportunityRationale: 'Striking distance position 9.4 with 840 monthly search impressions.',
    internalLinks: [
      { url: 'https://dawnexus.in/services/ai-video-creation', anchor: 'AI video production services', title: 'AI Video Creation' }
    ]
  });

  assert.ok(prompt.includes('PROMPT: COMPLETE SEO-OPTIMIZED BLOG ARTICLE FOR DAWNEXUS'));
  assert.ok(prompt.includes('Target Primary Keyword:** ai video production company coimbatore'));
  assert.ok(prompt.includes('Search Intent:** Commercial'));
  assert.ok(prompt.includes('Required Internal Links'));
  assert.ok(prompt.includes('https://dawnexus.in/services/ai-video-creation'));
  assert.ok(prompt.includes('yaml'));
});

test('Encryption: Securely encrypts and decrypts OAuth tokens with AES-256-GCM', () => {
  const sampleTokenPayload = JSON.stringify({
    access_token: 'ya29.sample_mock_access_token_12345',
    refresh_token: '1//0g_sample_refresh_token_67890',
    expires_in: 3600
  });

  const encrypted = encryptPayload(sampleTokenPayload);
  assert.notEqual(encrypted, sampleTokenPayload);
  assert.ok(encrypted.includes(':')); // Format: iv:authTag:cipher

  const decrypted = decryptPayload(encrypted);
  assert.equal(decrypted, sampleTokenPayload);
});

