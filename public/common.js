// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');
if (navToggle && navMenu) {
  const syncMenuForViewport = () => {
    if (window.matchMedia('(min-width: 768px)').matches) {
      navMenu.classList.remove('is-open');
      navMenu.style.display = '';
      navMenu.style.flexWrap = '';
      navToggle.setAttribute('aria-expanded', 'false');
    }
  };

  navToggle.addEventListener('click', () => {
    const open = navMenu.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(open));
  });

  window.addEventListener('resize', syncMenuForViewport);
  syncMenuForViewport();
}

// Active link highlight on scroll
const links = Array.from(document.querySelectorAll('.nav-link[href^="#"]'));
const targets = links.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
const linkMap = new Map(targets.map((el, i) => [el.id, links[i]]));
const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const link = linkMap.get(entry.target.id);
    if (!link) return;
    if (entry.isIntersecting) {
      links.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    }
  });
}, { rootMargin: '-40% 0px -55% 0px', threshold: 0.01 });
targets.forEach(t => io.observe(t));
