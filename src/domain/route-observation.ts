export const OBSERVATION_FRESHNESS_HOURS = 6;

export type StepFreeStatus = 'reported-yes' | 'reported-no' | 'unknown';
export type LiftStatus = 'reported-working' | 'reported-out' | 'no-lift' | 'unknown';
export type ObstacleStatus = 'none-seen' | 'reported-obstacle' | 'unknown';
export type ObservationSource = 'firsthand' | 'community';

export type RouteObservationInput = {
  fromLabel: string;
  toLabel: string;
  observedAt: string;
  source: ObservationSource;
  stepFreeStatus: StepFreeStatus;
  liftStatus: LiftStatus;
  obstacleStatus: ObstacleStatus;
};

export type RouteObservation = Omit<RouteObservationInput, 'observedAt'> & {
  id: string;
  createdAt: string;
  observedAt: string;
  expiresAt: string;
};

export type ObservationField = keyof RouteObservationInput;
export type ObservationIssue = { field: ObservationField; message: string };
export type Freshness = 'within-window' | 'expired' | 'unknown';

const stepFreeValues: StepFreeStatus[] = ['reported-yes', 'reported-no', 'unknown'];
const liftValues: LiftStatus[] = ['reported-working', 'reported-out', 'no-lift', 'unknown'];
const obstacleValues: ObstacleStatus[] = ['none-seen', 'reported-obstacle', 'unknown'];
const sourceValues: ObservationSource[] = ['firsthand', 'community'];

export function localDateTimeValue(date = new Date()): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function parseLocalDateTime(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  if (year < 1000 || month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
  const date = new Date(year, month - 1, day, hour, minute);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day || date.getHours() !== hour || date.getMinutes() !== minute) return null;
  return date;
}

export function expiryForObservedAt(value: string): string | null {
  const observedAt = parseLocalDateTime(value);
  if (!observedAt) return null;
  return new Date(observedAt.getTime() + OBSERVATION_FRESHNESS_HOURS * 60 * 60 * 1000).toISOString();
}

export function validateRouteObservation(input: RouteObservationInput, now = new Date()): ObservationIssue[] {
  const issues: ObservationIssue[] = [];
  const from = typeof input.fromLabel === 'string' ? input.fromLabel.trim() : '';
  const to = typeof input.toLabel === 'string' ? input.toLabel.trim() : '';

  if (!from) issues.push({ field: 'fromLabel', message: 'Enter a public landmark or street segment.' });
  else if (from.length > 80) issues.push({ field: 'fromLabel', message: 'Use 80 characters or fewer.' });
  if (!to) issues.push({ field: 'toLabel', message: 'Enter the other end of this segment.' });
  else if (to.length > 80) issues.push({ field: 'toLabel', message: 'Use 80 characters or fewer.' });
  if (from && to && from.toLocaleLowerCase() === to.toLocaleLowerCase()) {
    issues.push({ field: 'toLabel', message: 'The segment needs two different endpoints.' });
  }

  const observedAt = parseLocalDateTime(input.observedAt);
  if (!observedAt) issues.push({ field: 'observedAt', message: 'Enter a valid local date and time.' });
  else if (!Number.isFinite(now.getTime()) || observedAt.getTime() > now.getTime()) {
    issues.push({ field: 'observedAt', message: 'Observation time cannot be in the future.' });
  }

  if (!sourceValues.includes(input.source)) issues.push({ field: 'source', message: 'Choose how this report was sourced.' });
  if (!stepFreeValues.includes(input.stepFreeStatus)) issues.push({ field: 'stepFreeStatus', message: 'Choose a step-free observation.' });
  if (!liftValues.includes(input.liftStatus)) issues.push({ field: 'liftStatus', message: 'Choose a lift observation.' });
  if (!obstacleValues.includes(input.obstacleStatus)) issues.push({ field: 'obstacleStatus', message: 'Choose an obstacle observation.' });
  if (input.stepFreeStatus === 'unknown' && input.liftStatus === 'unknown' && input.obstacleStatus === 'unknown') {
    issues.push({ field: 'stepFreeStatus', message: 'Report at least one observed access detail.' });
  }

  return issues;
}

export function createRouteObservation(input: RouteObservationInput, id: string, now = new Date()): RouteObservation {
  if (validateRouteObservation(input, now).length) throw new Error('Cannot save a route observation from invalid input.');
  if (!id.trim()) throw new Error('A local observation identifier is required.');
  const observedAt = parseLocalDateTime(input.observedAt)!;
  return {
    id: id.trim(),
    fromLabel: input.fromLabel.trim(),
    toLabel: input.toLabel.trim(),
    createdAt: now.toISOString(),
    observedAt: observedAt.toISOString(),
    expiresAt: new Date(observedAt.getTime() + OBSERVATION_FRESHNESS_HOURS * 60 * 60 * 1000).toISOString(),
    source: input.source,
    stepFreeStatus: input.stepFreeStatus,
    liftStatus: input.liftStatus,
    obstacleStatus: input.obstacleStatus,
  };
}

export function observationFreshness(observation: RouteObservation, now = new Date()): Freshness {
  const expiresAt = Date.parse(observation.expiresAt);
  if (!Number.isFinite(expiresAt) || !Number.isFinite(now.getTime())) return 'unknown';
  return now.getTime() < expiresAt ? 'within-window' : 'expired';
}
