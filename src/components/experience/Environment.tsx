"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment as DreiEnvironment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { evaluateAtmosphere, type AtmosphereState } from "@/lib/scene-config";

interface SceneEnvironmentProps {
  trackProgressRef: React.RefObject<number>;
  headlightPowerRef: React.RefObject<number>;
  isMobile?: boolean;
}

const SKY_VERTEX_SHADER = `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const SKY_FRAGMENT_SHADER = `
  uniform vec3 uTopColor;
  uniform vec3 uHorizonColor;
  uniform vec3 uSunDir;
  uniform float uDawnMix;
  varying vec3 vWorldPosition;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  void main() {
    vec3 dir = normalize(vWorldPosition);
    float upness = clamp(dir.y, 0.0, 1.0);
    vec3 col = mix(uHorizonColor, uTopColor, pow(upness, 0.58));

    // Velature di nuvole morbide del mattino italiano
    if (dir.y > 0.03) {
      vec2 cloudUv = dir.xz / (dir.y + 0.25) * 1.4;
      float c = noise(cloudUv * 1.8) * 0.6 + noise(cloudUv * 3.7) * 0.4;
      float cloudMask = smoothstep(0.54, 0.84, c) * smoothstep(0.03, 0.28, dir.y) * 0.24;
      vec3 cloudColor = mix(vec3(0.84, 0.90, 0.94), vec3(0.99, 0.94, 0.85), uDawnMix);
      col = mix(col, cloudColor, cloudMask);
    }

    // Alone solare dorato progressivo verso -Z
    float sunAmt = max(dot(dir, normalize(uSunDir)), 0.0);
    vec3 warmScattering = mix(vec3(0.74, 0.84, 0.90), vec3(1.0, 0.84, 0.60), uDawnMix);
    col += warmScattering * pow(sunAmt, 7.0) * (0.22 + 0.42 * uDawnMix);
    col += vec3(1.0, 0.95, 0.84) * pow(sunAmt, 84.0) * (0.35 + 0.65 * uDawnMix);

    gl_FragColor = vec4(col, 1.0);
  }
