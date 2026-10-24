import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { 
  getContactSettings, 
  updateContactSettings,
  DEFAULT_CONTACT_SETTINGS 
} from '../db.js';

describe('Dawnexus: Dynamic Contact & Social Settings Suite', () => {

  test('Retrieves default contact and social settings', () => {
    const settings = getContactSettings();
    assert.ok(settings, 'Contact settings must exist');
    assert.ok(settings.phone.length > 0, 'Phone number must be present');
    assert.ok(settings.email.includes('@'), 'Valid email must be present');
    assert.ok(settings.instagram_url.startsWith('http'), 'Instagram URL must start with http');
    assert.ok(settings.facebook_url.startsWith('http'), 'Facebook URL must start with http');
    assert.ok(settings.linkedin_url.startsWith('http'), 'LinkedIn URL must start with http');
  });

  test('Updates contact phone, email, and social profiles', () => {
    const original = getContactSettings();

    const updated = updateContactSettings({
      phone: '+91 98765 43210',
      email: 'hello@dawnexus.in',
      instagram_url: 'https://instagram.com/dawnexus_official',
      facebook_url: 'https://facebook.com/dawnexus_official',
      linkedin_url: 'https://linkedin.com/company/dawnexus_official',
      address: '123 Cross Cut Road, Coimbatore, Tamil Nadu, 641012'
    });

    assert.equal(updated.phone, '+91 98765 43210');
    assert.equal(updated.email, 'hello@dawnexus.in');
    assert.equal(updated.instagram_url, 'https://instagram.com/dawnexus_official');
    assert.equal(updated.facebook_url, 'https://facebook.com/dawnexus_official');
    assert.equal(updated.linkedin_url, 'https://linkedin.com/company/dawnexus_official');
    assert.equal(updated.address, '123 Cross Cut Road, Coimbatore, Tamil Nadu, 641012');

    // Verify persistence in db
    const reloaded = getContactSettings();
    assert.equal(reloaded.phone, '+91 98765 43210');
    assert.equal(reloaded.email, 'hello@dawnexus.in');
    assert.equal(reloaded.address, '123 Cross Cut Road, Coimbatore, Tamil Nadu, 641012');

    // Restore original settings
    updateContactSettings(original);
  });

  test('Supports optional address by allowing empty address', () => {
    const original = getContactSettings();

    const updated = updateContactSettings({
      address: ''
    });

    assert.equal(updated.address, '');
    const reloaded = getContactSettings();
    assert.equal(reloaded.address, '');

    // Restore original
    updateContactSettings(original);
  });

  test('Preserves existing fields when updating partial settings', () => {
    const original = getContactSettings();

    const updated = updateContactSettings({
      phone: '+91 99999 88888'
    });

    assert.equal(updated.phone, '+91 99999 88888');
    assert.equal(updated.email, original.email);
    assert.equal(updated.instagram_url, original.instagram_url);
    assert.equal(updated.facebook_url, original.facebook_url);
    assert.equal(updated.linkedin_url, original.linkedin_url);

    // Restore
    updateContactSettings(original);
  });
});
