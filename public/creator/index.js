// FAQ accordion
(() => {
  document.querySelectorAll('#faq.section .faq-item').forEach(item => {
    const btn = item.querySelector('.q');
    btn.addEventListener('click', () => {
      item.classList.toggle('open');
      const ans = item.querySelector('.a');
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
      const icons = el.querySelectorAll('[data-icon-anim]');

      // Run icon animation *after* the section fade/slide transition finishes,
      // so the motion is actually visible.
      const getTransitionMs = (node) => {
        const cs = window.getComputedStyle(node);
        const toMs = (v) => {
          const s = String(v).trim();
          if (!s) return 0;
          // supports `0.3s` and `120ms`
          if (s.endsWith('ms')) return parseFloat(s) || 0;
          if (s.endsWith('s')) return (parseFloat(s) || 0) * 1000;
          return parseFloat(s) || 0;
        };
        const durations = (cs.transitionDuration || '0s').split(',').map(toMs);
        const delays = (cs.transitionDelay || '0s').split(',').map(toMs);
        const maxDur = Math.max(0, ...durations);
        const maxDelay = Math.max(0, ...delays);
        return maxDur + maxDelay;
      };

      const waitForTransitionEnd = (node) => {
        const ms = getTransitionMs(node);
        if (ms <= 0) return Promise.resolve();

        return new Promise((resolve) => {
          let done = false;
          const cleanup = () => {
            if (done) return;
            done = true;
            node.removeEventListener('transitionend', onEnd);
            clearTimeout(fallback);
            resolve();
          };
          const onEnd = (e) => {
            if (e.target !== node) return;
            // Prefer to wait for the key visual properties.
            if (e.propertyName && e.propertyName !== 'opacity' && e.propertyName !== 'transform') return;
            cleanup();
          };
          node.addEventListener('transitionend', onEnd);
          const fallback = setTimeout(cleanup, ms + 80);
        });
      };

      waitForTransitionEnd(el).then(() => {
        const baseDelay = 800; // wait a bit after fade-in so the icon motion is clearly visible

        icons.forEach((i, idx) => {
          const delay = baseDelay + idx * 160; // stagger between icons
          setTimeout(() => {
            // Restart the animation reliably
            i.classList.remove('icon-pop');
            // force reflow so the animation restarts even if class was applied before
            void i.offsetWidth;
            i.classList.add('icon-pop');

            i.addEventListener(
              'animationend',
              () => i.classList.remove('icon-pop'),
              { once: true }
            );
          }, delay);
        });
      });
      obs.unobserve(el);
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -10% 0px'
  });

  targets.forEach((el) => observer.observe(el));
})();

// Hero video lazy-load
(() => {
  const heroVideo = document.querySelector('[data-hero-video]');
  if (!heroVideo) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const loadAndPlay = () => {
    if (heroVideo.dataset.loaded === 'true') return;
    const webmSource = document.createElement('source');
    webmSource.src = './hero.webm';
    webmSource.type = 'video/webm';
    heroVideo.appendChild(webmSource);

    const mp4Source = document.createElement('source');
    mp4Source.src = './hero.mp4';
    mp4Source.type = 'video/mp4';
    heroVideo.appendChild(mp4Source);

    heroVideo.load();
    heroVideo.dataset.loaded = 'true';
    const playPromise = heroVideo.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {});
    }
  };

  if (!('IntersectionObserver' in window)) {
    loadAndPlay();
    return;
  }

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      loadAndPlay();
      obs.unobserve(entry.target);
    });
  }, {
    threshold: 0.2
  });

  observer.observe(heroVideo);
})();
