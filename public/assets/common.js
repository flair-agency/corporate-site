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
          /**
           * 
           * @this HTMLElement
           * @param {string} key
           * @param {string} value
           */
          function removeData(key, value) {
            this.dataset[key] = (this.dataset[key] ?? '').split(' ').filter((state) => state !== value).join(' ').trim();
            return value;
          }
          removeData.bind(link)('state', 'active');
        });
        /**
         * 
         * @this HTMLElement
         * @param {string} key
         * @param {string} value
         */
        function addData(key, value) {
          this.dataset[key] = (this.dataset[key] ?? '').split(' ').concat(value).join(' ').trim();
          return value;
        }
        addData.bind(link)('state', 'active');
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px', threshold: 0.01 });
  targets.forEach(t => io.observe(t));
})();
