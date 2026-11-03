import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { milestoneTokenArtworkPalette } from '../domain/milestone-token-palette';
import { milestoneTokenNumber, type RecoveryTokenStyle } from '../domain/recovery-token';
import type { Milestone } from '../domain/time';
import './RecoveryMilestoneCanvas.css';

type RecoveryMilestoneCanvasProps = {
  milestone: Milestone;
  style: RecoveryTokenStyle;
  reducedMotion?: boolean;
};

type CanvasActions = { spin: () => void; flip: () => void; reset: () => void };
type TokenMilestone = Pick<Milestone, 'id' | 'label'>;

const textureSize = 1024;

/** Render one current milestone as an in-app, interactive 3D keytag or medallion. */
export function RecoveryMilestoneCanvas({ milestone, style, reducedMotion = false }: RecoveryMilestoneCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<CanvasActions | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  const palette = milestoneTokenArtworkPalette(milestone.id, style);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || webglUnavailable) return undefined;

    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let animationFrame = 0;
    let resizeObserver: ResizeObserver | null = null;
    let dragging = false;
    let previousPoint = { x: 0, y: 0 };
    let spinVelocity = 0;
    let flippedFace = false;
    let flipTarget: number | null = null;
    let alive = true;
    let failed = false;

    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.setAttribute('aria-hidden', 'true');
      renderer.domElement.className = 'recovery-token-canvas';
      host.appendChild(renderer.domElement);

      scene = new THREE.Scene();
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100);
      camera.position.set(0, 0, style === 'keytag' ? 8.2 : 7.4);
      scene.add(new THREE.AmbientLight(0xfff7e8, 1.25));
      const keyLight = new THREE.DirectionalLight(0xfff2d9, 2.1);
      keyLight.position.set(-3.5, 5.5, 7);
      scene.add(keyLight);
      const fillLight = new THREE.DirectionalLight(0xc9e4ff, 0.55);
      fillLight.position.set(4, -2, 4);
      scene.add(fillLight);

      const tokenMilestone: TokenMilestone = { id: milestone.id, label: milestone.label };
      const group = style === 'keytag'
        ? createKeytagMesh(tokenMilestone, palette)
        : createMedallionMesh(tokenMilestone, palette);
      group.rotation.x = style === 'keytag' ? -0.04 : 0.06;
      group.rotation.y = -0.22;
      scene.add(group);

      const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          const mapped = material as THREE.MeshStandardMaterial;
          if (mapped.map) mapped.map.anisotropy = Math.min(4, maxAnisotropy);
        });
      });

      const renderOnce = () => {
        if (!renderer || !scene || !alive || failed) return;
        try {
          renderer.render(scene, camera);
        } catch {
          failed = true;
          setWebglUnavailable(true);
        }
      };

      const needsFrameLoop = () => !reducedMotion || dragging || spinVelocity > 0.002 || flipTarget !== null;
      const scheduleFrame = () => {
        if (animationFrame || !alive || failed) return;
        animationFrame = window.requestAnimationFrame(renderFrame);
      };
      const renderFrame = (timestamp: number) => {
        animationFrame = 0;
        if (!renderer || !scene || !alive || failed) return;

        if (!dragging) {
          if (flipTarget !== null) {
            const turn = ((flipTarget - group.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
            if (Math.abs(turn) < 0.012) {
              group.rotation.y = flipTarget;
              flipTarget = null;
            } else {
              group.rotation.y += turn * 0.14;
            }
          } else if (spinVelocity > 0.002) {
            group.rotation.y += spinVelocity;
            spinVelocity *= 0.975;
            if (spinVelocity <= 0.002) spinVelocity = 0;
          } else if (!reducedMotion) {
            group.rotation.y += 0.0015;
          }
          if (!reducedMotion) group.position.y = Math.sin(timestamp * 0.00125) * 0.045;
        }

        renderOnce();
        if (needsFrameLoop()) scheduleFrame();
      };

      const resize = () => {
        if (!renderer || !host) return;
        const nextWidth = Math.max(1, host.clientWidth);
        const nextHeight = Math.max(1, host.clientHeight);
        renderer.setSize(nextWidth, nextHeight, false);
        camera.aspect = nextWidth / nextHeight;
        camera.updateProjectionMatrix();
        renderOnce();
      };

      const onPointerDown = (event: PointerEvent) => {
        dragging = true;
        spinVelocity = 0;
        flipTarget = null;
        previousPoint = { x: event.clientX, y: event.clientY };
        try { renderer?.domElement.setPointerCapture(event.pointerId); } catch { /* Pointer capture is optional. */ }
        scheduleFrame();
      };
      const onPointerMove = (event: PointerEvent) => {
        if (!dragging) return;
        const dx = event.clientX - previousPoint.x;
        const dy = event.clientY - previousPoint.y;
        group.rotation.y += dx * 0.009;
        group.rotation.x = Math.max(-0.55, Math.min(0.55, group.rotation.x + dy * 0.006));
        previousPoint = { x: event.clientX, y: event.clientY };
        spinVelocity = Math.max(-0.08, Math.min(0.08, dx * 0.0012));
        scheduleFrame();
      };
      const onPointerUp = (event: PointerEvent) => {
        if (!dragging) return;
        dragging = false;
        try { renderer?.domElement.releasePointerCapture(event.pointerId); } catch { /* Capture may already have ended. */ }
        scheduleFrame();
      };
      const onContextLost = (event: Event) => {
        event.preventDefault();
        failed = true;
        setWebglUnavailable(true);
      };

      renderer.domElement.addEventListener('pointerdown', onPointerDown);
      renderer.domElement.addEventListener('pointermove', onPointerMove);
      renderer.domElement.addEventListener('pointerup', onPointerUp);
      renderer.domElement.addEventListener('pointercancel', onPointerUp);
      renderer.domElement.addEventListener('webglcontextlost', onContextLost);
      actionsRef.current = {
        spin: () => { spinVelocity = 0.2; flipTarget = null; scheduleFrame(); },
        flip: () => { flippedFace = !flippedFace; flipTarget = flippedFace ? Math.PI : 0; spinVelocity = 0; scheduleFrame(); },
        reset: () => {
          flippedFace = false;
          flipTarget = null;
          spinVelocity = 0;
          group.rotation.set(style === 'keytag' ? -0.04 : 0.06, -0.22, 0);
          group.position.set(0, 0, 0);
          scheduleFrame();
        },
      };

      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);
      } else {
        window.addEventListener('resize', resize);
      }
      resize();
      if (!reducedMotion) scheduleFrame();

      return () => {
        alive = false;
        window.cancelAnimationFrame(animationFrame);
        resizeObserver?.disconnect();
        window.removeEventListener('resize', resize);
        renderer?.domElement.removeEventListener('pointerdown', onPointerDown);
        renderer?.domElement.removeEventListener('pointermove', onPointerMove);
        renderer?.domElement.removeEventListener('pointerup', onPointerUp);
        renderer?.domElement.removeEventListener('pointercancel', onPointerUp);
        renderer?.domElement.removeEventListener('webglcontextlost', onContextLost);
        actionsRef.current = null;
        disposeScene(scene);
        renderer?.dispose();
        try { renderer?.forceContextLoss(); } catch { /* Some devices do not expose context loss. */ }
        renderer?.domElement.remove();
      };
    } catch {
      alive = false;
      disposeScene(scene);
      renderer?.dispose();
      renderer?.domElement.remove();
      setWebglUnavailable(true);
      return undefined;
    }
  }, [milestone.id, milestone.label, style, reducedMotion, palette, webglUnavailable]);

  const flip = () => {
    actionsRef.current?.flip();
    setFlipped((value) => !value);
  };
  const reset = () => {
    actionsRef.current?.reset();
    setFlipped(false);
  };

  return (
    <div className={`recovery-canvas-token recovery-canvas-token--${style}`}>
      {webglUnavailable ? (
        <div className="recovery-token-static-fallback" role="img" aria-label={`${milestone.label} ${style === 'keytag' ? 'NA keytag' : 'AA medallion'} virtual token`}>
          <span>{style === 'keytag' ? 'NA' : 'AA'}</span>
          <strong>{milestone.label}</strong>
          <small>{style === 'keytag' ? 'CLEAN & SERENE' : 'UNITY · SERVICE · RECOVERY'}</small>
        </div>
      ) : (
        <div
          ref={hostRef}
          className="recovery-token-canvas-host"
          role="img"
          aria-label={`Interactive three-dimensional ${style === 'keytag' ? 'NA keytag' : 'AA medallion'}. The current reached milestone is ${milestone.label}. Drag to turn it; use the controls to spin, flip, or reset.`}
        />
      )}
      <p className="recovery-token-canvas-help">
        {webglUnavailable
          ? '3D graphics are unavailable in this browser. Your current milestone is still shown above.'
          : 'Drag the token to turn it. The manual controls remain available with reduced motion enabled.'}
      </p>
      {!webglUnavailable && (
        <div className="recovery-token-canvas-actions" role="group" aria-label="Current token controls">
          <button type="button" className="button button-secondary" onClick={() => actionsRef.current?.spin()}>Spin</button>
          <button type="button" className="button button-secondary" aria-pressed={flipped} onClick={flip}>{flipped ? 'Show front' : 'Flip token'}</button>
          <button type="button" className="button button-quiet" onClick={reset}>Reset view</button>
        </div>
      )}
    </div>
  );
}

