import { type Friend } from '../../types';

export const sortFriendsByName = (items: Friend[]) => (
  [...items].sort((a, b) => (
    (a?.displayName || '').localeCompare(b?.displayName || '', undefined, { sensitivity: 'base' })
  ))
);
