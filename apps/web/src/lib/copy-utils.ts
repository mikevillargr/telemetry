/**
 * Copy helpers for Sulu response blocks — tables, SVGs, HTML, plain text.
 */

/** Copy plain text to clipboard */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract tab-separated text from a DOM <table> element.
 * Pasteable directly into Excel / Google Sheets.
 */
export function tableToTSV(tableEl: HTMLTableElement): string {
  const rows: string[] = [];
  for (const row of Array.from(tableEl.rows)) {
    const cells: string[] = [];
    for (const cell of Array.from(row.cells)) {
      cells.push(cell.innerText.replace(/\t/g, ' ').trim());
    }
    rows.push(cells.join('\t'));
  }
  return rows.join('\n');
}

/** Copy a <table> element as tab-separated text */
export async function copyTable(tableEl: HTMLTableElement): Promise<boolean> {
  return copyText(tableToTSV(tableEl));
}

/**
 * Convert an SVG element to a PNG blob via <canvas>.
 * No external dependencies needed.
 */
export function svgToPngBlob(
  svgEl: SVGSVGElement,
  scale = 2,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const w = svgEl.width.baseVal.value || svgEl.clientWidth || 600;
      const h = svgEl.height.baseVal.value || svgEl.clientHeight || 400;
      const canvas = document.createElement('canvas');
      canvas.width = w * scale;
      canvas.height = h * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        resolve(null);
        return;
      }
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        resolve(blob);
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

/** Copy an SVG element as a PNG image to clipboard */
export async function copySvgAsImage(svgEl: SVGSVGElement): Promise<boolean> {
  try {
    const blob = await svgToPngBlob(svgEl);
    if (!blob) return false;
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob }),
    ]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Copy an HTML element as a PNG image to clipboard using html2canvas.
 * Dynamically imports html2canvas to avoid bundling it unless needed.
 */
export async function copyHtmlAsImage(el: HTMLElement): Promise<boolean> {
  try {
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(el, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
    });
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) { resolve(false); return; }
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
          resolve(true);
        } catch {
          resolve(false);
        }
      }, 'image/png');
    });
  } catch {
    return false;
  }
}
