// FAQ accordion
(() => {
  document.querySelectorAll('.faq-item').forEach(item => {
    const btn = item.querySelector('.faq-q');
    btn.addEventListener('click', () => {
      item.classList.toggle('open');
      const ans = item.querySelector('.faq-a');
      const isOpen = item.classList.contains('open');
      ans.classList.toggle('hidden', !isOpen);
    });
  });
})();

// Scroll-triggered animations
(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const targets = document.querySelectorAll('[data-animate]');
  if (!targets.length) return;

  const hiddenClasses = ['opacity-0', 'translate-y-4', '-translate-x-6', 'translate-x-6'];
  const shownClasses = ['transition-all', 'duration-300', 'ease-out', 'opacity-100'];

  if (!('IntersectionObserver' in window)) {
    targets.forEach((el) => {
      el.classList.remove(...hiddenClasses);
      el.classList.add(...shownClasses, 'translate-x-0', 'translate-y-0');
    });
    return;
  }

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.remove(...hiddenClasses);
      el.classList.add(...shownClasses, 'translate-x-0', 'translate-y-0');
      obs.unobserve(el);
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -10% 0px'
  });

  targets.forEach((el) => observer.observe(el));
})();
