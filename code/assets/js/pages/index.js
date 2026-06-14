const field = document.getElementById('heroField');
if (field) {
  const count = Math.floor(window.innerWidth / 22);
  for (let i = 0; i < count; i++) {
    const s = document.createElement('div');
    s.className = 'stalk';
    const h = 80 + Math.random() * 120;
    s.style.setProperty('--h', h + 'px');
    s.style.animationDelay = (Math.random() * 0.8) + 's';
    s.style.opacity = (0.5 + Math.random() * 0.5).toString();
    field.appendChild(s);
  }
}

function toggleMobileMenu() { alert('Menu mobile — có thể mở rộng sau!'); }
