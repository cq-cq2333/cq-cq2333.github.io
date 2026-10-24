/* ==========================================================================
   交互增强层 —— 全部为渐进增强：JS 失效时页面依然完整可读
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. 主题切换 ---------- */
  var root = document.documentElement;
  var toggle = document.getElementById('theme-toggle');

  function syncThemeIcon() {
    if (!toggle) return;
    var isDark = root.getAttribute('data-theme') === 'dark';
    toggle.setAttribute('aria-label', isDark ? '切换到浅色主题' : '切换到深色主题');
    // 暗色时显示太阳（点一下变亮），亮色时显示月亮
    toggle.innerHTML = isDark
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>';
  }

  if (toggle) {
    syncThemeIcon();
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', next === 'dark' ? '#0a0a0c' : '#fbfbf9');
      syncThemeIcon();
    });
  }

  /* ---------- 1b. 锚点链接复制成完整网址（方便直接发给 HR） ---------- */
  if (location.protocol.indexOf('http') === 0) {
    var base = location.href.split('#')[0];
    document.querySelectorAll('[data-copy-anchor]').forEach(function (btn) {
      btn.setAttribute('data-copy', base + '#' + btn.getAttribute('data-copy-anchor'));
    });
  }

  /* ---------- 2. 一键复制 + Toast ---------- */
  var toast = document.getElementById('toast');
  var toastTimer;

  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 1900);
  }

  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    return ok;
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-copy]');
    if (!btn) return;
    var text = btn.getAttribute('data-copy');
    var label = btn.getAttribute('data-copy-label') || text;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { showToast('已复制：' + label); },
        function () { showToast(legacyCopy(text) ? '已复制：' + label : '复制失败，请手动选择'); }
      );
    } else {
      showToast(legacyCopy(text) ? '已复制：' + label : '复制失败，请手动选择');
    }
  });

  /* ---------- 3. 滚动进场（IntersectionObserver） ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el, i) {
      el.style.transitionDelay = Math.min(i % 4, 3) * 70 + 'ms';
      io.observe(el);
    });
    // 兜底：2 秒后仍未出现的元素强制显示（防止锚点直达/异常滚动导致空白）
    setTimeout(function () {
      document.querySelectorAll('.reveal:not(.in)').forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight) el.classList.add('in');
      });
    }, 2000);
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- 4. 数字滚动计数 ---------- */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    el.textContent = '0';
    var dec = parseInt(el.getAttribute('data-decimals') || '0', 10);
    var prefix = el.getAttribute('data-prefix') || '';
    var suffix = el.getAttribute('data-suffix') || '';
    var dur = 1150;
    var start = null;

    function frame(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);           // easeOutCubic
      var val = (target * eased).toFixed(dec);
      if (dec === 0) val = Number(val).toLocaleString('en-US');
      el.textContent = prefix + val + suffix;
      if (p < 1) requestAnimationFrame(frame);
      else {
        var fin = dec === 0 ? Number(target).toLocaleString('en-US') : target.toFixed(dec);
        el.textContent = prefix + fin + suffix;
      }
    }
    requestAnimationFrame(frame);
  }

  var counters = document.querySelectorAll('[data-count]');
  if (!reduceMotion && 'IntersectionObserver' in window) {
    // 先把最终值缓存下来，再归零（保证无 JS / 截图 / 首屏时显示的是正确数字）
    counters.forEach(function (el) { el.setAttribute('data-final', el.textContent); });
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        animateCount(en.target);
        co.unobserve(en.target);
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) {
      if (el.getAttribute('data-prefix') !== null) {
        // 带前缀的（如 1:8.6）保持不动画，避免格式错乱
        return;
      }
      co.observe(el);
    });
  }

  /* ---------- 5. 导航高亮当前区块 ---------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-links a'));
  var sections = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { so.observe(s); });
  }

  /* ---------- 6. 打印前校准数字（避免导出到动画中间帧） ---------- */
  window.addEventListener('beforeprint', function () {
    document.querySelectorAll('[data-count][data-final]').forEach(function (el) {
      el.textContent = el.getAttribute('data-final');
    });
  });

  /* ---------- 7. 年份 ---------- */
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
