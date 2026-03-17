import { createContext, useContext, useState } from 'react';

export type AgentState = 'idle' | 'thinking' | 'searching' | 'executing' | 'alert';

interface NeuralSphereContextType {
  agentState: AgentState;
  setAgentState: (state: AgentState) => void;
  // Legacy helpers kept for backward compat
  isThinking: boolean;
  setIsThinking: (value: boolean) => void;
  intensity: number;
  setIntensity: (value: number) => void;
  particleSpeed: number;
  setParticleSpeed: (value: number) => void;
}

const NeuralSphereContext = createContext<NeuralSphereContextType | undefined>(undefined);

export function NeuralSphereProvider({ children }: { children: React.ReactNode }) {
  const [agentState, setAgentState] = useState<AgentState>('idle');
  const [intensity, setIntensity] = useState(1);
  const [particleSpeed, setParticleSpeed] = useState(1);

  // Legacy isThinking derived from agentState
  const isThinking = agentState !== 'idle';
  const setIsThinking = (value: boolean) => setAgentState(value ? 'thinking' : 'idle');

  const value: NeuralSphereContextType = {
    agentState,
    setAgentState,
    isThinking,
    setIsThinking,
    intensity,
    setIntensity,
    particleSpeed,
    setParticleSpeed,
  };

  return (
    <NeuralSphereContext.Provider value={value}>
      {children}
    </NeuralSphereContext.Provider>
  );
}

export function useNeuralSphere() {
  const context = useContext(NeuralSphereContext);
  if (context === undefined) {
    throw new Error('useNeuralSphere must be used within a NeuralSphereProvider');
  }
  return context;
}
