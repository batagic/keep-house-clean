/**
 * Nav & footer đồng bộ toàn site — sửa menu tại đây, áp dụng cho mọi trang.
 */
(function () {
  const NAV_ITEMS = [
    { href: 'index.html',   label: 'Trang Chủ', page: 'index' },
    { href: 'kho-qua.html', label: 'Kho Quà',   page: 'kho-qua' },
    { href: 'quy-doi.html', label: 'Quy Đổi',   page: 'quy-doi' },
    { href: 'nhat-ky.html', label: 'Nhật Ký',   page: 'nhat-ky' },
    { href: 'print.html',   label: '🖨️ In',     page: 'print' },
  ];

  const FOOTER_ITEMS = NAV_ITEMS;

  function renderSiteNav() {
    const el = document.getElementById('mainNav');
    if (!el) return;

    const current = el.dataset.page || '';
    const printBtn = el.dataset.printBtn === 'true';
    const showMobile = el.dataset.mobile !== 'false';

    const links = NAV_ITEMS.map(({ href, label, page }) => {
      const cls = page === current ? ' class="active"' : '';
      return `<li><a href="${href}"${cls}>${label}</a></li>`;
    }).join('\n    ');

    const extra = printBtn
      ? `<button type="button" class="nav-btn" onclick="window.print()"><i class="fas fa-print"></i> In Bản Này</button>`
      : (showMobile
        ? `<button type="button" class="nav-mobile-btn" aria-label="Menu" onclick="typeof toggleMobileMenu==='function'&&toggleMobileMenu()">☰</button>`
        : '');

    el.innerHTML = `
  <a href="index.html" class="nav-logo">
    <span class="logo-icon">🌾</span>
    Kho Thóc Gia Đình
  </a>
  <ul class="nav-links">
    ${links}
    <li><a href="quy-doi.html" class="nav-cta">🌾 Tính Gạo</a></li>
  </ul>
  ${extra}`;
  }

  function renderSiteFooter() {
    const el = document.getElementById('siteFooter');
    if (!el) return;

    const links = FOOTER_ITEMS.map(({ href, label }) =>
      `<a href="${href}">${label}</a>`
    ).join('\n      ');

    el.innerHTML = `
  <div class="footer-inner">
    <div class="footer-brand">
      <a href="index.html">🌾 Kho Thóc Gia Đình</a>
      <p class="footer-copy" style="margin-top:.3rem">Gamification dành cho gia đình hiện đại</p>
    </div>
    <nav class="footer-nav" aria-label="Liên kết trang">
      ${links}
    </nav>
    <p class="footer-copy">© 2024 Kho Thóc Gia Đình · Tạo ra để kết nối & thấu hiểu ❤️</p>
  </div>`;
  }

  renderSiteNav();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderSiteFooter);
  } else {
    renderSiteFooter();
  }
})();
