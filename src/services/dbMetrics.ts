const FIRESTORE_SAVER_MODE_STORAGE_KEY = 'fom_play_firestore_saver_mode';
const FIRESTORE_SAVER_MODE_DEFAULT = false;
const DB_METRICS_STORAGE_PREFIX = 'fom_play_db_metrics_v1';
const DB_METRICS_RECENT_LIMIT = 120;

type DbMetricOperation = 'read' | 'write' | 'delete' | 'listen' | 'skip';
type DbMetricDbRole = 'primary' | 'ephemeral';
type DbMetricRecord = {
  at: string;
  flow: string;
  operation: DbMetricOperation | 'error';
  count: number;
  docs: number;
  label: string;
  dbRole?: DbMetricDbRole;
  collection?: string;
  code?: string;
  message?: string;
};

type TrackFirestoreRouteInput = {
  dbRole: DbMetricDbRole;
  collection: string;
  operation: DbMetricOperation | 'error';
  flow: string;
  label?: string;
};

const getDbMetricsStorageKey = () => {
  const day = new Date().toISOString().slice(0, 10);
  return `${DB_METRICS_STORAGE_PREFIX}_${day}`;
};

export const isFirestoreSaverModeEnabled = () => {
  if (typeof window === 'undefined') return FIRESTORE_SAVER_MODE_DEFAULT;
  try {
    const override = localStorage.getItem(FIRESTORE_SAVER_MODE_STORAGE_KEY);
    if (override === 'off') return false;
    if (override === 'on') return true;
  } catch {
    // fall back to the deployment default
  }
  return FIRESTORE_SAVER_MODE_DEFAULT;
};

export const setFirestoreSaverModeOverride = (value: 'on' | 'off' | 'default') => {
  if (typeof window === 'undefined') return isFirestoreSaverModeEnabled();
  try {
    if (value === 'default') localStorage.removeItem(FIRESTORE_SAVER_MODE_STORAGE_KEY);
    else localStorage.setItem(FIRESTORE_SAVER_MODE_STORAGE_KEY, value);
  } catch {
    // ignore storage failures
  }
  return isFirestoreSaverModeEnabled();
};

const readStoredDbMetrics = () => {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(getDbMetricsStorageKey()) || '{}');
  } catch {
    return {};
  }
};

const getDbMetricsSummary = () => {
  const metrics: any = readStoredDbMetrics();
  const flows = metrics.flows || {};
  const labels = metrics.labels || {};
  const recent = Array.isArray(metrics.recent) ? metrics.recent : [];

  return {
    day: metrics.day || new Date().toISOString().slice(0, 10),
    updatedAt: metrics.updatedAt || null,
    totals: metrics.totals || {},
    dbRoleSummary: Object.entries(metrics.dbRoles || {}).map(([dbRole, value]: [string, any]) => ({
      dbRole,
      reads: Number(value?.read || 0),
      readDocs: Number(value?.readDocs || 0),
      writes: Number(value?.write || 0),
      deletes: Number(value?.delete || 0),
      listens: Number(value?.listen || 0),
      skips: Number(value?.skip || 0),
      errors: Number(value?.error || 0),
    })),
    flowRanking: Object.entries(flows)
      .map(([flow, value]: [string, any]) => ({
        flow,
        reads: Number(value?.read || 0),
        readDocs: Number(value?.readDocs || 0),
        writes: Number(value?.write || 0),
        deletes: Number(value?.delete || 0),
        listens: Number(value?.listen || 0),
        skips: Number(value?.skip || 0),
        errors: Number(value?.error || 0),
      }))
      .sort((a, b) => ((b.readDocs + b.reads + b.writes + b.listens) - (a.readDocs + a.reads + a.writes + a.listens))),
    labelRanking: Object.entries(labels)
      .map(([key, value]: [string, any]) => ({
        key,
        reads: Number(value?.read || 0),
        readDocs: Number(value?.readDocs || 0),
        writes: Number(value?.write || 0),
        deletes: Number(value?.delete || 0),
        listens: Number(value?.listen || 0),
        skips: Number(value?.skip || 0),
        errors: Number(value?.error || 0),
      }))
      .sort((a, b) => ((b.readDocs + b.reads + b.writes + b.listens) - (a.readDocs + a.reads + a.writes + a.listens)))
      .slice(0, 25),
    collectionRanking: Object.entries(metrics.collections || {})
      .map(([key, value]: [string, any]) => ({
        key,
        dbRole: String(value?.dbRole || ''),
        reads: Number(value?.read || 0),
        readDocs: Number(value?.readDocs || 0),
        writes: Number(value?.write || 0),
        deletes: Number(value?.delete || 0),
        listens: Number(value?.listen || 0),
        skips: Number(value?.skip || 0),
        errors: Number(value?.error || 0),
      }))
      .sort((a, b) => ((b.readDocs + b.reads + b.writes + b.listens) - (a.readDocs + a.reads + a.writes + a.listens)))
      .slice(0, 25),
    recent,
  };
};

