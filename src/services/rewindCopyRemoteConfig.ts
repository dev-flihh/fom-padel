import { fetchAndActivate, getRemoteConfig, getString, isSupported } from 'firebase/remote-config';
import { app } from '../firebase';
import { parseRewindCopyBankJson, type RewindCopyLine } from '../features/rewind/rewindCopyBank';

// Mirrors toxicCopyRemoteConfig: Firebase Remote Config key + QA/dev
// localStorage override, failing closed to the built-in default bank.

export const REWIND_COPY_REMOTE_CONFIG_KEY = 'rewind_copy_v1';
export const REWIND_COPY_LOCAL_OVERRIDE_KEY = 'fom_rewind_copy_config_v1';

let cachedRewindCopyBank: RewindCopyLine[] | null | undefined;
let rewindCopyBankRequest: Promise<RewindCopyLine[] | null> | null = null;

const readLocalRewindCopyOverride = () => {
  if (typeof window === 'undefined') return null;
  try {
    const localOverride = window.localStorage.getItem(REWIND_COPY_LOCAL_OVERRIDE_KEY);
    const envOverride = ((import.meta as any).env?.VITE_REWIND_COPY_CONFIG_JSON as string | undefined) || '';
    return parseRewindCopyBankJson(localOverride || envOverride);
  } catch {
    return null;
  }
};

export const fetchRewindCopyBank = async (): Promise<RewindCopyLine[] | null> => {
  const localOverride = readLocalRewindCopyOverride();
  if (localOverride) {
    cachedRewindCopyBank = localOverride;
    return localOverride;
  }

  if (cachedRewindCopyBank !== undefined) return cachedRewindCopyBank;
  if (rewindCopyBankRequest) return rewindCopyBankRequest;
  if (typeof window === 'undefined') return null;

  rewindCopyBankRequest = (async () => {
    try {
      const supported = await isSupported();
      if (!supported) {
        cachedRewindCopyBank = null;
        return null;
      }

      const remoteConfig = getRemoteConfig(app);
      remoteConfig.settings.minimumFetchIntervalMillis = import.meta.env.DEV
        ? 60 * 1000
        : 60 * 60 * 1000;
      remoteConfig.defaultConfig = {
        ...remoteConfig.defaultConfig,
        [REWIND_COPY_REMOTE_CONFIG_KEY]: '',
      };

      await fetchAndActivate(remoteConfig);
      cachedRewindCopyBank = parseRewindCopyBankJson(getString(remoteConfig, REWIND_COPY_REMOTE_CONFIG_KEY));
      return cachedRewindCopyBank;
    } catch (err) {
      console.warn('Unable to fetch rewind copy remote config', err);
      cachedRewindCopyBank = null;
      return null;
    } finally {
      rewindCopyBankRequest = null;
    }
  })();

  return rewindCopyBankRequest;
};
