// Mobile nav toggle
(() => {
  Array.from(document.querySelectorAll('nav.on-page>button.toggle')).forEach(toggle => {
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
    });
  });
})();

// Active link highlight on scroll
(() => {
  const links = Array.from(document.querySelectorAll('nav.on-page menu li a[href^="#"]')).map((/** @type HTMLElement */ link) => link);
  const targets = links.map(l => { try { return document.querySelector(l.getAttribute('href')) } catch (e) { return null } }).filter(Boolean);
  const linkMap = new Map(targets.map((el, i) => [el.id, links[i]]));
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const link = linkMap.get(entry.target.id);
      if (!link) return;
      if (entry.isIntersecting) {
        links.forEach((link) => {
          removeData.bind(link)('state', 'active');
        });
        addData.bind(link)('state', 'active');
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px', threshold: 0.01 });
  targets.forEach(t => io.observe(t));
})();

/**
 * 
 * @this HTMLElement
 * @param {string} key
 * @param {string} value
 * @returns
 */
function addData(key, value) {
  this.dataset[key] = (this.dataset[key] ?? '').split(' ').concat(value).join(' ').trim();
  return value;
}

/**
 * 
 * @this HTMLElement
 * @param {string} key
 * @param {string} value
 * @returns
 */
function removeData(key, value) {
  this.dataset[key] = (this.dataset[key] ?? '').split(' ').filter((state) => state !== value).join(' ').trim();
  return;
}

/**
 * 
 * @this HTMLElement
 * @param {string} key
 * @param {string} value
 * @returns
 */
function toggleData(key, value) {
  const values = (this.dataset[key] ?? '').split(' ');
  const b = values.some(v => v === value);
  this.dataset[key] = (b ? values.filter(v => v !== value) : values.concat(value)).join(' ').trim();
  return b;
}

/**
 * 
 * @param {unknown} v 
 * @returns 
 */
const toMs = (v) => {
  const s = String(v).trim();
  if (!s) return 0;
  // supports `0.3s` and `120ms`
  if (s.endsWith('ms')) return parseFloat(s) || 0;
  if (s.endsWith('s')) return (parseFloat(s) || 0) * 1000;
  return parseFloat(s) || 0;
};

/**
 * Run icon animation *after* the section fade/slide transition finishes, so the motion is actually visible.
 * 
 * @param {Element} node 
 * @returns
 */
function getTransitionMs(node) {
  const cs = window.getComputedStyle(node);
  const durations = (cs.transitionDuration || '0s').split(',').map(toMs);
  const delays = (cs.transitionDelay || '0s').split(',').map(toMs);
  const maxDur = Math.max(0, ...durations);
  const maxDelay = Math.max(0, ...delays);
  return maxDur + maxDelay;
};

/**
 * 
 * @param {Element} node 
 * @returns {Promise<Element>}
 */
function waitForTransitionEnd(node) {
  const ms = getTransitionMs(node);
  if (ms <= 0) return Promise.resolve(node);

  return new Promise((resolve) => {
    let done = false;

    /**
     * 
     * @returns 
     */
    function cleanup() {
      if (done) return;
      done = true;
      node.removeEventListener('transitionend', onEnd);
      clearTimeout(fallback);
      resolve(node);
    }

    /**
     * 
     * @param {Event} e 
     * @returns 
     */
    function onEnd(e) {
      if (e.target !== node) return;
      // Prefer to wait for the key visual properties.
      if (e.propertyName && e.propertyName !== 'opacity' && e.propertyName !== 'transform') return;
      cleanup();
    };

    node.addEventListener('transitionend', onEnd);
    const fallback = setTimeout(cleanup, ms + 80);
  });
};

/**
 * Scroll-triggered animations
 */
(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const selectors = {
    panel: '[data-animate][data-direction]',
    icon: ':is(.fab,.far,.fas)[data-animate]'
  };

  /**
   * wait a bit after fade-in so the icon motion is clearly visible
   */
  const baseDelay = 800;

  document.querySelectorAll(selectors.panel).forEach(('IntersectionObserver' in window ? () => {
    const observer = new IntersectionObserver((entries, observer) => {
      entries.filter(({ isIntersecting }) => isIntersecting).map(({ target: el }) => Promise.all([
        observer.unobserve(el),
        Promise.resolve(el).then((el) => {
          toggleData.bind(el)('animate', 'true');
          return el;
        }).then(waitForTransitionEnd).then((el) => {
          const key = 'animate';
          const value = 'true';
          el.querySelectorAll(selectors.icon).forEach((/** @type {HTMLElement} */ icon, idx) => {
            /**
             * stagger between icons
             */
            const delay = baseDelay + idx * 160;
            const remove = removeData.bind(icon);
            setTimeout(function callback() {
              remove(key, value); // Restart the animation reliably
              void icon.offsetWidth; // force reflow so the animation restarts even if class was applied before
              addData.bind(icon)(key, value);
              icon.addEventListener('animationend', () => remove(key, value), { once: true });
            }, delay);
          });
        })
      ]));
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -10% 0px'
    });

    /**
     * 
     * @type {(e: Element) => void}
     */
    return (el) => observer.observe(el);
  } : () => {
    /**
     * 
     * @type {(e: Element) => void}
     */
    return (el) => void toggleData.bind(el)('animate', 'true');
  })());
})();
