import puppeteer from "puppeteer";
import { marked } from "marked";
import katex from "katex";

/**
 * Protect math delimiters from marked, render them with KaTeX (MathML output),
 * then restore into the marked-processed HTML.
 */
function renderMath(markdown: string): [string, string[]] {
  const blocks: string[] = [];

  // Display math: $$...$$
  markdown = markdown.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
    const idx = blocks.length;
    try {
      blocks.push(
        `<div class="math-display">${katex.renderToString(math.trim(), { displayMode: true, throwOnError: false, output: "mathml" })}</div>`
      );
    } catch {
      blocks.push(`<pre class="math-error">${math}</pre>`);
    }
    return `MATHBLOCK_${idx}_END`;
  });

  // Inline math: $...$
  markdown = markdown.replace(/\$([^$\n]+?)\$/g, (_, math) => {
    const idx = blocks.length;
    try {
      blocks.push(
        katex.renderToString(math.trim(), { displayMode: false, throwOnError: false, output: "mathml" })
      );
    } catch {
      blocks.push(`<code class="math-error">${math}</code>`);
    }
    return `MATHBLOCK_${idx}_END`;
  });

  return [markdown, blocks];
}

/**
 * Convert a Markdown string into a styled PDF buffer.
 */
export async function markdownToPdf(markdown: string): Promise<Buffer> {
  const [protectedMd, mathBlocks] = renderMath(markdown);
  let htmlBody = await marked(protectedMd) as string;
  // Restore rendered math
  htmlBody = htmlBody.replace(/MATHBLOCK_(\d+)_END/g, (_, idx) => mathBlocks[parseInt(idx)]);

  const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { margin: 2.5cm 2cm; }
  body {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.65;
    color: #1a1a2e;
    max-width: 100%;
  }
  h1 {
    font-size: 22pt;
    font-weight: 700;
    color: #1a1a2e;
    border-bottom: 2px solid #7c5cfc;
    padding-bottom: 8px;
    margin-top: 0;
  }
  h2 {
    font-size: 16pt;
    font-weight: 600;
    color: #2d2d4e;
    margin-top: 28px;
    border-bottom: 1px solid #e0e0e8;
    padding-bottom: 4px;
  }
  h3 {
    font-size: 13pt;
    font-weight: 600;
    color: #3a3a5a;
    margin-top: 20px;
  }
  blockquote {
    border-left: 3px solid #7c5cfc;
    padding: 8px 16px;
    margin: 16px 0;
    background: #f8f7ff;
    color: #444;
    font-size: 10pt;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    font-size: 10pt;
  }
  th, td {
    border: 1px solid #d0d0dc;
    padding: 8px 12px;
    text-align: left;
  }
  th {
    background: #f0f0f8;
    font-weight: 600;
  }
  code {
    font-family: 'SF Mono', 'Fira Code', monospace;
    background: #f4f4f8;
    padding: 2px 5px;
    border-radius: 3px;
    font-size: 9.5pt;
  }
  pre {
    background: #f4f4f8;
    padding: 14px;
    border-radius: 6px;
    overflow-x: auto;
    font-size: 9.5pt;
    line-height: 1.5;
  }
  pre code {
    background: none;
    padding: 0;
  }
  ul, ol { padding-left: 24px; }
  li { margin-bottom: 4px; }
  hr { border: none; border-top: 1px solid #e0e0e8; margin: 24px 0; }
  strong { color: #1a1a2e; }
  h1, h2, h3, h4, h5, h6 {
    break-after: avoid;
    page-break-after: avoid;
  }
  .math-display { margin: 18px 0; text-align: center; overflow-x: auto; }
  math { font-size: 12pt; }
  .math-error { color: #c0392b; background: #fff0f0; padding: 4px 8px; border-radius: 4px; }
</style>
</head>
<body>
${htmlBody}
</body>
</html>`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
