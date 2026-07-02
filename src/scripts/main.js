import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Preloader ---------- */
(function preloader() {
  const el = document.querySelector("[data-preloader]");
  const count = document.querySelector("[data-count]");
  if (!el) return;
  if (reduce) { el.remove(); document.body.style.overflow = ""; startHero(); return; }

  document.body.style.overflow = "hidden";
  let n = 0;
  const tick = setInterval(() => {
    n += Math.floor(Math.random() * 8) + 3;
    if (n >= 100) { n = 100; clearInterval(tick); }
    count.textContent = n;
    if (n === 100) {
      setTimeout(() => {
        el.classList.add("is-done");
        document.body.style.overflow = "";
        startHero();
        setTimeout(() => el.remove(), 1000);
      }, 350);
    }
  }, 120);
})();

/* ---------- Hero intro ---------- */
function startHero() {
  const lines = document.querySelectorAll(".hero__title .line");
  if (reduce) { lines.forEach((l) => (l.style.opacity = 1)); return; }
  gsap.set(lines, { yPercent: 110 });
  gsap.to(lines, { yPercent: 0, duration: 1.1, ease: "power4.out", stagger: 0.08 });
  gsap.from(".hero__eyebrow, .hero__meta > *", {
    y: 24, opacity: 0, duration: 0.9, ease: "power3.out", stagger: 0.08, delay: 0.3,
  });
}

/* ---------- Custom cursor ---------- */
(function cursor() {
  const dot = document.querySelector("[data-cursor]");
  if (!dot || window.matchMedia("(hover: none)").matches) return;
  let x = window.innerWidth / 2, y = window.innerHeight / 2, cx = x, cy = y;
  window.addEventListener("mousemove", (e) => { x = e.clientX; y = e.clientY; });
  (function loop() {
    cx += (x - cx) * 0.18; cy += (y - cy) * 0.18;
    dot.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
    requestAnimationFrame(loop);
  })();
  document.querySelectorAll("[data-link], a, button, [data-tilt]").forEach((el) => {
    el.addEventListener("mouseenter", () => dot.classList.add("is-hover"));
    el.addEventListener("mouseleave", () => dot.classList.remove("is-hover"));
  });
})();

/* ---------- Reveal on scroll ---------- */
(function reveals() {
  const items = document.querySelectorAll("[data-reveal]");
  if (reduce || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-in"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
  );
  items.forEach((el) => io.observe(el));
})();

/* ---------- Word-by-word reveal ---------- */
(function words() {
  document.querySelectorAll("[data-reveal-words]").forEach((block) => {
    const text = block.textContent.trim();
    block.textContent = "";
    text.split(/\s+/).forEach((w) => {
      const span = document.createElement("span");
      span.className = "word";
      span.textContent = w;
      block.appendChild(span);
      block.appendChild(document.createTextNode(" "));
      if (reduce) span.classList.add("is-in");
    });

    if (reduce) return;
    const wordEls = block.querySelectorAll(".word");
    ScrollTrigger.create({
      trigger: block, start: "top 80%", end: "bottom 55%", scrub: true,
      onUpdate: (self) => {
        const active = Math.floor(self.progress * wordEls.length);
        wordEls.forEach((el, i) => el.classList.toggle("is-in", i <= active));
      },
    });
  });
})();

/* ---------- Animated counters ---------- */
(function counters() {
  const nums = document.querySelectorAll("[data-counter]");
  const run = (el) => {
    const target = +el.dataset.counter;
    const dur = 1600; const t0 = performance.now();
    const step = (t) => {
      const p = Math.min((t - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(eased * target);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if (reduce || !("IntersectionObserver" in window)) {
    nums.forEach((el) => (el.textContent = el.dataset.counter));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
  }, { threshold: 0.6 });
  nums.forEach((el) => io.observe(el));
})();

/* ---------- Marquee (infinite) ---------- */
(function marquee() {
  const track = document.querySelector("[data-marquee]");
  if (!track || reduce) return;
  let offset = 0; const speed = 0.5;
  const half = track.scrollWidth / 2;
  (function loop() {
    offset -= speed;
    if (Math.abs(offset) >= half) offset = 0;
    track.style.transform = `translateX(${offset}px)`;
    requestAnimationFrame(loop);
  })();
})();

/* ---------- Project tilt ---------- */
(function tilt() {
  if (reduce || window.matchMedia("(hover: none)").matches) return;
  document.querySelectorAll("[data-tilt] .project__media").forEach((media) => {
    const card = media.closest("[data-tilt]");
    card.addEventListener("mousemove", (e) => {
      const r = media.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      media.style.transform = `perspective(800px) rotateY(${px * 6}deg) rotateX(${-py * 6}deg) scale(1.01)`;
    });
    card.addEventListener("mouseleave", () => { media.style.transform = ""; });
  });
})();

/* ---------- Header hide on scroll down ---------- */
(function header() {
  const header = document.querySelector("[data-header]");
  if (!header) return;
  let last = 0;
  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    if (y > last && y > 300) header.classList.add("is-hidden");
    else header.classList.remove("is-hidden");
    last = y;
  }, { passive: true });
})();

/* ---------- Mobile nav ---------- */
(function mobileNav() {
  const burger = document.querySelector("[data-burger]");
  const nav = document.querySelector("[data-nav]");
  if (!burger || !nav) return;
  const toggle = (open) => {
    burger.classList.toggle("is-open", open);
    nav.classList.toggle("is-open", open);
    document.body.style.overflow = open ? "hidden" : "";
  };
  burger.addEventListener("click", () => toggle(!burger.classList.contains("is-open")));
  nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => toggle(false)));
})();

/* ---------- Back to top ---------- */
document.querySelector("[data-top]")?.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
});
