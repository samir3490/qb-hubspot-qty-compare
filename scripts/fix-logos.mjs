/**
 * Fix iSee logo PNG: source file has black background with near-black "iSEE" text.
 * Converts background to white and darkens body text for legibility on light UI.
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ASSETS =
  'C:/Users/samir/.cursor/projects/c-Users-samir-OneDrive-Documents-Cursor-AI/assets';
const OUT = path.join(__dirname, '../public/logos');
const ISEE_SRC = path.join(OUT, 'isee-logo.png');
const AGRASEN_SRC = path.join(
  ASSETS,
  'c__Users_samir_AppData_Roaming_Cursor_User_workspaceStorage_fe7bb0377e1cb1a5e495d41372c939de_images_Use_This_Black_and_Orange_Edited_Logo1-a55d0158-6591-428a-a438-1140dcd73937.png'
);

function isCyan(r, g, b) {
  return b > 130 && g > 70 && r < 80;
}

function isNearBlack(r, g, b) {
  return r < 25 && g < 25 && b < 25;
}

function isDarkGray(r, g, b) {
  return r < 110 && g < 110 && b < 110 && !isCyan(r, g, b);
}

async function fixIseeLogo() {
  const { data, info } = await sharp(ISEE_SRC)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (isCyan(r, g, b)) {
      data[i] = 0;
      data[i + 1] = 174;
      data[i + 2] = 239;
      data[i + 3] = 255;
      continue;
    }

    if (isNearBlack(r, g, b)) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = 255;
      continue;
    }

    if (isDarkGray(r, g, b)) {
      data[i] = 35;
      data[i + 1] = 31;
      data[i + 2] = 32;
      data[i + 3] = 255;
    }
  }

  const outPath = path.join(OUT, 'isee-logo-fixed.png');
  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toFile(outPath);

  fs.renameSync(outPath, path.join(OUT, 'isee-logo.png'));

  console.log('Fixed iSee logo -> public/logos/isee-logo.png');
}

async function copyAgrasenLogo() {
  await sharp(AGRASEN_SRC)
    .png()
    .toFile(path.join(OUT, 'agrasen-logo.png'));
  console.log('Copied Agrasen logo -> public/logos/agrasen-logo.png');
}

async function generateFavicons() {
  const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
    <rect width="32" height="32" rx="6" fill="#ffffff"/>
    <circle cx="16" cy="9" r="5.5" fill="#00aeef"/>
    <rect x="12.5" y="15" width="7" height="13" rx="1.5" fill="#231f20"/>
  </svg>`;

  const iconBuf = Buffer.from(iconSvg);

  await sharp(iconBuf).resize(32, 32).png().toFile('src/app/icon.png');
  await sharp(iconBuf).resize(32, 32).png().toFile('public/favicon.ico');
  await sharp(path.join(OUT, 'isee-logo.png'))
    .resize(180, 180, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toFile('src/app/apple-icon.png');

  console.log('Regenerated favicons');
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  await fixIseeLogo();

  if (fs.existsSync(AGRASEN_SRC)) {
    await copyAgrasenLogo();
  } else {
    console.warn('Agrasen source not in assets; keep existing PNG if present');
  }

  await generateFavicons();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
