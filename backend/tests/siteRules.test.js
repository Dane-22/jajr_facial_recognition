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
  assert.match(attendanceSiteDecision([a, b], a, 'OUT', b.latitude, b.longitude).error, /PANICSICAN/);
  assert.equal(attendanceSiteDecision([a, b], a, 'OUT', a.latitude, a.longitude).site.id, 1);
  assert.match(attendanceSiteDecision([a, b], a, 'IN', b.latitude, b.longitude).error, /Time out/);
  assert.equal(attendanceSiteDecision([a, b], null, 'IN', b.latitude, b.longitude).site.id, 2);
});
