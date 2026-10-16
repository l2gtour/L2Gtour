/* ============================================================
   L2G TOUR 2027 — SCRIPT.JS
   ============================================================ */

/* ——— NAV scroll + mobile toggle ——— */
const navbar    = document.getElementById('navbar');
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');


navToggle.addEventListener('click', () => {
  const isOpen = navToggle.classList.toggle('is-open');
  navLinks.classList.toggle('is-open');
  document.body.style.overflow = isOpen ? 'hidden' : '';
});

navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    navToggle.classList.remove('is-open');
    navLinks.classList.remove('is-open');
    document.body.style.overflow = '';
  });
});

/* ——— PARALLAX hero background ——— */
const heroBg = document.getElementById('heroBg');

function doParallax() {
  if (heroBg) heroBg.style.transform = `translateY(${window.scrollY * 0.38}px)`;
}

/* ——— INTERSECTION OBSERVER — scroll animations ——— */
const animObs = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const delay = parseInt(entry.target.dataset.delay) || 0;
    setTimeout(() => entry.target.classList.add('is-visible'), delay);
    animObs.unobserve(entry.target);
  });
}, { threshold: 0.12, rootMargin: '0px 0px -55px 0px' });

document.querySelectorAll('[data-animate]').forEach(el => animObs.observe(el));

/* ——— COUNTER ANIMATION ——— */
function runCounter(el, target, duration = 2000) {
  const start = performance.now();
  const tick  = (now) => {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);           // ease-out cubic
    el.textContent = Math.round(eased * target).toLocaleString('fr-FR');
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

const counterObs = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const target = parseInt(entry.target.dataset.target);
    runCounter(entry.target, target);
    counterObs.unobserve(entry.target);
  });
}, { threshold: 0.4 });

document.querySelectorAll('.counter').forEach(el => counterObs.observe(el));

/* ——— SVG ROUTE MAP — SCROLL-DRIVEN ANIMATION ——— */
const routeClipRect = document.getElementById('routeClipRect');
const mapSection = document.querySelector('.map-wrap');
const mapWaypoints = document.querySelectorAll('.waypoint');

let routeScrollFn = null;

if (routeClipRect && mapSection) {
  const routeSvg = document.querySelector('.route-svg');
  const vbParts = routeSvg ? routeSvg.getAttribute('viewBox').split(' ').map(Number) : [0, 0, 800, 1100];
  const svgVbY = vbParts[1];
  const svgHeight = vbParts[3];

  const wpThresholds = [0.05, 0.15, 0.50, 0.75, 0.95];
  const wpRevealed = new Array(mapWaypoints.length).fill(false);

  routeScrollFn = function updateRouteOnScroll() {
    const rect = mapSection.getBoundingClientRect();
    const viewH = window.innerHeight;
    const start = rect.top - viewH;
    const end = rect.bottom;
    const total = end - start;
    const progress = Math.max(0, Math.min(1, (-start / total) * 1.8));

    routeClipRect.setAttribute('height', svgHeight * progress);

    mapWaypoints.forEach((wp, i) => {
      if (progress >= (wpThresholds[i] || 0) && !wpRevealed[i]) {
        wp.classList.add('visible');
        wpRevealed[i] = true;
      }
    });
  };

  routeScrollFn();
}

/* ——— UNIFIED ACCORDION SYSTEM (MOBILE) ——— */
function initMobileAccordions() {
  // 1. Crew Member Toggles
  const memberBtns = document.querySelectorAll('.m-nav-btn');
  const memberCards = document.querySelectorAll('.member-card');
  
  memberBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      const isActive = btn.classList.contains('active');
      
      // Close all first
      memberBtns.forEach(b => b.classList.remove('active'));
      memberCards.forEach(c => c.style.display = 'none');
      
      // If we clicked an inactive one, open it
      if (!isActive) {
        btn.classList.add('active');
        const targetCard = document.getElementById(`member-${target}`);
        if (targetCard) targetCard.style.display = 'flex';
      }
    });
  });

  // 2. Values, Communication & Support Accordions
  const accordionTriggers = document.querySelectorAll('[data-accordion]');
  accordionTriggers.forEach(trigger => {
    // Header click
    const header = trigger.querySelector('.val-header, .comm-header, .scard-header, .leg-row-m');
    if (!header) return;

    header.addEventListener('click', () => {
      const group = trigger.dataset.accordion;
      const isActive = trigger.classList.contains('is-active');

      // Close others in same group on mobile
      if (window.innerWidth <= 767) {
        document.querySelectorAll(`[data-accordion="${group}"]`).forEach(el => {
          if (el !== trigger) el.classList.remove('is-active');
        });
      }

      trigger.classList.toggle('is-active', !isActive);
    });
  });

  // 3. Valorisation Scroll-Trigger (Sequential unfold at 1/3 screen)
  if (window.innerWidth <= 767) {
    const valoTiles = document.querySelectorAll('[data-accordion="valo"]');
    let valoTicking = false;

    function updateValoScroll() {
      const triggerLine = window.innerHeight / 3;
      let activeIndex = -1;

      valoTiles.forEach((tile, i) => {
        const rect = tile.getBoundingClientRect();
        // The card's "+" button zone (header top) triggers when it crosses the top 1/3
        if (rect.top <= triggerLine && rect.bottom > 0) {
          activeIndex = i;
        }
      });

      valoTiles.forEach((tile, i) => {
        tile.classList.toggle('is-active', i === activeIndex);
      });

      valoTicking = false;
    }

    window.addEventListener('scroll', () => {
      if (!valoTicking) {
        requestAnimationFrame(updateValoScroll);
        valoTicking = true;
      }
    }, { passive: true });
  }
}

