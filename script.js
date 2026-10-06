// Use provided frames named Frame0.jpg ... Frame239.jpg in the project root
const FRAME_COUNT = 240; // adjust if you have a different total
const frames = Array.from({ length: FRAME_COUNT }, (_, i) => `Frame${i}.jpg`);

// Preload images for smoother playback
const preloaded = [];
frames.forEach((src, idx) => {
  const img = new Image();
  img.src = src;
  preloaded[idx] = img;
});

// Greeting is replayed when the girl enters a waving/appearance moment
const APPEAR_FRAMES = new Set([77]);
const EXIT_FRAME = 200;

document.addEventListener('DOMContentLoaded', () => {
  const frameImg = document.getElementById('frameImg');
  const overlay = document.getElementById('imgOverlay');
  const greetBlock = document.getElementById('greetBlock');
  const underlinePath = document.querySelector('.underline-path');

  const revealTargets = document.querySelectorAll('.reveal, .section-head, .about-layout, .project-card, .timeline-item, .skill-cluster, .cert-feature, .cert-card, .contact');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
      } else {
        entry.target.classList.remove('in-view');
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -8% 0px'
  });

  revealTargets.forEach((target) => observer.observe(target));

  // hero animation logic remains unchanged below this point
  let fi = 55;
  const msPerFrame = 40;
  let prevInAppear = false;
  let greetingShown = false;
  let textExited = false;
  const RANGE_START = 55;
  const RANGE_END = 158;
  let preScrollMode = true;
  let userInteracting = false;
  let interactionTimeout = null;
  const INTERACTION_TIMEOUT_MS = 160;
  const SCROLL_PX_PER_FRAME = 8;
  let scrollBaseY = null;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // keep the looping sequence running until the user interacts with scroll
  setInterval(() => {
    if (!userInteracting) {
      if (preScrollMode) {
        fi = fi < RANGE_END ? fi + 1 : RANGE_START;
      } else if (fi < frames.length - 1) {
        fi += 1;
      }

      frameImg.src = frames[fi];

      const inAppear = APPEAR_FRAMES.has(fi);
      if (inAppear && !prevInAppear && !greetingShown) {
        startTextAnimation();
        greetingShown = true;
      }
      prevInAppear = inAppear;

      if (!textExited && fi === EXIT_FRAME) {
        textExited = true;
        greetBlock.classList.add('exit-up');
      }
    }
  }, msPerFrame);

  function startTextAnimation() {
    greetBlock.classList.remove('exit-up');
    underlinePath.classList.remove('drawn');

    if (reducedMotion) {
      greetBlock.classList.add('revealed');
      underlinePath.classList.add('drawn');
      greetingShown = true;
      return;
    }

    greetBlock.classList.add('revealed');
    const underlineDelay = 1350;
    setTimeout(() => underlinePath.classList.add('drawn'), underlineDelay);
    greetingShown = true;
  }

  function parseObjectPosition(pos) {
    const parts = (pos || '50% 50%').split(/\s+/);
    const x = parts[0];
    const y = parts[1] || '50%';
    const map = (p) => {
      if (p === 'left') return 0;
      if (p === 'center') return 0.5;
      if (p === 'right') return 1;
      if (p === 'top') return 0;
      if (p === 'bottom') return 1;
      if (p.endsWith('%')) return parseFloat(p) / 100;
      return parseFloat(p) || 0.5;
    };
    return [map(x), map(y)];
  }

  function computeRenderedRect(img) {
    const containerRect = img.parentElement.getBoundingClientRect();
    const cw = containerRect.width;
    const ch = containerRect.height;
    const iw = img.naturalWidth || img.width || 1;
    const ih = img.naturalHeight || img.height || 1;
    const fit = 'contain';
    const [posX, posY] = parseObjectPosition(getComputedStyle(img).objectPosition || 'center center');
    const scale = fit === 'cover' ? Math.max(cw / iw, ch / ih) : Math.min(cw / iw, ch / ih);
    const renderedW = iw * scale;
    const renderedH = ih * scale;
    const offsetX = (cw - renderedW) * posX;
    const offsetY = (ch - renderedH) * posY;

    return {
      left: Math.round(containerRect.left + offsetX),
      top: Math.round(containerRect.top + offsetY),
      width: Math.round(renderedW),
      height: Math.round(renderedH)
    };
  }

  function positionOverlay() {
    const r = computeRenderedRect(frameImg);
    overlay.style.left = `${r.left}px`;
    overlay.style.top = `${r.top}px`;
    overlay.style.width = `${r.width}px`;
    overlay.style.height = `${r.height}px`;
  }

  // scroll interaction - moves the foreground containing girl + greeting upward while the animation keeps playing
  const heroVisual = document.getElementById('heroVisual');
  const heroFrame = document.querySelector('.hero-frame');
  let lastScrollY = window.scrollY || 0;
  let targetOffset = 0;
  let currentOffset = 0;
  let maxOffset = 220;

  function updateHeroTravel() {
    if (!heroFrame) return;
    const frameHeight = heroFrame.offsetHeight || 720;
    const naturalMax = Math.round(frameHeight * 0.7);
    maxOffset = Math.min(Math.max(100, Math.round(window.innerHeight * 0.38)), naturalMax);
    if (targetOffset > maxOffset) targetOffset = maxOffset;
  }

  updateHeroTravel();

  window.addEventListener('scroll', () => {
    if (reducedMotion) return;

    const curY = window.scrollY || 0;
    const delta = curY - lastScrollY;

    userInteracting = true;
    clearTimeout(interactionTimeout);
    interactionTimeout = setTimeout(() => {
      userInteracting = false;
      if (!preScrollMode) {
        greetBlock.classList.remove('revealed');
        underlinePath.classList.remove('drawn');
        greetingShown = false;
      }
    }, INTERACTION_TIMEOUT_MS);

    if (delta > 0) {
      targetOffset = Math.min(maxOffset, Math.max(0, targetOffset + delta));
      if (preScrollMode) {
        preScrollMode = false;
        scrollBaseY = curY;
        if (!greetingShown) startTextAnimation();
      }
      if (!preScrollMode && scrollBaseY !== null) {
        const passed = Math.max(0, curY - scrollBaseY);
        const step = Math.floor(passed / SCROLL_PX_PER_FRAME);
        const targetFrame = Math.min(frames.length - 1, RANGE_END + step);
        if (targetFrame !== fi) {
          fi = targetFrame;
          frameImg.src = frames[fi];
        }
      }
    } else if (delta < 0) {
      targetOffset = Math.max(0, targetOffset + delta);
      if (!preScrollMode && scrollBaseY !== null && curY <= scrollBaseY) {
        preScrollMode = true;
        scrollBaseY = null;

        greetBlock.classList.remove('revealed');
        underlinePath.classList.remove('drawn');
        greetBlock.classList.remove('exit-up');
        greetingShown = false;
        textExited = false;

        fi = RANGE_START;
        frameImg.src = frames[fi];
      }
    }

    lastScrollY = curY;
  }, { passive: true });

  function tickScrollPosition() {
    const ease = 0.12;
    currentOffset += (targetOffset - currentOffset) * ease;
    if (Math.abs(currentOffset - targetOffset) < 0.5) currentOffset = targetOffset;

    if (heroVisual) {
      heroVisual.style.transform = `translateY(${-Math.round(currentOffset)}px)`;
    }

    requestAnimationFrame(tickScrollPosition);
  }

  window.addEventListener('resize', () => {
    positionOverlay();
    updateHeroTravel();
  });
  frameImg.addEventListener('load', positionOverlay);
  positionOverlay();
  requestAnimationFrame(tickScrollPosition);
});

