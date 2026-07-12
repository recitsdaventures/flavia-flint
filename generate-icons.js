const { createCanvas } = require('canvas');
const fs = require('fs');

function drawCompass(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.35;

  // Fond vert foncé arrondi
  ctx.fillStyle = '#2D4A2D';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.22);
  ctx.fill();

  // Cercle boussole beige
  ctx.fillStyle = '#F5EDD8';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Bordure cercle
  ctx.strokeStyle = '#8B6010';
  ctx.lineWidth = size * 0.008;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.9, 0, Math.PI * 2);
  ctx.stroke();

  // Aiguille Nord terracotta
  ctx.fillStyle = '#C4622D';
  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 0.75);
  ctx.lineTo(cx - r * 0.12, cy);
  ctx.lineTo(cx, cy - r * 0.2);
  ctx.lineTo(cx + r * 0.12, cy);
  ctx.closePath();
  ctx.fill();

  // Aiguille Sud dorée
  ctx.fillStyle = '#8B6010';
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.moveTo(cx, cy + r * 0.75);
  ctx.lineTo(cx - r * 0.1, cy);
  ctx.lineTo(cx, cy + r * 0.2);
  ctx.lineTo(cx + r * 0.1, cy);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // Centre
  ctx.fillStyle = '#2D4A2D';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#E8A020';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.04, 0, Math.PI * 2);
  ctx.fill();

  // Lettre N
  ctx.fillStyle = '#2D4A2D';
  ctx.font = `bold ${size * 0.12}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('N', cx, cy - r * 0.6);

  return canvas;
}

// Générer les deux tailles
[192, 512].forEach(size => {
  const canvas = drawCompass(size);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`icon-${size}.png`, buffer);
  console.log(`✅ icon-${size}.png créé`);
});
