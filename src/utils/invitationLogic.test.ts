import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateGuestName,
  buildInvitationShareUrl,
  parseInvitationParams,
  formatPersonalizedGreeting,
  computeElevationStats,
  CHHATH_SCHEDULE,
  EMERGENCY_CONTACT_NUMBER,
  PROVIDER_DOMAIN,
  EXACT_VENUE_MAPS_URL,
} from './invitationLogic';

test('validateGuestName rejects empty or whitespace-only names', () => {
  const resEmpty = validateGuestName('');
  assert.equal(resEmpty.valid, false);
  assert.ok(resEmpty.error);

  const resSpaces = validateGuestName('   ');
  assert.equal(resSpaces.valid, false);

  const resSingle = validateGuestName('A');
  assert.equal(resSingle.valid, false);
});

test('validateGuestName accepts and normalizes valid guest names', () => {
  const res = validateGuestName('  Aarav   Verma & Family  ');
  assert.equal(res.valid, true);
  assert.equal(res.sanitizedName, 'Aarav Verma & Family');
  assert.equal(res.error, undefined);
});

test('buildInvitationShareUrl encodes guest name into query string', () => {
  const url = buildInvitationShareUrl('https://example.com/?autostart=1', 'Priya Singh');
  assert.equal(url, 'https://example.com/?guest=Priya+Singh');
});

test('parseInvitationParams detects shared guest link and transitions to received-greeting', () => {
  const parsed = parseInvitationParams('?guest=Rohan+Mishra');
  assert.equal(parsed.guestName, 'Rohan Mishra');
  assert.equal(parsed.initialStep, 'received-greeting');
  assert.equal(parsed.initialSection, 'invitation');
});

test('parseInvitationParams handles autostart=1 and view=navigation', () => {
  const parsed = parseInvitationParams('?autostart=1&view=navigation');
  assert.equal(parsed.guestName, null);
  assert.equal(parsed.autostart, true);
  assert.equal(parsed.initialStep, 'add-name');
  assert.equal(parsed.initialSection, 'navigation');
});

test('formatPersonalizedGreeting formats Hey, welcome with guest name, 15/16 Nov dates, exact venue link, and safety info', () => {
  const greeting = formatPersonalizedGreeting('Ananya Sharma');
  assert.equal(greeting.headline, 'Hey, welcome Ananya Sharma!');
  assert.ok(greeting.subheadline.includes('15 November'));
  assert.ok(greeting.subheadline.includes('16 November'));
  assert.ok(greeting.shareMessage.includes(EMERGENCY_CONTACT_NUMBER));
  assert.ok(greeting.shareMessage.includes(PROVIDER_DOMAIN));
  assert.ok(greeting.shareMessage.includes(EXACT_VENUE_MAPS_URL));
});

test('CHHATH_SCHEDULE includes 15 November evening near 4:00 PM and 16 November near 4:00 AM', () => {
  assert.equal(CHHATH_SCHEDULE.length, 2);
  assert.equal(CHHATH_SCHEDULE[0].dateLabel, '15 November');
  assert.ok(CHHATH_SCHEDULE[0].timeLabel.includes('4:00 PM'));
  assert.equal(CHHATH_SCHEDULE[1].dateLabel, '16 November');
  assert.ok(CHHATH_SCHEDULE[1].timeLabel.includes('4:00 AM'));
});

test('computeElevationStats calculates min, max, relief, and average elevation', () => {
  const stats = computeElevationStats([
    { distanceKm: 0, elevationMeters: 138.5 },
    { distanceKm: 0.5, elevationMeters: 146.5 },
    { distanceKm: 1.0, elevationMeters: 150.0 },
  ]);
  assert.equal(stats.minMeters, 138.5);
  assert.equal(stats.maxMeters, 150.0);
  assert.equal(stats.reliefMeters, 11.5);
  assert.equal(stats.avgMeters, 145.0);
});
