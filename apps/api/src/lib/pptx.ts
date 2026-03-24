import PptxGenJS from 'pptxgenjs';

interface ReportSection {
  type: string;
  title: string;
  content: string;
  agentType?: string;
}

interface PptxOptions {
  reportTitle: string;
  clientName: string;
  createdAt: string;
  sections: ReportSection[];
}

const BRAND = {
  bg: '0A0A0F',
  cardBg: '111118',
  border: '1E1E2E',
  orange: 'E8450A',
  blue: '3B82F6',
  green: '10B981',
  purple: '8B5CF6',
  white: 'FFFFFF',
  muted: '94A3B8',
  text: 'E2E8F0',
};

const AGENT_COLORS: Record<string, string> = {
  data: BRAND.orange,
  strategy: BRAND.green,
  trends: BRAND.purple,
  visualization: BRAND.blue,
};

/**
 * Generate a PPTX buffer from a report's sections.
 */
export async function generatePptx(options: PptxOptions): Promise<Buffer> {
  const { reportTitle, clientName, createdAt, sections } = options;

  const pptx = new PptxGenJS();
  pptx.author = 'Growth Rocket BI';
  pptx.company = 'Growth Rocket';
  pptx.title = reportTitle;
  pptx.subject = `Report for ${clientName}`;

  pptx.defineSlideMaster({
    title: 'BRAND_MASTER',
    background: { color: BRAND.bg },
    objects: [
      {
        rect: { x: 0, y: '93%', w: '100%', h: '7%', fill: { color: BRAND.cardBg } },
      },
      {
        text: {
          text: 'Growth Rocket BI • Confidential',
          options: {
            x: 0.5,
            y: '94%',
            w: 5,
            h: 0.3,
            fontSize: 8,
            color: BRAND.muted,
            fontFace: 'Arial',
          },
        },
      },
    ],
  });

  // --- Cover Slide ---
  const coverSlide = pptx.addSlide({ masterName: 'BRAND_MASTER' });
  coverSlide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: '100%',
    h: '100%',
    fill: { color: BRAND.bg },
  });

  // Orange accent bar
  coverSlide.addShape(pptx.ShapeType.rect, {
    x: 0.5,
    y: 2.2,
    w: 1.5,
    h: 0.06,
    fill: { color: BRAND.orange },
  });

  coverSlide.addText(reportTitle, {
    x: 0.5,
    y: 2.5,
    w: 9,
    h: 1.2,
    fontSize: 32,
    bold: true,
    color: BRAND.white,
    fontFace: 'Arial',
  });

  coverSlide.addText(clientName, {
    x: 0.5,
    y: 3.7,
    w: 9,
    h: 0.5,
    fontSize: 18,
    color: BRAND.orange,
    fontFace: 'Arial',
  });

  const dateStr = new Date(createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  coverSlide.addText(dateStr, {
    x: 0.5,
    y: 4.2,
    w: 9,
    h: 0.4,
    fontSize: 12,
    color: BRAND.muted,
    fontFace: 'Arial',
  });

  // --- Content Slides ---
  for (const section of sections) {
    const accentColor = AGENT_COLORS[section.agentType || ''] || BRAND.orange;

    const slide = pptx.addSlide({ masterName: 'BRAND_MASTER' });

    // Section title bar
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: '100%',
      h: 0.8,
      fill: { color: BRAND.cardBg },
    });

    // Accent line
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0.8,
      w: '100%',
      h: 0.04,
      fill: { color: accentColor },
    });

    slide.addText(section.title, {
      x: 0.5,
      y: 0.15,
      w: 8,
      h: 0.5,
      fontSize: 18,
      bold: true,
      color: BRAND.white,
      fontFace: 'Arial',
    });

    if (section.agentType) {
      const label = section.agentType.charAt(0).toUpperCase() + section.agentType.slice(1) + ' Agent';
      slide.addText(label, {
        x: 8.5,
        y: 0.2,
        w: 1.3,
        h: 0.35,
        fontSize: 8,
        color: accentColor,
        fontFace: 'Arial',
        align: 'right',
      });
    }

    // Strip markdown formatting for clean PPTX text
    const cleanContent = stripMarkdown(section.content);

    // Split long content across multiple slides if needed
    const maxCharsPerSlide = 1800;
    if (cleanContent.length <= maxCharsPerSlide) {
      slide.addText(cleanContent, {
        x: 0.5,
        y: 1.1,
        w: 9,
        h: 4.5,
        fontSize: 11,
        color: BRAND.text,
        fontFace: 'Arial',
        valign: 'top',
        lineSpacingMultiple: 1.3,
        wrap: true,
      });
    } else {
      // First chunk on the current slide
      const firstChunk = cleanContent.substring(0, maxCharsPerSlide);
      const breakPoint = firstChunk.lastIndexOf('\n') > maxCharsPerSlide * 0.5
        ? firstChunk.lastIndexOf('\n')
        : maxCharsPerSlide;

      slide.addText(cleanContent.substring(0, breakPoint), {
        x: 0.5,
        y: 1.1,
        w: 9,
        h: 4.5,
        fontSize: 11,
        color: BRAND.text,
        fontFace: 'Arial',
        valign: 'top',
        lineSpacingMultiple: 1.3,
        wrap: true,
      });

      // Remaining content on continuation slides
      let remaining = cleanContent.substring(breakPoint).trim();
      while (remaining.length > 0) {
        const contSlide = pptx.addSlide({ masterName: 'BRAND_MASTER' });
        contSlide.addText(`${section.title} (cont.)`, {
          x: 0.5,
          y: 0.3,
          w: 9,
          h: 0.5,
          fontSize: 14,
          bold: true,
          color: BRAND.muted,
          fontFace: 'Arial',
        });

        const chunk = remaining.substring(0, maxCharsPerSlide);
        const bp = chunk.length < maxCharsPerSlide
          ? chunk.length
          : (chunk.lastIndexOf('\n') > maxCharsPerSlide * 0.5
            ? chunk.lastIndexOf('\n')
            : maxCharsPerSlide);

        contSlide.addText(remaining.substring(0, bp), {
          x: 0.5,
          y: 1.0,
          w: 9,
          h: 4.6,
          fontSize: 11,
          color: BRAND.text,
          fontFace: 'Arial',
          valign: 'top',
          lineSpacingMultiple: 1.3,
          wrap: true,
        });

        remaining = remaining.substring(bp).trim();
      }
    }
  }

  // Generate buffer
  const output = await pptx.write({ outputType: 'nodebuffer' });
  return output as Buffer;
}

/**
 * Strip common markdown formatting for PPTX plain text.
 */
function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')          // headings
    .replace(/\*\*(.+?)\*\*/g, '$1')      // bold
    .replace(/\*(.+?)\*/g, '$1')          // italic
    .replace(/`{1,3}[^`]*`{1,3}/g, (m) => // code blocks/inline
      m.replace(/`/g, ''),
    )
    .replace(/^\s*[-*+]\s+/gm, '• ')      // list items
    .replace(/^\s*\d+\.\s+/gm, '')        // numbered lists (keep number-less)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/\|/g, ' ')                  // table pipes
    .replace(/^[-:]+$/gm, '')             // table dividers
    .replace(/\n{3,}/g, '\n\n')           // excessive newlines
    .trim();
}
