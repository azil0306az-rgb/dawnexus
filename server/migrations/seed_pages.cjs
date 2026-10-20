const { Client } = require('pg');
require('dotenv').config();

// Require our TS file through tsx or inline representation
const pages = [
  'website-design',
  'seo-services',
  'ai-video-creation',
  'digital-marketing'
];

async function seed() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log('Seeding default pages into PostgreSQL if missing...');
  // Read websiteContent defaults
  const { DEFAULT_SERVICE_PAGES } = await import('../websiteContent.js');

  for (const slug of pages) {
    const page = DEFAULT_SERVICE_PAGES[slug];
    if (!page) continue;

    const check = await client.query('SELECT id, version FROM website_pages WHERE slug = $1', [slug]);
    if (check.rows.length === 0) {
      const res = await client.query(`
        INSERT INTO website_pages (
          slug, title, canonical_url, hero_badge, hero_subtitle, hero_description,
          hero_primary_cta, hero_secondary_cta, capabilities_json, process_steps_json,
          packages_json, faqs_json, cta_section_json, meta_title, meta_description,
          og_image, status, version, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 1, NOW()
        ) RETURNING id;
      `, [
        page.slug,
        page.title,
        page.canonical_url,
        page.hero_badge,
        page.hero_subtitle,
        page.hero_description,
        page.hero_primary_cta,
        page.hero_secondary_cta,
        JSON.stringify(page.capabilities),
        JSON.stringify(page.process_steps),
        JSON.stringify(page.packages),
        JSON.stringify(page.faqs),
        JSON.stringify(page.cta_section),
        page.meta_title,
        page.meta_description,
        page.og_image,
        page.status
      ]);

      const pageId = res.rows[0].id;
      // Also insert initial published version record
      await client.query(`
        INSERT INTO website_content_versions (
          page_slug, version_number, content_json, change_summary, created_by, is_published, published_at
        ) VALUES (
          $1, 1, $2, 'Initial authoritative version', 'system_init', 1, NOW()
        );
      `, [slug, JSON.stringify(page)]);

      console.log(`Seeded page [${slug}] with initial Version 1`);
    } else {
      console.log(`Page [${slug}] already exists in PostgreSQL (version: ${check.rows[0].version})`);
    }
  }

  await client.end();
  console.log('PostgreSQL seed completed successfully.');
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
