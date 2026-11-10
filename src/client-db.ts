import Dexie, { type Table } from 'dexie';
import type { RouteObservation, RouteObservationInput } from '@/domain/route-observation';

export type OutboxItem = { id: string; payload: unknown; createdAt: number; attempts: number; lastError?: string };
export type RouteObservationDraft = { id: 'active'; data: RouteObservationInput; updatedAt: string };

export class LocalDatabase extends Dexie {
  outbox!: Table<OutboxItem, string>;
  drafts!: Table<RouteObservationDraft, string>;
  observations!: Table<RouteObservation, string>;

  constructor() {
    super('idea-barrier-free-city-router');
    this.version(1).stores({ outbox: 'id,createdAt,attempts' });
    this.version(2).stores({
      outbox: 'id,createdAt,attempts',
      drafts: 'id,updatedAt',
      observations: 'id,fromLabel,toLabel,createdAt,observedAt,expiresAt,source',
    });
  }
}

export const localDatabase = new LocalDatabase();
