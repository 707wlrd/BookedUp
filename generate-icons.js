/**
 * generate-icons.js
 * Génère tous les assets PNG pour BookedUp (client) et BookedUp Pro (mobile/coiffeur).
 * Utilise sharp + SVG inline — aucune dépendance native à compiler.
 *
 * Installation : npm install sharp   (ou : pnpm add -w sharp)
 * Exécution    : node generate-icons.js
 */

const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

// ─── Tokens de marque ────────────────────────────────────────────────────────
const VIOLET  = '#7C3AED';
const DARK_BG = '#050608';
const WHITE   = '#FFFFFF';

// ─── Chemins de sortie ───────────────────────────────────────────────────────
const MOBILE_ASSETS = path.join(__dirname, 'apps', 'mobile', 'assets');
const CLIENT_ASSETS = path.join(__dirname, 'apps', 'client', 'assets');

[MOBILE_ASSETS, CLIENT_ASSETS].forEach(d => fs.mkdirSync(d, { recursive: true }));

// ─── Path SVG de l'éclair (viewBox 0 0 100 100) ─────────────────────────────
// Forme asymétrique pointue — haut-droit vers bas-gauche
const BOLT = 'M 57,4 L 25,54 L 46,54 L 43,96 L 75,46 L 54,46 Z';

// ─── Générateurs SVG ─────────────────────────────────────────────────────────

/**
 * Icône carrée 1024×1024
 * bg         : couleur de fond (null = transparent)
 * boltColor  : couleur de l'éclair
 */
function svgIcon(size, bg, boltColor) {
  const margin = size * 0.20;          // espace autour de l'éclair
  const bW = size - margin * 2;
  const bH = bW;
  const bX = margin;
  const bY = margin;

  const background = bg
    ? `<rect width="${size}" height="${size}" fill="${bg}"/>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${background}
  <g transform="translate(${bX},${bY}) scale(${bW / 100},${bH / 100})">
    <path d="${BOLT}" fill="${boltColor}"/>
  </g>
</svg>`;
}

/**
 * Adaptive icon 1024×1024 — éclair seul légèrement plus petit
 * (Android ajoute son propre fond de couleur)
 */
function svgAdaptive(size, boltColor) {
  const margin = size * 0.22;
  const bW = size - margin * 2;
  const bX = margin;
  const bY = margin;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <g transform="translate(${bX},${bY}) scale(${bW / 100},${bW / 100})">
    <path d="${BOLT}" fill="${boltColor}"/>
  </g>
</svg>`;
}

/**
 * Splash portrait 1284×2778
 * appName     : nom affiché sous l'éclair
 * showPro     : true → badge violet "Pro" sous le nom
 */
function svgSplash(W, H, appName, showPro) {
  // Éclair : 36 % de la largeur, centré verticalement à 40 % du haut
  const bW   = W * 0.36;
  const bH   = bW;
  const bX   = (W - bW) / 2;
  const bY   = H * 0.40 - bH / 2;

  // Texte principal
  const fsMain = W * 0.092;
  const mainY  = bY + bH + fsMain * 1.35;

  // Badge Pro
  const fsPro  = W * 0.040;
  const badgeH = fsPro * 2.0;
  const badgeW = fsPro * 4.8;
  const badgeX = (W - badgeW) / 2;
  const badgeY = mainY + fsPro * 0.6;
  const proY   = badgeY + fsPro * 1.35;

  const badge = showPro ? `
  <rect x="${badgeX}" y="${badgeY}" width="${badgeW}" height="${badgeH}"
        rx="${badgeH / 2}" fill="${VIOLET}"/>
  <text x="${W / 2}" y="${proY}"
        font-family="'Helvetica Neue',Helvetica,Arial,sans-serif"
        font-weight="700" font-size="${fsPro}" fill="${WHITE}"
        text-anchor="middle" letter-spacing="4">PRO</text>` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${DARK_BG}"/>
  <g transform="translate(${bX},${bY}) scale(${bW / 100},${bH / 100})">
    <path d="${BOLT}" fill="${WHITE}"/>
  </g>
  <text x="${W / 2}" y="${mainY}"
        font-family="'Helvetica Neue',Helvetica,Arial,sans-serif"
        font-weight="800" font-size="${fsMain}" fill="${WHITE}"
        text-anchor="middle" letter-spacing="6">${appName}</text>
  ${badge}
</svg>`;
}

/**
 * Icône de notification 96×96 — éclair blanc, fond transparent
 */
function svgNotif(size) {
  const margin = size * 0.10;
  const bW = size - margin * 2;
  const bX = margin;
  const bY = margin;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <g transform="translate(${bX},${bY}) scale(${bW / 100},${bW / 100})">
    <path d="${BOLT}" fill="${WHITE}"/>
  </g>
</svg>`;
}

// ─── Pipeline de rendu ───────────────────────────────────────────────────────
async function render(svgString, outPath) {
  const buf = Buffer.from(svgString, 'utf8');
  await sharp(buf).png().toFile(outPath);
  const kb = (fs.statSync(outPath).size / 1024).toFixed(1);
  console.log(`  OK  ${path.relative(__dirname, outPath).padEnd(48)}  ${kb} KB`);
}

async function main() {
  console.log('\n=== BookedUp — Générateur d\'icônes ===\n');

  // ── mobile — BookedUp Pro (coiffeur) ────────────────────────────────────
  console.log('[mobile / BookedUp Pro]');
  await render(svgIcon(1024, VIOLET, WHITE),      path.join(MOBILE_ASSETS, 'icon.png'));
  await render(svgAdaptive(1024, VIOLET),          path.join(MOBILE_ASSETS, 'adaptive-icon.png'));
  await render(svgSplash(1284, 2778, 'BookedUp', true),  path.join(MOBILE_ASSETS, 'splash.png'));
  await render(svgNotif(96),                       path.join(MOBILE_ASSETS, 'notification-icon.png'));

  // ── client — BookedUp (utilisateur) ────────────────────────────────────
  console.log('\n[client / BookedUp]');
  await render(svgIcon(1024, VIOLET, WHITE),      path.join(CLIENT_ASSETS, 'icon.png'));
  await render(svgAdaptive(1024, VIOLET),          path.join(CLIENT_ASSETS, 'adaptive-icon.png'));
  await render(svgSplash(1284, 2778, 'BookedUp', false), path.join(CLIENT_ASSETS, 'splash.png'));

  console.log('\n7 assets generes avec succes.\n');
}

main().catch(err => {
  console.error('\nErreur:', err.message);
  if (err.message.includes("Cannot find module 'sharp'")) {
    console.error('\nInstalle sharp en premier :\n  npm install sharp\n  # ou : pnpm add -w sharp\n');
  }
  process.exit(1);
});
