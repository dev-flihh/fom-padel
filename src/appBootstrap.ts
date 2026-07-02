export const isAppShellQuery = (params: URLSearchParams) => {
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
