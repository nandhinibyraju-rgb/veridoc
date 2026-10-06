import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useAuth } from '../context/AuthContext';

export default function ThreeDBackground({ isSplash = false, className = '' }) {
  const mountRef = useRef(null);
  const { studentMode, appMode } = useAuth ? useAuth() : { studentMode: false, appMode: 'doctor' };
  const isStudent = studentMode || appMode === 'student';

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const width = currentMount.clientWidth || window.innerWidth;
    const height = currentMount.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = isSplash ? 35 : 45;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    currentMount.appendChild(renderer.domElement);

    // 2. Determine color palette based on mode and context
    let primaryColor = isSplash ? 0x22D3EE : (isStudent ? 0x6366F1 : 0x0F766E);
    let secondaryColor = isSplash ? 0x14B8A6 : (isStudent ? 0xF59E0B : 0x06B6D4);

    // 3. Create 3D Floating Particle Cloud / Molecular Grid
    const particleCount = isSplash ? 85 : 60;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 45;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 35;

      velocities.push({
        x: (Math.random() - 0.5) * 0.02,
        y: (Math.random() - 0.5) * 0.02,
        z: (Math.random() - 0.5) * 0.02,
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Particle Material
    const pMaterial = new THREE.PointsMaterial({
      color: primaryColor,
      size: isSplash ? 1.4 : 1.1,
      transparent: true,
      opacity: isSplash ? 0.75 : 0.35,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geometry, pMaterial);
    scene.add(particles);

    // 4. Create 3D Geometric Ring / Helix Orbs in background
    const torusGeo = new THREE.TorusGeometry(isSplash ? 12 : 16, 0.25, 16, 64);
    const torusMat = new THREE.MeshBasicMaterial({
      color: secondaryColor,
      wireframe: true,
      transparent: true,
      opacity: isSplash ? 0.25 : 0.12,
    });
    const torusMesh = new THREE.Mesh(torusGeo, torusMat);
    torusMesh.rotation.x = Math.PI / 4;
    scene.add(torusMesh);

    // 5. Mouse tracking for subtle 3D camera parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Handle Resize
    const handleResize = () => {
      if (!currentMount) return;
      const newWidth = currentMount.clientWidth || window.innerWidth;
      const newHeight = currentMount.clientHeight || window.innerHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // 6. Animation Loop
    let animationFrameId;
    const startTime = performance.now();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = (performance.now() - startTime) * 0.001;

      // Smooth camera interpolation
      targetX += (mouseX * 4 - targetX) * 0.04;
      targetY += (-mouseY * 3 - targetY) * 0.04;
      camera.position.x = targetX;
      camera.position.y = targetY;
      camera.lookAt(scene.position);

      // Rotate torus
      torusMesh.rotation.z = elapsedTime * 0.08;
      torusMesh.rotation.y = elapsedTime * 0.05;

      // Drift particles
      const posAttr = geometry.attributes.position;
      const posArray = posAttr.array;

      for (let i = 0; i < particleCount; i++) {
        posArray[i * 3] += velocities[i].x;
        posArray[i * 3 + 1] += velocities[i].y;
        posArray[i * 3 + 2] += velocities[i].z;

        // Bounce boundaries
        if (Math.abs(posArray[i * 3]) > 32) velocities[i].x *= -1;
        if (Math.abs(posArray[i * 3 + 1]) > 24) velocities[i].y *= -1;
        if (Math.abs(posArray[i * 3 + 2]) > 20) velocities[i].z *= -1;
      }
      posAttr.needsUpdate = true;

      // Gentle global rotation
      particles.rotation.y = elapsedTime * 0.02;

      renderer.render(scene, camera);
    };

    animate();

    // 7. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      geometry.dispose();
      pMaterial.dispose();
      torusGeo.dispose();
      torusMat.dispose();
      renderer.dispose();
    };
  }, [isSplash, isStudent]);

  return (
    <div
      ref={mountRef}
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
