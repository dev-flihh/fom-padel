#!/usr/bin/env node

const parseArgs = (argv) => {
  const parsed = {
    token: '',
    project: '',
    database: '',
    apply: false,
    normalizeMmrZeroMatches: false,
    pageSize: 300
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--apply') {
      parsed.apply = true;
      continue;
    }
    if (arg === '--normalize-mmr-zero-matches') {
      parsed.normalizeMmrZeroMatches = true;
      continue;
    }
    if (arg === '--token') {
      parsed.token = argv[i + 1] || '';
      i += 1;
      continue;
    }
    if (arg === '--project') {
      parsed.project = argv[i + 1] || '';
      i += 1;
      continue;
    }
    if (arg === '--database') {
      parsed.database = argv[i + 1] || '';
      i += 1;
      continue;
    }
    if (arg === '--page-size') {
      const parsedPageSize = Number(argv[i + 1] || '');
      if (Number.isFinite(parsedPageSize) && parsedPageSize > 0) {
        parsed.pageSize = Math.floor(parsedPageSize);
      }
      i += 1;
      continue;
    }
  }

  return parsed;
};

const getStringField = (fieldValue) => {
  if (!fieldValue) return '';
  if (typeof fieldValue.stringValue === 'string') return fieldValue.stringValue;
  return '';
};

const getNumberField = (fieldValue) => {
  if (!fieldValue) return null;
  if (fieldValue.integerValue !== undefined) {
    const value = Number(fieldValue.integerValue);
    return Number.isFinite(value) ? value : null;
  }
  if (fieldValue.doubleValue !== undefined) {
    const value = Number(fieldValue.doubleValue);
    return Number.isFinite(value) ? value : null;
  }
  return null;
};

const extractDocId = (fullDocName) => {
  const parts = String(fullDocName || '').split('/');
  return parts.length ? parts[parts.length - 1] : '';
};

const countNonPendingMatches = (roundsFieldValue) => {
  const rounds = roundsFieldValue?.arrayValue?.values;
  if (!Array.isArray(rounds)) return 0;

  let total = 0;
  for (const round of rounds) {
    const matches = round?.mapValue?.fields?.matches?.arrayValue?.values;
    if (!Array.isArray(matches)) continue;
    for (const match of matches) {
      const status = getStringField(match?.mapValue?.fields?.status);
      if (status && status !== 'pending') total += 1;
    }
  }
  return total;
};

const requestJson = async (url, init) => {
  const response = await fetch(url, init);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status} ${response.statusText}: ${text}`);
  }
  return response.json();
};

const listCollectionDocuments = async ({
  baseUrl,
  collectionId,
  token,
  pageSize
}) => {
  const documents = [];
  let nextPageToken = '';

  do {
    const pageTokenQuery = nextPageToken ? `&pageToken=${encodeURIComponent(nextPageToken)}` : '';
    const url = `${baseUrl}/documents/${collectionId}?pageSize=${pageSize}${pageTokenQuery}`;
    const payload = await requestJson(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (Array.isArray(payload.documents)) {
      documents.push(...payload.documents);
    }
    nextPageToken = payload.nextPageToken || '';
  } while (nextPageToken);

  return documents;
};

const patchUserStats = async ({
  baseUrl,
  token,
  userDocId,
  totalMatches,
  shouldUpdateMmr,
  mmr
}) => {
  const updateMask = ['totalMatches'];
  if (shouldUpdateMmr) updateMask.push('mmr');
  const updateMaskQuery = updateMask.map((fieldPath) => `updateMask.fieldPaths=${encodeURIComponent(fieldPath)}`).join('&');
  const url = `${baseUrl}/documents/users/${userDocId}?${updateMaskQuery}`;
  const fields = {
    totalMatches: {
      integerValue: String(Math.max(0, Math.trunc(totalMatches)))
    }
  };
  if (shouldUpdateMmr) {
    fields.mmr = {
      integerValue: String(Math.max(0, Math.trunc(mmr)))
    };
  }
  const body = {
    fields
  };

  await requestJson(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
};

const run = async () => {
  const args = parseArgs(process.argv);
  if (!args.token || !args.project || !args.database) {
    console.error('Usage: node scripts/backfill-total-matches.mjs --token <token> --project <projectId> --database <databaseId> [--apply] [--normalize-mmr-zero-matches] [--page-size <n>]');
    process.exit(1);
  }

  const baseUrl = `https://firestore.googleapis.com/v1/projects/${args.project}/databases/${args.database}`;

  const users = await listCollectionDocuments({
    baseUrl,
    collectionId: 'users',
    token: args.token,
    pageSize: args.pageSize
  });
  const tournaments = await listCollectionDocuments({
    baseUrl,
    collectionId: 'tournaments',
    token: args.token,
    pageSize: args.pageSize
  });

  const totalMatchesByUser = new Map();
  for (const tournamentDoc of tournaments) {
    const fields = tournamentDoc?.fields || {};
    const userId = getStringField(fields.userId);
    if (!userId) continue;
    const countedMatches = countNonPendingMatches(fields.rounds);
    totalMatchesByUser.set(userId, (totalMatchesByUser.get(userId) || 0) + countedMatches);
  }

  const updates = [];
  for (const userDoc of users) {
    const fields = userDoc?.fields || {};
    const userId = getStringField(fields.uid) || extractDocId(userDoc?.name);
    if (!userId) continue;

    const docId = extractDocId(userDoc?.name);
    const stored = getNumberField(fields.totalMatches);
    const computed = totalMatchesByUser.get(userId) || 0;
    const displayName = getStringField(fields.displayName) || '(no-name)';
    const mmr = getNumberField(fields.mmr) || 0;
    const shouldNormalizeMmr = args.normalizeMmrZeroMatches && computed === 0 && mmr > 0;

    if (stored === null || stored !== computed || shouldNormalizeMmr) {
      updates.push({
        docId,
        userId,
        displayName,
        mmr,
        storedTotalMatches: stored,
        computedTotalMatches: computed,
        shouldNormalizeMmr,
        normalizedMmr: shouldNormalizeMmr ? 0 : mmr
      });
    }
  }

  console.log(`Users scanned: ${users.length}`);
  console.log(`Tournaments scanned: ${tournaments.length}`);
  console.log(`Users requiring totalMatches update: ${updates.length}`);
  if (updates.length > 0) {
    console.log('Sample updates (first 10):');
    updates.slice(0, 10).forEach((item, idx) => {
      console.log(
        `${idx + 1}. ${item.displayName} (${item.userId}) mmr=${item.mmr}${item.shouldNormalizeMmr ? '->0' : ''} stored=${item.storedTotalMatches ?? 'null'} -> computed=${item.computedTotalMatches}`
      );
    });
  }

  if (!args.apply) {
    console.log('Dry-run mode. Re-run with --apply to write changes.');
    return;
  }

  let success = 0;
  let failed = 0;
  for (const update of updates) {
    try {
      await patchUserStats({
        baseUrl,
        token: args.token,
        userDocId: update.docId,
        totalMatches: update.computedTotalMatches,
        shouldUpdateMmr: update.shouldNormalizeMmr,
        mmr: update.normalizedMmr
      });
      success += 1;
    } catch (err) {
      failed += 1;
      console.error(`Failed update for ${update.userId}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`Applied updates successfully: ${success}`);
  console.log(`Failed updates: ${failed}`);
  if (failed > 0) process.exit(2);
};

run().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
