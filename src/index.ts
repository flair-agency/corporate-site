// Mobile nav toggle
((selectors) => {
  type Item = {
    toggle: HTMLElement;
    nav: HTMLElement;
    menu: HTMLElement | null;
  };

  const items: Item[] = Array.from(
    document.querySelectorAll<HTMLElement>(selectors.toggle),
  )
    .map((toggle) => {
      const nav = toggle.closest<HTMLElement>("nav.on-page");
      // In this markup, <menu> is the next sibling of the toggle button
      const menu = toggle.nextElementSibling as HTMLElement | null;
      return nav ? { toggle, nav, menu } : null;
    })
    .filter((v): v is Item => v !== null);

  const isOpen = (t: HTMLElement) => t.getAttribute("aria-expanded") === "true";
  const open = (t: HTMLElement) => t.setAttribute("aria-expanded", "true");
  const close = (t: HTMLElement) => t.setAttribute("aria-expanded", "false");

  // Toggle button click
  items.forEach(({ toggle }) => {
    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      isOpen(toggle) ? close(toggle) : open(toggle);
    });
  });

  // Close when clicking outside the nav (also catches taps on body::before/backdrop)
  document.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof Node)) return;

    items.forEach(({ toggle, nav }) => {
      if (!isOpen(toggle)) return;
      if (nav.contains(target)) return;
      close(toggle);
    });
  });

  // ESC closes
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    items.forEach(({ toggle }) => {
      if (isOpen(toggle)) close(toggle);
    });
  });

  // Close when a menu link is clicked
  items.forEach(({ toggle, menu }) => {
    if (!menu) return;
    menu.addEventListener("click", (e) => {
      if (e.target instanceof HTMLAnchorElement) {
        close(toggle);
      }
    });
  });
})({
  toggle: "nav.on-page>button.toggle",
});

// Active link highlight on scroll
((selectors) => {
  const links = Array.from(
    document.querySelectorAll<HTMLElement>(selectors.a),
  ).map((link) => link);
  const targets = links
    .map((l) => {
      try {
        return document.querySelector<HTMLElement>(
          l.getAttribute("href") ?? "",
        );
      } catch (e) {
        return null;
      }
    })
    .filter((l) => l !== null);
  const linkMap = new Map(targets.map((el, i) => [el?.id, links[i]]));
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const link = linkMap.get(entry.target.id);
        if (!link) return;
        if (entry.isIntersecting) {
          links.forEach((link) => {
            removeData.bind(link)("state", "active");
          });
          addData.bind(link)("state", "active");
        }
      });
    },
    { rootMargin: "-40% 0px -55% 0px", threshold: 0.01 },
  );
  targets.forEach((t) => io.observe(t));
})({
  a: 'nav.on-page menu li a[href^="#"]',
});

function addData(this: HTMLElement, key: string, value: string) {
  this.dataset[key] = (this.dataset[key] ?? "")
    .split(" ")
    .concat(value)
    .join(" ")
    .trim();
  return value;
}

function removeData(this: HTMLElement, key: string, value: string) {
  this.dataset[key] = (this.dataset[key] ?? "")
    .split(" ")
    .filter((state) => state !== value)
    .join(" ")
    .trim();
  return;
}

function toggleData(this: HTMLElement, key: string, value: string) {
  const values = (this.dataset[key] ?? "").split(" ");
  const b = values.some((v) => v === value);
  this.dataset[key] = (
    b ? values.filter((v) => v !== value) : values.concat(value)
  )
    .join(" ")
    .trim();
  return b;
}

const toMs = (v: unknown) => {
  const s = String(v).trim();
  if (!s) return 0;
  // supports `0.3s` and `120ms`
  if (s.endsWith("ms")) return parseFloat(s) || 0;
  if (s.endsWith("s")) return (parseFloat(s) || 0) * 1000;
  return parseFloat(s) || 0;
};

/**
 * Run icon animation *after* the section fade/slide transition finishes, so the motion is actually visible.
 *
 * @param {HTMLElement} node
 * @returns
 */
function getTransitionMs(node: HTMLElement) {
  const cs = window.getComputedStyle(node);
  const durations = (cs.transitionDuration || "0s").split(",").map(toMs);
  const delays = (cs.transitionDelay || "0s").split(",").map(toMs);
  const maxDur = Math.max(0, ...durations);
  const maxDelay = Math.max(0, ...delays);
  return maxDur + maxDelay;
}

