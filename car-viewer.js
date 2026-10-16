import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ══════════════════════════════════════════════════════════════════════════════
//  ZONE DEFINITIONS — coordonnées géométriques locales du mesh Carrosserie_0
//  Z+ = avant  |  Z- = arrière  |  Y+ = haut
//  Frontières z : capot z>2.6 | flanc_av z(1.3-2.6) | porte_av z(0-1.3)
//                 porte_ar z(-2.5-0) | custode z(-4.0 à -2.5) | pare-chocs z<-4.0
//  Frontières y : pavillon y>0.88 | vitre y>0.38 | caisse y≈0 | bas y<0
//
//  PALETTE HAUTE-CONTRASTE — chaque zone voisine a une teinte très différente
//  pour que les frontières soient lisibles au premier coup d'œil.
//  On utilise flat shading + geometry non-indexée pour des bordures nettes.
// ══════════════════════════════════════════════════════════════════════════════
const BODY_ZONES = [
  // ── CAPOT CENTRAL — 1 000€ ────────────────────────────────────────────────
  // Le capot descend en pente : z≈0 (y≈1.5) → z≈2.5 (y≈0.3).
  // DOIT venir AVANT toit pour que z≥0 soit capot, pas toit.
  {
    id: 'capot_central',
    label: 'Capot central',
    price: '1 000€',
    hex:          0x8B1A1A,
    highlightHex: 0xFF4444,
    test: (x, y, z) => {
      const ax = Math.abs(x);
      if (ax >= 0.9) return false;
      if (z >= 0 && y > 0.88) return true;
      if (z > 1.5 && y > 0.18 && y <= 0.88) return true;
      return false;
    },
  },
  // ── CÔTÉS CAPOT — 300€ (×2) ───────────────────────────────────────────────
  // Arêtes d'aile de part et d'autre du capot
  {
    id: 'capot_cote',
    label: 'Côtés capot',
    price: '300€',
    hex:          0xE88C28,
    highlightHex: 0xFFBB44,
    test: (x, y, z) => {
      const ax = Math.abs(x);
      if (ax < 0.9 || ax > 2.3) return false;
      if (z >= 0 && y > 0.88) return true;
      if (z > 1.0 && y > 0.5 && y <= 0.88) return true;
      return false;
    },
  },
  // ── TOIT COMPLET — 1 000€ ─────────────────────────────────────────────────
  // Après capot : ne capture que z<0 (pavillon derrière le pare-brise)
  {
    id: 'toit',
    label: 'Toit complet',
    price: '1 000€',
    hex:          0x8B1A1A,
    highlightHex: 0xFF4444,
    test: (x, y, z) => y > 0.88,
  },
  // ── 4. SOUS PHARES AVANT — 100€ (×2) ──────────────────────────────────────
  {
    id: 'sous_phare_av',
    label: 'Bande sous phare avant',
    price: '100€',
    hex:          0xD4920A,
    highlightHex: 0xFFDD00,
    test: (x, y, z) => z > 2.6 && y > -0.12 && y <= 0.18 && Math.abs(x) > 0.75,
  },
  // ── 5. CÔTÉS PLAQUE AVANT — 50€ (×2) ─────────────────────────────────────
  {
    id: 'cote_plaque_av',
    label: 'Côté plaque avant',
    price: '50€',
    hex:          0xF0D060,
    highlightHex: 0xFFFF88,
    test: (x, y, z) => z > 2.8 && y > -0.22 && y <= 0.05 && Math.abs(x) > 0.22 && Math.abs(x) <= 0.75,
  },
  // ── 6-9. BANDE BAS AVANT — 100€ × 4 ──────────────────────────────────────
  {
    id: 'bande_bas_1',
    label: 'Bande basse avant #1',
    price: '100€',
    hex:          0xB86010,
    highlightHex: 0xFFCC00,
    test: (x, y, z) => z > 3.0 && y <= -0.22 && x < -0.45,
  },
  {
    id: 'bande_bas_2',
    label: 'Bande basse avant #2',
    price: '100€',
    hex:          0xE8A040,
    highlightHex: 0xFFCC00,
    test: (x, y, z) => z > 3.0 && y <= -0.22 && x >= -0.45 && x < 0,
  },
  {
    id: 'bande_bas_3',
    label: 'Bande basse avant #3',
    price: '100€',
    hex:          0xB86010,
    highlightHex: 0xFFCC00,
    test: (x, y, z) => z > 3.0 && y <= -0.22 && x >= 0 && x < 0.45,
  },
  {
    id: 'bande_bas_4',
    label: 'Bande basse avant #4',
    price: '100€',
    hex:          0xE8A040,
    highlightHex: 0xFFCC00,
    test: (x, y, z) => z > 3.0 && y <= -0.22 && x >= 0.45,
  },
  // ── 10. FLANC AVANT — 400€ (×2) ───────────────────────────────────────────
  {
    id: 'flanc_avant',
    label: 'Flanc avant',
    price: '400€',
    hex:          0xCC7020,
    highlightHex: 0xFFAA44,
    test: (x, y, z) => Math.abs(x) > 1.4 && z > 1.3 && z <= 2.6 && y > -1.8 && y <= 0.88,
  },
  // ── 11. PORTE AVANT — Réservé organisateur ────────────────────────────────
  {
    id: 'porte_avant',
    label: 'Porte avant — Réservé organisateur',
    price: '—',
    hex:          0x606060,
    highlightHex: 0xBBBBBB,
    test: (x, y, z) => Math.abs(x) > 1.4 && z > 0 && z <= 1.3 && y > -1.8 && y <= 0.88,
  },
  // ── 12. VITRE PORTIÈRE ARRIÈRE — 450€ (×2) ────────────────────────────────
  {
    id: 'vitre_portiere_arr',
    label: 'Vitre portière arrière',
    price: '450€',
    hex:          0x1A5030,
    highlightHex: 0x44DD77,
    test: (x, y, z) => Math.abs(x) > 1.4 && z > -2.5 && z <= 0 && y > 0.38 && y <= 0.88,
  },
  // ── 13. MILIEU PORTIÈRE ARRIÈRE — 850€ (×2) ───────────────────────────────
  {
    id: 'portiere_arr_milieu',
    label: 'Portière arrière — milieu',
    price: '850€',
    hex:          0x5C2010,
    highlightHex: 0xFF8844,
    test: (x, y, z) => Math.abs(x) > 1.4 && z > -2.5 && z <= 0 && y > -0.08 && y <= 0.38,
  },
  // ── 14. BAS PORTIÈRE ARRIÈRE — 200€ (×2) ──────────────────────────────────
  {
    id: 'portiere_arr_bas',
    label: 'Bas portière arrière',
    price: '200€',
    hex:          0xD98830,
    highlightHex: 0xFFBB55,
    test: (x, y, z) => Math.abs(x) > 1.4 && z > -2.5 && z <= 0 && y > -1.8 && y <= -0.08,
  },
  // ── 15. CÔTÉS PLAQUE ARRIÈRE — 200€ (×2) ──────────────────────────────────
  {
    id: 'cote_plaque_ar',
    label: 'Côté plaque arrière',
    price: '200€',
    hex:          0xB06028,
    highlightHex: 0xFF9944,
    test: (x, y, z) => z <= -3.5 && z > -4.5 && y > -0.22 && y <= 0.12
                     && Math.abs(x) > 0.32 && Math.abs(x) <= 1.1,
  },
  // ── 16. CÔTÉS LOGO RENAULT ARRIÈRE — 100€ (×2) ────────────────────────────
  {
    id: 'cote_logo_ar',
    label: 'Côté logo Renault (arr.)',
    price: '100€',
    hex:          0xD4920A,
    highlightHex: 0xFFDD00,
    test: (x, y, z) => z <= -3.5 && z > -4.5 && y > 0.08 && y <= 0.38
                     && Math.abs(x) > 0.15 && Math.abs(x) <= 0.55,
  },
  // ── 17. FLANC ARRIÈRE HAUT — 200€ (×2) ───────────────────────────────────
  {
    id: 'flanc_arr_haut',
    label: 'Flanc arrière (haut)',
    price: '200€',
    hex:          0xA86030,
    highlightHex: 0xFFAA55,
    test: (x, y, z) => Math.abs(x) > 1.4 && z <= -2.5 && z > -4.0 && y > 0.0 && y <= 0.88,
  },
  // ── 18. FLANC ARRIÈRE BAS — 200€ (×2) ────────────────────────────────────
  {
    id: 'flanc_arr_bas',
    label: 'Flanc arrière (bas)',
    price: '200€',
    hex:          0xD09838,
    highlightHex: 0xFFCC66,
    test: (x, y, z) => Math.abs(x) > 1.4 && z <= -2.5 && z > -4.0 && y > -1.8 && y <= 0.0,
  },
  // ── CATCH-ALL ─────────────────────────────────────────────────────────────
  {
    id: 'carrosserie',
    label: 'Carrosserie',
    price: '—',
    hex:          0x3C1A08,
    highlightHex: 0xFF9900,
    test: (x, y, z) => Math.abs(x) > 1.2,
  },
];

