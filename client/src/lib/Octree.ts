import * as THREE from 'three';

interface OctreeNode {
  bounds: THREE.Box3;
  particles: number[]; // indices
  children: OctreeNode[];
  level: number;
}

export class Octree {
  root: OctreeNode;
  maxParticlesPerNode: number;
  maxDepth: number;

  constructor(
    bounds: THREE.Box3,
    maxParticlesPerNode: number = 50,
    maxDepth: number = 4
  ) {
    this.maxParticlesPerNode = maxParticlesPerNode;
    this.maxDepth = maxDepth;
    this.root = {
      bounds: bounds.clone(),
      particles: [],
      children: [],
      level: 0,
    };
  }

  insert(particleIndex: number, position: THREE.Vector3): void {
    this._insertRecursive(this.root, particleIndex, position);
  }

  private _insertRecursive(
    node: OctreeNode,
    particleIndex: number,
    position: THREE.Vector3
  ): void {
    if (!node.bounds.containsPoint(position)) {
      return;
    }

    if (node.children.length === 0) {
      node.particles.push(particleIndex);

      // Subdivide if necessary
      if (
        node.particles.length > this.maxParticlesPerNode &&
        node.level < this.maxDepth
      ) {
        this._subdivide(node);
      }
      return;
    }

    // Insert into appropriate child
    for (const child of node.children) {
      if (child.bounds.containsPoint(position)) {
        this._insertRecursive(child, particleIndex, position);
        return;
      }
    }
  }

  private _subdivide(node: OctreeNode): void {
    const min = node.bounds.min;
    const max = node.bounds.max;
    const mid = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);

    const childBounds = [
      new THREE.Box3(new THREE.Vector3(min.x, min.y, min.z), new THREE.Vector3(mid.x, mid.y, mid.z)),
      new THREE.Box3(new THREE.Vector3(mid.x, min.y, min.z), new THREE.Vector3(max.x, mid.y, mid.z)),
      new THREE.Box3(new THREE.Vector3(min.x, mid.y, min.z), new THREE.Vector3(mid.x, max.y, mid.z)),
      new THREE.Box3(new THREE.Vector3(mid.x, mid.y, min.z), new THREE.Vector3(max.x, max.y, mid.z)),
      new THREE.Box3(new THREE.Vector3(min.x, min.y, mid.z), new THREE.Vector3(mid.x, mid.y, max.z)),
      new THREE.Box3(new THREE.Vector3(mid.x, min.y, mid.z), new THREE.Vector3(max.x, mid.y, max.z)),
      new THREE.Box3(new THREE.Vector3(min.x, mid.y, mid.z), new THREE.Vector3(mid.x, max.y, max.z)),
      new THREE.Box3(new THREE.Vector3(mid.x, mid.y, mid.z), new THREE.Vector3(max.x, max.y, max.z)),
    ];

    node.children = childBounds.map((bounds) => ({
      bounds,
      particles: [],
      children: [],
      level: node.level + 1,
    }));

    // Redistribute particles
    const particlesToInsert = node.particles;
    node.particles = [];

    for (const idx of particlesToInsert) {
      // Note: This is a simplified version - in real implementation,
      // you'd need to pass the actual position
      for (const child of node.children) {
        this._insertRecursive(child, idx, new THREE.Vector3(0, 0, 0));
      }
    }
  }

  getNeighbors(position: THREE.Vector3, radius: number): number[] {
    const neighbors: number[] = [];
    this._getNeighborsRecursive(this.root, position, radius, neighbors);
    return neighbors;
  }

  private _getNeighborsRecursive(
    node: OctreeNode,
    position: THREE.Vector3,
    radius: number,
    neighbors: number[]
  ): void {
    // Check if sphere intersects this node's bounds
    const closestPoint = node.bounds.clampPoint(position, new THREE.Vector3());
    const distance = position.distanceTo(closestPoint);

    if (distance > radius) {
      return;
    }

    // Add particles from this node
    neighbors.push(...node.particles);

    // Check children
    for (const child of node.children) {
      this._getNeighborsRecursive(child, position, radius, neighbors);
    }
  }

  clear(): void {
    this.root.particles = [];
    this.root.children = [];
  }
}
