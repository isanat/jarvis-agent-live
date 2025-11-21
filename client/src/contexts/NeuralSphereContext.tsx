import { createContext, useContext, useState } from 'react';

interface NeuralSphereContextType {
  isThinking: boolean;
  setIsThinking: (value: boolean) => void;
  intensity: number;
  setIntensity: (value: number) => void;
  particleSpeed: number;
  setParticleSpeed: (value: number) => void;
}

const NeuralSphereContext = createContext<NeuralSphereContextType | undefined>(undefined);

export function NeuralSphereProvider({ children }: { children: React.ReactNode }) {
  const [isThinking, setIsThinking] = useState(false);
  const [intensity, setIntensity] = useState(1);
  const [particleSpeed, setParticleSpeed] = useState(1);

  const value: NeuralSphereContextType = {
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
