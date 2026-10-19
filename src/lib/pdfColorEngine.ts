// Color conversion utilities to parse and convert oklab/oklch/color() colors to standard rgb/rgba,
// which prevents crashes in html2canvas (used by html2pdf.js) under Tailwind CSS v4.

let colorCanvas: HTMLCanvasElement | null = null;
let colorCtx: CanvasRenderingContext2D | null = null;

export function cssColorToRgb(colorStr: string): string {
  if (typeof window === 'undefined') return colorStr;
  try {
    if (!colorCanvas) {
      colorCanvas = document.createElement('canvas');
      colorCanvas.width = 1;
      colorCanvas.height = 1;
      colorCtx = colorCanvas.getContext('2d', { willReadFrequently: true });
    }
    if (colorCtx) {
      colorCtx.clearRect(0, 0, 1, 1);
      colorCtx.fillStyle = '#000000';
      colorCtx.fillStyle = colorStr;
      colorCtx.fillRect(0, 0, 1, 1);
      const data = colorCtx.getImageData(0, 0, 1, 1).data;
      const alpha = +(data[3] / 255).toFixed(2);
      if (alpha === 1) {
        return `rgb(${data[0]}, ${data[1]}, ${data[2]})`;
      } else {
        return `rgba(${data[0]}, ${data[1]}, ${data[2]}, ${alpha})`;
      }
    }
  } catch (e) {
    // fallback
  }
  return colorStr;
}

export function oklabToRgb(l_val: number, a_val: number, b_val: number): { r: number; g: number; b: number } {
  const l = l_val + 0.3963377774 * a_val + 0.2158037573 * b_val;
  const m = l_val - 0.1055613458 * a_val - 0.0638541728 * b_val;
  const s = l_val - 0.0894841775 * a_val - 1.2914855480 * b_val;

  const l_3 = l * l * l;
  const m_3 = m * m * m;
  const s_3 = s * s * s;

  const r_lin = +4.0767416621 * l_3 - 3.3077115913 * m_3 + 0.2309699292 * s_3;
  const g_lin = -1.2684380046 * l_3 + 2.6097574011 * m_3 - 0.3413193965 * s_3;
  const b_lin = -0.0041960863 * l_3 - 0.7034186147 * m_3 + 1.7076147010 * s_3;

  const gamma = (c: number) => {
    return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  };

  const r_res = Math.round(Math.max(0, Math.min(1, gamma(r_lin))) * 255);
  const g_res = Math.round(Math.max(0, Math.min(1, gamma(g_lin))) * 255);
  const b_res = Math.round(Math.max(0, Math.min(1, gamma(b_lin))) * 255);

  return { r: r_res, g: g_res, b: b_res };
}

export function convertOklabStringToRgb(oklabStr: string): string {
  const match = oklabStr.match(/oklab\(([^)]+)\)/);
  if (!match) return oklabStr;

  const partsStr = match[1].trim();
  const parts = partsStr.split(/[\s,/]+/);
  if (parts.length < 3) return oklabStr;

  const parseVal = (str: string, base: number = 1) => {
    if (str.endsWith('%')) {
      return (parseFloat(str) / 100) * base;
    }
    return parseFloat(str);
  };

  let l_val = parseVal(parts[0], 1);
  if (l_val > 1 && !parts[0].endsWith('%')) {
    l_val = l_val / 100;
  }

  const a_val = parseVal(parts[1], 1);
  const b_val = parseVal(parts[2], 1);

  const alphaStr = parts[3];
  const alpha = alphaStr !== undefined ? parseVal(alphaStr, 1) : 1;

  const { r, g, b } = oklabToRgb(l_val, a_val, b_val);

  if (alpha === 1) {
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}

