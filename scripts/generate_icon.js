import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="cfLogoBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#404040" />
      <stop offset="100%" stop-color="#242424" />
    </linearGradient>
    <linearGradient id="cfLogoAccent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#cccccc" />
    </linearGradient>
  </defs>

  <!-- Visible squircle container with defined graphite border -->
  <rect x="8" y="8" width="496" height="496" rx="108" fill="url(#cfLogoBg)" stroke="#555555" stroke-width="14" />

  <g>
    <rect x="116" y="186" width="280" height="190" rx="28" fill="#ffffff" />
    <path d="M126 146 L186 106 H386 L326 146 Z" fill="url(#cfLogoAccent)" />
    <path d="M146 146 h220 v20 H146 z" fill="#ffffff" />
    
    <path d="M190 106 L170 146" stroke="#242424" stroke-width="8" stroke-linecap="round" />
    <path d="M250 106 L230 146" stroke="#242424" stroke-width="8" stroke-linecap="round" />
    <path d="M310 106 L290 146" stroke="#242424" stroke-width="8" stroke-linecap="round" />

    <circle cx="256" cy="281" r="44" fill="#242424" />
    <polygon points="246,261 278,281 246,301" fill="#ffffff" />
  </g>
</svg>`;

async function generateAllIcons() {
  const publicDir = path.resolve('public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // 1. Write the clean SVG files
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgString.trim());
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgString.trim());

  // 2. 512x512 app logo icon and PWA icon
  const svgBuffer = Buffer.from(svgString);
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'app_logo_icon.png'));

  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'icon-512.png'));

  // 3. 192x192 PWA icon
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'icon-192.png'));

  // 4. 180x180 Apple touch icon
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // 5. 64x64 favicon.png
  await sharp(svgBuffer)
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));

  // 6. 64x64 favicon.ico (PNG format for favicon.ico)
  await sharp(svgBuffer)
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));

  console.log('Successfully generated all matching grey icons in public directory!');
}

generateAllIcons().catch(console.error);
