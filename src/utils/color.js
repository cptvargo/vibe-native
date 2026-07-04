// BlurHash → dominant vibrant colour — pure JS, zero native modules.
//
// Instead of using only the DC (average) component, we decode the full
// BlurHash at a 4×4 virtual grid and score each pixel for vibrancy using
// the same saturation-reward / extreme-lightness-penalty approach as the
// PWA's Canvas-based colorExtract.  This finds coloured regions even when
// the overall average is near-grey.

const B83 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~';

// Pre-built map so each char lookup is O(1), not O(83)
const B83_MAP = Object.fromEntries([...B83].map((c, i) => [c, i]));

function decode83(str, start, end) {
  let v = 0;
  for (let i = start; i < end; i++) v = v * 83 + (B83_MAP[str[i]] ?? 0);
  return v;
}

function linearToSRGB(v) {
  const c = Math.max(0, Math.min(1, v));
  return c <= 0.0031308
    ? Math.round(c * 12.92 * 255 + 0.5)
    : Math.round((1.055 * Math.pow(c, 1 / 2.4) - 0.055) * 255 + 0.5);
}

function sRGBToLinear(v) {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function signPow(v, exp) {
  return Math.sign(v) * Math.pow(Math.abs(v), exp);
}

// Take a pixel's sRGB (0-255) values and pin to a vibrant accent colour by
// preserving the hue and forcing saturation/lightness into a usable range.
// Returns null when the colour is essentially achromatic (< 4% saturation).
export function vibrify(rInt, gInt, bInt) {
  const r = rInt / 255, g = gInt / 255, b = bInt / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const l   = (max + min) / 2;
  const s   = max === min ? 0 : (l > 0.5 ? d / (2 - max - min) : d / (max + min));
  if (s < 0.04) return null;

  const h = (
    max === r ? (g - b) / d + (g < b ? 6 : 0) :
    max === g ? (b - r) / d + 2 :
                (r - g) / d + 4
  ) / 6;

  const ts = 0.80, tl = 0.44;
  const c  = (1 - Math.abs(2 * tl - 1)) * ts;
  const x  = c * (1 - Math.abs((h * 6) % 2 - 1));
  const m  = tl - c / 2;
  const [[r2, g2, b2]] = [[[c,x,0],[x,c,0],[0,c,x],[0,x,c],[x,0,c],[c,0,x]][Math.floor(h * 6) % 6]];
  const hex = v => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${hex(r2)}${hex(g2)}${hex(b2)}`;
}

// Decode the full BlurHash, evaluate at a 4×4 grid, find the most vibrant pixel.
export function blurHashToDominantColor(hash) {
  if (!hash || hash.length < 6) return null;

  try {
    const sizeFlag = decode83(hash, 0, 1);
    const numY     = Math.floor(sizeFlag / 9) + 1;
    const numX     = (sizeFlag % 9) + 2;
    const maxAC    = (decode83(hash, 1, 2) + 1) / 166;

    // Decode DC component (stored as sRGB ints → convert to linear)
    const dcInt = decode83(hash, 2, 6);
    const comps = [[
      sRGBToLinear((dcInt >> 16) & 255),
      sRGBToLinear((dcInt >>  8) & 255),
      sRGBToLinear( dcInt        & 255),
    ]];

    // Decode AC components (linear light, signed)
    for (let i = 1; i < numX * numY; i++) {
      const p = 4 + i * 2;          // position in hash string
      if (p + 2 > hash.length) break;
      const ac = decode83(hash, p, p + 2);
      comps.push([
        signPow((Math.floor(ac / 361) - 9) / 9, 2) * maxAC,
        signPow((Math.floor(ac /  19) % 19 - 9) / 9, 2) * maxAC,
        signPow((ac % 19             - 9) / 9, 2) * maxAC,
      ]);
    }

    // Evaluate the hash at a 4×4 grid of sample points
    const W = 4, H = 4;
    let bestColor = null, bestScore = -Infinity;

    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        let lr = 0, lg = 0, lb = 0, ci = 0;

        for (let cy = 0; cy < numY; cy++) {
          for (let cx = 0; cx < numX; cx++) {
            const basis =
              Math.cos(Math.PI * cx * (px + 0.5) / W) *
              Math.cos(Math.PI * cy * (py + 0.5) / H);
            lr += comps[ci][0] * basis;
            lg += comps[ci][1] * basis;
            lb += comps[ci][2] * basis;
            ci++;
          }
        }

        const ri = linearToSRGB(lr), gi = linearToSRGB(lg), bi = linearToSRGB(lb);

        // Score: reward saturation, penalise extremes (mirrors PWA findVibrant)
        const rf = ri / 255, gf = gi / 255, bf = bi / 255;
        const mx = Math.max(rf, gf, bf), mn = Math.min(rf, gf, bf);
        const ll = (mx + mn) / 2;
        const ss = mx === mn ? 0 : (ll > 0.5 ? (mx - mn) / (2 - mx - mn) : (mx - mn) / (mx + mn));
        const score = ss * 2 - Math.abs(ll - 0.45) * 1.2;

        if (score > bestScore && ll > 0.06 && ll < 0.94 && ss > 0.04) {
          bestScore = score;
          bestColor = [ri, gi, bi];
        }
      }
    }

    // Use the best vibrant pixel found
    if (bestColor) {
      const v = vibrify(bestColor[0], bestColor[1], bestColor[2]);
      if (v) return v;
    }

    // Last resort: attempt to vibrify the raw DC average
    return vibrify((dcInt >> 16) & 255, (dcInt >> 8) & 255, dcInt & 255);
  } catch {
    return null;
  }
}
