// Applies the saved (or system) theme before first paint, then wires the toggle.
(function () {
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem('theme'); } catch (e) {}
  var dark = saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  root.setAttribute('data-theme', dark ? 'dark' : 'light');
  // "js" switches on the scroll animations in site.css; skipped when the visitor asks for less motion.
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) root.classList.add('js');

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.querySelector('.pf-toggle');
    if (!btn) return;
    btn.setAttribute('aria-pressed', String(root.getAttribute('data-theme') === 'dark'));
    btn.addEventListener('click', function () {
      var toDark = root.getAttribute('data-theme') !== 'dark';
      root.setAttribute('data-theme', toDark ? 'dark' : 'light');
      btn.setAttribute('aria-pressed', String(toDark));
      try { localStorage.setItem('theme', toDark ? 'dark' : 'light'); } catch (e) {}
    });
  });
})();
