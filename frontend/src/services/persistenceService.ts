import { Load, Save } from '../../bindings/changeme/collectionservice';
import { UNGROUPED_SCOPE } from '../lib/apiDocsScope';
import { defaultAuth, newKeyValue } from '../lib/factories';
import { reconcileParams } from '../lib/query';
import {
  extractSecrets,
  maskStoredBodies,
  sanitizeSecurity,
  stripAccessTokens,
  type SecuritySettings,
} from '../lib/secretFields';
import { sanitizeAppearance, type AppearanceSettings } from '../lib/themes';
import { normalizeBaseUrl } from '../lib/url';
import { sealSecrets, type VaultSession } from '../lib/vault';
import type {
  Collection,
  Environment,
  Folder,
  HistoryEntry,
  KeyValue,
  PersistedState,
  SavedRequest,
  StoredResponse,
} from '../types';

export interface AppSnapshot {
  collections: Collection[];
  folders: Folder[];
  requests: SavedRequest[];
  openRequestIds: string[];
  activeRequestId: string | null;
  openDocIds: string[];
  activeDocId: string | null;
  environments: Environment[];
  activeEnvironmentId: string | null;
  history: HistoryEntry[];
  responses: Record<string, StoredResponse>;
  appearance?: AppearanceSettings;
  security: SecuritySettings;
}

function migrateHeaders(headers: KeyValue[] | string | undefined): KeyValue[] {
  if (Array.isArray(headers)) return headers;
  if (!headers) return [];
  try {
    const parsed = JSON.parse(headers);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.entries(parsed).map(([key, value]) =>
        newKeyValue({ key, value: String(value) })
      );
    }
  } catch {
  }
  return [];
}

export function deserialize(state: Partial<PersistedState>): AppSnapshot {
  const collectionIds = new Set((state.collections ?? []).map((c) => c.id));
  const folders = (state.folders ?? []).filter((f) => collectionIds.has(f.collectionId));
  const folderIds = new Set(folders.map((f) => f.id));

  const requests: SavedRequest[] = (state.requests ?? []).map((request) =>
    reconcileParams({
      id: request.id,
      collectionId: request.collectionId ?? null,
      folderId: request.folderId && folderIds.has(request.folderId) ? request.folderId : null,
      position: request.position,
      title: request.title ?? 'Requisição',
      method: request.method ?? 'GET',
      url: request.url ?? '',
      params: request.params ?? [],
      pathValues: request.pathValues ?? {},
      headers: migrateHeaders(request.headers),
      auth: { ...defaultAuth(), ...request.auth },
      bodyType: request.bodyType ?? 'json',
      body: request.body ?? '',
      formFields: request.formFields,
      graphqlVariables: request.graphqlVariables,
      preScript: request.preScript ?? '',
      postScript: request.postScript ?? '',
      extractions: request.extractions,
      source: request.source,
      doc: request.doc,
    })
  );

  const ids = new Set(requests.map((r) => r.id));
  const openRequestIds = state.openRequestIds
    ? state.openRequestIds.filter((id) => ids.has(id))
    : requests.slice(0, 1).map((r) => r.id);
  const activeRequestId =
    state.activeRequestId && openRequestIds.includes(state.activeRequestId)
      ? state.activeRequestId
      : openRequestIds[0] ?? null;

  const collections = (state.collections ?? []).map((collection) => ({
    ...collection,
    baseUrl: normalizeBaseUrl(collection.baseUrl),
  }));

  const docScopes = new Set([...collections.map((c) => c.id), UNGROUPED_SCOPE]);
  const openDocIds = (state.openDocIds ?? []).filter((id) => docScopes.has(id));
  const activeDocId = state.activeDocId && openDocIds.includes(state.activeDocId) ? state.activeDocId : null;

  return {
    collections,
    folders,
    requests,
    openRequestIds,
    activeRequestId,
    openDocIds,
    activeDocId,
    environments: state.environments ?? [],
    activeEnvironmentId: state.activeEnvironmentId ?? null,
    history: state.history ?? [],
    responses: Object.fromEntries(Object.entries(state.responses ?? {}).filter(([id]) => ids.has(id))),
    appearance: sanitizeAppearance(state.appearance),
    security: sanitizeSecurity(state.security),
  };
}

export async function loadRawState(): Promise<Partial<PersistedState> | null> {
  const raw = await Load();
  if (!raw) return null;
  return JSON.parse(raw) as Partial<PersistedState>;
}

export function withoutSecrets(snapshot: AppSnapshot): AppSnapshot {
  return extractSecrets(stripAccessTokens(maskStoredBodies(snapshot))).state;
}

export async function storedState(snapshot: AppSnapshot, session: VaultSession | null): Promise<PersistedState> {
  let state = snapshot;
  if (snapshot.security.maskStoredResponses) state = maskStoredBodies(state);
  if (!snapshot.security.persistAccessTokens) state = stripAccessTokens(state);
  if (!session) return state;
  const { state: stripped, secrets } = extractSecrets(state);
  return { ...stripped, vault: await sealSecrets(session, secrets) };
}

let pending: Promise<void> = Promise.resolve();

export function saveState(snapshot: AppSnapshot, session: VaultSession | null): Promise<void> {
  const run = async () => {
    await Save(JSON.stringify(await storedState(snapshot, session)));
  };
  pending = pending.then(run, run);
  return pending;
}
