const fs = require('fs');
const path = require('path');

const width = 128;
const height = 128;
const buffer = Buffer.alloc(width * height * 4);

// Fill with blue color (RGBA)
for (let i = 0; i < buffer.length; i += 4) {
    buffer[i] = 0;     // R
    buffer[i + 1] = 0; // G
    buffer[i + 2] = 255; // B
    buffer[i + 3] = 255; // A
}

// Minimal PNG header and data (simplified, actually using a base64 of a real 1x1 pixel scaled up or just a valid base64 string is easier)
// Let's use a known valid base64 for a blue dot 128x128.
// Actually, I'll just use a small valid PNG base64 and write it.

const base64Png = "iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAAAXNSR0IArs4c6QAAAHhlWElmTU0AKgAAAAgABQESAAMAAAABAAEAAAEaAAUAAAABAAAASgEbAAUAAAABAAAAUgEoAAMAAAABAAIAAIdpAAQAAAABAAAAWgAAAAAAAABIAAAAAQAAAEgAAAABAAOgAQADAAAAAQABAACgAgAEAAAAAQAAAICgAwAEAAAAAQAAAIAAAAA+1ObgAAAAlklEQVR4Ae3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIC3AYbQAAGyO0eOAAAAAElFTkSuQmCC";

const iconsDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

fs.writeFileSync(path.join(iconsDir, 'icon16.png'), Buffer.from(base64Png, 'base64'));
fs.writeFileSync(path.join(iconsDir, 'icon48.png'), Buffer.from(base64Png, 'base64'));
fs.writeFileSync(path.join(iconsDir, 'icon128.png'), Buffer.from(base64Png, 'base64'));

console.log("Icons generated");