// Re-init on load and resize
window.addEventListener('DOMContentLoaded', () => {
  initMobileAccordions();
  // Auto-open first comm tab on mobile
  if (window.innerWidth <= 767) {
    const firstComm = document.querySelector('[data-accordion="comm"]');
    if (firstComm) firstComm.classList.add('is-active');
  }
});

/* ——— CHART.JS BUDGET DOUGHNUT ——— */
let chartCreated = false;

/* Custom centre-text plugin */
const centerTextPlugin = {
  id: 'centerLabel',
  afterDraw(chart) {
    const { ctx, chartArea: { left, top, width, height } } = chart;
    const cx = left + width  / 2;
    const cy = top  + height / 2;
    ctx.save();

    // Amount
    ctx.fillStyle   = '#1A1208';
    ctx.font        = `normal 400 1.75rem Anton, sans-serif`;
    ctx.textAlign   = 'center';
    ctx.textBaseline= 'middle';
    ctx.fillText('10 400€', cx, cy - 13);

    // Label
    ctx.fillStyle = '#8A7A68';
    ctx.font      = `600 0.62rem Inter, sans-serif`;
    ctx.letterSpacing = '0.12em';
    ctx.fillText('BUDGET TOTAL', cx, cy + 14);
    ctx.restore();
  }
};

const chartCfg = {
  type: 'doughnut',
  data: {
    labels: [
      'Voiture & Préparation',
      "Frais d'Inscription",
      'Divers & Humanitaire',
      'Essence & Péages',
      'Survie & Médical',
      'Assurances'
    ],
    datasets: [{
      data: [3600, 2600, 1300, 1200, 1200, 500],
      backgroundColor: ['#1A1208', '#3C2015', '#5C3018', '#7B4A2A', '#C49A6A', '#CC7700'],
      borderColor:     '#FFFFFF',
      borderWidth:     4,
      hoverOffset:     20,
      hoverBorderColor:'#F2EDE0',
      hoverBorderWidth: 3,
    }]
  },
  options: {
    cutout: '63%',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: ctx  => ctx[0].label,
          label: ctx  => {
            const pct = ((ctx.parsed / 10400) * 100).toFixed(1);
            return `  ${ctx.parsed.toLocaleString('fr-FR')}€  (${pct}%)`;
          }
        },
        backgroundColor:  '#1A1208',
        borderColor:      'rgba(196,154,106,0.35)',
        borderWidth:      1,
        titleColor:       '#CC7700',
        bodyColor:        '#F2EDE0',
        padding:          14,
        cornerRadius:     8,
        titleFont: { family: 'Anton', size: 12 },
        bodyFont:  { family: 'Inter', size: 13 },
      }
    },
    animation: {
      animateRotate: true,
      animateScale:  true,
      duration:      1900,
      easing:        'easeOutQuart'
    },
    onHover: (evt, elements) => {
      if (window.innerWidth > 767) {
        evt.native.target.style.cursor = 'default';
        return;
      }
      evt.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
    },
    onClick: (evt, elements, chart) => {
      if (window.innerWidth > 767) return; // Only interactive on mobile
      if (elements && elements.length > 0) {
        const index = elements[0].index;
        showBudgetDetail(index);
      }
    },
    responsive:         true,
    maintainAspectRatio: true,
  },
  plugins: [centerTextPlugin]
};



const chartObs = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting || chartCreated) return;
    const canvas = document.getElementById('budgetChart');
    if (canvas) {
      new Chart(canvas, chartCfg);
      chartCreated = true;
    }
    chartObs.unobserve(entry.target);
  });
}, { threshold: 0.3 });