function createCanvasTexture(draw: (context: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = textureSize;
  canvas.height = textureSize;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas textures are unavailable.');
  draw(context);
  const texture = new THREE.CanvasTexture(canvas);
  texture.encoding = THREE.sRGBEncoding;
  texture.needsUpdate = true;
  return texture;
}

function seededRandom(seedText: string) {
  let seed = 0;
  for (let index = 0; index < seedText.length; index += 1) seed = (seed * 31 + seedText.charCodeAt(index)) >>> 0;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function drawTokenBase(context: CanvasRenderingContext2D, color: string, foil: string, seed: string) {
  const center = textureSize / 2;
  const gradient = context.createLinearGradient(100, 80, textureSize - 80, textureSize - 60);
  gradient.addColorStop(0, mixColor(color, '#ffffff', 0.25));
  gradient.addColorStop(0.55, color);
  gradient.addColorStop(1, mixColor(color, '#111714', 0.27));
  context.fillStyle = gradient;
  context.fillRect(0, 0, textureSize, textureSize);

  const random = seededRandom(seed);
  context.save();
  context.globalAlpha = 0.13;
  for (let index = 0; index < 900; index += 1) {
    const angle = random() * Math.PI * 2;
    const radius = 80 + random() * textureSize * 0.42;
    const x = center + Math.cos(angle) * radius;
    const y = center + Math.sin(angle) * radius;
    context.fillStyle = random() > 0.48 ? '#ffffff' : '#101714';
    context.beginPath();
    context.arc(x, y, 1 + random() * 2.4, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();

  context.strokeStyle = foil;
  context.lineWidth = 18;
  context.beginPath();
  context.arc(center, center, textureSize * 0.43, 0, Math.PI * 2);
  context.stroke();
  context.lineWidth = 7;
  context.beginPath();
  context.arc(center, center, textureSize * 0.395, 0, Math.PI * 2);
  context.stroke();
}

function drawTriangle(context: CanvasRenderingContext2D, center: number, radius: number, color: string) {
  context.save();
  context.strokeStyle = color;
  context.lineWidth = 12;
  context.lineJoin = 'round';
  context.beginPath();
  context.moveTo(center, center - radius * 0.95);
  context.lineTo(center + radius * 0.86, center + radius * 0.62);
  context.lineTo(center - radius * 0.86, center + radius * 0.62);
  context.closePath();
  context.stroke();
  context.restore();
}

function drawKeytagFace(milestone: TokenMilestone, palette: ReturnType<typeof milestoneTokenArtworkPalette>, isBack: boolean) {
  return createCanvasTexture((context) => {
    const center = textureSize / 2;
    const bulbCenterY = textureSize * 0.65;
    const gradient = context.createLinearGradient(100, 80, textureSize - 80, textureSize - 60);
    gradient.addColorStop(0, mixColor(palette.color, '#ffffff', 0.2));
    gradient.addColorStop(0.55, palette.color);
    gradient.addColorStop(1, mixColor(palette.color, '#111714', 0.18));
    context.fillStyle = gradient;
    context.fillRect(0, 0, textureSize, textureSize);

    const random = seededRandom(`${milestone.id}-na-${isBack ? 'back' : 'front'}`);
    context.save();
    context.globalAlpha = 0.12;
    for (let index = 0; index < 700; index += 1) {
      const angle = random() * Math.PI * 2;
      const radius = 30 + random() * textureSize * 0.48;
      const x = center + Math.cos(angle) * radius;
      const y = center + Math.sin(angle) * radius;
      context.fillStyle = random() > 0.5 ? '#ffffff' : '#111111';
      context.beginPath();
      context.arc(x, y, 1 + random() * 2, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();

    context.save();
    context.fillStyle = palette.ink;
    context.strokeStyle = palette.ink;
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    if (!isBack) {
      const outerRadius = textureSize * 0.28;
      context.lineWidth = 22;
      context.beginPath();
      context.arc(center, bulbCenterY, outerRadius, 0, Math.PI * 2);
      context.stroke();
      context.lineWidth = 11;
      context.beginPath();
      context.arc(center, bulbCenterY, outerRadius - 34, 0, Math.PI * 2);
      context.stroke();

      context.font = '900 27px "Arial Black", Impact, sans-serif';
      context.fillText('UNITY', center, bulbCenterY - outerRadius + 28);
      context.fillText('RECOVERY', center, bulbCenterY + outerRadius - 27);
      context.save();
      context.translate(center - outerRadius + 26, bulbCenterY);
      context.rotate(-Math.PI / 2);
      context.fillText('SERVICE', 0, 0);
      context.restore();
      context.save();
      context.translate(center + outerRadius - 26, bulbCenterY);
      context.rotate(Math.PI / 2);
      context.fillText('FELLOWSHIP', 0, 0);
      context.restore();

      context.save();
      context.translate(center, bulbCenterY);
      context.rotate(Math.PI / 4);
      context.lineWidth = 18;
      context.strokeRect(-textureSize * 0.147, -textureSize * 0.147, textureSize * 0.294, textureSize * 0.294);
      context.restore();
      context.font = '900 196px "Arial Black", Impact, sans-serif';
      context.fillText('NA', center, bulbCenterY + 7);
    } else if (milestone.label.toLocaleLowerCase() === '24 hours') {
      context.font = '900 98px "Arial Black", Impact, sans-serif';
      context.fillText('WELCOME', center, bulbCenterY - 45);
      context.font = '900 60px "Arial Black", Impact, sans-serif';
      context.fillText('JUST FOR TODAY', center, bulbCenterY + 58);
    } else {
      const { number, unit } = milestoneTokenNumber(milestone.label);
      const sourceWording: Record<string, string> = {
        '30 days': 'THIRTY DAYS',
        '60 days': 'SIXTY DAYS',
        '90 days': 'NINETY DAYS',
        '6 months': 'SIX MONTHS',
        '9 months': 'NINE MONTHS',
        '1 year': 'ONE YEAR',
        '18 months': 'EIGHTEEN MONTHS',
      };
      const wording = sourceWording[milestone.label.toLocaleLowerCase()] ?? `${number} ${unit}`;
      context.font = '900 82px "Arial Black", Impact, sans-serif';
      context.fillText('CLEAN & SERENE', center, bulbCenterY - 72);
      context.font = '900 72px "Arial Black", Impact, sans-serif';
      context.fillText(`FOR ${wording}`, center, bulbCenterY + 31);
      if (unit === 'YEARS' && Number(number) > 1) {
        context.font = '900 54px "Arial Black", Impact, sans-serif';
        context.fillText('OF RECOVERY', center, bulbCenterY + 121);
      }
    }
    context.restore();
  });
}

function drawMedallionFace(milestone: TokenMilestone, palette: ReturnType<typeof milestoneTokenArtworkPalette>, isBack: boolean) {
  return createCanvasTexture((context) => {
    const center = textureSize / 2;
    drawTokenBase(context, palette.color, palette.foil, `${milestone.id}-coin-${isBack ? 'back' : 'front'}`);
    context.save();
    context.strokeStyle = palette.foil;
    context.fillStyle = palette.ink;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    const radius = textureSize * 0.3;

    if (!isBack) {
      const motto = 'TO THINE OWN SELF BE TRUE';
      const startAngle = -Math.PI * 0.72;
      const endAngle = -Math.PI * 0.28;
      const angleStep = (endAngle - startAngle) / (motto.length - 1);
      context.font = 'bold 31px Georgia, "Times New Roman", serif';
      for (let index = 0; index < motto.length; index += 1) {
        const angle = startAngle + index * angleStep;
        context.save();
        context.translate(center + radius * 1.27 * Math.cos(angle), center + radius * 1.27 * Math.sin(angle));
        context.rotate(angle + Math.PI / 2);
        context.fillText(motto[index] ?? '', 0, 0);
        context.restore();
      }

      drawTriangle(context, center, radius, palette.ink);
      context.font = 'bold 27px Georgia, "Times New Roman", serif';
      context.save();
      context.translate(center - radius * 0.36, center - radius * 0.12);
      context.rotate(Math.PI / 3);
      context.fillText('UNITY', 0, 0);
      context.restore();
      context.save();
      context.translate(center + radius * 0.36, center - radius * 0.12);
      context.rotate(-Math.PI / 3);
      context.fillText('SERVICE', 0, 0);
      context.restore();
      context.font = 'bold 28px Georgia, "Times New Roman", serif';
      context.fillText('RECOVERY', center, center + radius * 0.62);

      context.beginPath();
      context.arc(center, center - 16, textureSize * 0.105, 0, Math.PI * 2);
      context.fillStyle = mixColor(palette.color, '#101010', 0.28);
      context.fill();
      context.strokeStyle = palette.foil;
      context.lineWidth = 9;
      context.stroke();
      context.fillStyle = palette.ink;
      const { number, unit } = milestoneTokenNumber(milestone.label);
      context.font = '900 108px "Arial Black", Georgia, serif';
      context.fillText(number, center, center - 25);
      context.font = '700 43px Georgia, serif';
      context.fillText(unit, center, center + 80);
    } else {
      const random = seededRandom(`${milestone.id}-aa-reverse`);
      context.save();
      context.beginPath();
      context.arc(center, center, textureSize * 0.42, 0, Math.PI * 2);
      context.clip();
      context.fillStyle = 'rgba(0,0,0,0.22)';
      for (let index = 0; index < 1_500; index += 1) {
        const x = center + (random() - 0.5) * textureSize * 0.84;
        const y = center + (random() - 0.5) * textureSize * 0.84;
        context.beginPath();
        context.arc(x, y, 1 + random() * 2.5, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();
      const prayerLines = [
        'God grant me the', 'Serenity to accept the', 'things I cannot', 'change,',
        'Courage to change', 'the things', 'I can, and Wisdom', 'to know the', 'difference.',
      ];
      context.font = 'bold 33px Georgia, "Times New Roman", serif';
      prayerLines.forEach((line, index) => context.fillText(line, center, center - 180 + index * 46));
    }
    context.restore();
  });
}

function createKeytagMesh(milestone: TokenMilestone, palette: ReturnType<typeof milestoneTokenArtworkPalette>) {
  const group = new THREE.Group();
  const width = 2.1;
  const height = 3.2;
  const corner = 1.05;
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2 + corner, -height / 2);
  shape.lineTo(width / 2 - corner, -height / 2);
  shape.quadraticCurveTo(width / 2, -height / 2, width / 2, -height / 2 + corner);
  shape.lineTo(width / 3.3, height / 2 - 0.48);
  shape.quadraticCurveTo(0, height / 2 + 0.38, -width / 3.3, height / 2 - 0.48);
  shape.lineTo(-width / 2, -height / 2 + corner);
  shape.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + corner, -height / 2);
  const hole = new THREE.Path();
  hole.absarc(0, height / 2 - 0.32, 0.22, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  const depth = 0.11;
  const bodyGeometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 1,
    bevelSize: 0.035,
    bevelThickness: 0.035,
  });
  bodyGeometry.center();
  const isOneYearGlow = milestone.id === 'calendar-12-months';
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: palette.color,
    roughness: 0.38,
    metalness: 0.18,
    emissive: isOneYearGlow ? new THREE.Color('#78ad4f') : new THREE.Color('#000000'),
    emissiveIntensity: isOneYearGlow ? 0.18 : 0,
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  group.add(body);

  const faceGeometry = new THREE.ShapeGeometry(shape);
  faceGeometry.center();
  faceGeometry.computeBoundingBox();
  const bounds = faceGeometry.boundingBox;
  if (bounds) {
    const boxWidth = bounds.max.x - bounds.min.x;
    const boxHeight = bounds.max.y - bounds.min.y;
    const position = faceGeometry.getAttribute('position');
    if (position) {
      const uvs = new Float32Array(position.count * 2);
      for (let index = 0; index < position.count; index += 1) {
        const x = position.getX(index);
        const y = position.getY(index);
        uvs[index * 2] = (x - bounds.min.x) / boxWidth;
        uvs[index * 2 + 1] = 0.5 + (y - (bounds.min.y + boxHeight / 2)) / boxWidth;
      }
      faceGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    }
  }

  const frontTexture = drawKeytagFace(milestone, palette, false);
  const backTexture = drawKeytagFace(milestone, palette, true);
  const glow = isOneYearGlow ? new THREE.Color('#b6f9a1') : new THREE.Color('#000000');
  const foil = new THREE.MeshStandardMaterial({ color: 0xffffff, map: frontTexture, roughness: 0.3, metalness: 0.58, emissive: glow, emissiveIntensity: isOneYearGlow ? 0.08 : 0 });
  const reverseFoil = new THREE.MeshStandardMaterial({ color: 0xffffff, map: backTexture, roughness: 0.34, metalness: 0.5, emissive: glow, emissiveIntensity: isOneYearGlow ? 0.08 : 0 });
  const front = new THREE.Mesh(faceGeometry, foil);
  front.position.z = depth / 2 + 0.037;
  const back = new THREE.Mesh(faceGeometry, reverseFoil);
  back.position.z = -depth / 2 - 0.037;
  back.rotation.y = Math.PI;
  group.add(front, back);

  const ringMaterial = new THREE.MeshStandardMaterial({ color: 0xd7dde2, roughness: 0.2, metalness: 0.92 });
  const grommet = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.045, 16, 32), ringMaterial);
  grommet.position.set(0, 1.28, 0.07);
  const keyRing = new THREE.Mesh(new THREE.TorusGeometry(0.67, 0.045, 16, 48), ringMaterial);
  keyRing.position.set(0, 1.93, 0.05);
  group.add(grommet, keyRing);
  return group;
}

function createMedallionMesh(milestone: TokenMilestone, palette: ReturnType<typeof milestoneTokenArtworkPalette>) {
  const group = new THREE.Group();
  const radius = 2;
  const thickness = 0.13;
  const edgeMaterial = new THREE.MeshStandardMaterial({ color: palette.color, roughness: 0.34, metalness: 0.82 });
  const edge = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, thickness, 96, 1, true), edgeMaterial);
  edge.geometry.rotateX(Math.PI / 2);
  group.add(edge);

  const frontTexture = drawMedallionFace(milestone, palette, false);
  const backTexture = drawMedallionFace(milestone, palette, true);
  const face = new THREE.CircleGeometry(radius, 96);
  const front = new THREE.Mesh(face, new THREE.MeshStandardMaterial({ map: frontTexture, roughness: 0.38, metalness: 0.28 }));
  front.position.z = thickness / 2 + 0.003;
  const back = new THREE.Mesh(face, new THREE.MeshStandardMaterial({ map: backTexture, roughness: 0.4, metalness: 0.28 }));
  back.position.z = -thickness / 2 - 0.003;
  back.rotation.y = Math.PI;
  group.add(front, back);

  const rimMaterial = new THREE.MeshStandardMaterial({ color: palette.foil, roughness: 0.25, metalness: 0.92 });
  const outerRim = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.965, 0.045, 12, 96), rimMaterial);
  outerRim.position.z = thickness / 2 + 0.012;
  const reverseRim = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.965, 0.045, 12, 96), rimMaterial);
  reverseRim.position.z = -thickness / 2 - 0.012;
  reverseRim.rotation.y = Math.PI;
  group.add(outerRim, reverseRim);
  return group;
}

function mixColor(color: string, target: string, amount: number): string {
  const sourceRgb = hexToRgb(color);
  const targetRgb = hexToRgb(target);
  const mixed = sourceRgb.map((channel, index) => Math.round(channel + ((targetRgb[index] ?? channel) - channel) * amount));
  return `rgb(${mixed[0]}, ${mixed[1]}, ${mixed[2]})`;
}

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  const normalized = value.length === 3 ? value.split('').map((character) => character + character).join('') : value;
  return [0, 2, 4].map((index) => Number.parseInt(normalized.slice(index, index + 2), 16) || 0) as [number, number, number];
}

function disposeScene(scene: THREE.Scene | null) {
  scene?.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      const mapped = material as THREE.MeshStandardMaterial;
      mapped.map?.dispose();
      mapped.dispose();
    });
  });
}
