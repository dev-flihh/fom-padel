import { Player, Tournament } from "./types";

export const INITIAL_PLAYERS: Player[] = [
  {
    id: '1',
    name: 'Budi Sudarsono',
    rating: 4.5,
    initials: 'BS',
    team: 'Padel Masters',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop',
    stats: { matches: 12, won: 12, lost: 1, draw: 0, diff: 42 }
  },
  {
    id: '2',
    name: 'Siti Nurhaliza',
    rating: 4.2,
    initials: 'SN',
    team: 'Ace Seekers',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
    stats: { matches: 10, won: 10, lost: 3, draw: 0, diff: 28 }
  },
  {
    id: '3',
    name: 'Andi Pratama',
    rating: 4.0,
    initials: 'AP',
    team: 'Volley Kings',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
    stats: { matches: 9, won: 9, lost: 4, draw: 0, diff: 15 }
  },
  {
    id: '4',
    name: 'Dewi Sartika',
    rating: 3.8,
    initials: 'DS',
    team: 'Court Queens',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop',
    stats: { matches: 8, won: 8, lost: 5, draw: 0, diff: -4 }
  },
  {
    id: '5',
    name: 'Rian Hidayat',
    rating: 3.5,
    initials: 'RH',
    team: 'Smash Bros',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop',
    stats: { matches: 7, won: 7, lost: 6, draw: 0, diff: -12 }
  },
  {
    id: '6',
    name: 'Siska Pratama',
    rating: 4.2,
    initials: 'SP',
    stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 }
  },
  {
    id: '7',
    name: 'Falih',
    rating: 4.5,
    initials: 'F',
    stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 }
  },
  {
    id: '8',
    name: 'Putra',
    rating: 4.0,
    initials: 'P',
    stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 }
  },
  {
    id: '9',
    name: 'Hermon',
    rating: 4.1,
    initials: 'H',
    stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 }
  },
  {
    id: '10',
    name: 'Rizky',
    rating: 3.9,
    initials: 'R',
    stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 }
  }
];

export const INITIAL_TOURNAMENT: Tournament = {
  name: 'Padel Tournament',
  format: 'Americano',
  criteria: 'Points Won',
  courts: 1,
  totalPoints: 21,
  players: [],
  inactivePlayerIds: [],
  rounds: [],
  numRounds: 5
};
