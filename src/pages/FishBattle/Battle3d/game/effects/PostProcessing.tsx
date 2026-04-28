import React from 'react';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { KernelSize } from 'postprocessing';
import { RENDER_CONFIG } from '../../config/renderConfig';

const PostProcessingEffects: React.FC = () => {
  if (!RENDER_CONFIG.enableBloom) return null;

  return (
    <EffectComposer>
      <Bloom
        intensity={RENDER_CONFIG.bloomIntensity}
        luminanceThreshold={RENDER_CONFIG.bloomThreshold}
        luminanceSmoothing={RENDER_CONFIG.bloomSmoothing}
        kernelSize={KernelSize.SMALL}
        mipmapBlur
      />
    </EffectComposer>
  );
};

export default PostProcessingEffects;
