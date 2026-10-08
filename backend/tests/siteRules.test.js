const test = require('node:test');
const assert = require('node:assert/strict');
const { distanceMeters, validCoordinates, matchingSite, attendanceSiteDecision } = require('../utils/siteRules');

test('accepts zero coordinates and rejects missing or out-of-range locations', () => {
  assert.equal(validCoordinates(0, 0), true);
  assert.equal(validCoordinates(null, 0), false);
  assert.equal(validCoordinates(91, 0), false);
  assert.equal(validCoordinates(0, 'unknown'), false);
});

test('uses each site radius and selects the nearest matching assigned site', () => {
  const sites = [
    { id: 1, name: 'A', latitude: 16.6625838, longitude: 120.3322232, radius_meters: 100 },
    { id: 2, name: 'B', latitude: 16.6625838, longitude: 120.3323000, radius_meters: 100 }
  ];
  assert.equal(matchingSite(sites, 16.6625838, 120.3323000).id, 2);
  assert.equal(matchingSite(sites, 16.6700000, 120.3323000), null);
  assert.ok(distanceMeters(16.6625838, 120.3322232, 16.6625838, 120.3323000) < 100);
});

test('requires a time-out at the site with the open time-in', () => {
  const a = { id: 1, site_id: 1, name: 'PANICSICAN', latitude: 16.6625838, longitude: 120.3322232, radius_meters: 100 };
  const b = { id: 2, site_id: 2, name: 'YARD', latitude: 16.6137584, longitude: 120.3430499, radius_meters: 100 };
  assert.equal(attendanceSiteDecision([a, b], null, 'IN', a.latitude, a.longitude).site.id, 1);
  const wrongSite = attendanceSiteDecision([a, b], a, 'OUT', b.latitude, b.longitude);
  assert.match(wrongSite.error, /PANICSICAN/);
  assert.equal(wrongSite.reason, 'outside_site_boundary');
  assert.equal(wrongSite.boundaryContext, 'required_time_out_site');
  assert.match(wrongSite.error, /Time-out requires reported coordinates inside/);
  assert.ok(wrongSite.distanceMeters > wrongSite.allowedRadiusMeters);
  assert.equal(attendanceSiteDecision([a, b], a, 'OUT', a.latitude, a.longitude).site.id, 1);
  assert.match(attendanceSiteDecision([a, b], a, 'IN', b.latitude, b.longitude).error, /Time out/);
  assert.equal(attendanceSiteDecision([a, b], null, 'IN', b.latitude, b.longitude).site.id, 2);
  const outside = attendanceSiteDecision([a, b], null, 'IN', 16.6700000, 120.3323000);
  assert.equal(outside.reason, 'outside_site_boundary');
  assert.equal(outside.boundaryContext, 'closest_assigned_boundary');
  assert.match(outside.error, /Closest assigned boundary:/);
  assert.ok(outside.distanceMeters > outside.allowedRadiusMeters);
});

test('distinguishes missing assignments and preserves open-site rules when boundaries overlap', () => {
  const a = { id: 1, site_id: 1, name: 'PANICSICAN', latitude: 16.66, longitude: 120.33, radius_meters: 100 };
  const b = { id: 2, site_id: 2, name: 'SUNDARA', latitude: 16.66, longitude: 120.3305, radius_meters: 100 };
  const missing = attendanceSiteDecision([], null, 'IN', b.latitude, b.longitude);
  assert.equal(missing.reason, 'no_active_site_assignment');
  assert.match(missing.error, /No active site is assigned/);
  const inactiveOpenSite = attendanceSiteDecision([b], a, 'OUT', b.latitude, b.longitude);
  assert.equal(inactiveOpenSite.reason, 'inactive_open_session_assignment');
  assert.match(inactiveOpenSite.error, /open time-in at PANICSICAN/);
  const overlappingOut = attendanceSiteDecision([a, b], a, 'OUT', b.latitude, b.longitude);
  assert.equal(overlappingOut.site.id, a.id);
  const outsideOpenSite = attendanceSiteDecision([a, b], a, 'OUT', 16.66, 120.332);
  assert.equal(outsideOpenSite.reason, 'outside_site_boundary');
  assert.equal(outsideOpenSite.boundaryContext, 'required_time_out_site');
});
