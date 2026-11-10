import { describe, expect, it } from 'vitest';
import { createRouteObservation, expiryForObservedAt, localDateTimeValue, observationFreshness, validateRouteObservation, type RouteObservationInput } from './route-observation';

const now = new Date('2026-10-28T10:00:00.000Z');
const validInput: RouteObservationInput = {
  fromLabel: '  North library gate  ',
  toLabel: 'Market square crossing',
  observedAt: localDateTimeValue(now),
  source: 'firsthand',
  stepFreeStatus: 'reported-yes',
  liftStatus: 'unknown',
  obstacleStatus: 'none-seen',
};

describe('route segment observations', () => {
  it('creates a normalized local observation with a six-hour freshness expiry', () => {
    const record = createRouteObservation(validInput, 'local-id-1', now);
    expect(record.fromLabel).toBe('North library gate');
    expect(record.createdAt).toBe(now.toISOString());
    expect(record.observedAt).toBe(now.toISOString());
    expect(record.expiresAt).toBe('2026-10-28T16:00:00.000Z');
    expect(observationFreshness(record, new Date('2026-10-28T15:59:59.999Z'))).toBe('within-window');
  });

  it('requires different public endpoints and at least one observed access detail', () => {
    expect(validateRouteObservation({ ...validInput, fromLabel: 'Central Gate', toLabel: ' central gate ' }, now).map((issue) => issue.field)).toContain('toLabel');
    expect(validateRouteObservation({ ...validInput, stepFreeStatus: 'unknown', liftStatus: 'unknown', obstacleStatus: 'unknown' }, now).map((issue) => issue.field)).toContain('stepFreeStatus');
    expect(validateRouteObservation({ ...validInput, fromLabel: ' ' }, now).map((issue) => issue.field)).toContain('fromLabel');
  });

  it('rejects malformed, impossible and future source times', () => {
    expect(validateRouteObservation({ ...validInput, observedAt: 'not-a-time' }, now).map((issue) => issue.field)).toContain('observedAt');
    expect(validateRouteObservation({ ...validInput, observedAt: '2026-02-30T10:00' }, now).map((issue) => issue.field)).toContain('observedAt');
    expect(validateRouteObservation({ ...validInput, observedAt: localDateTimeValue(new Date(now.getTime() + 60_000)) }, now).map((issue) => issue.field)).toContain('observedAt');
  });

  it('allows a historical report but marks it expired immediately after its window', () => {
    const observedAt = localDateTimeValue(new Date(now.getTime() - 6 * 60 * 60 * 1000));
    const record = createRouteObservation({ ...validInput, observedAt }, 'local-id-2', now);
    expect(observationFreshness(record, now)).toBe('expired');
    expect(observationFreshness(record, new Date(record.expiresAt))).toBe('expired');
    expect(expiryForObservedAt(observedAt)).toBe(record.expiresAt);
  });

  it('serializes the source and observation fields without reporter identity or free-text notes', () => {
    const record = createRouteObservation({ ...validInput, source: 'community' }, 'local-id-3', now);
    const restored = JSON.parse(JSON.stringify(record));
    expect(restored).toEqual(record);
    expect(restored).not.toHaveProperty('reporterName');
    expect(restored).not.toHaveProperty('phone');
    expect(restored).not.toHaveProperty('coordinates');
    expect(restored).not.toHaveProperty('notes');
  });
});
