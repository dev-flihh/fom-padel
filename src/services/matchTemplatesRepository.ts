import type { MatchTemplate } from '../features/tournaments/quickStart';

// Penyimpanan template match: localStorage per akun (R1.3 — lokasi storage
// keputusan engineering; mulai dari lokal, sinkronisasi Firestore menyusul
// tanpa mengubah kontrak fungsi ini).
const TEMPLATE_STORAGE_PREFIX = 'fom_match_templates_v1_';
const MAX_TEMPLATES = 10;

const storageKeyFor = (uid: string) => `${TEMPLATE_STORAGE_PREFIX}${uid}`;

const isValidTemplate = (value: unknown): value is MatchTemplate => {
  if (!value || typeof value !== 'object') return false;
  const template = value as MatchTemplate;
  return Boolean(template.id && template.name && template.format && Array.isArray(template.players));
};

export const listMatchTemplates = (uid?: string | null): MatchTemplate[] => {
  const normalizedUid = String(uid || '').trim();
  if (!normalizedUid) return [];
  try {
    const raw = window.localStorage.getItem(storageKeyFor(normalizedUid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidTemplate);
  } catch (err) {
    console.error('Read match templates error:', err);
    return [];
  }
};

const persistTemplates = (uid: string, templates: MatchTemplate[]) => {
  try {
    window.localStorage.setItem(storageKeyFor(uid), JSON.stringify(templates.slice(0, MAX_TEMPLATES)));
  } catch (err) {
    console.error('Persist match templates error:', err);
  }
};

// Simpan template baru di urutan teratas; nama sama akan menggantikan
// template lama supaya "Save as template" berulang tidak menumpuk duplikat.
export const saveMatchTemplate = (uid: string | null | undefined, template: MatchTemplate): MatchTemplate[] => {
  const normalizedUid = String(uid || '').trim();
  if (!normalizedUid) return [];
  const existing = listMatchTemplates(normalizedUid).filter(
    (item) => item.id !== template.id && item.name.trim().toLowerCase() !== template.name.trim().toLowerCase()
  );
  const next = [template, ...existing];
  persistTemplates(normalizedUid, next);
  return next.slice(0, MAX_TEMPLATES);
};

export const deleteMatchTemplate = (uid: string | null | undefined, templateId: string): MatchTemplate[] => {
  const normalizedUid = String(uid || '').trim();
  if (!normalizedUid) return [];
  const next = listMatchTemplates(normalizedUid).filter((item) => item.id !== templateId);
  persistTemplates(normalizedUid, next);
  return next;
};
