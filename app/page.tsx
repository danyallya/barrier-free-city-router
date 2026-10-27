'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { localDatabase, type RouteObservationDraft } from '@/client-db';
import {
  createRouteObservation,
  expiryForObservedAt,
  localDateTimeValue,
  observationFreshness,
  validateRouteObservation,
  type Freshness,
  type ObservationField,
  type ObservationIssue,
  type RouteObservation,
  type RouteObservationInput,
} from '@/domain/route-observation';

type DraftState = 'loading' | 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';

function emptyInput(observedAt = ''): RouteObservationInput {
  return {
    fromLabel: '',
    toLabel: '',
    observedAt,
    source: 'firsthand',
    stepFreeStatus: 'unknown',
    liftStatus: 'unknown',
    obstacleStatus: 'unknown',
  };
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Unknown time';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function stepFreeLabel(value: RouteObservation['stepFreeStatus']): string {
  if (value === 'reported-yes') return 'Reported step-free';
  if (value === 'reported-no') return 'Reported not step-free';
  return 'Unknown';
}

function liftLabel(value: RouteObservation['liftStatus']): string {
  if (value === 'reported-working') return 'Reported working at observation time';
  if (value === 'reported-out') return 'Reported out of service';
  if (value === 'no-lift') return 'No lift reported on this segment';
  return 'Unknown';
}

function obstacleLabel(value: RouteObservation['obstacleStatus']): string {
  if (value === 'none-seen') return 'No obstruction seen at observation time';
  if (value === 'reported-obstacle') return 'An obstruction was reported';
  return 'Unknown';
}

function freshnessLabel(value: Freshness): string {
  if (value === 'within-window') return 'Within the local six-hour window; conditions are not verified live.';
  if (value === 'expired') return 'Expired. Recheck this segment before relying on the report.';
  return 'Freshness is unknown. Recheck this segment before relying on the report.';
}

