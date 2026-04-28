import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import Minion from './Minion';

const Minions: React.FC = React.memo(() => {
  const minionIds = useGameStore(useShallow((s): string[] => s.minions.map((minion) => minion.id)));

  return (
    <>
      {minionIds.map((minionId) => (
        <Minion key={minionId} minionId={minionId} />
      ))}
    </>
  );
});

Minions.displayName = 'Minions';

export default Minions;
