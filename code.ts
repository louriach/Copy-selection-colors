figma.showUI(__html__, { width: 240, height: 320 });

// Parse hex or rgba string to { r, g, b, a } in 0–1 range for Figma
function parseColorValue(value: string): { r: number; g: number; b: number; a: number } | null {
  const trimmed = value.trim();
  const hexMatch = trimmed.match(/^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/);
  if (hexMatch) {
    const r = parseInt(hexMatch[1].slice(0, 2), 16) / 255;
    const g = parseInt(hexMatch[1].slice(2, 4), 16) / 255;
    const b = parseInt(hexMatch[1].slice(4, 6), 16) / 255;
    const a = hexMatch[2] ? parseInt(hexMatch[2], 16) / 255 : 1;
    return { r, g, b, a };
  }
  const rgbaMatch = trimmed.match(/^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/);
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1], 10) / 255,
      g: parseInt(rgbaMatch[2], 10) / 255,
      b: parseInt(rgbaMatch[3], 10) / 255,
      a: rgbaMatch[4] != null ? parseFloat(rgbaMatch[4]) : 1,
    };
  }
  return null;
}

// Function to convert RGB to Hex
function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }).join('');
}

// Function to convert Alpha (0 to 1) to 2-digit Hex
function alphaToHex(a: number): string {
  const alphaHex = Math.round(a * 255).toString(16);
  return alphaHex.length === 1 ? "0" + alphaHex : alphaHex;
}

// Function to convert RGB to RGBA
function rgbToRgba(r: number, g: number, b: number, a: number): string {
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a.toFixed(2)})`;
}

// Function to get colors from the selection based on format
function getColors(format: string) {
  const selection = figma.currentPage.selection;
  let colorValues: { name: string, value: string }[] = [];

  selection.forEach((node) => {
    if ("fills" in node && Array.isArray(node.fills)) {
      const fills = node.fills as Paint[];
      fills.forEach(fill => {
        if (fill.type === 'SOLID') {
          const { r, g, b } = fill.color;
          const opacity = fill.opacity !== undefined ? fill.opacity : 1;
          let colorValue: string;

          switch (format) {
            case 'hex':
              colorValue = rgbToHex(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255));
              if (opacity < 1) {
                colorValue += alphaToHex(opacity);
              }
              break;
            case 'rgba':
              colorValue = rgbToRgba(r, g, b, opacity);
              break;
            default:
              colorValue = '';
          }

          if (colorValue) {
            colorValues.push({ name: node.name, value: colorValue });
          }
        }
      });
    }
  });

  figma.ui.postMessage({ type: 'colors-in-format', colorValues });
}

// Listen for selection changes
let currentFormat = 'hex'; // Default format

figma.on('selectionchange', () => {
  getColors(currentFormat); // Get colors based on the current format
});

// Create a frame on the canvas with autolayout listing each color (name + value) and a swatch
async function createFrameFromColors(colorValues: { name: string; value: string }[]) {
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });

  const frame = figma.createFrame();
  frame.name = 'Colors';
  frame.layoutMode = 'VERTICAL';
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'AUTO';
  frame.paddingLeft = 16;
  frame.paddingRight = 16;
  frame.paddingTop = 16;
  frame.paddingBottom = 16;
  frame.itemSpacing = 10;
  frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: 1 }];
  frame.cornerRadius = 8;
  frame.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0.1 }];
  frame.strokeWeight = 1;

  for (const item of colorValues) {
    const row = figma.createFrame();
    row.name = item.name;
    row.layoutMode = 'HORIZONTAL';
    row.primaryAxisSizingMode = 'AUTO';
    row.counterAxisSizingMode = 'AUTO';
    row.itemSpacing = 12;
    row.counterAxisAlignItems = 'CENTER';
    row.fills = [];

    // Color swatch
    const swatch = figma.createRectangle();
    swatch.name = 'swatch';
    swatch.resize(24, 24);
    swatch.cornerRadius = 4;
    swatch.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0.15 }];
    swatch.strokeWeight = 1;
    const parsed = parseColorValue(item.value);
    if (parsed) {
      swatch.fills = [{ type: 'SOLID', color: { r: parsed.r, g: parsed.g, b: parsed.b }, opacity: parsed.a }];
    } else {
      swatch.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 }, opacity: 1 }];
    }
    row.appendChild(swatch);

    // Title (name from JSON)
    const nameText = figma.createText();
    nameText.fontName = { family: 'Inter', style: 'Medium' };
    nameText.fontSize = 12;
    nameText.characters = item.name;
    nameText.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 }, opacity: 1 }];
    row.appendChild(nameText);

    // Value (color code)
    const valueText = figma.createText();
    valueText.fontName = { family: 'Inter', style: 'Regular' };
    valueText.fontSize = 11;
    valueText.characters = item.value;
    valueText.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 }, opacity: 1 }];
    row.appendChild(valueText);

    frame.appendChild(row);
  }

  frame.x = figma.viewport.center.x - frame.width / 2;
  frame.y = figma.viewport.center.y - frame.height / 2;

  figma.currentPage.appendChild(frame);
  figma.currentPage.selection = [frame];
  figma.viewport.scrollAndZoomIntoView([frame]);
}

// Handle messages from the UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'set-format') {
    currentFormat = msg.format; // Update current format
    getColors(currentFormat); // Get colors based on the new format
  } else if (msg.type === 'create-frame' && Array.isArray(msg.colorValues)) {
    await createFrameFromColors(msg.colorValues as { name: string; value: string }[]);
  }
};