import en, { type Dict } from './en';
import id from './id';
import pagesEn, { type Pages } from './pagesEn';
import pagesId from './pagesId';

export type { Dict, Pages };

export const getDict = (locale: string | undefined): Dict => (locale === 'id' ? id : en);

export const getPages = (locale: string | undefined): Pages => (locale === 'id' ? pagesId : pagesEn);

/** Prefix path dengan /id untuk locale Indonesia; EN tetap di root. */
export const localePath = (path: string, locale: string | undefined): string =>
  locale === 'id' ? `/id${path === '/' ? '/' : path}` : path;
