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

function outsideBoundary(site, latitude, longitude, error, boundaryContext) {
  return {
    error,
    code: 403,
    reason: 'outside_site_boundary',
    boundaryContext,
    siteName: site.name,
    distanceMeters: Math.round(distanceMeters(Number(latitude), Number(longitude), Number(site.latitude), Number(site.longitude))),
    allowedRadiusMeters: Number(site.radius_meters)
  };
}

function attendanceSiteDecision(assignedSites, openSession, status, latitude, longitude) {
  if (!assignedSites.length) return {
    error: 'No active site is assigned to this employee. Contact an administrator to check site assignments.',
    code: 403, reason: 'no_active_site_assignment'
  };
  if (openSession && status !== 'OUT') return {
    error: `You are timed in at ${openSession.name}. Time out there before timing in elsewhere.`, code: 409
  };
  if (!openSession && status !== 'IN') return { error: 'No open time-in was found. Please scan again.', code: 409 };
  if (openSession && !assignedSites.some(site => site.id === openSession.site_id)) return {
    error: `The assignment for the open time-in at ${openSession.name} is inactive or missing. Contact a Superadmin to correct the open time-in.`,
    code: 403, reason: 'inactive_open_session_assignment'
  };
  if (openSession && !matchingSite([openSession], latitude, longitude)) return outsideBoundary(
    openSession, latitude, longitude,
    `Time-out requires reported coordinates inside the boundary of the open session site, ${openSession.name}. Contact a Superadmin if a correction is needed.`,
    'required_time_out_site'
  );
  const site = openSession || matchingSite(assignedSites, latitude, longitude);
  if (!site) {
    const nearest = assignedSites.reduce((best, candidate) => {
      const distance = distanceMeters(Number(latitude), Number(longitude), Number(candidate.latitude), Number(candidate.longitude));
      const excess = distance - Number(candidate.radius_meters);
      return !best || excess < best.excess ? { site: candidate, excess } : best;
    }, null).site;
    return outsideBoundary(nearest, latitude, longitude,
      `Reported coordinates are outside every active assigned site boundary. Closest assigned boundary: ${nearest.name}.`,
      'closest_assigned_boundary');
  }
  return { site };
}

module.exports = { distanceMeters, validCoordinates, matchingSite, attendanceSiteDecision };
