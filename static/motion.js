// Scroll animations for the public pages. Does nothing when the visitor prefers reduced motion
// (theme.js then leaves the "js" class off, and site.css shows everything without animation).
(function () {
  'use strict';
  var root = document.documentElement;
  if (!root.classList.contains('js')) return;

  // 1. Fade-and-rise for anything marked .pf-reveal as it enters the window.
  var reveals = document.querySelectorAll('.pf-reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e, i) {
        if (!e.isIntersecting) return;
        e.target.style.setProperty('--delay', Math.min(i, 6) * 70 + 'ms');
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  // 2. Scroll-linked motion: the introduction recedes, the timeline line draws itself,
  //    and each entry lights up as the line reaches its dot.
  var intro = document.querySelector('.pf-intro');
  var introInner = document.querySelector('.pf-intro__inner');
  var timeline = document.querySelector('.pf-tl');
  var items = timeline ? Array.prototype.slice.call(timeline.querySelectorAll('.pf-tl__item')) : [];
  var dots = items.map(function (it) { return it.querySelector('.pf-tl__dot'); });
  var ticking = false;

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  function update() {
    ticking = false;
    var vh = window.innerHeight;
    var y = window.scrollY || window.pageYOffset;
    root.style.setProperty('--sy', String(Math.round(y)));
    root.classList.toggle('is-scrolled', y > 8);

    if (intro && introInner && timeline) {
      intro.style.setProperty('--hp', clamp(y / (intro.offsetHeight * 0.8)).toFixed(3));
    }

    if (timeline) {
      // The "head" of the line sits at 62% of the window height, and runs to the
      // bottom of the window as the page ends so the last entry always completes.
      var remaining = root.scrollHeight - (y + vh);
      var head = Math.max(vh * 0.62, vh - remaining);
      var box = timeline.getBoundingClientRect();
      timeline.style.setProperty('--p', clamp((head - box.top) / box.height).toFixed(4));
      for (var i = 0; i < items.length; i++) {
        var d = dots[i].getBoundingClientRect();
        var reached = d.top + d.height / 2 <= head + 1;
        if (reached) items[i].classList.add('is-in');
        items[i].classList.toggle('is-active', reached);
      }
    }
  }

  function onScroll() {
    if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();
