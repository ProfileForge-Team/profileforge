const pages = [...document.querySelectorAll('.page')];
const navLinks = [...document.querySelectorAll('.nav-link')];
const buttons = [...document.querySelectorAll('.nav-link-button')];
const mobileNav = document.getElementById('mobileNav');
const menuBtn = document.getElementById('menuBtn');
const cursorGlow = document.getElementById('cursorGlow');
const progress = document.getElementById('topProgress');

function showPage(pageName) {
  const target = pages.find(p => p.dataset.page === pageName) ? pageName : 'home';
  pages.forEach(page => page.classList.toggle('active', page.dataset.page === target));
  navLinks.forEach(link => link.classList.toggle('active', link.dataset.page === target));
  history.replaceState(null, '', '#' + target);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  mobileNav?.classList.remove('open');
  requestAnimationFrame(() => revealVisible());
}

navLinks.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    showPage(link.dataset.page);
  });
});
buttons.forEach(button => button.addEventListener('click', () => showPage(button.dataset.page)));
menuBtn?.addEventListener('click', () => mobileNav.classList.toggle('open'));

window.addEventListener('load', () => {
  const page = (location.hash || '#home').replace('#', '');
  showPage(page);
  revealVisible();
});

window.addEventListener('mousemove', e => {
  if (!cursorGlow) return;
  cursorGlow.style.left = e.clientX + 'px';
  cursorGlow.style.top = e.clientY + 'px';
});

window.addEventListener('scroll', () => {
  const h = document.documentElement.scrollHeight - innerHeight;
  const value = h > 0 ? (scrollY / h) * 100 : 0;
  progress.style.width = value + '%';
  revealVisible();
});

function revealVisible() {
  const reveals = [...document.querySelectorAll('.page.active .reveal')];
  reveals.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < innerHeight - 80) el.classList.add('visible');
  });
}

const likeBtn = document.getElementById('likeBtn');
likeBtn?.addEventListener('click', () => {
  likeBtn.textContent = '♥ Лайк поставлен';
  likeBtn.classList.add('liked');
  for (let i = 0; i < 16; i++) spawnHeart(likeBtn);
});

function spawnHeart(origin) {
  const rect = origin.getBoundingClientRect();
  const heart = document.createElement('span');
  heart.textContent = '♥';
  heart.style.position = 'fixed';
  heart.style.left = rect.left + rect.width / 2 + 'px';
  heart.style.top = rect.top + rect.height / 2 + 'px';
  heart.style.color = '#00F5FF';
  heart.style.pointerEvents = 'none';
  heart.style.zIndex = '200';
  heart.style.fontSize = Math.random() * 16 + 14 + 'px';
  heart.style.textShadow = '0 0 18px #00F5FF';
  document.body.appendChild(heart);
  const x = (Math.random() - .5) * 180;
  const y = -80 - Math.random() * 120;
  heart.animate([
    { transform: 'translate(0,0) scale(1)', opacity: 1 },
    { transform: `translate(${x}px,${y}px) scale(.3)`, opacity: 0 }
  ], { duration: 900 + Math.random() * 600, easing: 'ease-out' }).onfinish = () => heart.remove();
}

// Decorative active state for project/template cards
[...document.querySelectorAll('.project-card, .template-card')].forEach(card => {
  card.addEventListener('click', () => {
    if (card.classList.contains('template-card')) {
      document.querySelectorAll('.template-card').forEach(c => c.classList.remove('selected'));
    }
    card.classList.toggle('selected');
  });
});

// Premium motion layer: subtle parallax, magnetic buttons, floating particles
const root = document.documentElement;
const heroCollage = document.querySelector('.hero-collage');
let rafId = null;
let lastMouse = { x: 0, y: 0 };

function setHeroMotion(e) {
  if (!heroCollage) return;
  const rect = heroCollage.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
  const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  heroCollage.style.setProperty('--mx', x.toFixed(3));
  heroCollage.style.setProperty('--my', y.toFixed(3));
}

heroCollage?.addEventListener('mousemove', setHeroMotion);
heroCollage?.addEventListener('mouseleave', () => {
  heroCollage.style.setProperty('--mx', '0');
  heroCollage.style.setProperty('--my', '0');
});

function updateScrollMotion() {
  rafId = null;
  const activePage = document.querySelector('.page.active');
  if (!activePage) return;
  const hero = activePage.querySelector('.hero-collage');
  if (hero) {
    const rect = hero.getBoundingClientRect();
    const shift = Math.max(-80, Math.min(80, (innerHeight * 0.5 - rect.top) * 0.12));
    hero.style.setProperty('--scroll', `${shift}px`);
  }

  document.querySelectorAll('.page.active .wide-banner img, .page.active .image-stage img, .page.active .dash-preview img').forEach((img) => {
    const rect = img.getBoundingClientRect();
    const center = rect.top + rect.height / 2;
    const offset = (center - innerHeight / 2) * -0.018;
    img.style.transform = `translateY(${offset}px) scale(1.035)`;
  });
}

window.addEventListener('scroll', () => {
  if (!rafId) rafId = requestAnimationFrame(updateScrollMotion);
}, { passive: true });
window.addEventListener('resize', () => {
  if (!rafId) rafId = requestAnimationFrame(updateScrollMotion);
});

// Button magnetism — tiny movement, solid feel
const magneticButtons = document.querySelectorAll('.primary-btn, .ghost-btn');
magneticButtons.forEach((button) => {
  button.addEventListener('mousemove', (e) => {
    const rect = button.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * 0.12;
    const y = (e.clientY - rect.top - rect.height / 2) * 0.16;
    button.classList.add('magnetic');
    button.style.setProperty('--btn-x', `${x}px`);
    button.style.setProperty('--btn-y', `${y}px`);
  });
  button.addEventListener('mouseleave', () => {
    button.classList.remove('magnetic');
    button.style.setProperty('--btn-x', '0px');
    button.style.setProperty('--btn-y', '0px');
  });
});

// Ambient sparks: light, not distracting
function createSparks() {
  const existing = document.querySelectorAll('.aqua-spark');
  existing.forEach(s => s.remove());
  const count = innerWidth < 720 ? 10 : 22;
  for (let i = 0; i < count; i++) {
    const spark = document.createElement('i');
    spark.className = 'aqua-spark';
    spark.style.left = `${Math.random() * 100}vw`;
    spark.style.setProperty('--x', `${(Math.random() - 0.5) * 220}px`);
    spark.style.setProperty('--dur', `${10 + Math.random() * 14}s`);
    spark.style.animationDelay = `${Math.random() * -18}s`;
    spark.style.opacity = `${0.18 + Math.random() * 0.35}`;
    document.body.appendChild(spark);
  }
}
createSparks();
window.addEventListener('resize', () => {
  clearTimeout(window.__sparkResize);
  window.__sparkResize = setTimeout(createSparks, 250);
});

// Recalculate motion after switching tabs
const originalShowPage = showPage;
showPage = function(pageName) {
  originalShowPage(pageName);
  setTimeout(updateScrollMotion, 120);
};
