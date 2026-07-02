import { fetchAndActivate, getRemoteConfig, getString, isSupported } from 'firebase/remote-config';
import { app } from '../firebase';
import { parseToxicCopyConfigJson, type ToxicCopyConfig } from '../features/matches/toxicCopyConfig';

export const TOXIC_COPY_REMOTE_CONFIG_KEY = 'toxic_copy_v1';
export const TOXIC_COPY_LOCAL_OVERRIDE_KEY = 'fom_toxic_copy_config_v1';

let cachedToxicCopyConfig: ToxicCopyConfig | null | undefined;
let toxicCopyConfigRequest: Promise<ToxicCopyConfig | null> | null = null;

const readLocalToxicCopyOverride = () => {
  if (typeof window === 'undefined') return null;
  try {
    const localOverride = window.localStorage.getItem(TOXIC_COPY_LOCAL_OVERRIDE_KEY);
    const envOverride = ((import.meta as any).env?.VITE_TOXIC_COPY_CONFIG_JSON as string | undefined) || '';
    return parseToxicCopyConfigJson(localOverride || envOverride);
  } catch {
    return null;
  }
};

export const fetchToxicCopyConfig = async (): Promise<ToxicCopyConfig | null> => {
  const localOverride = readLocalToxicCopyOverride();
  if (localOverride) {
    cachedToxicCopyConfig = localOverride;
    return localOverride;
  }

  if (cachedToxicCopyConfig !== undefined) return cachedToxicCopyConfig;
  if (toxicCopyConfigRequest) return toxicCopyConfigRequest;
  if (typeof window === 'undefined') return null;

  toxicCopyConfigRequest = (async () => {
    try {
      const supported = await isSupported();
      if (!supported) {
        cachedToxicCopyConfig = null;
        return null;
      }

      const remoteConfig = getRemoteConfig(app);
      remoteConfig.settings.minimumFetchIntervalMillis = import.meta.env.DEV
        ? 60 * 1000
        : 60 * 60 * 1000;
      remoteConfig.defaultConfig = {
        ...remoteConfig.defaultConfig,
        [TOXIC_COPY_REMOTE_CONFIG_KEY]: '',
      };

      await fetchAndActivate(remoteConfig);
      cachedToxicCopyConfig = parseToxicCopyConfigJson(getString(remoteConfig, TOXIC_COPY_REMOTE_CONFIG_KEY));
      return cachedToxicCopyConfig;
    } catch (err) {
      console.warn('Unable to fetch toxic copy remote config', err);
      cachedToxicCopyConfig = null;
      return null;
    } finally {
      toxicCopyConfigRequest = null;
    }
  })();

  return toxicCopyConfigRequest;
};
