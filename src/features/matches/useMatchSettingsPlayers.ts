import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
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
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>(() => dedupePlayersById(tournamentPlayers || []));

  const normalizedAllPlayers = useMemo(() => dedupePlayersById(allPlayers || []), [allPlayers]);
  const sortedSelectedPlayers = useMemo(() => sortPlayersByName(selectedPlayers), [selectedPlayers]);
  const availablePlayers = useMemo(
    () => sortPlayersByName(
      normalizedAllPlayers.filter((player) => !selectedPlayers.some((selected) => selected?.id === player.id))
    ),
    [normalizedAllPlayers, selectedPlayers]
  );

  useEffect(() => {
    const normalizedFromTournament = dedupePlayersById(tournamentPlayers || []);
    const currentIds = selectedPlayers.map((p) => p.id).join('|');
    const nextIds = normalizedFromTournament.map((p) => p.id).join('|');
    if (currentIds !== nextIds) setSelectedPlayers(normalizedFromTournament);
  }, [tournamentPlayers, selectedPlayers]);

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

  useEffect(() => {
    setTournament((prev) => {
      const prevIds = prev.players.map((p) => p.id).join('|');
      const nextIds = selectedPlayers.map((p) => p.id).join('|');
      if (prevIds === nextIds) return prev;
      return { ...prev, players: selectedPlayers };
    });
  }, [selectedPlayers, setTournament]);

  const togglePlayer = (player: Player) => {
    if (!player?.id) return;
    setSelectedPlayers((prev) => {
      const alreadySelected = prev.some((p) => p?.id === player.id);
      const next = alreadySelected
        ? prev.filter((p) => p?.id !== player.id)
        : [...prev, player];
      return dedupePlayersById(next);
    });
  };

  const addPlayer = (newPlayer: Player) => {
    setAllPlayers((prev) => dedupePlayersById([newPlayer, ...prev]));
    setSelectedPlayers((prev) => dedupePlayersById([newPlayer, ...prev]));
  };

  return {
    selectedPlayers,
    sortedSelectedPlayers,
    availablePlayers,
    togglePlayer,
    addPlayer
  };
};