// Initialize THREE.Color for each zone
BODY_ZONES.forEach(z => {
  z.color          = new THREE.Color(z.hex);
  z.highlightColor = new THREE.Color(z.highlightHex);
});

const DEFAULT_BODY_COLOR = new THREE.Color(0x3C1A08);

function getZoneForPoint(x, y, z) {
  for (const zone of BODY_ZONES) {
    if (zone.test(x, y, z)) return zone;
  }
  return null;
}

// ── Non-body interactive zones (detected by node name) ────────────────────
const NODE_ZONES = {
  // Phares avant — 100€ chacun (gauche / droite)
  'Feux avants_6': {
    label: 'Phare avant',
    price: '100€',
    hex: 0xD4920A,
    subzone: (lx, ly, lz) => ({
      label: `Phare avant — côté ${lx >= 0 ? 'droit' : 'gauche'}`,
      price: '100€',
      subId: lx >= 0 ? 'R' : 'L',
    }),
  },
  // Feux arrière — 100€ chacun (gauche / droite)
  'Feux arriere_5': {
    label: 'Feu arrière',
    price: '100€',
    hex: 0xD4920A,
    subzone: (lx, ly, lz) => ({
      label: `Feu arrière — côté ${lx >= 0 ? 'droit' : 'gauche'}`,
      price: '100€',
      subId: lx >= 0 ? 'R' : 'L',
    }),
  },
  // Vitre arrière — 2 zones séparées gauche / droite
  'Pare brise arriere_11': {
    label: 'Vitre arrière',
    price: '450€ / côté',
    hex: 0x2A1A0E,
    subzone: (lx, ly, lz) => ({
      label: `Vitre arrière — côté ${lx >= 0 ? 'droit' : 'gauche'}`,
      price: '450€',
      subId: lx >= 0 ? 'R' : 'L',
    }),
  },
  // Pare-chocs arrière — 2 lignes × 8 cases = 16 zones à 50€
  'Pare chocs_12': {
    label: 'Pare-chocs arrière',
    price: '50€ / case',
    hex: 0x4A2A10,
    subzone: (lx, ly, lz) => {
      const col  = Math.min(7, Math.max(0, Math.floor((lx + 1.5) / (3.0 / 8))));
      const row  = ly >= -0.1 ? 1 : 2;
      return {
        label: `Pare-chocs arr. — ligne ${row}, case ${col + 1}/8`,
        price: '50€',
        subId: `r${row}c${col}`,
      };
    },
  },
};

