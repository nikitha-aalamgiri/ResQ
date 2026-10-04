import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getOfflineBundle, computeBundleEtag } from '../src/services/offlineBundle.js';

describe('ResQ Offline Bundle Service', () => {
  it('aggregates all public emergency datasets with valid schema', async () => {
    const bundle = await getOfflineBundle();

    assert.ok(bundle.serverTime, 'Must include serverTime ISO string');
    assert.ok(bundle.updatedAt, 'Must include per-category updatedAt dictionary');

    // Check categories exist and are arrays
    assert.ok(Array.isArray(bundle.shelters), 'Must include shelters array');
    assert.ok(Array.isArray(bundle.hospitals), 'Must include hospitals array');
    assert.ok(Array.isArray(bundle.floodZones), 'Must include floodZones array');
    assert.ok(Array.isArray(bundle.safeZones), 'Must include safeZones array');
    assert.ok(Array.isArray(bundle.blockedRoads), 'Must include blockedRoads array');
    assert.ok(Array.isArray(bundle.alerts), 'Must include alerts array');
    assert.ok(Array.isArray(bundle.contacts), 'Must include contacts array');
    assert.ok(Array.isArray(bundle.instructions), 'Must include instructions array');

    // Check shelter fields
    if (bundle.shelters.length > 0) {
      const s = bundle.shelters[0];
      assert.ok(s.id, 'Shelter must have id');
      assert.ok(s.name, 'Shelter must have name');
      assert.equal(typeof s.lat, 'number', 'Shelter lat must be number');
      assert.equal(typeof s.lng, 'number', 'Shelter lng must be number');
      assert.ok('capacity' in s, 'Shelter must have capacity');
      assert.ok('food' in s, 'Shelter must have food boolean');
      assert.ok('water' in s, 'Shelter must have water boolean');
      assert.ok('medical' in s, 'Shelter must have medical boolean');
      assert.ok('accessible' in s, 'Shelter must have accessible boolean');
      assert.ok('pets' in s, 'Shelter must have pets boolean');
      assert.ok('status' in s, 'Shelter must have status');
      assert.ok('updatedAt' in s, 'Shelter must have updatedAt');
    }

    // Check hospital fields
    if (bundle.hospitals.length > 0) {
      const h = bundle.hospitals[0];
      assert.ok(h.id, 'Hospital must have id');
      assert.ok(h.name, 'Hospital must have name');
      assert.equal(typeof h.lat, 'number', 'Hospital lat must be number');
      assert.equal(typeof h.lng, 'number', 'Hospital lng must be number');
      assert.ok(h.phone, 'Hospital must have phone');
      assert.ok('emergency_available' in h, 'Hospital must have emergency_available');
    }

    // Check safe zones
    assert.ok(bundle.safeZones.length > 0, 'Safe zones must not be empty');
    const sz = bundle.safeZones[0];
    assert.ok(sz.id, 'Safe zone must have id');
    assert.ok(sz.name, 'Safe zone must have name');
    assert.ok(sz.geometry, 'Safe zone must have geometry');

    // Check no user data / tokens leaked
    const jsonStr = JSON.stringify(bundle);
    assert.equal(jsonStr.includes('password'), false, 'Must never leak password');
    assert.equal(jsonStr.includes('token'), false, 'Must never leak auth tokens');
    assert.equal(jsonStr.includes('citizen_id'), false, 'Must never leak citizen_id');
  });

  it('computes deterministic ETag for identical bundle content', async () => {
    const bundle1 = await getOfflineBundle();
    const etag1 = computeBundleEtag(bundle1);
    const etag2 = computeBundleEtag(bundle1);

    assert.equal(typeof etag1, 'string');
    assert.ok(etag1.startsWith('"') && etag1.endsWith('"'));
    assert.equal(etag1, etag2, 'ETags must match for identical content');
  });
});
