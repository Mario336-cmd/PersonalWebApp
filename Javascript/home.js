console.log('✅ home.js running');

const genShadows = (count, w, h) =>
  Array.from({ length: count })
    .map(() => `${Math.random() * w}px ${Math.random() * h}px #FFF`)
    .join(',');

window.addEventListener('DOMContentLoaded', () => {
  const isTouch = window.matchMedia('(hover: none)').matches;

  const smallCount = isTouch ? 400 : 1000;
  const mediumCount = isTouch ? 200 : 500;
  const bigCount = isTouch ? 80 : 200;

  const setStarPositions = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    document.getElementById('stars').style.setProperty('--shadow-small', genShadows(smallCount, w, h));
    document.getElementById('stars2').style.setProperty('--shadow-medium', genShadows(mediumCount, w, h));
    document.getElementById('stars3').style.setProperty('--shadow-big', genShadows(bigCount, w, h));
  };

  setStarPositions();

  const tiltNodes = document.querySelectorAll('.tilt');
  let tiltEnabled = false;

  const updateTilt = () => {
    const shouldEnable =
      window.matchMedia('(hover: hover)').matches &&
      window.innerWidth >= 640 &&
      window.VanillaTilt;
    if (shouldEnable && !tiltEnabled) {
      VanillaTilt.init(tiltNodes, {
        max: 35,
        speed: 700,
        perspective: 1000,
        glare: true,
        gyroscope: true
      });
      tiltEnabled = true;
    } else if (!shouldEnable && tiltEnabled) {
      tiltNodes.forEach(el => el.vanillaTilt && el.vanillaTilt.destroy());
      tiltEnabled = false;
    }
  };

  updateTilt();
  window.addEventListener('resize', () => {
    setStarPositions();
    updateTilt();
  });

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const t = entry.target;
      if (entry.isIntersecting) {
        t.classList.add('visible');
        if (t.id === 'certifications' && !t.dataset.filled) {
          t.dataset.filled = 'true';
          const cards = Array.from(t.querySelectorAll('.cert-card.fill'));
          cards.forEach((item, idx) => {
            const bgColor = getComputedStyle(item).backgroundColor;
            const fillLayer = document.createElement('div');
            fillLayer.classList.add('fill-layer');
            item.style.backgroundColor = 'transparent';
            item.style.position = 'relative';
            item.style.overflow = 'hidden';
            setTimeout(() => {
              fillLayer.style.backgroundColor = bgColor;
              item.appendChild(fillLayer);
            }, idx * 300);
          });
        }
      }
    });
  }, { threshold: 0.2 });

  document.querySelectorAll('.section').forEach(sec => observer.observe(sec));


  const navToggle = document.getElementById('nav-toggle');
  const navMenu   = document.getElementById('nav-menu');
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      const expanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', !expanded);
      navMenu.classList.toggle('show');
    });
    navMenu.querySelectorAll('a').forEach(l => l.addEventListener('click', () => {
      navMenu.classList.remove('show');
      navToggle.setAttribute('aria-expanded', 'false');
    }));
  }

  document.getElementById('contact-form').addEventListener('submit', e => {
    e.preventDefault();
    const msg = encodeURIComponent('message=' + e.target.message.value);
    location.href = `mailto:uushungamario@gmail.com?subject=Contact&body=${msg}`;
  });

  document.getElementById('clear-btn').addEventListener('click', () =>
    document.getElementById('contact-form').reset()
  );

  // Fallback smooth scrolling for browsers without CSS support
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
});