// ── DOM refs ──────────────────────────────────────────────────────────────
const container = document.getElementById('car-viewer-container');
const canvas    = document.getElementById('carCanvas');
const loaderEl  = document.getElementById('carLoader');
const loaderTxt = document.getElementById('carLoaderText');
const tooltip   = document.getElementById('carTooltip');

// ── Scene ─────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
camera.position.set(6.5, 1.2, 0);
camera.lookAt(0, 0, 0);

scene.add(new THREE.AmbientLight(0xF2EDE0, 1.4));
const sun = new THREE.DirectionalLight(0xfff5e0, 2.2);
sun.position.set(5, 8, 5);
scene.add(sun);
const fill = new THREE.DirectionalLight(0xC49A6A, 0.7);
fill.position.set(-5, 2, -3);
scene.add(fill);
scene.add(new THREE.HemisphereLight(0xF2EDE0, 0x3C2015, 0.6));

// ── Controls ───────────────────────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping   = true;
controls.dampingFactor   = 0.08;
controls.autoRotate      = true;
controls.autoRotateSpeed = 1.2;
controls.enablePan       = false;
controls.enableZoom      = false;
// Disable touch rotation on mobile so vertical scroll isn't blocked
if ('ontouchstart' in window) controls.enableRotate = false;
controls.minDistance     = 4;
controls.maxDistance     = 14;
controls.maxPolarAngle   = Math.PI / 2.1;
controls.minPolarAngle   = 0.1;
controls.target.set(0, 0, 0);

