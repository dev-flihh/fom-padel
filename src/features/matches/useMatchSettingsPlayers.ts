import { useEffect, useMemo, type Dispatch, type SetStateAction } from 'react';
import { type Player, type Tournament } from '../../types';
import { dedupePlayersById, sortPlayersByName } from './matchSetupUtils';

export const useMatchSettingsPlayers = ({
  tournamentPlayers,
  allPlayers,
  setAllPlayers,
  setTournament
}: {
  tournamentPlayers: Player[];
  allPlayers: Player[];
  setAllPlayers: Dispatch<SetStateAction<Player[]>>;
  setTournament: Dispatch<SetStateAction<Tournament>>;
}) => {
  const selectedPlayers = useMemo(() => dedupePlayersById(tournamentPlayers || []), [tournamentPlayers]);
  const normalizedAllPlayers = useMemo(() => dedupePlayersById(allPlayers || []), [allPlayers]);
  const sortedSelectedPlayers = useMemo(() => sortPlayersByName(selectedPlayers), [selectedPlayers]);
  const availablePlayers = useMemo(
    () => sortPlayersByName(
      normalizedAllPlayers.filter((player) => !selectedPlayers.some((selected) => selected?.id === player.id))
    ),
    [normalizedAllPlayers, selectedPlayers]
  );

  useEffect(() => {
    if (selectedPlayers.length === 0) return;
    setAllPlayers((prev) => {
      const normalizedPrev = dedupePlayersById(prev || []);
      const knownIds = new Set(normalizedPrev.map((p) => p.id));
      let changed = normalizedPrev.length !== prev.length;
      const merged = [...normalizedPrev];

      selectedPlayers.forEach((player) => {
        if (!player?.id || knownIds.has(player.id)) return;
        merged.push(player);
        knownIds.add(player.id);
        changed = true;
      });

      return changed ? merged : prev;
    });
  }, [selectedPlayers, setAllPlayers]);

  const togglePlayer = (player: Player) => {
    if (!player?.id) return;
    setTournament((prev) => {
      const currentPlayers = dedupePlayersById(prev.players || []);
      const alreadySelected = currentPlayers.some((p) => p?.id === player.id);
      const nextPlayers = alreadySelected
        ? currentPlayers.filter((p) => p?.id !== player.id)
        : dedupePlayersById([...currentPlayers, player]);
      const currentIds = currentPlayers.map((p) => p.id).join('|');
      const nextIds = nextPlayers.map((p) => p.id).join('|');
      if (currentIds === nextIds) return prev;
      return { ...prev, players: nextPlayers };
    });
  };

  const addPlayer = (newPlayer: Player) => {
    setAllPlayers((prev) => dedupePlayersById([newPlayer, ...prev]));
    setTournament((prev) => {
      const nextPlayers = dedupePlayersById([newPlayer, ...(prev.players || [])]);
      const prevIds = (prev.players || []).map((p) => p.id).join('|');
      const nextIds = nextPlayers.map((p) => p.id).join('|');
      if (prevIds === nextIds) return prev;
      return { ...prev, players: nextPlayers };
    });
  };

  return {
    selectedPlayers,
    sortedSelectedPlayers,
    availablePlayers,
    togglePlayer,
    addPlayer
  };
};
