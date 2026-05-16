/**
 * Génère toutes les icônes PNG pour les apps BookedUp Pro et BookedUp Client.
 * Usage : node generate-icons.js
 * Dépendance : npm install -g sharp  (ou : npm install sharp)
 */
const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const PURPLE = '#7C3AED';
const BG     = '#050608';
const WHITE  = '#FFFFFF';

// SVG éclair centré sur fond coloré
function iconSvg(size, bgColor, boltColor) {
  const pad  = size * 0.22;
  const w    = size - pad * 2;
  const h    = size - pad * 2;
  // Éclair stylisé
  const pts  = [
    [pad + w * 0.58, pad],
    [pad + w * 0.22, pad + h * 0.48],
    [pad + w * 0.50, pad + h * 0.48],
    [pad + w * 0.42, pad + h],
    [pad + w * 0.78, pad + h * 0.52],
    [pad + w * 0.50, pad + h * 0.52],
  ].map(([x, y]) => `${x},${y}`).join(' ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    ${bgColor ? `<rect width="${size}" height="${size}" fill="${bgColor}" rx="${size * 0.22}"/>` : ''}
    <polygon points="${pts}" fill="${boltColor}" />
  </svg>`;
}

// SVG splash (portrait)
function splashSvg(w, h, isPro) {
  const boltSize = Math.min(w, h) * 0.18;
  const boltPad  = (boltSize * 0.22);
  const boltW    = boltSize - boltPad * 2;
  const boltH    = boltSize - boltPad * 2;
  const bx       = (w - boltSize) / 2;
  const by       = h * 0.35;

  const pts = [
    [bx + boltPad + boltW * 0.58, by + boltPad],
    [bx + boltPad + boltW * 0.22, by + boltPad + boltH * 0.48],
    [bx + boltPad + boltW * 0.50, by + boltPad + boltH * 0.48],
    [bx + boltPad + boltW * 0.42, by + boltPad + boltH],
    [bx + boltPad + boltW * 0.78, by + boltPad + boltH * 0.52],
    [bx + boltPad + boltW * 0.50, by + boltPad + boltH * 0.52],
  ].map(([x, y]) => `${x},${y}`).join(' ');

  const fontSize    = w * 0.095;
  const textY       = by + boltSize + fontSize * 1.2;
  const subFontSize = w * 0.042;
  const subY        = textY + fontSize * 0.9;
  const badgeH      = subFontSize * 1.8;
  const badgeW      = subFontSize * 5;
  const badgeX      = (w - badgeW) / 2;
  const badgeY      = subY - subFontSize * 1.1;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect width="${w}" height="${h}" fill="${BG}"/>
    <polygon points="${pts}" fill="${WHITE}"/>
    <text x="${w/2}" y="${textY}" font-family="system-ui,-apple-system,sans-serif"
      font-size="${fontSize}" font-weight="800" fill="${WHITE}" text-anchor="middle">BookedUp</text>
    ${isPro ? `
    <rect x="${badgeX}" y="${badgeY}" width="${badgeW}" height="${badgeH}"
      rx="${badgeH/2}" fill="${PURPLE}"/>
    <text x="${w/2}" y="${subY}" font-family="system-ui,-apple-system,sans-serif"
      font-size="${subFontSize}" font-weight="700" fill="${WHITE}" text-anchor="middle">PRO</text>
    ` : `
    <text x="${w/2}" y="${subY}" font-family="system-ui,-apple-system,sans-serif"
      font-size="${subFontSize}" font-weight="400" fill="rgba(255,255,255,0.45)" text-anchor="middle">Réservez en quelques secondes</text>
    `}
  </svg>`;
}

// SVG notification icon (transparent bg)
function notifSvg(size) {
  const pad  = size * 0.12;
  const w    = size - pad * 2;
  const h    = size - pad * 2;
  const pts  = [
    [pad + w * 0.58, pad],
    [pad + w * 0.22, pad + h * 0.48],
    [pad + w * 0.50, pad + h * 0.48],
    [pad + w * 0.42, pad + h],
    [pad + w * 0.78, pad + h * 0.52],
    [pad + w * 0.50, pad + h * 0.52],
  ].map(([x, y]) => `${x},${y}`).join(' ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <polygon points="${pts}" fill="${WHITE}"/>
  </svg>`;
}

async function gen(svgStr, outPath, w, h) {
  const buf = Buffer.from(svgStr);
  await sharp(buf).resize(w, h).png().toFile(outPath);
  console.log(`✓ ${path.relative(process.cwd(), outPath)}`);
}

async function main() {
  const mobile = path.join(__dirname, 'apps/mobile/assets');
  const client = path.join(__dirname, 'apps/client/assets');

  // Mobile Pro
  await gen(iconSvg(1024, PURPLE, WHITE),      path.join(mobile, 'icon.png'),              1024, 1024);
  await gen(iconSvg(1024, null,   PURPLE),      path.join(mobile, 'adaptive-icon.png'),     1024, 1024);
  await gen(splashSvg(1284, 2778, true),        path.join(mobile, 'splash.png'),            1284, 2778);
  await gen(notifSvg(96),                       path.join(mobile, 'notification-icon.png'),   96,   96);

  // Client
  await gen(iconSvg(1024, PURPLE, WHITE),      path.join(client, 'icon.png'),              1024, 1024);
  await gen(iconSvg(1024, null,   PURPLE),      path.join(client, 'adaptive-icon.png'),     1024, 1024);
  await gen(splashSvg(1284, 2778, false),       path.join(client, 'splash.png'),            1284, 2778);
  await gen(notifSvg(96),                       path.join(client, 'notification-icon.png'),   96,   96);

  console.log('\n🎨 Toutes les icônes générées !');
}

main().catch(err => {
  console.error('Erreur:', err.message);
  console.log('\nInstalle sharp d\'abord : npm install sharp');
  process.exit(1);
});