`;

export default function SceneEnvironment({
  trackProgressRef,
  headlightPowerRef,
  isMobile = false,
}: SceneEnvironmentProps) {
  const dirLightRef = useRef<THREE.DirectionalLight>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight>(null);
  const sunDiscRef = useRef<THREE.Mesh>(null);
  const fogRef = useRef<THREE.FogExp2>(null);
  const bgColorRef = useRef<THREE.Color>(null);
  const skyMatRef = useRef<THREE.ShaderMaterial>(null);

  const atmosphereRef = useRef<AtmosphereState>({
    skyTop: new THREE.Color("#4B6A82"),
    skyHorizon: new THREE.Color("#B8CCD4"),
    fogColor: new THREE.Color("#B8CCD4"),
    fogDensity: 0.0052,
    sunIntensity: 1.15,
    sunColor: new THREE.Color("#C7DCEE"),
    sunElevation: 7,
    ambientIntensity: 0.85,
    hemiSky: new THREE.Color("#DAE7EC"),
    hemiGround: new THREE.Color("#525E53"),
    headlightPower: 0.9,
    dawnMix: 0,
  });

  const initialSkyUniforms = useMemo(
    () => ({
      uTopColor: { value: new THREE.Color("#4B6A82") },
      uHorizonColor: { value: new THREE.Color("#B8CCD4") },
      uSunDir: { value: new THREE.Vector3(0.24, 0.22, -1).normalize() },
      uDawnMix: { value: 0 },
    }),
    [],
  );

  useEffect(() => {
    return () => {
      // Nessuna risorsa extra allocata manualmente oltre ai nodi dichiarativi R3F
    };
  }, []);

  useFrame(({ camera }) => {
    const t = trackProgressRef.current ?? 0;
    const atm = evaluateAtmosphere(t, atmosphereRef.current);
    headlightPowerRef.current = atm.headlightPower;

    if (bgColorRef.current) {
      bgColorRef.current.copy(atm.skyHorizon);
    }

    if (fogRef.current) {
      fogRef.current.color.copy(atm.fogColor);
      fogRef.current.density = atm.fogDensity;
    }

    const elevRad = THREE.MathUtils.degToRad(atm.sunElevation);
    const sunDirX = 0.24;
    const sunDirY = Math.sin(elevRad);
    const sunDirZ = -Math.cos(elevRad);

    if (skyMatRef.current) {
      const uniforms = skyMatRef.current.uniforms;
      uniforms.uTopColor.value.copy(atm.skyTop);
      uniforms.uHorizonColor.value.copy(atm.skyHorizon);
      uniforms.uDawnMix.value = atm.dawnMix;
      uniforms.uSunDir.value.set(sunDirX, sunDirY, sunDirZ).normalize();
    }

    if (dirLightRef.current) {
      dirLightRef.current.intensity = atm.sunIntensity;
      dirLightRef.current.color.copy(atm.sunColor);
      dirLightRef.current.position.set(
        camera.position.x + sunDirX * 85,
        Math.max(18, sunDirY * 95 + 22),
        camera.position.z + sunDirZ * 85,
      );
      dirLightRef.current.target.position.set(camera.position.x, 0, camera.position.z - 18);
      dirLightRef.current.target.updateMatrixWorld();
    }

    if (hemiLightRef.current) {
      hemiLightRef.current.intensity = atm.ambientIntensity;
      hemiLightRef.current.color.copy(atm.hemiSky);
      hemiLightRef.current.groundColor.copy(atm.hemiGround);
    }

    if (sunDiscRef.current) {
      sunDiscRef.current.position.set(
        85,
        THREE.MathUtils.lerp(28, 92, t),
        -430,
      );
    }
  });

  return (
    <>
      <color ref={bgColorRef} attach="background" args={["#B8CCD4"]} />
      <fogExp2 ref={fogRef} attach="fog" args={["#B8CCD4", 0.0052]} />

      <hemisphereLight ref={hemiLightRef} args={["#DAE7EC", "#525E53", 0.95]} />
      <directionalLight
        ref={dirLightRef}
        position={[24, 34, -80]}
        intensity={1.3}
        castShadow={!isMobile}
        shadow-mapSize-width={isMobile ? 512 : 1536}
        shadow-mapSize-height={isMobile ? 512 : 1536}
        shadow-camera-near={5}
        shadow-camera-far={260}
        shadow-camera-left={-55}
        shadow-camera-right={55}
        shadow-camera-top={55}
        shadow-camera-bottom={-55}
        shadow-bias={-0.0004}
      />

      {/* Cupola cielo panoramica */}
      <mesh position={[0, 0, -60]}>
        <sphereGeometry args={[520, 36, 24]} />
        <shaderMaterial
          ref={skyMatRef}
          vertexShader={SKY_VERTEX_SHADER}
          fragmentShader={SKY_FRAGMENT_SHADER}
          uniforms={initialSkyUniforms}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Disco solare caldo all'orizzonte */}
      <mesh ref={sunDiscRef} position={[85, 36, -430]}>
        <circleGeometry args={[18, 32]} />
        <meshBasicMaterial color="#FFF0D4" transparent opacity={0.92} fog={false} />
      </mesh>

      {/* Environment map procedurale chiara e naturale per riflessi argento metallizzato della Captur */}
      <DreiEnvironment frames={1} resolution={isMobile ? 64 : 128}>
        <Lightformer
          form="rect"
          intensity={2.8}
          position={[0, 10, 0]}
          scale={[24, 10, 1]}
          rotation={[Math.PI / 2, 0, 0]}
          color="#FAFAF7"
        />
        <Lightformer
          form="rect"
          intensity={1.9}
          position={[-12, 4, 0]}
          scale={[20, 4, 1]}
          rotation={[0, Math.PI / 2, 0]}
          color="#CADCE0"
        />
        <Lightformer
          form="rect"
          intensity={2.2}
          position={[12, 4, -8]}
          scale={[20, 4, 1]}
          rotation={[0, -Math.PI / 2, 0]}
          color="#F3D9B3"
        />
        <Lightformer
          form="ring"
          intensity={1.2}
          position={[0, -4, 0]}
          scale={[18, 18, 1]}
          rotation={[-Math.PI / 2, 0, 0]}
          color="#879B88"
        />
      </DreiEnvironment>
    </>
  );
}
