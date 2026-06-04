/* Gordon & Smith — servicos.js */

(function () {
  'use strict';

  // Sticky navbar always dark on internal pages
  const navbar = document.getElementById('navbar');
  if (navbar) navbar.classList.add('scrolled');

  // Smooth scroll for in-page anchors
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const offset = 80;
      window.scrollTo({
        top: target.getBoundingClientRect().top + window.scrollY - offset,
        behavior: 'smooth'
      });
    });
  });

  // Animate service sections on scroll
  const srvSections = document.querySelectorAll('.srv-section');

  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('srv-visible');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });

    srvSections.forEach(s => obs.observe(s));
  }

})();
