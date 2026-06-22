// Dependency-free single-page PDF generator for plain ASCII text (Helvetica 11pt, US Letter).
// Normalises to ASCII so JS string length == UTF-8 byte length, keeping xref offsets valid.
export function buildSimplePdf(rawText: string): string {
  const text = rawText
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[^\x00-\x7F]/g, '');
  const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const maxChars = 92;
  const wrapped: string[] = [];
  for (const line of text.replace(/\r/g, '').split('\n')) {
    if (line.length <= maxChars) { wrapped.push(line); continue; }
    let s = line;
    while (s.length > maxChars) {
      let cut = s.lastIndexOf(' ', maxChars);
      if (cut <= 0) cut = maxChars;
      wrapped.push(s.slice(0, cut));
      s = s.slice(cut).replace(/^\s+/, '');
    }
    wrapped.push(s);
  }
  let content = 'BT\n/F1 11 Tf\n15 TL\n72 740 Td\n';
  for (const ln of wrapped) content += `(${escape(ln)}) Tj\nT*\n`;
  content += 'ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach(off => { pdf += String(off).padStart(10, '0') + ' 00000 n \n'; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return pdf;
}

export function downloadPdf(filename: string, text: string) {
  const blob = new Blob([buildSimplePdf(text)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
