console.log('✅ home.js running');

const genShadows = (count, w, h) =>
  Array.from({ length: count })
    .map(() => `${Math.random() * w}px ${Math.random() * h}px #FFF`)
    .join(',');

window.addEventListener('DOMContentLoaded', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const isTouch = window.matchMedia('(hover: none)').matches;

  const smallCount = isTouch ? 400 : 1000;
  const mediumCount = isTouch ? 200 : 500;
  const bigCount = isTouch ? 80 : 200;

  document.getElementById('stars').style.setProperty('--shadow-small', genShadows(smallCount, w, h));
  document.getElementById('stars2').style.setProperty('--shadow-medium', genShadows(mediumCount, w, h));
  document.getElementById('stars3').style.setProperty('--shadow-big', genShadows(bigCount, w, h));

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

  const enableTilt = window.matchMedia('(hover: hover)').matches;
  if (enableTilt) {
    VanillaTilt.init(document.querySelectorAll('.tilt'), {
      max: 15,
      speed: 700,
      perspective: 1000,
      glare: true,
      "max-glare": 0.5,
      gyroscope: true
    });
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
