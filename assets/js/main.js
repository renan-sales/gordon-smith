/* Gordon & Smith — main.js */

(function () {
  'use strict';

  // ── Navbar scroll effect ──────────────────────────────────
  const navbar = document.getElementById('navbar');
  function handleScroll() {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  }
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // ── Mobile menu ───────────────────────────────────────────
  const menuToggle = document.getElementById('menuToggle');
  const navLinks   = document.getElementById('navLinks');

  menuToggle.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    menuToggle.classList.toggle('open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  });

  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      menuToggle.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  // Close menu on outside click
  document.addEventListener('click', e => {
    if (!navbar.contains(e.target) && navLinks.classList.contains('open')) {
      navLinks.classList.remove('open');
      menuToggle.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
  });

  // ── Active nav link on scroll ─────────────────────────────
  const sections = document.querySelectorAll('section[id]');
  const navAnchors = navLinks.querySelectorAll('a[href^="#"]');

  function updateActiveLink() {
    let current = '';
    sections.forEach(sec => {
      if (window.scrollY >= sec.offsetTop - 120) current = sec.id;
    });
    navAnchors.forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === '#' + current);
    });
  }

  window.addEventListener('scroll', updateActiveLink, { passive: true });

  // ── Scroll animations ─────────────────────────────────────
  const aosEls = document.querySelectorAll('[data-aos]');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });

    aosEls.forEach(el => observer.observe(el));
  } else {
    aosEls.forEach(el => el.classList.add('visible'));
  }

  // ── Counter animation for stats ───────────────────────────
  const statEls = document.querySelectorAll('.stat-item strong');

  function animateCount(el) {
    const text = el.textContent.trim();
    const match = text.match(/^(\d+)/);
    if (!match) return;
    const target = parseInt(match[1], 10);
    const suffix = text.slice(match[0].length);
    let start = 0;
    const duration = 1400;
    const step = 16;
    const increment = target / (duration / step);

    const timer = setInterval(() => {
      start = Math.min(start + increment, target);
      el.textContent = Math.floor(start) + suffix;
      if (start >= target) clearInterval(timer);
    }, step);
  }

  if ('IntersectionObserver' in window) {
    const statsObs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          animateCount(e.target);
          statsObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.5 });

    statEls.forEach(el => statsObs.observe(el));
  }

  // ── Form submission ───────────────────────────────────────
  const form = document.getElementById('contatoForm');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();

      const nome = form.querySelector('[name="nome"]');
      const tel  = form.querySelector('[name="telefone"]');

      // Remove previous messages
      form.querySelectorAll('.form-msg').forEach(m => m.remove());

      if (!nome.value.trim()) {
        showMsg(form, 'Por favor, informe seu nome.', 'error');
        nome.focus();
        return;
      }

      if (!tel.value.trim()) {
        showMsg(form, 'Por favor, informe seu WhatsApp.', 'error');
        tel.focus();
        return;
      }

      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'ENVIANDO...';

      // Build WhatsApp message
      const empresa  = form.querySelector('[name="empresa"]')?.value || '';
      const email    = form.querySelector('[name="email"]')?.value || '';
      const servico  = form.querySelector('[name="servico"]')?.value || '';
      const mensagem = form.querySelector('[name="mensagem"]')?.value || '';

      const msg = [
        `Olá! Me chamo *${nome.value.trim()}*${empresa ? ` da marca *${empresa}*` : ''}.`,
        servico  ? `Interesse: *${servico}*` : '',
        mensagem ? `Mensagem: ${mensagem}` : '',
        email    ? `E-mail: ${email}` : '',
        `Tel: ${tel.value.trim()}`,
      ].filter(Boolean).join('\n');

      setTimeout(() => {
        showMsg(form, 'Mensagem enviada! Redirecionando para o WhatsApp...', 'success');
        btn.disabled = false;
        btn.textContent = 'ENVIAR MENSAGEM';
        setTimeout(() => {
          window.open(`https://wa.me/551126621100?text=${encodeURIComponent(msg)}`, '_blank');
          form.reset();
          form.querySelectorAll('.form-msg').forEach(m => m.remove());
        }, 1200);
      }, 600);
    });
  }

  function showMsg(form, text, type) {
    const p = document.createElement('p');
    p.className = `form-msg ${type}`;
    p.textContent = text;
    form.appendChild(p);
    p.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ── Video mute toggles ───────────────────────────────────
  document.querySelectorAll('.btn-mute').forEach(btn => {
    btn.addEventListener('click', () => {
      const video = document.getElementById(btn.dataset.target);
      if (!video) return;
      video.muted = !video.muted;
      btn.classList.toggle('sound-on', !video.muted);
      btn.setAttribute('aria-label', video.muted ? 'Ativar som' : 'Desativar som');
    });
  });

  // ── Smooth scroll for anchor links ───────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const offset = parseInt(getComputedStyle(document.documentElement)
        .getPropertyValue('--nav-h'), 10) || 80;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

})();