const budgetSection = document.getElementById('budget');
if (budgetSection) chartObs.observe(budgetSection);

/* ——— EMPLACEMENT COVERFLOW CAROUSEL ——— */
(function () {
  const tabs    = document.querySelectorAll('.empl-tab');
  const slides  = document.querySelectorAll('.empl-slide');
  const prevBtn = document.querySelector('.empl-arrow--prev');
  const nextBtn = document.querySelector('.empl-arrow--next');
  if (!tabs.length || !slides.length) return;

  const views = ['avant', 'arriere', 'cote-g', 'cote-d', 'dessus'];
  const map   = {
    'avant':   'clio-avant',
    'arriere': 'clio-arriere',
    'cote-g':  'clio-cote-gauche',
    'cote-d':  'clio-cote-droit',
    'dessus':  'clio-dessus'
  };
  const labels = {
    'avant':   'Vue avant de la Clio avec les emplacements publicitaires',
    'arriere': 'Vue arrière de la Clio',
    'cote-g':  'Vue côté gauche de la Clio',
    'cote-d':  'Vue côté droit de la Clio',
    'dessus':  'Vue dessus de la Clio'
  };

  let currentIndex = 0;
  let isAnimating  = false;

  /* Initialize slide images based on view mapping */
  const slideEls = views.map((v, i) => {
    const el  = slides[i];
    const img = el.querySelector('img');
    if (img) {
      img.src = `images/emplacement/${map[v]}.png`;
      img.alt = labels[v];
    }
    
    // Add specific class for side profiles because they need to be scaled up more
    if (v === 'cote-g' || v === 'cote-d') {
      el.classList.add('is-cote');
    }
    
    // Add click listener: clicking an inactive face centers it
    el.addEventListener('click', () => {
      if (i !== currentIndex) goTo(i);
    });

    return el;
  });

  function layout() {
    const n = views.length;
    slideEls.forEach((el, i) => {
      let offset = i - currentIndex;
      if (offset > Math.floor(n / 2))  offset -= n;
      if (offset < -Math.floor(n / 2)) offset += n;

      let pos;
      if (offset === 0) pos = 'center';
      else if (offset === -1) pos = 'left';
      else if (offset === 1) pos = 'right';
      else if (offset < -1) pos = 'far-left';
      else pos = 'far-right';

      el.setAttribute('data-position', pos);
      
      // Make elements like price labels inside inactive faces unclickable/hidden
      // This allows price labels to only be interactive when the face is active.
      el.style.pointerEvents = (pos === 'center') ? 'auto' : 'none';
      if (pos === 'left' || pos === 'right') el.style.pointerEvents = 'auto'; // allow clicking card to jump
      
      const labels = el.querySelectorAll('.price-label, .empl-price-label');
      labels.forEach(lbl => {
        lbl.style.opacity = (pos === 'center') ? '1' : '0';
        lbl.style.pointerEvents = (pos === 'center') ? 'auto' : 'none';
      });
    });

    tabs.forEach((t, i) => t.classList.toggle('active', i === currentIndex));
  }

  function goTo(newIndex) {
    if (isAnimating || newIndex === currentIndex) return;
    isAnimating = true;
    currentIndex = ((newIndex % views.length) + views.length) % views.length;
    layout();
    setTimeout(() => { isAnimating = false; }, 600); // sync with CSS transition + buffer
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => goTo(i));
  });

  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.preventDefault();
      goTo(currentIndex - 1);
    });
  }
  
  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.preventDefault();
      goTo(currentIndex + 1);
    });
  }

  /* Swipe support for mobile */
  const carousel = document.querySelector('.empl-carousel');
  let touchStartX = 0;
  if (carousel) {
    carousel.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    carousel.addEventListener('touchend', e => {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) goTo(currentIndex + (diff > 0 ? 1 : -1));
    });
  }

  /* Keyboard arrows */
  document.addEventListener('keydown', e => {
    if (!carousel) return;
    const rect = carousel.getBoundingClientRect();
    if (rect.top > window.innerHeight || rect.bottom < 0) return;
    if (e.key === 'ArrowLeft') goTo(currentIndex - 1);
    if (e.key === 'ArrowRight') goTo(currentIndex + 1);
  });

  // Initial render
  requestAnimationFrame(() => layout());
})();

