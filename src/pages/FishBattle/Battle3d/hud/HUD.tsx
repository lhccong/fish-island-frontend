import React, { type RefObject } from 'react';
import { useGameStore } from '../store/useGameStore';
import TopBar from './TopBar';
import SkillBar from './SkillBar';
import EmoteWheel from './EmoteWheel';
import SpectatorPanel from './SpectatorPanel';
import DisconnectOverlay from './DisconnectOverlay';
import Minimap from './Minimap';

interface HUDProps {
  viewportRef: RefObject<HTMLDivElement>;
}

const HUD: React.FC<HUDProps> = ({ viewportRef }) => {
  const isLoading = useGameStore((s) => s.isLoading);

  if (isLoading) return null;

  return (
    <div className="absolute inset-0 z-[50] pointer-events-none" style={{ pointerEvents: 'none' }}>
      <div style={{ pointerEvents: 'auto' }}>
        <TopBar />
        <SpectatorPanel />
        <EmoteWheel viewportRef={viewportRef} />
        <Minimap position="top-left" />
        <SkillBar />
      </div>
      {/* 断线遮罩（最高层级，阻断所有交互） */}
      <DisconnectOverlay />
    </div>
  );
};

export default HUD;
