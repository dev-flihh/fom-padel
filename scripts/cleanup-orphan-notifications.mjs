#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const DEFAULT_PROJECT = 'gen-lang-client-0996764238';
const DEFAULT_DATABASE = 'ai-studio-27d60198-41b0-4446-92d0-3c510bc94635';

const parseArgs = (argv) => {
  const parsed = {
    project: DEFAULT_PROJECT,
    database: DEFAULT_DATABASE,
    token: '',
    apply: false,
    pageSize: 500,
    report: ''
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--apply') {
      parsed.apply = true;
      continue;
    }
    if (arg === '--project') {
      parsed.project = argv[i + 1] || parsed.project;
      i += 1;
      continue;
    }
    if (arg === '--database') {
      parsed.database = argv[i + 1] || parsed.database;
      i += 1;
      continue;
    }
    if (arg === '--token') {
      parsed.token = argv[i + 1] || '';
      i += 1;
      continue;
    }
    if (arg === '--page-size') {
      const pageSize = Number(argv[i + 1] || '');
      if (Number.isFinite(pageSize) && pageSize > 0) {
        parsed.pageSize = Math.min(500, Math.floor(pageSize));
      }
      i += 1;
      continue;
    }
    if (arg === '--report') {
      parsed.report = argv[i + 1] || '';
      i += 1;
      continue;
    }
  }

  return parsed;
};

const getAccessToken = (explicitToken) => {
  if (explicitToken) return explicitToken;
  return execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
};

const requestJson = async (url, init) => {
  const response = await fetch(url, init);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status} ${response.statusText}: ${text}`);
  }
  return response.json();
};

const extractRelativePath = (documentName, docRoot) => (
  String(documentName || '').replace(`${docRoot}/`, '')
);

const extractDocId = (documentName) => {
  const parts = String(documentName || '').split('/');
  return parts[parts.length - 1] || '';
};

const listUsers = async ({ documentsUrl, docRoot, headers, pageSize }) => {
  const users = new Set();
  const userSummaries = new Map();
  let nextPageToken = '';

  do {
    const url = new URL(`${documentsUrl}/users`);
    url.searchParams.set('pageSize', String(pageSize));
    if (nextPageToken) url.searchParams.set('pageToken', nextPageToken);

    const payload = await requestJson(url, { method: 'GET', headers });
    for (const document of payload.documents || []) {
      const uid = extractDocId(document.name);
      const fields = document.fields || {};
      users.add(uid);
      userSummaries.set(uid, {
        uid,
        path: extractRelativePath(document.name, docRoot),
        email: fields.email?.stringValue || '',
        displayName: fields.displayName?.stringValue || fields.username?.stringValue || ''
      });
    }
    nextPageToken = payload.nextPageToken || '';
  } while (nextPageToken);

  return { users, userSummaries };
};

const queryNotificationDocs = async ({ documentsUrl, headers, pageSize }) => {
  const documents = [];

  for (let offset = 0; ; offset += pageSize) {
    const payload = await requestJson(`${documentsUrl}:runQuery`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'notifications', allDescendants: true }],
          offset,
          limit: pageSize
        }
      })
    });

    const pageDocuments = payload
      .map((row) => row.document)
      .filter(Boolean);

    documents.push(...pageDocuments);
    if (pageDocuments.length < pageSize) break;
  }

  return documents;
};

const groupByParent = (documents, docRoot, users) => {
  const parentCounts = new Map();
  const orphanDocuments = [];
  const unexpectedDocuments = [];

  for (const document of documents) {
    const relativePath = extractRelativePath(document.name, docRoot);
    const parts = relativePath.split('/');
    const notificationsIndex = parts.lastIndexOf('notifications');
    const parentPath = parts.slice(0, notificationsIndex).join('/');
    const parentUid = parts[notificationsIndex - 1] || '';
    const isUserNotification = parts[0] === 'users' && notificationsIndex === 2;
    const parentExists = users.has(parentUid);
    const parentKey = parentPath || '(unknown)';

    parentCounts.set(parentKey, {
      parentPath,
      uid: parentUid,
      existingUser: parentExists,
      count: (parentCounts.get(parentKey)?.count || 0) + 1
    });

    if (!isUserNotification) {
      unexpectedDocuments.push({ name: document.name, relativePath, parentPath, uid: parentUid });
      continue;
    }

    if (!parentExists) {
      orphanDocuments.push({ name: document.name, relativePath, parentPath, uid: parentUid });
    }
  }

  return {
    parentCounts: Array.from(parentCounts.values()).sort((a, b) => b.count - a.count),
    orphanDocuments,
    unexpectedDocuments
  };
};

const chunkArray = (items, size) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const deleteDocuments = async ({ documentsUrl, headers, documentNames }) => {
  let deleted = 0;
  const batches = chunkArray(documentNames, 500);

  for (const batch of batches) {
    await requestJson(`${documentsUrl}:commit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        writes: batch.map((name) => ({ delete: name }))
      })
    });
    deleted += batch.length;
  }

  return deleted;
};

const main = async () => {
  const args = parseArgs(process.argv);
  const token = getAccessToken(args.token);
  const docRoot = `projects/${args.project}/databases/${args.database}/documents`;
  const documentsUrl = `https://firestore.googleapis.com/v1/${docRoot}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    'x-goog-user-project': args.project,
    'Content-Type': 'application/json'
  };

  const { users } = await listUsers({ documentsUrl, docRoot, headers, pageSize: args.pageSize });
  const notificationDocs = await queryNotificationDocs({ documentsUrl, headers, pageSize: args.pageSize });
  const grouped = groupByParent(notificationDocs, docRoot, users);
  const orphanDocumentNames = grouped.orphanDocuments.map((document) => document.name);
  const existingParentNotifications = grouped.parentCounts
    .filter((parent) => parent.existingUser)
    .reduce((total, parent) => total + parent.count, 0);

  let deleted = 0;
  if (args.apply && orphanDocumentNames.length > 0) {
    deleted = await deleteDocuments({ documentsUrl, headers, documentNames: orphanDocumentNames });
  }

  const report = {
    mode: args.apply ? 'apply' : 'dry-run',
    project: args.project,
    database: args.database,
    users: users.size,
    notificationsScanned: notificationDocs.length,
    existingParentNotifications,
    orphanNotifications: grouped.orphanDocuments.length,
    unexpectedNotificationPaths: grouped.unexpectedDocuments.length,
    deleted,
    topParents: grouped.parentCounts.slice(0, 25),
    sampleOrphans: grouped.orphanDocuments.slice(0, 25)
  };

  if (args.report) {
    writeFileSync(args.report, `${JSON.stringify(report, null, 2)}\n`);
  }

  console.log(JSON.stringify(report, null, 2));
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
