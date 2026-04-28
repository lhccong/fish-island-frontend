import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import Champion from './Champion';

/** 渲染所有英雄 */
const Champions: React.FC = React.memo(() => {
  const championIds = useGameStore(useShallow((s): string[] => s.champions.map((champ) => champ.id)));

  return (
    <>
      {championIds.map((championId) => (
        <Champion key={championId} championId={championId} />
      ))}
    </>
  );
});

export default Champions;