// ── State ─────────────────────────────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const pointer   = new THREE.Vector2(-9999, -9999);
let hoveredZone = null;
let loadedModel = null;
let allMeshes   = [];
let bodyMeshes  = [];

// ══════════════════════════════════════════════════════════════════════════════
//  FLAT-SHADED VERTEX ZONE COLORING
//  → Convert to non-indexed geometry so each triangle has its own vertices
//  → Color ALL 3 vertices of each face based on the face centroid
//  → This gives perfectly sharp, clean zone boundaries with zero gradient
// ══════════════════════════════════════════════════════════════════════════════
function applyVertexZones(mesh) {
  let geo = mesh.geometry;

  // Convert indexed → non-indexed for per-face coloring
  if (geo.index) {
    geo = geo.toNonIndexed();
    mesh.geometry = geo;
  }

  const posAttr = geo.attributes.position;
  if (!posAttr) return;

  const count  = posAttr.count;
  const colors = new Float32Array(count * 3);

  // Color per face (3 vertices at a time) using the centroid
  for (let i = 0; i < count; i += 3) {
    const cx = (posAttr.getX(i) + posAttr.getX(i+1) + posAttr.getX(i+2)) / 3;
    const cy = (posAttr.getY(i) + posAttr.getY(i+1) + posAttr.getY(i+2)) / 3;
    const cz = (posAttr.getZ(i) + posAttr.getZ(i+1) + posAttr.getZ(i+2)) / 3;
    const zone = getZoneForPoint(cx, cy, cz);
    const col  = zone ? zone.color : DEFAULT_BODY_COLOR;

    for (let v = 0; v < 3; v++) {
      colors[(i + v) * 3]     = col.r;
      colors[(i + v) * 3 + 1] = col.g;
      colors[(i + v) * 3 + 2] = col.b;
    }
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  // Recompute normals for flat shading
  geo.computeVertexNormals();

  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  mats.forEach(m => {
    m.vertexColors = true;
    m.color.set(0xffffff);
    m.flatShading = true;
    m.metalness = 0.18;
    m.roughness = 0.55;
    m.needsUpdate = true;
  });

  bodyMeshes.push(mesh);
}

// ── Highlight body zone ────────────────────────────────────────────────────
const _mixColor = new THREE.Color();

function setBodyZoneHighlight(zoneId, on) {
  bodyMeshes.forEach(mesh => {
    const geo     = mesh.geometry;
    const posAttr = geo.attributes.position;
    const colAttr = geo.attributes.color;
    if (!colAttr) return;

    const count = posAttr.count;
    for (let i = 0; i < count; i += 3) {
      const cx = (posAttr.getX(i) + posAttr.getX(i+1) + posAttr.getX(i+2)) / 3;
      const cy = (posAttr.getY(i) + posAttr.getY(i+1) + posAttr.getY(i+2)) / 3;
      const cz = (posAttr.getZ(i) + posAttr.getZ(i+1) + posAttr.getZ(i+2)) / 3;
      const zone = getZoneForPoint(cx, cy, cz);
      if (!zone || zone.id !== zoneId) continue;

      if (on) {
        _mixColor.lerpColors(zone.color, zone.highlightColor, 0.55);
      } else {
        _mixColor.copy(zone.color);
      }
      for (let v = 0; v < 3; v++) {
        colAttr.setXYZ(i + v, _mixColor.r, _mixColor.g, _mixColor.b);
      }
    }
    colAttr.needsUpdate = true;
  });
}

// ── Highlight node zone ────────────────────────────────────────────────────
function setNodeHighlight(node, on, hex) {
  if (!node) return;
  node.traverse(child => {
    if (!child.isMesh) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach(m => {
      if (m.emissive === undefined) return;
      m.emissive.setHex(on ? hex : 0x000000);
      m.emissiveIntensity = on ? 0.45 : 0;
    });
  });
}

// ── Tooltip ────────────────────────────────────────────────────────────────
function showTooltip(sx, sy, label, price) {
  tooltip.innerHTML = `<span class="car-tooltip-label">${label}</span><span class="car-tooltip-price">${price}</span>`;
  tooltip.style.display = 'flex';
  const cw   = container.clientWidth;
  const left = Math.min(Math.max(sx, 90), cw - 90);
  tooltip.style.left = left + 'px';
  tooltip.style.top  = (sy - 12) + 'px';
}

function hideTooltip() {
  tooltip.style.display = 'none';
}

// ── Clear current hover ────────────────────────────────────────────────────
function clearHover() {
  if (!hoveredZone) return;
  if (hoveredZone.type === 'body') {
    setBodyZoneHighlight(hoveredZone.id, false);
  } else {
    setNodeHighlight(hoveredZone.node, false);
  }
  hoveredZone = null;
}

// ── Hover check ────────────────────────────────────────────────────────────
function checkHover(sx, sy) {
  if (!loadedModel) return;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(allMeshes, false);

  if (!hits.length) {
    clearHover(); hideTooltip(); controls.autoRotate = true; return;
  }

  const hit  = hits[0];
  const mesh = hit.object;

  if (bodyMeshes.includes(mesh)) {
    const local = mesh.worldToLocal(hit.point.clone());
    const zone  = getZoneForPoint(local.x, local.y, local.z);

    if (!zone) { clearHover(); hideTooltip(); return; }

    if (!hoveredZone || hoveredZone.type !== 'body' || hoveredZone.id !== zone.id) {
      clearHover();
      hoveredZone = { type: 'body', id: zone.id };
      setBodyZoneHighlight(zone.id, true);
      controls.autoRotate = false;
    }
    showTooltip(sx, sy, zone.label, zone.price);

  } else {
    let obj = mesh, nodeKey = null;
    while (obj) { if (NODE_ZONES[obj.name]) { nodeKey = obj.name; break; } obj = obj.parent; }

    if (!nodeKey) { clearHover(); hideTooltip(); controls.autoRotate = true; return; }

    const nz = NODE_ZONES[nodeKey];

    const localHit = mesh.worldToLocal(hit.point.clone());
    const sub   = nz.subzone ? nz.subzone(localHit.x, localHit.y, localHit.z) : null;
    const label = sub ? sub.label : nz.label;
    const price = sub ? sub.price : nz.price;
    const uid   = sub ? `${nodeKey}__${sub.subId}` : nodeKey;

    if (!hoveredZone || hoveredZone.type !== 'node' || hoveredZone.id !== uid) {
      clearHover();
      const node = loadedModel.getObjectByName(nodeKey);
      hoveredZone = { type: 'node', id: uid, nodeKey, node };
      setNodeHighlight(node, true, nz.hex);
      controls.autoRotate = false;
    }
    showTooltip(sx, sy, label, price);
  }
}

// ── Pointer events ─────────────────────────────────────────────────────────
function updatePointer(e) {
  const rect = canvas.getBoundingClientRect();
  const cx   = e.clientX ?? e.touches?.[0]?.clientX;
  const cy   = e.clientY ?? e.touches?.[0]?.clientY;
  pointer.x  = ((cx - rect.left) / rect.width)  *  2 - 1;
  pointer.y  = -((cy - rect.top) / rect.height) *  2 + 1;
  return { x: cx - rect.left, y: cy - rect.top };
}

canvas.addEventListener('pointermove', e => {
  const { x, y } = updatePointer(e);
  checkHover(x, y);
});

canvas.addEventListener('pointerleave', () => {
  pointer.set(-9999, -9999);
  clearHover(); hideTooltip(); controls.autoRotate = true;
});

canvas.addEventListener('pointerdown', e => {
  if (e.pointerType === 'touch') { const { x, y } = updatePointer(e); checkHover(x, y); }
});

// ── Bidirectional grid → model ─────────────────────────────────────────────
document.querySelectorAll('.place-item[data-zone]').forEach(item => {
  const zoneId = item.dataset.zone;
  if (!zoneId) return;

  item.addEventListener('mouseenter', () => {
    if (!loadedModel) return;
    clearHover();
    const bodyZone = BODY_ZONES.find(z => z.id === zoneId);
    if (bodyZone) {
      hoveredZone = { type: 'body', id: zoneId };
      setBodyZoneHighlight(zoneId, true);
    } else if (NODE_ZONES[zoneId]) {
      const node = loadedModel.getObjectByName(zoneId);
      hoveredZone = { type: 'node', id: zoneId, node };
      setNodeHighlight(node, true, NODE_ZONES[zoneId].hex);
    }
    controls.autoRotate = false;
    item.classList.add('is-active');
  });

  item.addEventListener('mouseleave', () => {
    clearHover(); controls.autoRotate = true;
    item.classList.remove('is-active');
  });
});

// ── Resize ─────────────────────────────────────────────────────────────────
function onResize() {
  const w = container.clientWidth;
  const h = container.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}
new ResizeObserver(onResize).observe(container);
onResize();

// ── Render loop ────────────────────────────────────────────────────────────
(function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
})();

