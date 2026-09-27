/* ============================================================================
   JANUS · Seguridad Privada Integral
   Comportamiento — CAPA LÓGICA (sin estilos)
   ----------------------------------------------------------------------------
   01 · Utilidades            06 · Contadores animados
   02 · Cabecera y progreso  07 · Tarjetas 3D (tilt)
   03 · Menú móvil           08 · Parallax
   04 · Slider del hero      09 · Marquesina infinita
   05 · Reveal on scroll    10 · Formularios + toast
   ========================================================================== */
(function () {
  'use strict';

  /* ─────────────────────────── 01 · UTILIDADES ─────────────────────────── */
  var $  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');
  var COARSE  = window.matchMedia('(hover: none)');
  var isReduced = function () { return REDUCED.matches; };
  var canHover  = function () { return !COARSE.matches; };

  var clamp = function (v, min, max) { return Math.min(Math.max(v, min), max); };

  function raf(fn) { return window.requestAnimationFrame(fn); }

  /* Espesado simple para scroll/resize */
  function onFrame(fn) {
    var queued = false;
    return function () {
      if (queued) return;
      queued = true;
      raf(function () { queued = false; fn(); });
    };
  }

  function setYear() {
    $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }


  /* ────────────────────── 02 · CABECERA Y PROGRESO ────────────────────── */
  function initHeader() {
    var nav      = $('[data-nav]');
    var progress = $('[data-progress]');
    var links    = $$('.nav__links a');
    var sections = links
      .map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); })
      .filter(Boolean);

    var update = onFrame(function () {
      var y = window.scrollY || window.pageYOffset;

      if (nav) nav.classList.toggle('is-stuck', y > 24);

      if (progress) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.width = (max > 0 ? clamp(y / max, 0, 1) * 100 : 0) + '%';
      }

      /* Marca el enlace de la sección visible */
      var current = null;
      var line = y + (nav ? nav.offsetHeight : 0) + 90;
      sections.forEach(function (sec) {
        if (sec.offsetTop <= line) current = sec.id;
      });
      links.forEach(function (a) {
        a.classList.toggle('is-current', a.getAttribute('href') === '#' + current);
      });
    });

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }


  /* ───────────────────────── 03 · MENÚ MÓVIL ───────────────────────── */
  function initMobileMenu() {
    var toggle  = $('[data-nav-toggle]');
    var drawer  = $('[data-nav-drawer]');
    var nav     = $('[data-nav]');
    if (!toggle || !drawer) return;

    var setOpen = function (open) {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Cerrar menú de navegación' : 'Abrir menú de navegación');
      drawer.classList.toggle('is-open', open);
      if (nav) nav.classList.toggle('is-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    };

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    $$('a', drawer).forEach(function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });

    /* Se cierra solo si se vuelve a desktop */
    window.matchMedia('(min-width: 901px)').addEventListener('change', function (e) {
      if (e.matches) setOpen(false);
    });
  }


  /* ────────────────────── 04 · SLIDER DEL HERO ────────────────────── */
  function initSlider() {
    var root = $('[data-slider]');
    if (!root) return;

    var slides  = $$('[data-slide]', root);
    var panels  = $$('[data-panel]', root);
    var dots    = $$('[data-slide-to]', root);
    var prevBtn = $('[data-slide-prev]', root);
    var nextBtn = $('[data-slide-next]', root);
    var playBtn = $('[data-slide-toggle]', root);
    var counter = $('[data-slide-index]', root);
    var totalEl = $('[data-slide-total]', root);

    if (!slides.length) return;

    var DURATION = 7000;
    var index = 0;
    var timer = null;
    var playing = !isReduced();
    var pointer = { x: 0, y: 0 };

    root.style.setProperty('--slide-dur', DURATION + 'ms');
    if (totalEl) totalEl.textContent = pad(slides.length);

    function pad(n) { return (n < 10 ? '0' : '') + n; }

    function goTo(next, userAction) {
      index = (next + slides.length) % slides.length;

      slides.forEach(function (s, i) {
        s.classList.toggle('is-active', i === index);
        s.setAttribute('aria-hidden', String(i !== index));
      });

      panels.forEach(function (p, i) {
        var on = i === index;
        p.classList.toggle('is-active', on);
        p.setAttribute('aria-hidden', String(!on));
        /* Los paneles ocultos no deben recibir foco */
        $$('a, button, input, select, textarea', p).forEach(function (el) {
          if (on) el.removeAttribute('tabindex');
          else el.setAttribute('tabindex', '-1');
        });
      });

      dots.forEach(function (d, i) {
        var on = i === index;
        d.classList.toggle('is-active', on);
        if (on) d.setAttribute('aria-current', 'true');
        else d.removeAttribute('aria-current');
        /* Reinicia la barra de progreso */
        var fill = $('i', d);
        if (fill) { fill.style.animation = 'none'; void fill.offsetWidth; fill.style.animation = ''; }
      });

      if (counter) counter.textContent = pad(index + 1);

      /* Retorno háptico visual: el punto activo "rebota" al navegar a mano */
      if (userAction) {
        var active = dots[index];
        if (active) {
          active.classList.remove('is-bump');
          void active.offsetWidth;
          active.classList.add('is-bump');
        }
      }

      restart();
    }

    function next() { goTo(index + 1, true); }
    function prev() { goTo(index - 1, true); }

    function start() {
      stop();
      if (!playing) return;
      timer = window.setInterval(function () { goTo(index + 1); }, DURATION);
    }
    function stop() { if (timer) { window.clearInterval(timer); timer = null; } }
    function restart() { stop(); start(); }

    function setPlaying(state) {
      playing = state;
      if (playBtn) {
        playBtn.setAttribute('aria-pressed', String(!playing));
        playBtn.setAttribute('aria-label', playing ? 'Pausar reproducción' : 'Reanudar reproducción');
      }
      playing ? restart() : stop();
    }

    nextBtn && nextBtn.addEventListener('click', next);
    prevBtn && prevBtn.addEventListener('click', prev);
    playBtn && playBtn.addEventListener('click', function () { setPlaying(!playing); });

    dots.forEach(function (d) {
      d.addEventListener('click', function () { goTo(parseInt(d.dataset.slideTo, 10), true); });
    });

    /* Teclado (cuando el hero tiene foco) */
    root.setAttribute('tabindex', '-1');
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); prev(); }
    });

    /* Pausa al pasar el mouse o al enfocar los controles */
    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', start);
    root.addEventListener('focusin', stop);
    root.addEventListener('focusout', function (e) {
      if (!root.contains(e.relatedTarget)) start();
    });

    /* No gastar ciclos con la pestaña en segundo plano */
    document.addEventListener('visibilitychange', function () {
      document.hidden ? stop() : start();
    });

    /* Gesto de swipe */
    root.addEventListener('pointerdown', function (e) {
      pointer.x = e.clientX; pointer.y = e.clientY;
    }, { passive: true });

    root.addEventListener('pointerup', function (e) {
      var dx = e.clientX - pointer.x;
      var dy = e.clientY - pointer.y;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) {
        dx < 0 ? next() : prev();
      }
    }, { passive: true });

    /* Micro-interacción: el logo sigue al cursor */
    if (canHover() && !isReduced()) {
      var mark = $('[data-parallax]', root);
      if (mark) {
        root.addEventListener('pointermove', function (e) {
          var r = root.getBoundingClientRect();
          var nx = (e.clientX - r.left) / r.width - .5;
          var ny = (e.clientY - r.top) / r.height - .5;
          mark.style.setProperty('--px', (nx * 26).toFixed(2) + 'px');
          mark.style.setProperty('--py', (ny * 20).toFixed(2) + 'px');
        }, { passive: true });
      }
    }

    goTo(0);
  }


  /* ───────────────────── 05 · REVEAL ON SCROLL ───────────────────── */
  var revealObserver = null;

  function initReveal() {
    var items = $$('[data-reveal]');
    if (!items.length) return;

    if (isReduced() || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });

    items.forEach(function (el) { revealObserver.observe(el); });
  }


  /* ─────────────────── 06 · CONTADORES ANIMADOS ─────────────────── */
  function initCounters() {
    var counters = $$('[data-count]');
    if (!counters.length) return;

    var run = function (el) {
      var target = parseFloat(el.dataset.count);
      if (isNaN(target)) return;
      var prefix = el.dataset.prefix || '';
      var dur = 1400;
      var t0 = null;

      var step = function (t) {
        if (t0 === null) t0 = t;
        var p = clamp((t - t0) / dur, 0, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + Math.round(target * eased);
        if (p < 1) raf(step);
      };
      raf(step);
    };

    if (isReduced() || !('IntersectionObserver' in window)) {
      counters.forEach(function (el) { el.textContent = (el.dataset.prefix || '') + el.dataset.count; });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        run(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.6 });

    counters.forEach(function (el) { io.observe(el); });
  }


  /* ────────────────── 07 · TARJETAS 3D (TILT) ────────────────── */
  function initTilt() {
    if (!canHover() || isReduced()) return;

    $$('.card--tilt').forEach(function (card) {
      var rafId = null;
      var rx = 0, ry = 0;

      var apply = function () {
        rafId = null;
        card.style.transform =
          'perspective(900px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) translateY(-6px)';
      };

      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - .5;
        var py = (e.clientY - r.top) / r.height - .5;
        ry = px * 9;
        rx = -py * 7;
        if (!rafId) rafId = raf(apply);
      });

      card.addEventListener('pointerleave', function () {
        rx = ry = 0;
        if (!rafId) rafId = raf(apply);
        card.style.transform = '';
      });
    });
  }


  /* ───────────────────────── 08 · PARALLAX ───────────────────────── */
  function initParallax() {
    var items = $$('[data-parallax]');
    if (!items.length || isReduced()) return;

    var update = onFrame(function () {
      var vh = window.innerHeight;
      items.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var factor = parseFloat(el.dataset.parallax) || 0.15;
        var offset = (r.top + r.height / 2 - vh / 2) * factor;
        el.style.setProperty('--shift', (-offset).toFixed(1) + 'px');
      });
    });

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }

  /* Línea de tiempo del proceso: se rellena al avanzar el scroll */
  function initProcessLine() {
    var list = $('[data-process] .process__list');
    if (!list || isReduced()) return;

    var update = onFrame(function () {
      var r = list.getBoundingClientRect();
      var vh = window.innerHeight;
      var progress = clamp((vh * 0.72 - r.top) / (r.width || 1), 0, 1);
      list.style.setProperty('--p', (progress * 100).toFixed(1) + '%');
    });

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }


  /* ───────────────── 09 · MARQUESINA INFINITA ───────────────── */
  function initMarquee() {
    $$('[data-marquee]').forEach(function (wrap) {
      var track = $('[data-marquee-track]', wrap);
      if (!track) return;

      /* Se duplica el contenido para que el bucle sea perfecto */
      var clone = track.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      while (clone.firstChild) track.appendChild(clone.firstChild);
    });
  }


  /* ──────────────── 10 · FORMULARIOS + TOAST ──────────────── */
  function initToast() {
    var el = $('[data-toast]');
    var hideTimer = null;

    return function (message) {
      if (!el) return;
      el.textContent = message;
      el.classList.add('is-visible');
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(function () { el.classList.remove('is-visible'); }, 6000);
    };
  }

  function initForms() {
    var toast = initToast();

    var MESSAGES = {
      cv: '¡Gracias! Abrimos WhatsApp para que envíes tu CV.',
      consulta: '¡Gracias! Abrimos WhatsApp para que completemos tu consulta.'
    };

    var WHATSAPP = '5491155887635';

    var setError = function (field, message) {
      var wrap = field.closest('.field');
      if (!wrap) return;
      wrap.classList.toggle('is-invalid', !!message);
      var slot = $('[data-error]', wrap);
      if (slot) slot.textContent = message || '';
    };

    /* "Sede de interés (opcional)?" → "sede de interés" */
    var cleanLabel = function (field) {
      var label = $('label', field.closest('.field'));
      if (!label) return 'este campo';
      return label.textContent
        .replace('(opcional)', '')
        .replace(/[¿?¡!:.…\s]+$/, '')
        .replace(/^[¿¡\s]+/, '')
        .trim() || 'este campo';
    };

    var validate = function (field) {
      var value = (field.value || '').trim();

      if (field.tagName === 'SELECT') {
        return field.hasAttribute('required') && !value ? 'Seleccioná ' + cleanLabel(field).toLowerCase() + '.' : '';
      }
      if (field.hasAttribute('required') && !value) return 'Ingresá ' + cleanLabel(field).toLowerCase() + '.';
      if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(value)) {
        return 'Revisá el formato del email.';
      }
      if (field.type === 'tel' && value && value.replace(/\D/g, '').length < 8) {
        return 'Ingresá un teléfono válido.';
      }
      return '';
    };

    $$('[data-form]').forEach(function (form) {
      var kind = form.dataset.form;

      /* Validación en vivo al salir del campo */
      $$('input, select, textarea', form).forEach(function (field) {
        field.addEventListener('blur', function () { setError(field, validate(field)); });
        field.addEventListener('input', function () {
          if (field.closest('.field').classList.contains('is-invalid')) {
            setError(field, validate(field));
          }
        });
      });

      form.addEventListener('submit', function (e) {
        e.preventDefault();

        var fields = $$('input, select, textarea', form);
        var invalid = fields.filter(function (f) { return validate(f); });

        fields.forEach(function (f) { setError(f, validate(f)); });

        if (invalid.length) {
          invalid[0].focus();
          toast('Revisá los campos marcados en rojo.');
          return;
        }

        /* Arma el resumen y lo envía por WhatsApp */
        var lines = fields
          .filter(function (f) { return (f.value || '').trim() && f.name; })
          .map(function (f) { return cleanLabel(f) + ': ' + f.value.trim(); });

        var text = (kind === 'cv' ? 'Postulación JANUS' : 'Consulta JANUS') + '\n' + lines.join('\n');
        window.open('https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(text), '_blank', 'noopener');

        form.reset();
        toast(MESSAGES[kind] || '¡Gracias! Te contactamos pronto.');
      });
    });
  }


  /* ─────────────────────────── Arranque ─────────────────────────── */
  function boot() {
    setYear();
    initHeader();
    initMobileMenu();
    initSlider();
    initReveal();
    initCounters();
    initTilt();
    initParallax();
    initProcessLine();
    initMarquee();
    initForms();
    document.body.classList.add('is-ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
