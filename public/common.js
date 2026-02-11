// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');
if (navToggle && navMenu) {
  navToggle.addEventListener('click', () => {
    const open = navMenu.style.display === 'flex';
    navMenu.style.display = open ? 'none' : 'flex';
    navMenu.style.flexWrap = 'wrap';
    navToggle.setAttribute('aria-expanded', String(!open));
  });
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
