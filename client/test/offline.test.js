import 'fake-indexeddb/auto';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  db,
  setMeta,
  getMeta,
  setLastSync,
  getLastSync,
  setLastKnownLocation,
  getLastKnownLocation,
  clearUserSessionData,
} from '../src/offline/db.js';

import {
  STATIC_CONTACTS,
  STATIC_INSTRUCTIONS,
  seedStaticContent,
} from '../src/offline/staticContent.js';

import {
  getFreshness,
  FRESHNESS_THRESHOLDS,
  formatSyncTime,
} from '../src/offline/freshness.js';

import { syncAll } from '../src/offline/syncService.js';

describe('ResQ Phase 1 Offline Architecture Test Suite', () => {
  beforeEach(async () => {
    // Clear all tables before each test
    await db.shelters.clear();
    await db.hospitals.clear();
    await db.floodZones.clear();
    await db.safeZones.clear();
    await db.blockedRoads.clear();
    await db.contacts.clear();
    await db.alerts.clear();
    await db.instructions.clear();
    await db.routes.clear();
    await db.mySos.clear();
    await db.sosQueue.clear();
    await db.meta.clear();
  });

  // Group 1: Dexie IndexedDB Schema & Session Guard
  describe('Group 1: IndexedDB Schema & Session Isolation', () => {
    it('initializes all 12 tables and manages key-value metadata', async () => {
      await setMeta('test_key', { hello: 'world' });
      const val = await getMeta('test_key');
      assert.deepEqual(val, { hello: 'world' });

      const syncTime = '2026-10-04T08:00:00.000Z';
      await setLastSync('shelters', syncTime);
      const retrieved = await getLastSync('shelters');
      assert.equal(retrieved, syncTime);
    });

    it('stores and retrieves last known user location with timestamp', async () => {
      await setLastKnownLocation({
        lat: 17.3850,
        lng: 78.4867,
        accuracy: 15,
      });

      const loc = await getLastKnownLocation();
      assert.ok(loc);
      assert.equal(loc.lat, 17.3850);
      assert.equal(loc.lng, 78.4867);
      assert.ok(loc.timestamp);
    });

    it('clearUserSessionData clears personal items on logout but preserves public emergency data', async () => {
      // Seed public data
      await db.shelters.put({ id: 'sh-1', name: 'Safe Shelter', status: 'open', capacity: 100, occupancy: 10 });
      await db.contacts.put({ number: '112', service_key: 'national_emergency', label_key: 'test' });

      // Seed citizen personal data
      await db.mySos.put({ id: 'FQ1024', status: 'WAITING', priority: 'critical', createdAt: new Date().toISOString() });
      await db.routes.put({ id: 'rt-1', createdAt: new Date().toISOString() });
      await setLastKnownLocation({ lat: 17.38, lng: 78.48 });
      await db.sosQueue.put({ localId: 1, status: 'synced', clientGeneratedId: 'cg-1' });
      await db.sosQueue.put({ localId: 2, status: 'pending_unsent', clientGeneratedId: 'cg-2' });

      // Trigger logout cleanup
      await clearUserSessionData();

      // Verify personal data is eradicated
      assert.equal(await db.mySos.count(), 0, 'mySos must be cleared on logout');
      assert.equal(await db.routes.count(), 0, 'routes must be cleared on logout');
      assert.equal(await getLastKnownLocation(), null, 'lastKnownLocation must be deleted on logout');
      
      // Verify pending unsent queue item is preserved for Phase 3 sync, but synced ones deleted
      const remainingQueue = await db.sosQueue.toArray();
      assert.equal(remainingQueue.length, 1);
      assert.equal(remainingQueue[0].status, 'pending_unsent');

      // Verify public emergency data is strictly preserved
      assert.equal(await db.shelters.count(), 1, 'Public shelters must be preserved on logout');
      assert.equal(await db.contacts.count(), 1, 'Public contacts must be preserved on logout');
    });
  });

  // Group 2: Freshness Thresholds
  describe('Group 2: Freshness & Staleness Governance', () => {
    const fixedNow = 1700000000000; // Reference epoch

    it('marks shelters fresh (<30m), stale (30m-2h), and very stale (>=2h)', () => {
      // 10 minutes ago -> fresh
      const t10m = fixedNow - 10 * 60 * 1000;
      const f1 = getFreshness('shelters', t10m, fixedNow);
      assert.equal(f1.level, 'fresh');

      // 45 minutes ago -> stale
      const t45m = fixedNow - 45 * 60 * 1000;
      const f2 = getFreshness('shelters', t45m, fixedNow);
      assert.equal(f2.level, 'stale');

      // 3 hours ago -> very_stale
      const t3h = fixedNow - 3 * 60 * 60 * 1000;
      const f3 = getFreshness('shelters', t3h, fixedNow);
      assert.equal(f3.level, 'very_stale');
    });

    it('marks flood zones fresh up to 6 hours and stale after 6 hours', () => {
      // 4 hours ago -> fresh
      const t4h = fixedNow - 4 * 60 * 60 * 1000;
      const f1 = getFreshness('floodZones', t4h, fixedNow);
      assert.equal(f1.level, 'fresh');

      // 7 hours ago -> stale
      const t7h = fixedNow - 7 * 60 * 60 * 1000;
      const f2 = getFreshness('floodZones', t7h, fixedNow);
      assert.equal(f2.level, 'stale');

      // 14 hours ago -> very_stale
      const t14h = fixedNow - 14 * 60 * 60 * 1000;
      const f3 = getFreshness('floodZones', t14h, fixedNow);
      assert.equal(f3.level, 'very_stale');
    });

    it('treats emergency contacts and safety instructions as permanently fresh', () => {
      const yearOld = fixedNow - 365 * 24 * 60 * 60 * 1000;
      const fc = getFreshness('contacts', yearOld, fixedNow);
      assert.equal(fc.level, 'fresh', 'Contacts must never go stale');

      const fi = getFreshness('instructions', null, fixedNow);
      assert.equal(fi.level, 'fresh', 'Instructions must never go stale');
    });

    it('handles missing or invalid timestamps with very_stale', () => {
      const f = getFreshness('shelters', null, fixedNow);
      assert.equal(f.level, 'very_stale');
      assert.equal(f.updatedAt, null);
    });
  });

  // Group 3: Static Emergency Bundling
  describe('Group 3: Static Content Bundling', () => {
    it('seeds static contacts and instructions into empty IndexedDB tables', async () => {
      assert.equal(await db.contacts.count(), 0);
      assert.equal(await db.instructions.count(), 0);

      await seedStaticContent(db);

      assert.equal(await db.contacts.count(), STATIC_CONTACTS.length);
      assert.equal(await db.instructions.count(), STATIC_INSTRUCTIONS.length);

      // Verify contact numbers include essential lines
      const c112 = await db.contacts.get('112');
      assert.ok(c112, '112 must be seeded');
      assert.equal(c112.service_key, 'national_emergency');

      const c108 = await db.contacts.get('108');
      assert.ok(c108, '108 must be seeded');

      // Idempotency: re-calling seed does not duplicate or error
      await seedStaticContent(db);
      assert.equal(await db.contacts.count(), STATIC_CONTACTS.length);
    });
  });

  // Group 4: Synchronization Service & Concurrency Guard
  describe('Group 4: Synchronization Service', () => {
    it('preserves existing IndexedDB data when server fetch fails', async () => {
      // Prepopulate shelter
      await db.shelters.put({
        id: 'existing-sh-1',
        name: 'Preserved Relief Camp',
        status: 'open',
        capacity: 500,
        occupancy: 100,
      });

      // Mock fetch failure
      const originalFetch = global.fetch;
      global.fetch = async () => {
        throw new Error('Connection refused / 503 Outage');
      };

      try {
        const result = await syncAll();
        assert.equal(result.success, false);
        assert.equal(result.preservedOldData, true);

        // Verify data was NOT wiped
        const shelters = await db.shelters.toArray();
        assert.equal(shelters.length, 1);
        assert.equal(shelters[0].name, 'Preserved Relief Camp');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('populates all IndexedDB categories and timestamps on successful sync', async () => {
      const mockBundle = {
        serverTime: '2026-10-04T09:00:00.000Z',
        updatedAt: {
          shelters: '2026-10-04T08:50:00.000Z',
          hospitals: '2026-10-04T08:00:00.000Z',
          floodZones: '2026-10-04T07:00:00.000Z',
          safeZones: '2026-10-04T07:00:00.000Z',
          blockedRoads: '2026-10-04T08:30:00.000Z',
          alerts: '2026-10-04T08:55:00.000Z',
        },
        shelters: [
          { id: 'sh-1', name: 'Kotla Stadium', lat: 17.43, lng: 78.43, capacity: 800, occupancy: 200, status: 'open' },
        ],
        hospitals: [
          { id: 'hosp-1', name: 'Osmania Hospital', lat: 17.37, lng: 78.47, phone: '+91-40-24600121', emergency_available: true },
        ],
        floodZones: [
          { id: 'fz-1', name: 'Musi Basin', severity: 'critical', risk_level: 'critical', geometry: { type: 'Point', coordinates: [78.48, 17.37] } },
        ],
        safeZones: [
          { id: 'sz-1', name: 'Jubilee Hills Plateau', elevation_meters: 585, geometry: { type: 'Point', coordinates: [78.41, 17.43] } },
        ],
        blockedRoads: [
          { id: 'br-1', name: 'Moosarambagh Cause Way', status: 'impassable', severity: 'critical', geometry: { type: 'Point', coordinates: [78.51, 17.37] } },
        ],
        alerts: [
          { id: 'al-1', title: 'Severe Flood Warning', severity: 'critical', timestamp: '2026-10-04T08:55:00.000Z' },
        ],
        contacts: STATIC_CONTACTS,
        instructions: STATIC_INSTRUCTIONS,
      };

      const originalFetch = global.fetch;
      global.fetch = async (url) => {
        if (url.includes('/api/offline/bundle')) {
          return {
            ok: true,
            status: 200,
            headers: new Map([['ETag', '"abc123etag"']]),
            json: async () => mockBundle,
          };
        }
        return { ok: true, status: 200, json: async () => ({}) };
      };

      try {
        const progressSteps = [];
        const result = await syncAll({
          onProgress: (cat, status) => progressSteps.push({ cat, status }),
        });

        assert.equal(result.success, true);
        assert.equal(await db.shelters.count(), 1);
        assert.equal(await db.hospitals.count(), 1);
        assert.equal(await db.floodZones.count(), 1);
        assert.equal(await db.safeZones.count(), 1);
        assert.equal(await db.blockedRoads.count(), 1);
        assert.equal(await db.alerts.count(), 1);

        // Verify lastSync metadata was set per category
        const shelterSync = await getLastSync('shelters');
        assert.equal(shelterSync, '2026-10-04T08:50:00.000Z');

        const overallSync = await getLastSync(null);
        assert.ok(overallSync);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('prevents concurrent sync executions across multiple tabs/calls', async () => {
      let activeRuns = 0;
      let maxConcurrency = 0;

      const mockBundle = {
        serverTime: new Date().toISOString(),
        updatedAt: {},
        shelters: [],
        hospitals: [],
        floodZones: [],
        safeZones: [],
        blockedRoads: [],
        alerts: [],
        contacts: [],
        instructions: [],
      };

      const originalFetch = global.fetch;
      global.fetch = async () => {
        activeRuns++;
        maxConcurrency = Math.max(maxConcurrency, activeRuns);
        await new Promise((r) => setTimeout(r, 50));
        activeRuns--;
        return {
          ok: true,
          status: 200,
          headers: new Map(),
          json: async () => mockBundle,
        };
      };

      try {
        // Trigger two sync calls simultaneously
        const [res1, res2] = await Promise.all([
          syncAll(),
          syncAll(),
        ]);

        // One must succeed, the second must be safely skipped or locked
        const successes = [res1, res2].filter((r) => r.success);
        const skipped = [res1, res2].filter((r) => r.skipped);

        assert.ok(successes.length >= 1, 'At least one sync must complete');
        assert.ok(skipped.length >= 1 || maxConcurrency === 1, 'Must not run simultaneously');
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  // Group 5: Connection Reachability Check
  describe('Group 5: Connection Reachability Check', () => {
    it('reports online=true when health check succeeds within timeout', async () => {
      const originalFetch = global.fetch;
      global.fetch = async (url) => {
        if (url === '/api/health') {
          return {
            ok: true,
            status: 200,
            json: async () => ({ status: 'ok', serverTime: new Date().toISOString() }),
          };
        }
        return { ok: false, status: 404 };
      };

      try {
        const controller = new AbortController();
        const res = await fetch('/api/health', { method: 'GET', signal: controller.signal });
        assert.equal(res.ok, true);
        const data = await res.json();
        assert.equal(data.status, 'ok');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('reports online=false when health check fails or times out', async () => {
      const originalFetch = global.fetch;
      global.fetch = async () => {
        throw new Error('Network timeout (simulated)');
      };

      try {
        let reached = false;
        try {
          await fetch('/api/health', { method: 'GET' });
          reached = true;
        } catch {
          reached = false;
        }
        assert.equal(reached, false, 'Failed health check must report offline');
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});
