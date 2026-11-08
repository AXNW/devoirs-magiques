// Effets visuels : étincelles autour d'un élément, pluie d'étoiles plein écran.

const SPARKS = ['✨', '⭐', '🌟', '💫'];

export function sparkle(target, count = 14) {
  const rect = target.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  for (let i = 0; i < count; i++) {
    const s = document.createElement('span');
    s.className = 'spark';
    s.textContent = SPARKS[i % SPARKS.length];
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const dist = 80 + Math.random() * 90;
    s.style.left = `${cx}px`;
    s.style.top = `${cy}px`;
    s.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    s.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
    document.body.append(s);
    s.addEventListener('animationend', () => s.remove());
  }
}

export function celebrate(count = 50) {
  const items = ['⭐', '🌟', '✨', '💎', '🎩', '🐾', '🌙'];
  for (let i = 0; i < count; i++) {
    const s = document.createElement('span');
    s.className = 'confetti';
    s.textContent = items[i % items.length];
    s.style.left = `${Math.random() * 100}vw`;
    s.style.animationDelay = `${Math.random() * 0.8}s`;
    s.style.animationDuration = `${2.2 + Math.random() * 1.6}s`;
    s.style.fontSize = `${18 + Math.random() * 22}px`;
    document.body.append(s);
    s.addEventListener('animationend', () => s.remove());
  }
}
