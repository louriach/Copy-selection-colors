figma.showUI(__html__, { width: 240, height: 240 });

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

// Function to get colors from the selection based on format
function getColors(format: string) {
  const selection = figma.currentPage.selection;
  let colorValues: string[] = [];

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
              // Round the opacity to two decimal places
              const roundedOpacity = Math.round(opacity * 100) / 100;
              colorValue = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${roundedOpacity})`;
              break;
            default:
              colorValue = '';
          }

          if (colorValue) {
            colorValues.push(colorValue);
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

// Handle messages from the UI
figma.ui.onmessage = (msg) => {
  if (msg.type === 'set-format') {
    currentFormat = msg.format; // Update current format
    getColors(currentFormat); // Get colors based on the new format
  }
};