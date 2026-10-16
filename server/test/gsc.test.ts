import test from 'node:test';
import assert from 'node:assert/strict';
import { GscService } from '../gscService.js';
import { McpService } from '../mcpService.js';
import { MCP_TOOLS } from '../mcpServer.js';
import {
  createSeoResearchJob,
  getSeoResearchJobById,
  saveGscSearchAnalyticsCache,
  getGscSearchAnalyticsCache
} from '../db.js';

test('GSC MCP Tools Registration', () => {
  const toolNames = MCP_TOOLS.map(t => t.name);
  const expectedGscTools = [
    'gsc_get_connection_status',
    'gsc_list_properties',
    'gsc_get_search_analytics',
    'gsc_get_top_queries',
    'gsc_get_top_pages',
    'gsc_get_research_status',
    'gsc_run_research_sync',
    'gsc_get_research_job'
  ];

  for (const tool of expectedGscTools) {
    assert.ok(toolNames.includes(tool), `Missing MCP tool: ${tool}`);
  }
});

test('GSC Service: Connection Status returns diagnostic when not authorized', async () => {
  const status = await GscService.getConnectionStatus();
  assert.ok(typeof status.isConnected === 'boolean');
  assert.ok(typeof status.selectedProperty === 'string');
  assert.ok(typeof status.hasCredentials === 'boolean');
});

test('GSC MCP Service: gscGetResearchStatus reports connection and jobs', async () => {
  const res = await McpService.gscGetResearchStatus();
  assert.ok(res.connection);
  assert.ok(Array.isArray(res.recentJobs));
});

test('GSC Database: Job lifecycle and cache persistence', () => {
  const testJobId = `test_job_${Date.now()}`;
  const job = createSeoResearchJob({
    job_id: testJobId,
    property: 'https://dawnexus.in/',
    date_range: '28d',
    dimensions: 'query',
    status: 'queued',
    triggered_by: 'automated-test'
  });

  assert.equal(job.job_id, testJobId);
  assert.equal(job.status, 'queued');

  const retrieved = getSeoResearchJobById(testJobId);
  assert.ok(retrieved);
  assert.equal(retrieved.job_id, testJobId);

  // Cache test
  const cacheCount = saveGscSearchAnalyticsCache([
    {
      property: 'https://dawnexus.in/',
      query: 'digital marketing agency coimbatore',
      clicks: 14,
      impressions: 280,
      ctr: 0.05,
      position: 8.2,
      period_type: 'current',
      start_date: '2026-09-15',
      end_date: '2026-10-14'
    }
  ]);
  assert.equal(cacheCount, 1);

  const cachedRows = getGscSearchAnalyticsCache('https://dawnexus.in/', 'current');
  assert.ok(cachedRows.length > 0);
  assert.equal(cachedRows[0].query, 'digital marketing agency coimbatore');
});