const exportDbMetricsText = () => {
  const summary = getDbMetricsSummary();
  return JSON.stringify(summary, null, 2);
};

const getDbErrorCode = (err: any) => (
  String(err?.code || err?.name || '').trim() || 'unknown'
);

const getDbErrorMessage = (err: any) => (
  String(err?.message || err || 'Unknown Firestore error').slice(0, 240)
);

const appendDbMetricRecord = (current: any, record: DbMetricRecord) => {
  const labelKey = `${record.flow}:${record.label || 'default'}`;
  const dbRoleKey = record.dbRole || 'unknown';
  const collectionKey = record.collection
    ? `${dbRoleKey}:${record.collection}`
    : '';
  const nextTotals = {
    ...(current.totals || {}),
    [record.operation]: Number(current.totals?.[record.operation] || 0) + record.count,
    [`${record.operation}Docs`]: Number(current.totals?.[`${record.operation}Docs`] || 0) + record.docs
  };
  const nextFlow = {
    ...(current.flows?.[record.flow] || {}),
    [record.operation]: Number(current.flows?.[record.flow]?.[record.operation] || 0) + record.count,
    [`${record.operation}Docs`]: Number(current.flows?.[record.flow]?.[`${record.operation}Docs`] || 0) + record.docs
  };
  const nextLabel = {
    ...(current.labels?.[labelKey] || {}),
    [record.operation]: Number(current.labels?.[labelKey]?.[record.operation] || 0) + record.count,
    [`${record.operation}Docs`]: Number(current.labels?.[labelKey]?.[`${record.operation}Docs`] || 0) + record.docs
  };
  const nextDbRole = record.dbRole ? {
    ...(current.dbRoles?.[dbRoleKey] || {}),
    [record.operation]: Number(current.dbRoles?.[dbRoleKey]?.[record.operation] || 0) + record.count,
    [`${record.operation}Docs`]: Number(current.dbRoles?.[dbRoleKey]?.[`${record.operation}Docs`] || 0) + record.docs
  } : null;
  const nextCollection = collectionKey ? {
    ...(current.collections?.[collectionKey] || {}),
    dbRole: dbRoleKey,
    [record.operation]: Number(current.collections?.[collectionKey]?.[record.operation] || 0) + record.count,
    [`${record.operation}Docs`]: Number(current.collections?.[collectionKey]?.[`${record.operation}Docs`] || 0) + record.docs
  } : null;

  return {
    day: new Date().toISOString().slice(0, 10),
    updatedAt: record.at,
    totals: nextTotals,
    flows: {
      ...(current.flows || {}),
      [record.flow]: nextFlow
    },
    labels: {
      ...(current.labels || {}),
      [labelKey]: nextLabel
    },
    dbRoles: record.dbRole ? {
      ...(current.dbRoles || {}),
      [dbRoleKey]: nextDbRole
    } : (current.dbRoles || {}),
    collections: collectionKey ? {
      ...(current.collections || {}),
      [collectionKey]: nextCollection
    } : (current.collections || {}),
    recent: [
      record,
      ...(Array.isArray(current.recent) ? current.recent : [])
    ].slice(0, DB_METRICS_RECENT_LIMIT)
  };
};

