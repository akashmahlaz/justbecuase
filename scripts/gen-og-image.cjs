const fs = require('fs');

const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a"/>
      <stop offset="50%" style="stop-color:#1e293b"/>
      <stop offset="100%" style="stop-color:#0f766e"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1100" cy="-50" r="200" fill="rgba(34,211,238,0.08)"/>
  <circle cx="50" cy="680" r="150" fill="rgba(15,118,110,0.15)"/>
  <text x="600" y="220" text-anchor="middle" font-family="system-ui,sans-serif" font-size="58" font-weight="800" fill="white" letter-spacing="-1">JustBeCause Network</text>
  <text x="600" y="275" text-anchor="middle" font-family="system-ui,sans-serif" font-size="26" font-weight="600" fill="#22d3ee">Skills-Based Impact Platform</text>
  <text x="600" y="340" text-anchor="middle" font-family="system-ui,sans-serif" font-size="20" fill="#94a3b8">Connect your skills with meaningful causes. Join thousands of</text>
  <text x="600" y="370" text-anchor="middle" font-family="system-ui,sans-serif" font-size="20" fill="#94a3b8">professionals making an impact worldwide.</text>
  <rect x="310" y="420" width="580" height="80" rx="12" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
  <text x="430" y="455" text-anchor="middle" font-family="system-ui,sans-serif" font-size="26" font-weight="700" fill="#22d3ee">1000+</text>
  <text x="430" y="480" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" fill="#94a3b8">Impact Agents</text>
  <text x="600" y="455" text-anchor="middle" font-family="system-ui,sans-serif" font-size="26" font-weight="700" fill="#22d3ee">500+</text>
  <text x="600" y="480" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" fill="#94a3b8">NGO Projects</text>
  <text x="770" y="455" text-anchor="middle" font-family="system-ui,sans-serif" font-size="26" font-weight="700" fill="#22d3ee">6</text>
  <text x="770" y="480" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" fill="#94a3b8">Languages</text>
</svg>`;

fs.writeFileSync('public/og-image.svg', svg);
console.log('Created public/og-image.svg (1200x630)');
