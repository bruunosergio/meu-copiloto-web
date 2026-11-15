import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { parseReceivables, type ParsedReport, type TextToken } from './parse-report';

GlobalWorkerOptions.workerSrc = workerSrc;

type TextItemLike = {
  str: string;
  transform: number[];
};

function isTextItem(item: unknown): item is TextItemLike {
  if (!item || typeof item !== 'object') return false;
  return 'str' in item && 'transform' in item;
}

export function pdfBytes(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, 1024));
  const start = head.indexOf('%PDF-');
  if (start < 0) return null;
  return start === 0 ? bytes : bytes.subarray(start);
}

export async function extractReport(buffer: ArrayBuffer): Promise<ParsedReport> {
  const data = pdfBytes(buffer);
  if (!data) {
    throw new Error('Esse arquivo não é um PDF válido. No Shop Control, salve o relatório como PDF.');
  }
  let doc: Awaited<ReturnType<typeof getDocument>['promise']>;
  try {
    doc = await getDocument({ data, verbosity: 0, isEvalSupported: false }).promise;
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (/password/i.test(message)) {
      throw new Error('Esse PDF pede senha. Exporte de novo, sem senha.');
    }
    throw new Error('Esse arquivo não é um PDF válido. No Shop Control, salve o relatório como PDF.');
  }
  try {
    const pages: TextToken[][] = [];
    for (let index = 1; index <= doc.numPages; index += 1) {
      const page = await doc.getPage(index);
      const content = await page.getTextContent();
      const tokens: TextToken[] = [];
      for (const item of content.items) {
        if (!isTextItem(item)) continue;
        const text = item.str.trim();
        if (!text) continue;
        tokens.push({ x: item.transform[4], y: item.transform[5], t: text });
      }
      pages.push(tokens);
    }
    const textCount = pages.reduce((total, page) => total + page.length, 0);
    if (textCount < 8) {
      throw new Error(
        'O PDF abriu, mas está sem texto. Use a exportação em PDF do Shop Control, não uma foto da tela.',
      );
    }
    const report = parseReceivables(pages);
    const broken = report.clients.filter((client) => {
      const summed = Math.round(client.docs.reduce((total, doc) => total + doc.valor, 0) * 100) / 100;
      return client.docs.length === 0 || Math.abs(summed - client.total) > 0.05;
    });
    if (broken.length > 0) {
      throw new Error(
        `Li o PDF, mas ${broken.length} cliente(s) não fecharam o total impresso. Use o relatório Recebíveis em Aberto por Cliente.`,
      );
    }
    return report;
  } finally {
    const cleanup = doc as { destroy?: () => Promise<void> | void };
    if (typeof cleanup.destroy === 'function') await cleanup.destroy();
  }
}