export default function HomePage() {
  const [input, setInput] = useState<RouteObservationInput>(() => emptyInput());
  const [observations, setObservations] = useState<RouteObservation[]>([]);
  const [deviceNow, setDeviceNow] = useState<Date | null>(null);
  const [draftState, setDraftState] = useState<DraftState>('loading');
  const [step, setStep] = useState<'form' | 'review'>('form');
  const [issues, setIssues] = useState<ObservationIssue[]>([]);
  const [storageError, setStorageError] = useState('');
  const [notice, setNotice] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const hydrated = useRef(false);
  const skipNextDraftSave = useRef(false);
  const draftSaveTimer = useRef<number | null>(null);
  const pendingDraftWrite = useRef<Promise<void> | null>(null);

  async function settleDraftWrite() {
    if (draftSaveTimer.current !== null) {
      window.clearTimeout(draftSaveTimer.current);
      draftSaveTimer.current = null;
    }
    await pendingDraftWrite.current;
  }

  async function refreshObservations() {
    const saved = await localDatabase.observations.orderBy('createdAt').reverse().toArray();
    setObservations(saved);
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [draft, saved] = await Promise.all([
          localDatabase.drafts.get('active'),
          localDatabase.observations.orderBy('createdAt').reverse().toArray(),
        ]);
        if (cancelled) return;
        const loadedAt = new Date();
        setDeviceNow(loadedAt);
        if (draft) setInput(draft.data);
        else {
          skipNextDraftSave.current = true;
          setInput(emptyInput(localDateTimeValue(loadedAt)));
        }
        setObservations(saved);
        hydrated.current = true;
        setDraftState(draft ? 'saved' : 'idle');
      } catch {
        if (!cancelled) {
          hydrated.current = true;
          setDraftState('error');
          setStorageError('Local browser storage is unavailable. No observation was saved.');
        }
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    if (skipNextDraftSave.current) {
      skipNextDraftSave.current = false;
      return;
    }
    setDraftState('unsaved');
    const timer = window.setTimeout(() => {
      draftSaveTimer.current = null;
      const previousWrite = pendingDraftWrite.current;
      const write = (async () => {
        setDraftState('saving');
        try {
          await previousWrite;
          const draft: RouteObservationDraft = { id: 'active', data: input, updatedAt: new Date().toISOString() };
          await localDatabase.drafts.put(draft);
          setDraftState('saved');
          setStorageError('');
        } catch {
          setDraftState('error');
          setStorageError('The draft could not be saved on this device.');
        }
      })();
      pendingDraftWrite.current = write;
      void write.finally(() => {
        if (pendingDraftWrite.current === write) pendingDraftWrite.current = null;
      });
    }, 450);
    draftSaveTimer.current = timer;
    return () => {
      window.clearTimeout(timer);
      if (draftSaveTimer.current === timer) draftSaveTimer.current = null;
    };
  }, [input]);

  useEffect(() => {
    if (!deviceNow) return;
    const nextExpiry = observations
      .map((observation) => Date.parse(observation.expiresAt))
      .filter((expiresAt) => Number.isFinite(expiresAt) && expiresAt > deviceNow.getTime())
      .reduce((nearest, expiresAt) => Math.min(nearest, expiresAt), Number.POSITIVE_INFINITY);
    if (!Number.isFinite(nextExpiry)) return;
    const timer = window.setTimeout(() => setDeviceNow(new Date()), Math.max(0, nextExpiry - deviceNow.getTime() + 50));
    return () => window.clearTimeout(timer);
  }, [deviceNow, observations]);

  useEffect(() => {
    function refreshClockWhenVisible() {
      if (document.visibilityState === 'visible') setDeviceNow(new Date());
    }
    document.addEventListener('visibilitychange', refreshClockWhenVisible);
    return () => document.removeEventListener('visibilitychange', refreshClockWhenVisible);
  }, []);

  function updateField(field: ObservationField, value: string) {
    setInput((current) => ({ ...current, [field]: value }));
    setIssues([]);
    setNotice('');
  }

  function startReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const now = new Date();
    setDeviceNow(now);
    const nextIssues = validateRouteObservation(input, now);
    setIssues(nextIssues);
    if (nextIssues.length) {
      document.getElementById(`field-${nextIssues[0].field}`)?.focus();
      return;
    }
    setStep('review');
  }

  async function saveObservation() {
    const now = new Date();
    setDeviceNow(now);
    const nextIssues = validateRouteObservation(input, now);
    if (nextIssues.length) {
      setIssues(nextIssues);
      setStep('form');
      return;
    }

    setIsBusy(true);
    await settleDraftWrite();
    try {
      const observation = createRouteObservation(input, crypto.randomUUID(), now);
      await localDatabase.transaction('rw', localDatabase.observations, localDatabase.drafts, async () => {
        await localDatabase.observations.add(observation);
        await localDatabase.drafts.delete('active');
      });
    } catch {
      setStorageError('The observation could not be saved. The local draft is still available.');
      setDraftState('error');
      setIsBusy(false);
      return;
    }

    skipNextDraftSave.current = true;
    setInput(emptyInput(localDateTimeValue(now)));
    setIssues([]);
    setStep('form');
    setDraftState('idle');
    setIsBusy(false);
    setNotice('Observation saved on this device only. It is not a verified route and was not shared.');
    setStorageError('');
    try {
      await refreshObservations();
    } catch {
      setStorageError('The observation was saved locally, but the list could not be refreshed. Reload to confirm it.');
    }
  }

  async function deleteObservation(id: string) {
    setIsBusy(true);
    try {
      await localDatabase.transaction('rw', localDatabase.observations, async () => {
        const current = await localDatabase.observations.get(id);
        if (!current) throw new Error('Observation was not found.');
        await localDatabase.observations.delete(id);
      });
    } catch {
      setStorageError('The observation could not be deleted from this device.');
      setIsBusy(false);
      return;
    }
    setPendingDelete(null);
    setNotice('Observation deleted from this device.');
    setStorageError('');
    setIsBusy(false);
    try {
      await refreshObservations();
    } catch {
      setStorageError('The observation was deleted locally, but the list could not be refreshed. Reload to confirm it.');
    }
  }

  async function discardDraft() {
    setIsBusy(true);
    await settleDraftWrite();
    try {
      await localDatabase.drafts.delete('active');
      skipNextDraftSave.current = true;
      const now = new Date();
      setDeviceNow(now);
      setInput(emptyInput(localDateTimeValue(now)));
      setIssues([]);
      setStep('form');
      setDraftState('idle');
      setStorageError('');
      setNotice('Draft discarded from this device.');
    } catch {
      setStorageError('The draft could not be discarded from this device.');
      setDraftState('error');
    }
    setIsBusy(false);
  }

  const issueFor = (field: ObservationField) => issues.find((issue) => issue.field === field)?.message;
  const fieldClass = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:cursor-not-allowed disabled:opacity-60';
  const buttonClass = 'rounded-lg bg-sky-800 px-4 py-2 font-semibold text-white hover:bg-sky-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:cursor-not-allowed disabled:opacity-50';
  const observedExpiry = expiryForObservedAt(input.observedAt);
  const reviewWouldBeExpired = observedExpiry && deviceNow ? Date.parse(observedExpiry) <= deviceNow.getTime() : false;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="border-b border-slate-200 pb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-sky-800">Barrier-Free City Router · local prototype</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Route-segment observations</h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-700">Record a dated report about one public street segment. A report never certifies that a route is accessible: conditions can change, and every detail remains unverified live.</p>
        </header>

        <section aria-label="Storage and sync status" className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="font-semibold">Draft on this device</h2>
            <p className="mt-1 text-sm text-slate-700" aria-live="polite">
              {draftState === 'loading' && 'Checking local storage…'}
              {draftState === 'idle' && 'No unsaved changes'}
              {draftState === 'unsaved' && 'Unsaved changes'}
              {draftState === 'saving' && 'Saving draft locally…'}
              {draftState === 'saved' && 'Draft saved locally'}
              {draftState === 'error' && 'Local save failed'}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="font-semibold">Sync</h2>
            <p className="mt-1 text-sm text-slate-700">Local only · not uploaded · not shared with another device</p>
          </div>
        </section>

        {storageError && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">{storageError}</p>}
        {notice && <p aria-live="polite" className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-950">{notice}</p>}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          {step === 'form' ? (
            <>
              <div className="mb-5">
                <h2 className="text-xl font-bold">New segment observation</h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Use public landmark or street labels only. Do not enter home addresses, personal names, coordinates or private travel details. The map provider is not connected.</p>
              </div>
              {issues.length > 0 && <div role="alert" className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">Please correct the highlighted fields before reviewing.</div>}
              <form onSubmit={startReview} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium" htmlFor="field-fromLabel">From public landmark or street segment
                    <input id="field-fromLabel" type="text" maxLength={80} autoComplete="off" className={fieldClass} value={input.fromLabel} disabled={isBusy} onChange={(event) => updateField('fromLabel', event.target.value)} aria-invalid={Boolean(issueFor('fromLabel'))} aria-describedby={issueFor('fromLabel') ? 'error-fromLabel' : 'help-fromLabel'} />
                    {issueFor('fromLabel') ? <span id="error-fromLabel" className="mt-1 block text-sm text-red-800">{issueFor('fromLabel')}</span> : <span id="help-fromLabel" className="mt-1 block font-normal text-slate-600">Public label only; up to 80 characters.</span>}
                  </label>
                  <label className="block text-sm font-medium" htmlFor="field-toLabel">To public landmark or street segment
                    <input id="field-toLabel" type="text" maxLength={80} autoComplete="off" className={fieldClass} value={input.toLabel} disabled={isBusy} onChange={(event) => updateField('toLabel', event.target.value)} aria-invalid={Boolean(issueFor('toLabel'))} aria-describedby={issueFor('toLabel') ? 'error-toLabel' : 'help-toLabel'} />
                    {issueFor('toLabel') ? <span id="error-toLabel" className="mt-1 block text-sm text-red-800">{issueFor('toLabel')}</span> : <span id="help-toLabel" className="mt-1 block font-normal text-slate-600">Choose a different public label.</span>}
                  </label>
                </div>

                <label className="block text-sm font-medium" htmlFor="field-observedAt">Source time (your local time)
                  <input id="field-observedAt" type="datetime-local" max={deviceNow ? localDateTimeValue(deviceNow) : undefined} className={fieldClass} value={input.observedAt} disabled={isBusy} onChange={(event) => updateField('observedAt', event.target.value)} aria-invalid={Boolean(issueFor('observedAt'))} aria-describedby={issueFor('observedAt') ? 'error-observedAt' : 'help-observedAt'} />
                  {issueFor('observedAt') ? <span id="error-observedAt" className="mt-1 block text-sm text-red-800">{issueFor('observedAt')}</span> : <span id="help-observedAt" className="mt-1 block font-normal text-slate-600">Reports expire six hours after this time. The app records your device clock, which can be inaccurate.</span>}
                </label>

                <label className="block text-sm font-medium" htmlFor="field-source">Report source
                  <select id="field-source" className={fieldClass} value={input.source} disabled={isBusy} onChange={(event) => updateField('source', event.target.value)} aria-invalid={Boolean(issueFor('source'))} aria-describedby={issueFor('source') ? 'error-source' : 'help-source'}>
                    <option value="firsthand">Firsthand observation</option>
                    <option value="community">Community report</option>
                  </select>
                  {issueFor('source') ? <span id="error-source" className="mt-1 block text-sm text-red-800">{issueFor('source')}</span> : <span id="help-source" className="mt-1 block font-normal text-slate-600">No reporter identity is collected or verified.</span>}
                </label>

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block text-sm font-medium" htmlFor="field-stepFreeStatus">Step-free status (reported)
                    <select id="field-stepFreeStatus" className={fieldClass} value={input.stepFreeStatus} disabled={isBusy} onChange={(event) => updateField('stepFreeStatus', event.target.value)} aria-invalid={Boolean(issueFor('stepFreeStatus'))} aria-describedby={issueFor('stepFreeStatus') ? 'error-stepFreeStatus' : 'help-stepFreeStatus'}>
                      <option value="unknown">Unknown</option><option value="reported-yes">Reported yes</option><option value="reported-no">Reported no</option>
                    </select>
                    {issueFor('stepFreeStatus') ? <span id="error-stepFreeStatus" className="mt-1 block text-sm text-red-800">{issueFor('stepFreeStatus')}</span> : <span id="help-stepFreeStatus" className="sr-only">A report, not a verified route result.</span>}
                  </label>
                  <label className="block text-sm font-medium" htmlFor="field-liftStatus">Lift on this segment
                    <select id="field-liftStatus" className={fieldClass} value={input.liftStatus} disabled={isBusy} onChange={(event) => updateField('liftStatus', event.target.value)} aria-invalid={Boolean(issueFor('liftStatus'))} aria-describedby={issueFor('liftStatus') ? 'error-liftStatus' : 'help-liftStatus'}>
                      <option value="unknown">Unknown</option><option value="reported-working">Reported working</option><option value="reported-out">Reported out of service</option><option value="no-lift">No lift here</option>
                    </select>
                    {issueFor('liftStatus') ? <span id="error-liftStatus" className="mt-1 block text-sm text-red-800">{issueFor('liftStatus')}</span> : <span id="help-liftStatus" className="sr-only">Status at the reported source time.</span>}
                  </label>
                  <label className="block text-sm font-medium" htmlFor="field-obstacleStatus">Obstruction
                    <select id="field-obstacleStatus" className={fieldClass} value={input.obstacleStatus} disabled={isBusy} onChange={(event) => updateField('obstacleStatus', event.target.value)} aria-invalid={Boolean(issueFor('obstacleStatus'))} aria-describedby={issueFor('obstacleStatus') ? 'error-obstacleStatus' : 'help-obstacleStatus'}>
                      <option value="unknown">Unknown</option><option value="none-seen">None seen at observation time</option><option value="reported-obstacle">Obstruction reported</option>
                    </select>
                    {issueFor('obstacleStatus') ? <span id="error-obstacleStatus" className="mt-1 block text-sm text-red-800">{issueFor('obstacleStatus')}</span> : <span id="help-obstacleStatus" className="sr-only">A report, not a live check.</span>}
                  </label>
                </div>

                <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5">
                  <button type="submit" className={buttonClass} disabled={isBusy || draftState === 'loading' || draftState === 'error'}>Review observation</button>
                  <button type="button" onClick={() => void discardDraft()} className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:cursor-not-allowed disabled:opacity-50" disabled={isBusy}>Discard draft</button>
                </div>
              </form>
            </>
          ) : (
            <div>
              <h2 className="text-xl font-bold">Review this local report</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">This is one source report about a segment. It does not verify current conditions, certify accessibility or select a complete route.</p>
              {reviewWouldBeExpired && <p role="status" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">This source time is already outside the six-hour window. The report will be saved as expired.</p>}
              <dl className="mt-5 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
                <div><dt className="text-xs font-semibold uppercase text-slate-600">Segment</dt><dd className="mt-1">{input.fromLabel.trim()} → {input.toLabel.trim()}</dd></div>
                <div><dt className="text-xs font-semibold uppercase text-slate-600">Source time</dt><dd className="mt-1">{input.observedAt ? formatDateTime(new Date(input.observedAt).toISOString()) : 'Unknown time'}</dd></div>
                <div><dt className="text-xs font-semibold uppercase text-slate-600">Source</dt><dd className="mt-1">{input.source === 'firsthand' ? 'Firsthand observation' : 'Community report'}</dd></div>
                <div><dt className="text-xs font-semibold uppercase text-slate-600">Step-free status</dt><dd className="mt-1">{stepFreeLabel(input.stepFreeStatus)}</dd></div>
                <div><dt className="text-xs font-semibold uppercase text-slate-600">Lift</dt><dd className="mt-1">{liftLabel(input.liftStatus)}</dd></div>
                <div><dt className="text-xs font-semibold uppercase text-slate-600">Obstruction</dt><dd className="mt-1">{obstacleLabel(input.obstacleStatus)}</dd></div>
                <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase text-slate-600">Freshness limit</dt><dd className="mt-1">Expires {observedExpiry ? formatDateTime(observedExpiry) : 'at an unknown time'}; reports are not checked live.</dd></div>
              </dl>
              <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" onClick={() => setStep('form')} disabled={isBusy} className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:cursor-not-allowed disabled:opacity-50">Back to edit</button>
                <button type="button" onClick={() => void saveObservation()} disabled={isBusy} className={buttonClass}>Confirm and save locally</button>
              </div>
            </div>
          )}
        </section>

        <section aria-labelledby="observations-heading" className="space-y-4">
          <div>
            <h2 id="observations-heading" className="text-xl font-bold">Reports on this device</h2>
            <p className="mt-1 text-sm text-slate-600">The freshness window expires six hours after source time. Expired reports remain stored until you delete them.</p>
          </div>
          {observations.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">No local segment reports yet.</p> : observations.map((observation) => {
            const freshness = deviceNow ? observationFreshness(observation, deviceNow) : 'unknown';
            return (
              <article key={observation.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{observation.fromLabel} <span aria-hidden="true">→</span> {observation.toLabel}</h3>
                    <p className="mt-1 text-sm text-slate-600">Source time: {formatDateTime(observation.observedAt)} · {observation.source === 'firsthand' ? 'Firsthand report' : 'Community report'}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${freshness === 'within-window' ? 'bg-amber-100 text-amber-950' : 'bg-slate-200 text-slate-800'}`}>{freshness === 'within-window' ? 'Recent report · unverified' : freshness === 'expired' ? 'Expired report' : 'Freshness unknown'}</span>
                    <button type="button" disabled={isBusy} onClick={() => setPendingDelete(observation.id)} className="rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-900 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:opacity-50">Delete local report</button>
                  </div>
                </div>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                  <div><dt className="font-semibold">Step-free status</dt><dd className="mt-1 text-slate-700">{stepFreeLabel(observation.stepFreeStatus)}</dd></div>
                  <div><dt className="font-semibold">Lift</dt><dd className="mt-1 text-slate-700">{liftLabel(observation.liftStatus)}</dd></div>
                  <div><dt className="font-semibold">Obstruction</dt><dd className="mt-1 text-slate-700">{obstacleLabel(observation.obstacleStatus)}</dd></div>
                </dl>
                <p className="mt-3 text-sm leading-6 text-slate-700">{freshnessLabel(freshness)} Expires {formatDateTime(observation.expiresAt)}. Check conditions yourself before relying on this report.</p>
                <p className="mt-1 text-xs text-slate-500">Saved on this device at {formatDateTime(observation.createdAt)}. Source time uses the device clock and may be inaccurate.</p>
                {pendingDelete === observation.id && (
                  <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4" role="group" aria-label="Confirm local report deletion">
                    <p className="text-sm text-red-950">Delete this observation permanently from this device? It cannot be restored from this prototype.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => void deleteObservation(observation.id)} disabled={isBusy} className="rounded-lg bg-red-800 px-3 py-2 text-sm font-semibold text-white hover:bg-red-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:opacity-50">Delete permanently</button>
                      <button type="button" onClick={() => setPendingDelete(null)} disabled={isBusy} className="rounded-lg border border-slate-400 px-3 py-2 text-sm font-semibold text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:cursor-not-allowed disabled:opacity-50">Keep report</button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </section>

        <footer className="border-t border-slate-200 pt-5 text-sm leading-6 text-slate-600">
          <p>Reports and the active draft stay in this browser profile until deleted or browser storage is cleared. Expiry changes freshness only; it does not delete a record. There is no map provider, route engine, identity verification, live check, backup, encryption, access control, notification or sync. Do not store private addresses or real-time sensitive travel plans.</p>
        </footer>
      </div>
    </main>
  );
}
