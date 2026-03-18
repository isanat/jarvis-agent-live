import { useEffect, useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useNeuralSphere } from '@/contexts/NeuralSphereContext';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { Octree } from '@/lib/Octree';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  originalVelocity: THREE.Vector3;
}

function NeuralSphereContent() {
  const groupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<Particle[]>([]);
  const linesRef = useRef<THREE.LineSegments>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const octreeRef = useRef<Octree | null>(null);
  const { camera } = useThree();
  const { isThinking, intensity, particleSpeed } = useNeuralSphere();
  const metrics = usePerformanceMonitor();

  // Detect mobile device
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Adaptive particle count based on quality
  const PARTICLE_COUNT = useMemo(() => {
    if (metrics.quality === 'low') return 300;
    if (metrics.quality === 'medium') return 600;
    return isMobile ? 600 : 1500;
  }, [metrics.quality, isMobile]);

  const SPHERE_RADIUS = 3;
  const CONNECTION_DISTANCE = isMobile ? 2.2 : 2.8;

  // Initialize particles
  useEffect(() => {
    const particles: Particle[] = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      const x = SPHERE_RADIUS * Math.sin(phi) * Math.cos(theta);
      const y = SPHERE_RADIUS * Math.sin(phi) * Math.sin(theta);
      const z = SPHERE_RADIUS * Math.cos(phi);

      const position = new THREE.Vector3(x, y, z);
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02
      );

      // Color gradient: cyan → indigo → violet
      const hue = 0.58 + Math.random() * 0.22;
      const sat = 0.85 + Math.random() * 0.15;
      const lit = 0.55 + Math.random() * 0.15;
      const color = new THREE.Color().setHSL(hue, sat, lit);

      particles.push({
        position,
        velocity: velocity.clone(),
        color,
        originalVelocity: velocity.clone(),
      });
    }

    particlesRef.current = particles;

    // Initialize Octree for spatial partitioning
    const bounds = new THREE.Box3(
      new THREE.Vector3(-SPHERE_RADIUS - 1, -SPHERE_RADIUS - 1, -SPHERE_RADIUS - 1),
      new THREE.Vector3(SPHERE_RADIUS + 1, SPHERE_RADIUS + 1, SPHERE_RADIUS + 1)
    );
    octreeRef.current = new Octree(bounds, 50, 4);
  }, [PARTICLE_COUNT]);

  // Create particle geometry with instancing
  const particleGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);

    particlesRef.current.forEach((particle, i) => {
      positions[i * 3] = particle.position.x;
      positions[i * 3 + 1] = particle.position.y;
      positions[i * 3 + 2] = particle.position.z;

      colors[i * 3] = particle.color.r;
      colors[i * 3 + 1] = particle.color.g;
      colors[i * 3 + 2] = particle.color.b;
    });

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    return geometry;
  }, [PARTICLE_COUNT]);

  // Create particle material
  const particleMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      size: isMobile ? 0.10 : 0.13,
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.92,
    });
  }, [isMobile]);

  // Update animation with optimizations
  useFrame(() => {
    if (!groupRef.current || !octreeRef.current) return;

    // Update particle positions with thinking animation
    const speedMultiplier = isThinking ? particleSpeed * 2 : particleSpeed;

    particlesRef.current.forEach((particle) => {
      // Apply speed multiplier
      particle.velocity.copy(particle.originalVelocity).multiplyScalar(speedMultiplier);
      particle.position.add(particle.velocity);

      // Bounce particles within sphere
      const distance = particle.position.length();
      if (distance > SPHERE_RADIUS) {
        particle.position.normalize().multiplyScalar(SPHERE_RADIUS);
        particle.velocity.negate().multiplyScalar(0.95);
      }

      // Add randomness (more when thinking)
      const randomFactor = isThinking ? 0.002 : 0.001;
      particle.velocity.x += (Math.random() - 0.5) * randomFactor;
      particle.velocity.y += (Math.random() - 0.5) * randomFactor;
      particle.velocity.z += (Math.random() - 0.5) * randomFactor;

      // Damping
      particle.velocity.multiplyScalar(0.99);
    });

    // Update particle positions in geometry
    const positions = particleGeometry.attributes.position.array as Float32Array;
    particlesRef.current.forEach((particle, i) => {
      positions[i * 3] = particle.position.x;
      positions[i * 3 + 1] = particle.position.y;
      positions[i * 3 + 2] = particle.position.z;
    });
    particleGeometry.attributes.position.needsUpdate = true;

    // Update lines using spatial partitioning (Octree)
    const linePositions: number[] = [];

    // Only calculate connections for nearby particles using Octree
    for (let i = 0; i < Math.min(PARTICLE_COUNT, 200); i++) {
      const particle = particlesRef.current[i];
      const neighbors = octreeRef.current.getNeighbors(
        particle.position,
        CONNECTION_DISTANCE
      );

      for (const j of neighbors) {
        if (i < j) {
          linePositions.push(
            particle.position.x,
            particle.position.y,
            particle.position.z,
            particlesRef.current[j].position.x,
            particlesRef.current[j].position.y,
            particlesRef.current[j].position.z
          );
        }
      }
    }

    if (linesRef.current) {
      linesRef.current.geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array(linePositions), 3)
      );
      linesRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // Rotate sphere
    groupRef.current.rotation.x += 0.0001;
    groupRef.current.rotation.y += 0.0003;

    // Pulsing effect when thinking
    if (isThinking) {
      const pulse = Math.sin(Date.now() * 0.005) * 0.1 + 1;
      groupRef.current.scale.set(pulse, pulse, pulse);
    } else {
      groupRef.current.scale.set(1, 1, 1);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Particles */}
      <points ref={pointsRef} geometry={particleGeometry} material={particleMaterial} />

      {/* Lines (synaptic connections) */}
      <lineSegments ref={linesRef}>
        <bufferGeometry />
        <lineBasicMaterial
          color={isThinking ? 0xff6b9d : 0x818cf8}
          transparent={true}
          opacity={isThinking ? 0.55 : 0.30}
          linewidth={1}
        />
      </lineSegments>

      {/* Ambient light */}
      <ambientLight intensity={isThinking ? 0.8 : 0.5} />

      {/* Point lights for glow effect */}
      <pointLight
        position={[5, 5, 5]}
        intensity={isThinking ? 2.0 : 1.2}
        color={0x818cf8}
      />
      <pointLight
        position={[-5, -5, -5]}
        intensity={isThinking ? 1.8 : 1.0}
        color={0xc084fc}
      />

      {/* Additional light when thinking */}
      {isThinking && (
        <pointLight position={[0, 0, 0]} intensity={0.5} color={0xff6b9d} />
      )}
    </group>
  );
}

export function NeuralSphere() {
  const metrics = usePerformanceMonitor();

  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [0, 0, 4.2], fov: 68 }}
        style={{ width: '100%', height: '100%' }}
      >
        <NeuralSphereContent />
      </Canvas>

      {/* Performance metrics display (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 left-2 bg-black/50 text-white text-xs p-2 rounded font-mono">
          <div>FPS: {metrics.fps}</div>
          <div>Quality: {metrics.quality}</div>
          <div>Memory: {metrics.memory}MB</div>
        </div>
      )}
    </div>
  );
}