/* ——— GALERIE PHOTOS CAROUSEL ——— */
(function () {
  const slides  = Array.from(document.querySelectorAll('.galerie-slide'));
  const prevBtn = document.querySelector('.galerie-arrow--prev');
  const nextBtn = document.querySelector('.galerie-arrow--next');
  const dotsContainer = document.querySelector('.galerie-dots');
  if (!slides.length) return;

  const n = slides.length;
  let currentIndex = 0;
  let isAnimating  = false;

  /* Build dots */
  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'galerie-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `Photo ${i + 1}`);
    dot.addEventListener('click', () => goTo(i));
    dotsContainer.appendChild(dot);
  });

  function layout() {
    const dots = dotsContainer.querySelectorAll('.galerie-dot');
    slides.forEach((el, i) => {
      let offset = i - currentIndex;
      if (offset > Math.floor(n / 2))  offset -= n;
      if (offset < -Math.floor(n / 2)) offset += n;
      let pos;
      if (offset === 0)       pos = 'center';
      else if (offset === -1) pos = 'left';
      else if (offset === 1)  pos = 'right';
      else if (offset < -1)   pos = 'far-left';
      else                    pos = 'far-right';
      el.setAttribute('data-position', pos);
      el.style.pointerEvents = (pos === 'center' || pos === 'left' || pos === 'right') ? 'auto' : 'none';
    });
    dots.forEach((d, i) => d.classList.toggle('active', i === currentIndex));
  }

  function goTo(newIndex) {
    if (isAnimating || newIndex === currentIndex) return;
    isAnimating = true;
    currentIndex = ((newIndex % n) + n) % n;
    layout();
    setTimeout(() => { isAnimating = false; }, 600);
  }

  slides.forEach((el, i) => {
    el.addEventListener('click', () => { if (i !== currentIndex) goTo(i); });
  });

  if (prevBtn) prevBtn.addEventListener('click', e => { e.preventDefault(); goTo(currentIndex - 1); });
  if (nextBtn) nextBtn.addEventListener('click', e => { e.preventDefault(); goTo(currentIndex + 1); });

  /* Swipe */
  const carousel = document.querySelector('.galerie-carousel');
  let touchStartX = 0;
  if (carousel) {
    carousel.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    carousel.addEventListener('touchend', e => {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) goTo(currentIndex + (diff > 0 ? 1 : -1));
    });
  }

  requestAnimationFrame(() => layout());
})();

/* ——— ACTIVE NAV LINK on scroll (cached positions) ——— */
const sections    = document.querySelectorAll('section[id]');
const navAnchors  = document.querySelectorAll('.nav-links a[href^="#"]');
let   sectionData = []; // { id, top, bottom } — rebuilt on resize

function cacheSectionPositions() {
  sectionData = Array.from(sections).map(sec => ({
    id:     sec.id,
    top:    sec.offsetTop,
    bottom: sec.offsetTop + sec.offsetHeight
  }));
}

function updateActiveNav() {
  const y = window.scrollY + 100;
  for (const sec of sectionData) {
    if (y >= sec.top && y < sec.bottom) {
      navAnchors.forEach(a => {
        a.classList.toggle('active', a.getAttribute('href') === `#${sec.id}`);
      });
      break;
    }
  }
}

cacheSectionPositions();
let resizeSectionTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeSectionTimer);
  resizeSectionTimer = setTimeout(cacheSectionPositions, 200);
}, { passive: true });

/* ——— UNIFIED SCROLL DISPATCHER (one RAF loop for all scroll work) ——— */
let globalTicking = false;
window.addEventListener('scroll', () => {
  if (!globalTicking) {
    requestAnimationFrame(() => {
      // Navbar state
      navbar.classList.toggle('nav--scrolled', window.scrollY > 72);
      // Parallax
      doParallax();
      // Route map
      if (routeScrollFn) routeScrollFn();
      // Active nav
      updateActiveNav();
      globalTicking = false;
    });
    globalTicking = true;
  }
}, { passive: true });


/* ——— SPONSOR MODAL CONTROL ——— */
const sponsorModal  = document.getElementById('sponsorModal');
const closeModalBtn = document.getElementById('closeModal');
const openModalBtns = document.querySelectorAll('.js-open-sponsor-modal');

if (sponsorModal && closeModalBtn) {
  const openModal = (e) => {
    e.preventDefault();
    sponsorModal.classList.add('is-active');
    document.body.style.overflow = 'hidden'; // Lock scroll
  };

  const closeModal = () => {
    sponsorModal.classList.remove('is-active');
    document.body.style.overflow = ''; // Restore scroll
  };

  openModalBtns.forEach(btn => btn.addEventListener('click', openModal));
  closeModalBtn.addEventListener('click', closeModal);

  // Close on background click
  sponsorModal.addEventListener('click', (e) => {
    if (e.target === sponsorModal) closeModal();
  });

  // Close on Escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sponsorModal.classList.contains('is-active')) closeModal();
  });
}