function waitForTransitionEnd(node: HTMLElement) {
  const ms = getTransitionMs(node);
  if (ms <= 0) return Promise.resolve(node);

  return new Promise<HTMLElement>((resolve) => {
    let done = false;

    /**
     *
     * @returns
     */
    function cleanup() {
      if (done) return;
      done = true;
      node.removeEventListener("transitionend", onEnd);
      clearTimeout(fallback);
      resolve(node);
    }

    /**
     *
     * @param {TransitionEvent} e
     * @returns
     */
    function onEnd(e: TransitionEvent) {
      if (e.target !== node) return;
      // Prefer to wait for the key visual properties.
      if (
        e.propertyName &&
        e.propertyName !== "opacity" &&
        e.propertyName !== "transform"
      )
        return;
      cleanup();
    }

    node.addEventListener("transitionend", onEnd);
    const fallback = setTimeout(cleanup, ms + 80);
  });
}

/**
 * Scroll-triggered animations
 */
((
  selectors,
  /** wait a bit after fade-in so the icon motion is clearly visible */
  baseDelay = 800,
) => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  document.querySelectorAll<HTMLElement>(selectors.panel).forEach(
    ("IntersectionObserver" in window
      ? () => {
          const observer = new IntersectionObserver(
            (entries, observer) => {
              entries
                .filter(({ isIntersecting }) => isIntersecting)
                .map(({ target }) => {
                  if (!(target instanceof HTMLElement))
                    return Promise.reject<[void, void]>();
                  return Promise.all([
                    observer.unobserve(target),
                    Promise.resolve(target)
                      .then((el) => {
                        toggleData.bind(el)("animate", "true");
                        return el;
                      })
                      .then(waitForTransitionEnd)
                      .then((el) => {
                        const key = "animate";
                        const value = "true";
                        el.querySelectorAll<HTMLElement>(
                          selectors.icon,
                        ).forEach((icon, idx) => {
                          /**
                           * stagger between icons
                           */
                          const delay = baseDelay + idx * 160;
                          const remove = removeData.bind(icon);
                          setTimeout(function callback() {
                            remove(key, value); // Restart the animation reliably
                            void icon.offsetWidth; // force reflow so the animation restarts even if class was applied before
                            addData.bind(icon)(key, value);
                            icon.addEventListener(
                              "animationend",
                              () => remove(key, value),
                              { once: true },
                            );
                          }, delay);
                        });
                      }),
                  ]);
                });
            },
            {
              threshold: 0.15,
              rootMargin: "0px 0px -10% 0px",
            },
          );

          return (el: HTMLElement) => observer.observe(el);
        }
      : () => {
          return (el: HTMLElement) =>
            void toggleData.bind(el)("animate", "true");
        })(),
  );
})({
  panel: "[data-animate][data-direction]",
  icon: ":is(.fab,.far,.fas)[data-animate]",
});

(function renderGrowthChart({ ids, growthData }) {
  const svg = document.getElementById(ids.svg);
  if (!svg) return;
  const W = 600,
    H = 320;
  const pad = { left: 48, right: 40, top: 40, bottom: 60 };
  const plotW = W - pad.left - pad.right;
  const plotH = 260 - pad.top + 20; // top axis at y=40, bottom at y=260

  const years = growthData.map((d) => d.year);
  const vals = growthData.map((d) => d.value);
  const minY = Math.min(...vals);
  const maxY = Math.max(...vals);

  // scales
  const x = (i: number) => pad.left + plotW * (i / (growthData.length - 1));
  const y = (v: number) => {
    // invert: higher value -> smaller y
    const t = (v - minY) / (maxY - minY || 1);
    return 260 - t * 220; // 40..260 area
  };

  // polyline points
  const pts = growthData.map((d, i) => `${x(i)},${y(d.value)}`).join(" ");
  svg.querySelector("#growthLine")?.setAttribute("points", pts);

  // area path
  const areaTop =
    `M${x(0)},260 L${x(0)},${y(growthData[0]?.value ?? NaN)} ` +
    growthData.map((d, i) => `${x(i)},${y(d.value)}`).join(" ") +
    ` L${x(growthData.length - 1)},260 Z`;
  svg.querySelector("#growthArea")?.setAttribute("d", areaTop);

  // x labels
  const labels = svg.querySelector("#xlabels");
  if (labels) {
    labels.innerHTML = "";
    years.forEach((yr, i) => {
      const tx = document.createElementNS("http://www.w3.org/2000/svg", "text");
      tx.setAttribute("x", String(x(i)));
      tx.setAttribute("y", "280");
      tx.setAttribute("text-anchor", "middle");
      tx.textContent = String(yr);
      labels.appendChild(tx);
    });
  }
})({
  ids: {
    svg: "growthChart",
  },
  growthData: [
    { year: 2020, value: 54 }, // 2023=100を基準に後方推計
    { year: 2021, value: 66 },
    { year: 2022, value: 81 },
    { year: 2023, value: 100 }, // 実数アンカー: 2023年 世界のLive Streaming市場 USD 87.55B (GVR)
    { year: 2024, value: 123 }, // CAGR 23%で前方推計
    { year: 2025, value: 151 },
  ],
});
