// Friendly share paths: /m/<id> (live match) and /m/<id>/klasemen (standings).
// Kept intentionally loose so old query-string links (?shared=) still resolve too.
const SHARED_MATCH_PATH_RE = /^\/m\/([^/]+?)(?:\/(klasemen))?\/?$/i;

export const parseSharedMatchPath = (pathname: string = window.location.pathname) => {
  const match = SHARED_MATCH_PATH_RE.exec(pathname || '');
  if (!match) return null;
  let sharedId = match[1];
  try {
    sharedId = decodeURIComponent(sharedId);
  } catch {
    // keep raw value if it is not valid percent-encoding
  }
  if (!sharedId) return null;
  return {
    sharedId,
    targetView: (match[2] ? 'klasemen' : 'active') as 'active' | 'klasemen',
  };
};

export const isAppShellQuery = (
  params: URLSearchParams,
  pathname: string = window.location.pathname
) => {
  if (parseSharedMatchPath(pathname)) return true;
  const sharedId = params.get('shared');
  const e2e = params.get('e2e');
  const roomId = params.get('room');
  return Boolean(
    sharedId ||
    roomId ||
    e2e === 'finished-flow' ||
    e2e === 'background-flow' ||
    e2e === 'start-match-flow' ||
    e2e === 'share-flow' ||
    e2e === 'shared-viewer-flow' ||
    e2e === 'toxic-active-ticker' ||
    e2e === 'americano-incomplete-round' ||
    e2e === 'profile-flow' ||
    e2e === 'standings-6p' ||
    e2e === 'standings-long-history' ||
    e2e === 'toxic-standings' ||
    e2e === 'toxic-empty' ||
    e2e === 'toxic-shared' ||
    e2e === 'toxic-co-king'
  );
};

export const getInitialSharedContext = () => {
  const fromPath = parseSharedMatchPath(window.location.pathname);
  if (fromPath) {
    return {
      sharedId: fromPath.sharedId,
      targetView: fromPath.targetView,
      isShared: true,
    };
  }
  const params = new URLSearchParams(window.location.search);
  const sharedId = params.get('shared');
  const targetView = params.get('view') === 'klasemen' ? 'klasemen' : 'active';
  return {
    sharedId,
    targetView,
    isShared: Boolean(sharedId)
  };
};

export const getInitialE2EScenario = () => {
  const params = new URLSearchParams(window.location.search);
  const scenario = params.get('e2e');
  if (
    scenario === 'finished-flow' ||
    scenario === 'background-flow' ||
    scenario === 'start-match-flow' ||
    scenario === 'share-flow' ||
    scenario === 'shared-viewer-flow' ||
    scenario === 'toxic-active-ticker' ||
    scenario === 'americano-incomplete-round' ||
    scenario === 'profile-flow' ||
    scenario === 'standings-6p' ||
    scenario === 'standings-long-history' ||
    scenario === 'toxic-standings' ||
    scenario === 'toxic-empty' ||
    scenario === 'toxic-shared' ||
    scenario === 'toxic-co-king'
  ) {
    return scenario;
  }
  return null;
};
