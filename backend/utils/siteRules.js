const EARTH_RADIUS_METERS = 6371000;

function distanceMeters(lat1, lon1, lat2, lon2) {
  const toRadians = value => value * Math.PI / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function validCoordinates(latitude, longitude) {
  return ['number', 'string'].includes(typeof latitude) && ['number', 'string'].includes(typeof longitude) &&
    String(latitude).trim() !== '' && String(longitude).trim() !== '' && Number.isFinite(Number(latitude)) &&
    Number.isFinite(Number(longitude)) && Math.abs(Number(latitude)) <= 90 &&
    Math.abs(Number(longitude)) <= 180;
}

function matchingSite(sites, latitude, longitude) {
  return sites.map(site => ({
    ...site,
    distance: distanceMeters(Number(latitude), Number(longitude), Number(site.latitude), Number(site.longitude))
  })).filter(site => site.distance <= Number(site.radius_meters))
    .sort((a, b) => a.distance - b.distance)[0] || null;
}

function attendanceSiteDecision(assignedSites, openSession, status, latitude, longitude) {
  if (!assignedSites.length) return { error: 'You have no active assigned site. Contact an administrator.', code: 403 };
  if (openSession && status !== 'OUT') return {
    error: `You are timed in at ${openSession.name}. Time out there before timing in elsewhere.`, code: 409
  };
  if (!openSession && status !== 'IN') return { error: 'No open time-in was found. Please scan again.', code: 409 };
  if (openSession && !assignedSites.some(site => site.id === openSession.site_id)) return {
    error: `Your ${openSession.name} assignment is inactive. Contact a Superadmin to correct the open time-in.`, code: 403
  };
  if (openSession && !matchingSite([openSession], latitude, longitude)) return {
    error: `You timed in at ${openSession.name}. Return there to time out, or contact a Superadmin for a correction.`, code: 403
  };
  const site = openSession || matchingSite(assignedSites, latitude, longitude);
  if (!site) return { error: 'You are outside the allowed boundary of your assigned sites.', code: 403 };
  return { site };
}

module.exports = { distanceMeters, validCoordinates, matchingSite, attendanceSiteDecision };
