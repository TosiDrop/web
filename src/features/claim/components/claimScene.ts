import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export interface ClaimScene {
  setState: (state: { playing: boolean; complete: boolean }) => void;
  dispose: () => void;
}

const CYCLE = 3;
const IMPACT = 1.44;

function roundedRectangle(width: number, height: number, radius: number) {
  const x = -width / 2;
  const y = -height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

export async function createClaimScene(
  container: HTMLElement,
  logoUrl: string,
  onFailure: () => void,
): Promise<ClaimScene> {
  const logo = await new THREE.TextureLoader().loadAsync(logoUrl);
  logo.colorSpace = THREE.SRGBColorSpace;
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>([logo]);
  const scene = new THREE.Scene();
  let renderer: THREE.WebGLRenderer | undefined;
  let environment: THREE.WebGLRenderTarget | undefined;
  let resize: ResizeObserver | undefined;
  let intersection: IntersectionObserver | undefined;
  let frame = 0;
  let disposed = false;
  let contextLost = false;
  let playing = false;
  let complete = false;
  let visible = true;
  let phase = 0.28;
  let previousTime = 0;

  const stop = () => { cancelAnimationFrame(frame); frame = 0; previousTime = 0; };
  const loseContext = (event: Event) => {
    event.preventDefault();
    contextLost = true;
    stop();
    onFailure();
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    stop();
    resize?.disconnect();
    intersection?.disconnect();
    document.removeEventListener('visibilitychange', syncPlayback);
    renderer?.domElement.removeEventListener('webglcontextlost', loseContext);
    scene.traverse((object) => {
      if (object instanceof THREE.InstancedMesh) object.dispose();
      if (object instanceof THREE.DirectionalLight) object.shadow.dispose();
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    textures.forEach((texture) => texture.dispose());
    environment?.dispose();
    renderer?.dispose();
    renderer?.domElement.remove();
  };

  function mesh<G extends THREE.BufferGeometry>(geometry: G, material: THREE.Material) {
    geometries.add(geometry);
    materials.add(material);
    const result = new THREE.Mesh(geometry, material);
    result.castShadow = true;
    result.receiveShadow = true;
    return result;
  }

  // Declared here so every exit path can remove the visibility listener.
  let draw = () => {};
  function tick(time: number) {
    frame = 0;
    if (previousTime) phase = (phase + Math.min((time - previousTime) / 1000, 0.05)) % CYCLE;
    previousTime = time;
    draw();
    frame = requestAnimationFrame(tick);
  }
  function syncPlayback() {
    stop();
    if (disposed || contextLost || document.hidden || !visible) return;
    draw();
    if (playing && !complete) frame = requestAnimationFrame(tick);
  }

  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.addEventListener('webglcontextlost', loseContext);
    container.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    environment = pmrem.fromScene(room, 0.04);
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.85;
    room.dispose();
    pmrem.dispose();

    const camera = new THREE.OrthographicCamera(-2.4, 2.4, 1.85, -1.85, 0.1, 30);
    camera.position.set(3.1, 2.0, 7);
    camera.lookAt(0, 0.35, 0);
    scene.add(new THREE.HemisphereLight(0xc7edff, 0x10142b, 1.3));
    const key = new THREE.DirectionalLight(0xe5f7ff, 3);
    key.position.set(-3, 6, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = key.shadow.camera.bottom = -3;
    key.shadow.camera.right = key.shadow.camera.top = 3;
    key.shadow.normalBias = 0.025;
    key.shadow.bias = -0.0003;
    key.shadow.radius = 4;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x24c9ef, 4);
    rim.position.set(2, 3, -3);
    scene.add(rim);

    const walletMaterial = new THREE.MeshStandardMaterial({ color: 0x101b2e, roughness: 0.58, metalness: 0.08 });
    const lining = new THREE.MeshStandardMaterial({ color: 0x070e1b, roughness: 0.95 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x29bce9, metalness: 0.88, roughness: 0.25 });
    const brightMetal = new THREE.MeshStandardMaterial({ color: 0x98e5f2, metalness: 0.8, roughness: 0.22 });
    const faceMaterial = new THREE.MeshStandardMaterial({ color: 0x42c9ec, metalness: 0.6, roughness: 0.32 });
    const logoMaterial = new THREE.MeshStandardMaterial({ map: logo, transparent: true, alphaTest: 0.05, roughness: 0.52, metalness: 0.1, depthWrite: false });

    const wallet = new THREE.Group();
    // Anchor the bounce at the wallet's bottom edge.
    wallet.position.y = -0.97;
    scene.add(wallet);
    const panel = (width: number, height: number, depth: number, material: THREE.Material) => mesh(
      new THREE.ExtrudeGeometry(roundedRectangle(width, height, 0.14), { depth, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.035, bevelThickness: 0.025, curveSegments: 16 }),
      material,
    );
    const back = panel(1.45, 1.53, 0.055, walletMaterial);
    back.position.set(0, 0.785, -0.29);
    wallet.add(back);
    const inside = panel(1.31, 1.39, 0.025, lining);
    inside.position.set(0, 0.785, -0.21);
    wallet.add(inside);
    const front = panel(1.45, 1.45, 0.07, walletMaterial);
    front.position.set(0, 0.745, 0.23);
    wallet.add(front);
    for (const x of [-0.675, 0.675]) {
      const side = mesh(new THREE.BoxGeometry(0.08, 1.31, 0.5), walletMaterial);
      side.position.set(x, 0.695, 0);
      wallet.add(side);
    }
    const floor = mesh(new THREE.BoxGeometry(1.31, 0.09, 0.5), lining);
    floor.position.y = 0.04;
    wallet.add(floor);

    const walletMark = mesh(new THREE.PlaneGeometry(0.28, 0.28), logoMaterial);
    walletMark.castShadow = false;
    walletMark.position.set(0, 0.745, 0.337);
    wallet.add(walletMark);

    const coin = new THREE.Group();
    scene.add(coin);
    const profile = [[0, -0.075], [0.455, -0.075], [0.50, -0.055], [0.515, -0.032], [0.515, 0.032], [0.50, 0.055], [0.455, 0.075], [0, 0.075]];
    const body = mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 128), metal);
    body.rotation.x = Math.PI / 2;
    coin.add(body);
    const ridgeGeometry = new THREE.BoxGeometry(0.009, 0.022, 0.09);
    geometries.add(ridgeGeometry);
    materials.add(brightMetal);
    const ridges = new THREE.InstancedMesh(ridgeGeometry, brightMetal, 100);
    const ridge = new THREE.Object3D();
    for (let i = 0; i < 100; i++) {
      const angle = (i / 100) * Math.PI * 2;
      ridge.position.set(Math.sin(angle) * 0.512, Math.cos(angle) * 0.512, 0);
      ridge.rotation.z = -angle;
      ridge.updateMatrix();
      ridges.setMatrixAt(i, ridge.matrix);
    }
    coin.add(ridges);
    for (const direction of [-1, 1]) {
      const face = mesh(new THREE.CircleGeometry(0.44, 96), faceMaterial);
      face.position.z = direction * 0.077;
      face.rotation.y = direction < 0 ? Math.PI : 0;
      coin.add(face);
      const ring = mesh(new THREE.TorusGeometry(0.47, 0.012, 8, 96), brightMetal);
      ring.position.z = direction * 0.078;
      coin.add(ring);
      const mark = mesh(new THREE.PlaneGeometry(0.67, 0.67), logoMaterial);
      mark.castShadow = false;
      mark.position.z = direction * 0.081;
      mark.rotation.y = direction < 0 ? Math.PI : 0;
      coin.add(mark);
    }

    const splash = new THREE.Group();
    scene.add(splash);
    const droplets = Array.from({ length: 7 }, (_, i) => {
      const drop = mesh(new THREE.SphereGeometry(0.035 + (i % 3) * 0.008, 12, 8), brightMetal);
      drop.castShadow = false;
      splash.add(drop);
      return drop;
    });

    const shadowPixels = new Uint8Array(64 * 64 * 4);
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const distance = Math.hypot((x - 31.5) / 31.5, (y - 31.5) / 31.5);
        shadowPixels[(y * 64 + x) * 4 + 3] = Math.round(150 * Math.exp(-distance * distance * 4) * (1 - THREE.MathUtils.smoothstep(distance, 0.7, 1)));
      }
    }
    const shadowTexture = new THREE.DataTexture(shadowPixels, 64, 64);
    shadowTexture.magFilter = THREE.LinearFilter;
    shadowTexture.needsUpdate = true;
    textures.add(shadowTexture);
    const shadow = mesh(new THREE.PlaneGeometry(2.3, 1.8), new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -1.035;
    shadow.castShadow = false;
    shadow.receiveShadow = false;
    scene.add(shadow);

    draw = () => {
      if (!renderer || disposed || contextLost) return;
      const t = phase;
      const fall = THREE.MathUtils.clamp((t - 0.48) / 0.98, 0, 1);
      const reveal = THREE.MathUtils.smoothstep(t, 0, 0.24);
      coin.visible = !complete && t < 1.49;
      coin.scale.setScalar(reveal);
      coin.position.set(-0.08 + 0.08 * fall, 1.48 - 1.96 * fall * fall, 0);
      // Finish the turn before the rim enters the wallet's narrow opening.
      const turn = THREE.MathUtils.clamp(fall / 0.43, 0, 1);
      const aligned = THREE.MathUtils.smoothstep(fall, 0.14, 0.43);
      coin.rotation.set(0.08 * (1 - aligned), 0.25 * (1 - aligned) + 0.9 * Math.sin(turn * Math.PI), -0.12 * (1 - fall));

      const afterImpact = t - IMPACT;
      const bounce = !complete && afterImpact > 0 ? Math.sin(afterImpact * 15) * Math.exp(-afterImpact * 6) : 0;
      wallet.scale.set(1 + 0.055 * bounce, 1 - 0.09 * bounce, 1 + 0.04 * bounce);
      wallet.rotation.z = -0.018 * bounce;
      const burst = afterImpact / 0.68;
      splash.visible = !complete && burst > 0 && burst < 1;
      droplets.forEach((drop, i) => {
        const angle = (i / droplets.length) * Math.PI * 2;
        const spread = 0.35 + burst * 0.67;
        drop.position.set(Math.cos(angle) * spread, 0.65 + (0.55 + (i % 3) * 0.14) * 4 * burst * (1 - burst), Math.sin(angle) * spread * 0.34);
        drop.scale.set(1 - burst * 0.65, (1.6 - burst) * (1 - burst * 0.65), 1 - burst * 0.65);
      });
      renderer.render(scene, camera);
    };

    const fit = () => {
      if (!renderer || disposed) return;
      const { width, height } = container.getBoundingClientRect();
      if (!width || !height) return;
      const halfHeight = Math.max(1.85, (3.0 * height / width) / 2);
      camera.left = -halfHeight * width / height;
      camera.right = -camera.left;
      camera.top = halfHeight;
      camera.bottom = -halfHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      draw();
    };
    resize = new ResizeObserver(fit);
    resize.observe(container);
    intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncPlayback();
    });
    intersection.observe(container);
    document.addEventListener('visibilitychange', syncPlayback);
    fit();
    return {
      setState: (state) => {
        playing = state.playing;
        complete = state.complete;
        syncPlayback();
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
