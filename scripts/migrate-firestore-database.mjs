const DEFAULT_PROJECT = 'gen-lang-client-0996764238';
const DEFAULT_SOURCE_DATABASE = 'ai-studio-27d60198-41b0-4446-92d0-3c510bc94635';
const DEFAULT_DESTINATION_DATABASE = 'fom-play-sg';

const TOP_LEVEL_COLLECTIONS = [
  'users',
  'player_stats',
  'leaderboard_snapshots',
  'leaderboard_refresh_state',
  'tournaments',
  'tournament_details',
  'player_match_ledger',
  'tournament_stat_runs',
  'sharedMatches',
  'active_tournament_drafts',
  'feedback_submissions',
];

const USER_SUBCOLLECTIONS = [
  'friends',
  'friendRequests',
  'sentFriendRequests',
  'notifications',
  'history_summary',
];

const parseArgs = (argv) => {
  const parsed = {
    project: DEFAULT_PROJECT,
    source: DEFAULT_SOURCE_DATABASE,
    destination: DEFAULT_DESTINATION_DATABASE,
    token: process.env.FIRESTORE_MIGRATION_TOKEN || '',
    apply: false,
    pageSize: 100,
    batchSize: 100,
    maxDocs: Infinity,
    includeSharedMatches: false,
    collections: [...TOP_LEVEL_COLLECTIONS],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--project') parsed.project = argv[index + 1] || parsed.project;
    if (arg === '--source') parsed.source = argv[index + 1] || parsed.source;
    if (arg === '--destination') parsed.destination = argv[index + 1] || parsed.destination;
    if (arg === '--token') parsed.token = argv[index + 1] || parsed.token;
    if (arg === '--page-size') parsed.pageSize = Math.max(1, Number(argv[index + 1]) || parsed.pageSize);
    if (arg === '--batch-size') parsed.batchSize = Math.max(1, Math.min(500, Number(argv[index + 1]) || parsed.batchSize));
    if (arg === '--max-docs') parsed.maxDocs = Math.max(1, Number(argv[index + 1]) || parsed.maxDocs);
    if (arg === '--collections') {
      parsed.collections = String(argv[index + 1] || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
    if (arg === '--include-shared-matches') parsed.includeSharedMatches = true;
    if (arg === '--apply') parsed.apply = true;
  }

  if (!parsed.includeSharedMatches) {
    parsed.collections = parsed.collections.filter((collectionId) => collectionId !== 'sharedMatches');
  }

  return parsed;
};

const getDocumentPath = (docName) => {
  const marker = '/documents/';
  const markerIndex = docName.indexOf(marker);
  return markerIndex >= 0 ? docName.slice(markerIndex + marker.length) : docName;
};

const createFirestoreClient = ({ project, database, token }) => {
  const rootName = `projects/${project}/databases/${database}/documents`;
  const rootUrl = `https://firestore.googleapis.com/v1/${rootName}`;
  const headers = { Authorization: `Bearer ${token}` };

  return {
    async listDocuments(collectionPath, { pageSize, pageToken = '' } = {}) {
      const url = new URL(`${rootUrl}/${collectionPath}`);
      url.searchParams.set('pageSize', String(pageSize));
      if (pageToken) url.searchParams.set('pageToken', pageToken);

      const response = await fetch(url, { headers });
      if (response.status === 404) return { documents: [], nextPageToken: '' };
      if (!response.ok) {
        throw new Error(`Failed to list ${collectionPath}: ${response.status} ${await response.text()}`);
      }
      return response.json();
    },
    async batchWrite(documents) {
      const response = await fetch(`${rootUrl}:batchWrite`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          writes: documents.map((document) => ({
            update: {
              name: `${rootName}/${getDocumentPath(document.name)}`,
              fields: document.fields || {},
            },
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed batchWrite: ${response.status} ${await response.text()}`);
      }
      return response.json();
    },
  };
};

const listAllDocuments = async (client, collectionPath, { pageSize, maxDocs }) => {
  const documents = [];
  let pageToken = '';

  do {
    const page = await client.listDocuments(collectionPath, { pageSize, pageToken });
    documents.push(...(page.documents || []));
    pageToken = page.nextPageToken || '';
  } while (pageToken && documents.length < maxDocs);

  return documents.slice(0, maxDocs);
};

const writeInBatches = async (client, documents, { batchSize, apply }) => {
  if (!apply || documents.length === 0) return { written: 0 };

  let written = 0;
  for (let index = 0; index < documents.length; index += batchSize) {
    const batch = documents.slice(index, index + batchSize);
    await client.batchWrite(batch);
    written += batch.length;
    console.log(`Wrote ${written}/${documents.length}`);
  }

  return { written };
};

const migrateCollection = async ({ sourceClient, destinationClient, collectionPath, args }) => {
  const docs = await listAllDocuments(sourceClient, collectionPath, {
    pageSize: args.pageSize,
    maxDocs: args.maxDocs,
  });
  const writeResult = await writeInBatches(destinationClient, docs, {
    batchSize: args.batchSize,
    apply: args.apply,
  });

  return {
    collectionPath,
    read: docs.length,
    written: writeResult.written,
  };
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (!args.token) {
    console.error('Missing token. Use --token <accessToken> or FIRESTORE_MIGRATION_TOKEN.');
    process.exit(1);
  }
  if (args.source === args.destination) {
    console.error('Source and destination databases must be different.');
    process.exit(1);
  }

  const sourceClient = createFirestoreClient({
    project: args.project,
    database: args.source,
    token: args.token,
  });
  const destinationClient = createFirestoreClient({
    project: args.project,
    database: args.destination,
    token: args.token,
  });

  console.log(JSON.stringify({
    mode: args.apply ? 'apply' : 'dry-run',
    project: args.project,
    source: args.source,
    destination: args.destination,
    collections: args.collections,
    userSubcollections: USER_SUBCOLLECTIONS,
    pageSize: args.pageSize,
    batchSize: args.batchSize,
    maxDocs: Number.isFinite(args.maxDocs) ? args.maxDocs : 'unlimited',
  }, null, 2));

  const report = [];
  for (const collectionId of args.collections) {
    report.push(await migrateCollection({
      sourceClient,
      destinationClient,
      collectionPath: collectionId,
      args,
    }));
  }

  const shouldMigrateUserSubcollections = args.collections.includes('users');
  if (shouldMigrateUserSubcollections) {
    const users = await listAllDocuments(sourceClient, 'users', {
      pageSize: args.pageSize,
      maxDocs: args.maxDocs,
    });

    for (const userDoc of users) {
      const uid = getDocumentPath(userDoc.name).split('/').pop();
      for (const subcollectionId of USER_SUBCOLLECTIONS) {
        report.push(await migrateCollection({
          sourceClient,
          destinationClient,
          collectionPath: `users/${uid}/${subcollectionId}`,
          args,
        }));
      }
    }
  }

  console.log(JSON.stringify({ report }, null, 2));
  if (!args.apply) {
    console.log('Dry-run only. Re-run with --apply after reviewing counts.');
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
