import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei'
import { Avatar } from './Avatar'

/**
 * Студийный свет собран из Lightformer'ов прямо в сцене — без загрузки
 * HDR-файлов с CDN (в мессенджерах сеть бывает медленной).
 */
function StudioEnvironment() {
  return (
    <Environment resolution={256} frames={1}>
      <color attach="background" args={['#f3ebe4']} />
      {/* большой мягкий софтбокс сверху-спереди */}
      <Lightformer form="rect" intensity={2.2} color="#fff4ea" position={[0, 4, 3]} scale={[6, 3, 1]} target={[0, 1, 0]} />
      {/* тёплый ключевой слева */}
      <Lightformer form="rect" intensity={1.6} color="#ffe6d2" position={[-4, 2, 2]} scale={[2, 5, 1]} target={[0, 1, 0]} />
      {/* холодноватый контровой справа-сзади — рисует силуэт */}
      <Lightformer form="rect" intensity={1.2} color="#eef1ff" position={[4, 2.5, -3]} scale={[2, 5, 1]} target={[0, 1, 0]} />
      {/* кольцо-заполнение снизу, чтобы не было «грязных» теней */}
      <Lightformer form="ring" intensity={0.6} color="#fff" position={[0, -2, 2]} scale={4} target={[0, 1, 0]} />
    </Environment>
  )
}

export function Scene() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 0.9, 3.75], fov: 28, near: 0.1, far: 50 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ touchAction: 'none' }}
    >
      <ambientLight intensity={0.15} />
      <directionalLight
        position={[-2, 4, 3]}
        intensity={1.5}
        color="#fff3e8"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
      />

      <Suspense fallback={null}>
        <StudioEnvironment />
        <group position={[0, -0.78, 0]}>
          <Avatar />
          {/* подиум */}
          <mesh position={[0, -0.02, 0]} receiveShadow>
            <cylinderGeometry args={[0.46, 0.48, 0.04, 64]} />
            <meshStandardMaterial color="#d8c6b8" roughness={0.75} />
          </mesh>
          <ContactShadows position={[0, 0.001, 0]} opacity={0.55} scale={1.6} blur={2.4} far={1.2} resolution={512} color="#6b5546" />
        </group>
      </Suspense>

      <OrbitControls
        target={[0, 0.06, 0]}
        enablePan={false}
        enableZoom={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.7}
        minPolarAngle={Math.PI / 2 - 0.25}
        maxPolarAngle={Math.PI / 2 + 0.05}
      />
    </Canvas>
  )
}