export function oklchToRgb(l_val: number, c_val: number, h_val: number): { r: number; g: number; b: number } {
  // h_val is in degrees, convert to radians
  const h_rad = (h_val * Math.PI) / 180;
  const a = c_val * Math.cos(h_rad);
  const b = c_val * Math.sin(h_rad);

  const l = l_val + 0.3963377774 * a + 0.2158037573 * b;
  const m = l_val - 0.1055613458 * a - 0.0638541728 * b;
  const s = l_val - 0.0894841775 * a - 1.2914855480 * b;

  const l_3 = l * l * l;
  const m_3 = m * m * m;
  const s_3 = s * s * s;

  const r_lin = +4.0767416621 * l_3 - 3.3077115913 * m_3 + 0.2309699292 * s_3;
  const g_lin = -1.2684380046 * l_3 + 2.6097574011 * m_3 - 0.3413193965 * s_3;
  const b_lin = -0.0041960863 * l_3 - 0.7034186147 * m_3 + 1.7076147010 * s_3;

  const gamma = (c: number) => {
    return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  };

  const r_val = Math.round(Math.max(0, Math.min(1, gamma(r_lin))) * 255);
  const g_val = Math.round(Math.max(0, Math.min(1, gamma(g_lin))) * 255);
  const b_val = Math.round(Math.max(0, Math.min(1, gamma(b_lin))) * 255);

  return { r: r_val, g: g_val, b: b_val };
}

export function convertOklchStringToRgb(oklchStr: string): string {
  const match = oklchStr.match(/oklch\(([^)]+)\)/);
  if (!match) return oklchStr;

  const partsStr = match[1].trim();
  const parts = partsStr.split(/[\s,/]+/);
  if (parts.length < 3) return oklchStr;

  const parseVal = (str: string, base: number = 1) => {
    if (str.endsWith('%')) {
      return (parseFloat(str) / 100) * base;
    }
    return parseFloat(str);
  };

  let l_val = parseVal(parts[0], 1);
  if (l_val > 1 && !parts[0].endsWith('%')) {
    l_val = l_val / 100;
  }

  const c_val = parseVal(parts[1], 1);
  const h_val = parseVal(parts[2], 1);

  const alphaStr = parts[3];
  const alpha = alphaStr !== undefined ? parseVal(alphaStr, 1) : 1;

  const { r, g, b } = oklchToRgb(l_val, c_val, h_val);

  if (alpha === 1) {
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}

export function replaceUnsupportedColorsWithRgb(str: string): string {
  if (typeof str !== 'string') return str;
  if (!str.includes('oklch') && !str.includes('oklab') && !str.includes('color(')) return str;

  return str.replace(/(oklab|oklch|color)\([^)]+\)/g, (match) => {
    try {
      const converted = cssColorToRgb(match);
      if (converted && converted.startsWith('rgb')) {
        return converted;
      }
      if (match.startsWith('oklab')) {
        return convertOklabStringToRgb(match);
      }
      if (match.startsWith('oklch')) {
        return convertOklchStringToRgb(match);
      }
    } catch (e) {
      console.warn('Failed to parse/convert color:', match, e);
    }
    return match;
  });
}

export function preprocessElementStylesForPdf(element: HTMLElement): () => void {
  const originalStyles = new Map<HTMLElement, string>();
  const colorProperties = [
    'color',
    'backgroundColor',
    'borderColor',
    'borderTopColor',
    'borderRightColor',
    'borderBottomColor',
    'borderLeftColor',
    'outlineColor',
    'textDecorationColor',
    'boxShadow',
    'fill',
    'stroke'
  ];

  try {
    const elements = [element, ...Array.from(element.querySelectorAll('*'))] as HTMLElement[];
    for (const el of elements) {
      if (!el.style) continue;
      const computed = window.getComputedStyle(el);
      let changed = false;
      for (const prop of colorProperties) {
        try {
          const val = computed[prop as any];
          if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab') || val.includes('color('))) {
            const converted = replaceUnsupportedColorsWithRgb(val);
            if (converted && converted !== val) {
              if (!changed) {
                originalStyles.set(el, el.getAttribute('style') || '');
                changed = true;
              }
              el.style[prop as any] = converted;
            }
          }
        } catch (e) {
          // ignore individual property errors
        }
      }
    }
  } catch (err) {
    console.warn('Failed to preprocess oklab/oklch styles on elements:', err);
  }

  return () => {
    for (const [el, style] of originalStyles.entries()) {
      try {
        if (style) {
          el.setAttribute('style', style);
        } else {
          el.removeAttribute('style');
        }
      } catch (e) {
        // ignore restore errors
      }
    }
  };
}