// Scroll animation for skills section chips
document.addEventListener('DOMContentLoaded', function () {
  const skillsSection = document.getElementById('skills');
  if (!skillsSection || window.matchMedia('(prefers-reduced-motion: prefer)').matches) return;

  const observerOptions = {
    threshold: 0.2,
    rootMargin: '0px 0px -100px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        if (!entry.target.classList.contains('animated')) {
          entry.target.classList.add('animated');

          // Animate heading first
          const heading = entry.target.querySelector('.section-head');
          if (heading) {
            heading.style.animation = 'slideUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards';
          }

          // Animate cards with staggered delay
          const cards = entry.target.querySelectorAll('.skill-card');
          cards.forEach((card, cardIdx) => {
            card.style.animation = `fadeUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${cardIdx * 100}ms forwards`;

            // Animate individual chips with staggered delay
            const chips = card.querySelectorAll('li');
            chips.forEach((chip, chipIdx) => {
              chip.style.animation = `fadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${cardIdx * 100 + 200 + chipIdx * 40}ms forwards`;
            });
          });
        }
      } else {
        // Reset animations when out of view so they replay on next scroll
        entry.target.classList.remove('animated');

        const heading = entry.target.querySelector('.section-head');
        if (heading) heading.style.animation = 'none';

        const cards = entry.target.querySelectorAll('.skill-card');
        cards.forEach((card) => {
          card.style.animation = 'none';

          const chips = card.querySelectorAll('li');
          chips.forEach((chip) => {
            chip.style.animation = 'none';
          });
        });
      }
    });
  }, observerOptions);

  observer.observe(skillsSection);
});
/* =========================================================
   Certificate Lightbox
   ========================================================= */
function unlockScroll() {
  var lb = document.getElementById('certLightbox');
  var ov = document.getElementById('otherCertsOverlay');
  var lbOpen = lb && lb.classList.contains('is-open');
  var ovOpen = ov && ov.classList.contains('is-open');
  if (!lbOpen && !ovOpen) {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  }
}

function openCertLight(src, title) {
  var lb = document.getElementById('certLightbox');
  var img = document.getElementById('certLightboxImg');
  var ttl = document.getElementById('certLightboxTitle');
  if (!lb || !img) return;
  img.src = src;
  img.alt = title;
  if (ttl) ttl.textContent = title;
  lb.setAttribute('aria-hidden', 'false');
  lb.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

function closeCertLight(e) {
  if (e && e.target !== e.currentTarget && !e.target.classList.contains('cert-lightbox__close')) return;
  var lb = document.getElementById('certLightbox');
  if (lb) {
    lb.classList.remove('is-open');
    lb.setAttribute('aria-hidden', 'true');
  }
  unlockScroll();
}

/* =========================================================
   Other Certs Overlay
   ========================================================= */
function openOtherCerts() {
  var ov = document.getElementById('otherCertsOverlay');
  if (!ov) return;
  ov.classList.add('is-open');
  ov.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeOtherCerts() {
  var ov = document.getElementById('otherCertsOverlay');
  if (ov) {
    ov.classList.remove('is-open');
    ov.setAttribute('aria-hidden', 'true');
  }
  unlockScroll();
}

// ESC key closes both
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    closeCertLight();
    closeOtherCerts();
  }
});