export const isAppShellQuery = (params: URLSearchParams) => {
  const sharedId = params.get('shared');
  const e2e = params.get('e2e');
  return Boolean(
    sharedId ||
    e2e === 'finished-flow' ||
    e2e === 'background-flow' ||
    e2e === 'start-match-flow' ||
    e2e === 'profile-flow' ||
    e2e === 'standings-6p'
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
  if (scenario === 'finished-flow' || scenario === 'background-flow' || scenario === 'start-match-flow' || scenario === 'profile-flow' || scenario === 'standings-6p') {
    return scenario;
  }
  return null;
};
