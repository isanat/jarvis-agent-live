import { useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
}

function NeuralSphereContent() {
  const groupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<Particle[]>([]);
  const linesRef = useRef<THREE.LineSegments>(null);
  const { camera } = useThree();

  const PARTICLE_COUNT = 1500;
  const SPHERE_RADIUS = 3;
  const CONNECTION_DISTANCE = 2.5;

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

      // Color gradient: blue to purple
      const hue = 0.6 + Math.random() * 0.2; // Blue to purple range
      const color = new THREE.Color().setHSL(hue, 0.8, 0.6);

      particles.push({ position, velocity, color });
    }

    particlesRef.current = particles;
  }, []);

  // Create particle geometry
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
  }, []);

  // Create particle material
  const particleMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8,
    });
  }, []);

  // Update animation
  useFrame(() => {
    if (!groupRef.current) return;

    // Update particle positions
    particlesRef.current.forEach((particle) => {
      particle.position.add(particle.velocity);

      // Bounce particles within sphere
      const distance = particle.position.length();
      if (distance > SPHERE_RADIUS) {
        particle.position.normalize().multiplyScalar(SPHERE_RADIUS);
        particle.velocity.negate().multiplyScalar(0.95);
      }

      // Add some randomness
      particle.velocity.x += (Math.random() - 0.5) * 0.001;
      particle.velocity.y += (Math.random() - 0.5) * 0.001;
      particle.velocity.z += (Math.random() - 0.5) * 0.001;

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

    // Update lines (connections between nearby particles)
    const linePositions: number[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      for (let j = i + 1; j < PARTICLE_COUNT; j++) {
        const distance = particlesRef.current[i].position.distanceTo(
          particlesRef.current[j].position
        );

        if (distance < CONNECTION_DISTANCE) {
          linePositions.push(
            particlesRef.current[i].position.x,
            particlesRef.current[i].position.y,
            particlesRef.current[i].position.z,
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
  });

  return (
    <group ref={groupRef}>
      {/* Particles */}
      <points geometry={particleGeometry} material={particleMaterial} />

      {/* Lines (synaptic connections) */}
      <lineSegments ref={linesRef}>
        <bufferGeometry />
        <lineBasicMaterial
          color={0x6b7aff}
          transparent={true}
          opacity={0.2}
          linewidth={1}
        />
      </lineSegments>

      {/* Ambient light */}
      <ambientLight intensity={0.5} />

      {/* Point lights for glow effect */}
      <pointLight position={[5, 5, 5]} intensity={0.8} color={0x6b7aff} />
      <pointLight position={[-5, -5, -5]} intensity={0.6} color={0xb366ff} />
    </group>
  );
}

export function NeuralSphere() {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 75 }}
        style={{ width: '100%', height: '100%' }}
      >
        <NeuralSphereContent />
      </Canvas>
    </div>
  );
}
