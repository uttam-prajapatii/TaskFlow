import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fontsDir = path.join(__dirname, 'public', 'fonts');
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

const fonts = [
  {
    url: 'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.1.1/files/inter-latin-400-normal.woff2',
    dest: 'inter-latin-400.woff2',
  },
  {
    url: 'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.1.1/files/inter-latin-500-normal.woff2',
    dest: 'inter-latin-500.woff2',
  },
  {
    url: 'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.1.1/files/inter-latin-600-normal.woff2',
    dest: 'inter-latin-600.woff2',
  },
  {
    url: 'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.1.1/files/inter-latin-700-normal.woff2',
    dest: 'inter-latin-700.woff2',
  },
  {
    url: 'https://cdn.jsdelivr.net/npm/@fontsource/space-grotesk@5.1.1/files/space-grotesk-latin-500-normal.woff2',
    dest: 'space-grotesk-latin-500.woff2',
  },
  {
    url: 'https://cdn.jsdelivr.net/npm/@fontsource/space-grotesk@5.1.1/files/space-grotesk-latin-600-normal.woff2',
    dest: 'space-grotesk-latin-600.woff2',
  },
  {
    url: 'https://cdn.jsdelivr.net/npm/@fontsource/space-grotesk@5.1.1/files/space-grotesk-latin-700-normal.woff2',
    dest: 'space-grotesk-latin-700.woff2',
  },
];

async function main() {
  console.log('Downloading fonts via fetch...');
  for (const font of fonts) {
    const destPath = path.join(fontsDir, font.dest);
    const res = await fetch(font.url);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${font.url}: ${res.statusText}`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(destPath, buffer);
    console.log(`Saved ${font.dest} (${buffer.length} bytes)`);
  }
  console.log('Finished downloading all fonts.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