const installDbMetricsDebugHelper = (
  trackFirestoreRoute: (input: TrackFirestoreRouteInput) => void
) => {
  if (typeof window === 'undefined') return;
  const debugWindow = window as any;
  if (debugWindow.__fomDbMetrics) return;

  debugWindow.__fomDbMetrics = {
    read: readStoredDbMetrics,
    summary: getDbMetricsSummary,
    export: exportDbMetricsText,
    table: () => {
      const summary = getDbMetricsSummary();
      console.table(summary.flowRanking);
      console.table(summary.labelRanking);
      return summary;
    },
    copy: async () => {
      const text = exportDbMetricsText();
      await navigator.clipboard?.writeText(text);
      return text;
    },
    saverMode: {
      enabled: isFirestoreSaverModeEnabled,
      on: () => setFirestoreSaverModeOverride('on'),
      off: () => setFirestoreSaverModeOverride('off'),
      reset: () => setFirestoreSaverModeOverride('default'),
    },
    clear: () => {
      try {
        localStorage.removeItem(getDbMetricsStorageKey());
      } catch {
        // ignore storage failures
      }
    },
    trackFirestoreRoute,
  };
};

export const createDbMetricsRecorder = (
  trackFirestoreRoute: (input: TrackFirestoreRouteInput) => void
) => {
  const recordDbMetric = ({
    flow,
    operation,
    count = 1,
    docs = 0,
    label = '',
    dbRole,
    collection
  }: {
    flow: string;
    operation: DbMetricOperation;
    count?: number;
    docs?: number;
    label?: string;
    dbRole?: DbMetricDbRole;
    collection?: string;
  }) => {
    if (typeof window === 'undefined') return;
    try {
      installDbMetricsDebugHelper(trackFirestoreRoute);
      const storageKey = getDbMetricsStorageKey();
      const current = JSON.parse(localStorage.getItem(storageKey) || '{}');
      const safeCount = Math.max(0, Math.floor(Number(count) || 0));
      const safeDocs = Math.max(0, Math.floor(Number(docs) || 0));
      const next = appendDbMetricRecord(current, {
        at: new Date().toISOString(),
        flow,
        operation,
        count: safeCount,
        docs: safeDocs,
        label,
        dbRole,
        collection
      });

      localStorage.setItem(storageKey, JSON.stringify(next));
      if (dbRole && collection) {
        trackFirestoreRoute({ dbRole, collection, operation, flow, label });
      }
      if ((import.meta as any).env?.DEV) {
        console.debug('[FOM DB metric]', { flow, operation, count: safeCount, docs: safeDocs, label, dbRole, collection });
      }
    } catch (err) {
      console.error('Record DB metric error:', err);
    }
  };

  const recordDbError = ({
    flow,
    label = '',
    err,
    dbRole,
    collection
  }: {
    flow: string;
    label?: string;
    err: any;
    dbRole?: DbMetricDbRole;
    collection?: string;
  }) => {
    if (typeof window === 'undefined') return;
    try {
      installDbMetricsDebugHelper(trackFirestoreRoute);
      const storageKey = getDbMetricsStorageKey();
      const current = JSON.parse(localStorage.getItem(storageKey) || '{}');
      const code = getDbErrorCode(err);
      const message = getDbErrorMessage(err);
      const next = appendDbMetricRecord(current, {
        at: new Date().toISOString(),
        flow,
        operation: 'error',
        count: 1,
        docs: 0,
        label,
        dbRole,
        collection,
        code,
        message
      });

      localStorage.setItem(storageKey, JSON.stringify(next));
      if (dbRole && collection) {
        trackFirestoreRoute({ dbRole, collection, operation: 'error', flow, label });
      }
      if (code.toLowerCase().includes('resource-exhausted') || message.toLowerCase().includes('quota')) {
        console.warn('[FOM DB quota/error metric]', { flow, label, code, message });
      }
    } catch (metricErr) {
      console.error('Record DB error metric failed:', metricErr);
    }
  };

  return { recordDbMetric, recordDbError };
};
