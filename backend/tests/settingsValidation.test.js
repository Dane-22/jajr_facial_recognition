const test = require('node:test');
const assert = require('node:assert/strict');
const { validateSettings } = require('../utils/settingsValidation');

test('accepts the current admin settings payload', () => {
  assert.equal(validateSettings({
    confidence_threshold: '0.85', camera_resolution: '1080p', scan_cooldown: '3',
    work_start_time: '08:00', late_grace_period: '15', work_end_time: '17:00',
    auto_checkout: 'false', email_alerts: 'true', geofencing_enabled: 'true',
    office_latitude: '16.6148', office_longitude: '120.3539', geofence_radius_meters: '100'
  }), null);
});

test('rejects malformed geofence settings and unknown keys before saving', () => {
  assert.match(validateSettings({ office_latitude: 'not-a-number' }), /latitude/i);
  assert.match(validateSettings({ geofence_radius_meters: '0' }), /radius/i);
  assert.match(validateSettings({ office_longitude: '181' }), /longitude/i);
  assert.match(validateSettings({ unexpected_admin_key: 'value' }), /Unknown setting/i);
});

test('rejects invalid shift and recognition values', () => {
  assert.match(validateSettings({ work_start_time: '25:10' }), /time/i);
  assert.match(validateSettings({ confidence_threshold: 'NaN' }), /threshold/i);
  assert.match(validateSettings({ scan_cooldown: '99' }), /cooldown/i);
});
