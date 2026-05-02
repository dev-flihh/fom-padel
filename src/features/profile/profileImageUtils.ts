export const appendCacheBustParam = (url: string, version: string | number) => {
  if (!url || url.startsWith('data:')) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${encodeURIComponent(String(version))}`;
};

export const getStorageObjectPathFromUrl = (url: string) => {
  if (!url || url.startsWith('data:')) return null;
  try {
    const parsed = new URL(url);
    const objectSegment = parsed.pathname.match(/\/o\/(.+)$/)?.[1];
    if (!objectSegment) return null;
    return decodeURIComponent(objectSegment);
  } catch {
    return null;
  }
};
