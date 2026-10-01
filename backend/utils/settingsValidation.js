const ALLOWED_KEYS = new Set([
  'confidence_threshold', 'camera_resolution', 'scan_cooldown',
  'work_start_time', 'late_grace_period', 'work_end_time',
  'auto_checkout', 'email_alerts', 'geofencing_enabled',
  'office_latitude', 'office_longitude', 'geofence_radius_meters'
]);

const isFiniteNumberInRange = (value, min, max) => {
  if (value === '' || value == null) return false;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max;
};

const isTime = (value) => {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) return false;
  const [hours, minutes] = value.split(':').map(Number);
  return hours < 24 && minutes < 60;
};

const validateSettings = (settings) => {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return 'Settings must be an object';
  }
  for (const [key, value] of Object.entries(settings)) {
    if (!ALLOWED_KEYS.has(key)) return `Unknown setting: ${key}`;
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
      return `Invalid value for ${key}`;
    }
    const text = String(value);
    switch (key) {
      case 'confidence_threshold':
        if (!isFiniteNumberInRange(text, 0.5, 0.95)) return 'Confidence threshold must be between 0.5 and 0.95';
        break;
      case 'camera_resolution':
        if (!['480p', '720p', '1080p'].includes(text)) return 'Invalid camera resolution';
        break;
      case 'scan_cooldown':
        if (!['2', '3', '5', '10'].includes(text)) return 'Invalid scan cooldown';
        break;
      case 'work_start_time':
      case 'work_end_time':
        if (!isTime(text)) return `Invalid time for ${key}`;
        break;
      case 'late_grace_period':
        if (!/^\d+$/.test(text) || !isFiniteNumberInRange(text, 0, 120)) return 'Grace period must be 0 to 120 minutes';
        break;
      case 'auto_checkout':
      case 'email_alerts':
      case 'geofencing_enabled':
        if (!['true', 'false'].includes(text)) return `Invalid value for ${key}`;
        break;
      case 'office_latitude':
        if (!isFiniteNumberInRange(text, -90, 90)) return 'Invalid office latitude';
        break;
      case 'office_longitude':
        if (!isFiniteNumberInRange(text, -180, 180)) return 'Invalid office longitude';
        break;
      case 'geofence_radius_meters':
        if (!isFiniteNumberInRange(text, 1, 10000)) return 'Geofence radius must be 1 to 10000 meters';
        break;
    }
  }
  return null;
};

module.exports = { validateSettings, isFiniteNumberInRange };
