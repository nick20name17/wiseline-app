export const printCSS = `
  @page { size: 7in 3.5in; margin: 0; }
  @media print {
    html, body { height: 100%; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    #sticker { width: 7in; height: 3.5in; border-radius:0; border:none }
  }
`