// ── GLTF Load ──────────────────────────────────────────────────────────────
function loadModel() {
  // Modèle compressé avec Draco (20 Mo → 1,6 Mo), décodeur chargé depuis le CDN de three
  const draco = new DRACOLoader();
  draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/gltf/');
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);

  loader.load(
    'models/scene.glb',
    gltf => {
      const model = gltf.scene;

      // Center & scale
      const box    = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size   = box.getSize(new THREE.Vector3());
      const scale  = 5 / Math.max(size.x, size.y, size.z);
      model.scale.setScalar(scale);
      model.position.sub(center.multiplyScalar(scale));
      model.position.y += 0.1;

      model.traverse(child => {
        if (!child.isMesh) return;

        // Clone material for independent control
        child.material = Array.isArray(child.material)
          ? child.material.map(m => m.clone())
          : child.material.clone();

        // Is this mesh part of Carrosserie_0?
        let isBody = false;
        let obj    = child;
        while (obj) { if (obj.name === 'Carrosserie_0') { isBody = true; break; } obj = obj.parent; }

        if (isBody) {
          applyVertexZones(child);
        } else {
          // Check if this is a node zone
          let nodeKey = null;
          let nodeObj = child;
          while (nodeObj) { if (NODE_ZONES[nodeObj.name]) { nodeKey = nodeObj.name; break; } nodeObj = nodeObj.parent; }

          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach(m => {
            if (m.name === 'Plastique') { m.color.setHex(0x2A1A0E); m.roughness = 0.9; }
            if (m.emissive !== undefined) m.emissive.setHex(0x000000);

            // Give node-zone meshes a subtle tinted base for visibility
            if (nodeKey) {
              const nz = NODE_ZONES[nodeKey];
              const tintCol = new THREE.Color(nz.hex);
              m.color.lerp(tintCol, 0.25);
            }
          });
        }

        allMeshes.push(child);
      });

      loadedModel = model;
      scene.add(model);

      loaderEl.classList.add('hidden');
      setTimeout(() => { loaderEl.style.display = 'none'; }, 400);
    },
    xhr => {
      if (xhr.total) loaderTxt.textContent = `Chargement... ${Math.round(xhr.loaded / xhr.total * 100)}%`;
    },
    err => { console.error('GLTF error', err); loaderTxt.textContent = 'Erreur de chargement.'; }
  );
}

// ── Lazy load ──────────────────────────────────────────────────────────────
let modelStarted = false;
function startOnce() { if (modelStarted) return; modelStarted = true; loadModel(); }

const section = document.getElementById('emplacement');
if (section) {
  new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) { startOnce(); }
  }, { threshold: 0.05, rootMargin: '200px' }).observe(section);
  setTimeout(() => {
    const r = section.getBoundingClientRect();
    if (r.top < window.innerHeight + 200) startOnce();
  }, 500);
} else {
  startOnce();
}

// ── Debug access ──────────────────────────────────────────────────────────
window.__carViewer = { camera, controls, scene };
