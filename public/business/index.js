// === Growth chart data (replace with real values when確定) ===
const growthData = [
  { year: 2020, value: 54 }, // 2023=100を基準に後方推計
  { year: 2021, value: 66 },
  { year: 2022, value: 81 },
  { year: 2023, value: 100 }, // 実数アンカー: 2023年 世界のLive Streaming市場 USD 87.55B (GVR)
  { year: 2024, value: 123 }, // CAGR 23%で前方推計
  { year: 2025, value: 151 }
];

(function renderGrowthChart() {
  const svg = document.getElementById('growthChart');
  if (!svg) return;
  const W = 600, H = 320;
  const pad = { left: 48, right: 40, top: 40, bottom: 60 };
  const plotW = W - pad.left - pad.right;
  const plotH = 260 - pad.top + 20; // top axis at y=40, bottom at y=260

  const years = growthData.map(d => d.year);
  const vals = growthData.map(d => d.value);
  const minY = Math.min(...vals);
  const maxY = Math.max(...vals);

  // scales
  const x = (i) => pad.left + (plotW) * (i / (growthData.length - 1));
  const y = (v) => {
    // invert: higher value -> smaller y
    const t = (v - minY) / (maxY - minY || 1);
    return 260 - t * (220); // 40..260 area
  };

  // polyline points
  const pts = growthData.map((d, i) => `${x(i)},${y(d.value)}`).join(' ');
  svg.querySelector('#growthLine').setAttribute('points', pts);

  // area path
  const areaTop = `M${x(0)},260 L${x(0)},${y(growthData[0].value)} ` +
    growthData.map((d, i) => `${x(i)},${y(d.value)}`).join(' ') + ` L${x(growthData.length - 1)},260 Z`;
  svg.querySelector('#growthArea').setAttribute('d', areaTop);

  // x labels
  const labels = svg.querySelector('#xlabels');
  labels.innerHTML = '';
  years.forEach((yr, i) => {
    const tx = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    tx.setAttribute('x', x(i));
    tx.setAttribute('y', 280);
    tx.setAttribute('text-anchor', 'middle');
    tx.textContent = yr;
    labels.appendChild(tx);
  });
})();