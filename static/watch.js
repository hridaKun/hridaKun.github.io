// Industry watch page: switches between stock charts and shows the price under the pointer.
// On load it also fetches data.json and redraws the page when that data is newer than what
// the page was published with (on GitHub Pages a workflow refreshes it every 6 hours).
(function () {
  'use strict';
  var page = document.querySelector('.pf-watch');
  if (!page) return;
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  // Chart geometry; matches chart_svg() in server.py.
  var W = 720, H = 260, LEFT = 4, RIGHT = 64, TOP = 16, BOTTOM = 30;

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function parts(iso) { var p = iso.slice(0, 10).split('-'); return { y: p[0], m: MONTHS[Number(p[1]) - 1], d: Number(p[2]) }; }
  function niceDate(iso) { var p = parts(iso); return (p.d < 10 ? '0' : '') + p.d + ' ' + p.m + ' ' + p.y; }
  function shortDate(iso) { var p = parts(iso); return p.d + ' ' + p.m; }
  function hoverDate(iso) { var p = parts(iso); return p.d + ' ' + p.m + ' ' + p.y; }

  function scale(points) {
    var closes = points.map(function (p) { return p[1]; });
    var lo = Math.min.apply(null, closes), hi = Math.max.apply(null, closes);
    var pad = (hi - lo) * 0.08 || 1;
    return { lo: lo - pad, hi: hi + pad, min: lo, max: hi, n: points.length };
  }
  function xAt(i, n) { return LEFT + i * (W - LEFT - RIGHT) / (n - 1); }
  function yAt(v, s) { return TOP + (s.hi - v) * (H - TOP - BOTTOM) / (s.hi - s.lo); }

  // ---------- drawing from data.json ----------
  function change(label, value) {
    var up = value >= 0;
    return '<span class="pf-change pf-change--' + (up ? 'up' : 'down') + '"><span class="pf-change__label">' + label +
      '</span> <span aria-hidden="true">' + (up ? '▲' : '▼') + '</span> ' + (up ? '+' : '−') + Math.abs(value).toFixed(2) + '%</span>';
  }
  function pct(a, b) { return a ? (b - a) / a * 100 : 0; }

  function chartSvg(stock) {
    var pts = stock.points, s = scale(pts), n = s.n, sym = esc(stock.symbol);
    var path = 'M' + pts.map(function (p, i) { return xAt(i, n).toFixed(1) + ' ' + yAt(p[1], s).toFixed(1); }).join(' L');
    var area = path + ' L' + xAt(n - 1, n).toFixed(1) + ' ' + (H - BOTTOM) + ' L' + xAt(0, n).toFixed(1) + ' ' + (H - BOTTOM) + ' Z';
    var grid = '';
    for (var k = 0; k < 5; k++) {
      var v = s.lo + (s.hi - s.lo) * k / 4, gy = yAt(v, s);
      grid += '<line class="pf-chart__grid" x1="' + LEFT + '" x2="' + (W - RIGHT) + '" y1="' + gy.toFixed(1) + '" y2="' + gy.toFixed(1) + '"/>' +
        '<text class="pf-chart__label" x="' + (W - RIGHT + 10) + '" y="' + (gy + 4).toFixed(1) + '">' + v.toFixed(2) + '</text>';
    }
    var ticks = '';
    [0, Math.floor(n / 2), n - 1].filter(function (v, i, a) { return a.indexOf(v) === i; }).forEach(function (i) {
      var anchor = i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle';
      ticks += '<text class="pf-chart__label" x="' + xAt(i, n).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="' + anchor + '">' + shortDate(pts[i][0]) + '</text>';
    });
    var label = stock.symbol + ' daily closing price from ' + niceDate(pts[0][0]) + ' to ' + niceDate(pts[n - 1][0]) +
      ', between ' + s.min.toFixed(2) + ' and ' + s.max.toFixed(2) + ' ' + stock.currency;
    return '<svg class="pf-chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(label) + '">' +
      '<defs><linearGradient id="fill-' + sym + '" x1="0" y1="0" x2="0" y2="1"><stop class="pf-chart__stop-top" offset="0"/><stop class="pf-chart__stop-bottom" offset="1"/></linearGradient></defs>' +
      grid + '<path class="pf-chart__area" d="' + area + '" fill="url(#fill-' + sym + ')"/>' +
      '<path class="pf-chart__line" d="' + path + '"/>' +
      '<line class="pf-chart__cross" x1="0" x2="0" y1="' + TOP + '" y2="' + (H - BOTTOM) + '"/>' +
      '<circle class="pf-chart__dot" r="5" cx="0" cy="0"/>' + ticks + '</svg>';
  }

  function drawStocks(data) {
    var stocks = data.config.tickers.map(function (t) { return data.stocks[t]; })
      .filter(function (s) { return s && s.points && s.points.length > 1; });
    if (!stocks.length) return null;
    var tabs = '', charts = '';
    stocks.forEach(function (s, i) {
      var pts = s.points, last = pts[pts.length - 1][1], prev = pts[pts.length - 2][1], first = pts[0][1], sym = esc(s.symbol);
      tabs += '<button class="pf-ticker" type="button" role="tab" id="tab-' + sym + '" aria-selected="' + (i === 0) + '" aria-controls="chart-' + sym + '">' +
        '<span class="pf-ticker__symbol">' + sym + '</span><span class="pf-ticker__name">' + esc(s.name) + '</span>' +
        '<span class="pf-ticker__price">' + last.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
        ' <small>' + esc(s.currency) + '</small></span><span class="pf-ticker__changes">' + change('1D', pct(prev, last)) + change('6M', pct(first, last)) + '</span></button>';
      charts += '<figure class="pf-chartbox" role="tabpanel" id="chart-' + sym + '" aria-labelledby="tab-' + sym + '" data-points="' + esc(JSON.stringify(pts)) +
        '" data-currency="' + esc(s.currency) + '"' + (i === 0 ? '' : ' data-inactive') + '>' +
        '<figcaption class="pf-chartbox__caption">' + sym + ' · daily close · ' + niceDate(pts[0][0]) + ' to ' + niceDate(pts[pts.length - 1][0]) + '</figcaption>' +
        chartSvg(s) + '<div class="pf-chart__tip" aria-hidden="true" hidden></div></figure>';
    });
    return '<div class="pf-tickers" role="tablist" aria-label="Stocks">' + tabs + '</div>' + charts +
      '<p class="pf-card__note">End-of-day prices from ' + esc(stocks[0].source || '') + '. For interest only, not investment advice.</p>';
  }

  function drawNews(data) {
    var items = (data.news || []).filter(function (n) { return /^https?:\/\//i.test(n.url || ''); });
    if (!items.length) return null;
    return '<ol class="pf-news">' + items.map(function (n) {
      var meta = [n.source, n.date ? niceDate(n.date) : ''].filter(Boolean).join(' · ');
      return '<li class="pf-news__item"><p class="pf-news__meta">' + esc(meta) + '</p><a class="pf-news__title" href="' + esc(n.url) +
        '" rel="noopener noreferrer">' + esc(n.title) + '</a></li>';
    }).join('') + '</ol>';
  }

  function redraw(data) {
    var stocks = drawStocks(data), news = drawNews(data);
    var stockBox = page.querySelector('.pf-stocks'), newsBox = page.querySelector('.pf-newsbox');
    if (stocks && stockBox) stockBox.innerHTML = stocks;   // every value is escaped above
    if (news && newsBox) newsBox.innerHTML = news;
    var updated = page.querySelector('.pf-watch__updated');
    if (updated) updated.textContent = 'Updated ' + niceDate(data.updated) + '.';
    page.setAttribute('data-updated', data.updated);
    setup();
  }

  // ---------- tabs and hover ----------
  function setup() {
    var tabs = Array.prototype.slice.call(page.querySelectorAll('.pf-ticker'));
    var boxes = Array.prototype.slice.call(page.querySelectorAll('.pf-chartbox'));

    function select(tab) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        var box = document.getElementById(t.getAttribute('aria-controls'));
        if (box) { if (on) box.removeAttribute('data-inactive'); else box.setAttribute('data-inactive', ''); }
      });
    }
    tabs.forEach(function (tab, i) {
      tab.tabIndex = i === 0 ? 0 : -1;
      tab.addEventListener('click', function () { select(tab); });
      tab.addEventListener('keydown', function (e) {
        var by = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!by) return;
        e.preventDefault();
        var next = tabs[(i + by + tabs.length) % tabs.length];
        select(next);
        next.focus();
      });
    });

    boxes.forEach(function (box) {
      var points;
      try { points = JSON.parse(box.getAttribute('data-points')); } catch (e) { return; }
      var svg = box.querySelector('svg'), cross = box.querySelector('.pf-chart__cross'), dot = box.querySelector('.pf-chart__dot');
      var tip = box.querySelector('.pf-chart__tip'), line = box.querySelector('.pf-chart__line');
      var currency = box.getAttribute('data-currency') || '', s = scale(points), n = s.n;

      // Draw the line in when the chart first scrolls into view.
      if (line && line.getTotalLength && document.documentElement.classList.contains('js') && 'IntersectionObserver' in window) {
        var len = line.getTotalLength();
        line.style.strokeDasharray = len;
        line.style.strokeDashoffset = len;
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (!en.isIntersecting) return;
            line.classList.add('is-drawn');
            line.style.strokeDashoffset = '0';
            io.disconnect();
          });
        }, { threshold: 0.3 });
        io.observe(box);
      }

      function show(clientX) {
        var r = svg.getBoundingClientRect();
        var i = Math.round(((clientX - r.left) / r.width * W - LEFT) / (W - LEFT - RIGHT) * (n - 1));
        i = Math.max(0, Math.min(n - 1, i));
        var x = xAt(i, n), y = yAt(points[i][1], s);
        cross.setAttribute('x1', x); cross.setAttribute('x2', x);
        dot.setAttribute('cx', x); dot.setAttribute('cy', y);
        box.classList.add('is-hover');
        tip.hidden = false;
        tip.textContent = hoverDate(points[i][0]) + ' · ' + points[i][1].toFixed(2) + ' ' + currency;
        var half = tip.offsetWidth / 2;
        tip.style.left = Math.max(half, Math.min(r.width - half, x / W * r.width)) + 'px';
      }
      svg.addEventListener('pointermove', function (e) { show(e.clientX); });
      svg.addEventListener('pointerdown', function (e) { show(e.clientX); });
      svg.addEventListener('pointerleave', function () { box.classList.remove('is-hover'); tip.hidden = true; });
    });
  }

  setup();

  var src = page.getAttribute('data-src');
  if (src && window.fetch) {
    fetch(src, { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
      if (data && data.updated && data.config && data.updated > (page.getAttribute('data-updated') || '')) redraw(data);
    }).catch(function () { /* keep what the page was published with */ });
  }
})();
