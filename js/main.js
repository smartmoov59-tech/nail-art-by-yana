/* Nail Art by Yana · animations (GSAP + ScrollTrigger + Lenis, tout en local) */
(() => {
  'use strict';

  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover:hover) and (pointer:fine)').matches;
  let lenis = null;
  const stopScroll = () => lenis && lenis.stop();
  const startScroll = () => lenis && lenis.start();
  const goTo = (target, offset = 0) => {
    if (typeof target === 'string') target = $(target);
    if (!target) return;
    if (lenis) lenis.scrollTo(target, { offset, duration: 1.6, easing: t => 1 - Math.pow(1 - t, 4) });
    else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };

  /* Sans GSAP (bloqué, hors-ligne…), le site reste lisible : pas de loader, pas de pin */
  if (!window.gsap || !window.ScrollTrigger) {
    root.classList.add('no-pin');
    const l = $('#loader'); if (l) l.remove();
    initPlain();
    return;
  }
  if (reduce) root.classList.add('no-pin');

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* ------------------------------------------------------------------ */
  /* Défilement fluide                                                   */
  /* ------------------------------------------------------------------ */
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* ------------------------------------------------------------------ */
  /* Découpage du texte : mots / lettres sous masque                     */
  /* ------------------------------------------------------------------ */
  function splitEl(el, mode) {
    if (el.dataset.splitDone) return $$('.c', el);
    if (!el.closest('[aria-label]')) el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'w'; w.setAttribute('aria-hidden', 'true');
            if (mode === 'chars') {
              [...part].forEach(ch => {
                const c = document.createElement('span'); c.className = 'c'; c.textContent = ch; w.appendChild(c);
              });
            } else {
              const c = document.createElement('span'); c.className = 'c'; c.textContent = part; w.appendChild(c);
            }
            frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
    el.dataset.splitDone = '1';
    return $$('.c', el);
  }

  const heroChars = $$('.hero__title .ln').flatMap(el => splitEl(el, 'chars'));
  const footChars = $$('.foot__word [data-split]').flatMap(el => splitEl(el, 'chars'));
  const headings = $$('.h2[data-split]').map(el => ({ el, cs: splitEl(el, 'words') }));

  /* ------------------------------------------------------------------ */
  /* Loader : un ongle qui se remplit de vernis, puis le rideau monte    */
  /* ------------------------------------------------------------------ */
  const ready = Promise.race([
    Promise.all([document.fonts ? document.fonts.ready : Promise.resolve(),
      new Promise(r => document.readyState === 'complete' ? r() : addEventListener('load', r, { once: true }))]),
    new Promise(r => setTimeout(r, 3000))
  ]);

  function runLoader() {
    return new Promise(resolve => {
      const loader = $('#loader');
      if (!loader || reduce) { if (loader) loader.remove(); return resolve(); }
      stopScroll();
      const fill = $('.loader__fill'), count = $('#loaderCount'), box = $$('.loader__box > *');
      const st = { p: 0 };
      gsap.set(fill, { y: 64 });
      gsap.set(box, { opacity: 0, y: 24 });
      gsap.set(heroChars, { yPercent: 125, rotate: 6 });
      gsap.set('[data-hero-in]', { opacity: 0, y: 34 });
      gsap.set('.nav > *', { opacity: 0, y: -18 });

      const tl = gsap.timeline({ onComplete: () => { loader.remove(); startScroll(); resolve(); } });
      tl.to(box, { opacity: 1, y: 0, duration: .8, stagger: .1, ease: 'power3.out' })
        .to(fill, { y: 0, duration: 1.6, ease: 'power2.inOut' }, .15)
        .to(st, { p: 100, duration: 1.6, ease: 'power2.inOut', onUpdate: () => { count.textContent = Math.round(st.p); } }, .15)
        .add(() => { tl.pause(); ready.then(() => tl.resume()); })
        .to('.loader__shine', { opacity: 0, duration: .2 })
        .to('.loader__nail', { scale: 1.25, duration: .7, ease: 'power3.inOut' }, '<')
        .to(box, { opacity: 0, y: -30, duration: .5, stagger: .05, ease: 'power2.in' }, '<')
        .to('.loader__panel', { yPercent: -104, duration: 1.2, ease: 'expo.inOut' }, '-=.25')
        .add(heroIntro, '-=.7');
    });
  }

  function heroIntro() {
    const tl = gsap.timeline();
    tl.from('.hero__video', { scale: 1.3, duration: 2.6, ease: 'power3.out' }, 0)
      .to(heroChars, { yPercent: 0, rotate: 0, duration: 1.5, stagger: .05, ease: 'expo.out' }, .1)
      .to('[data-hero-in]', { opacity: 1, y: 0, duration: 1.1, stagger: .12, ease: 'power3.out' }, .5)
      .to('.nav > *', { opacity: 1, y: 0, duration: 1, stagger: .07, ease: 'power3.out' }, .7)
      .from('.fl', { opacity: 0, duration: 1.4, stagger: .1, ease: 'power2.out' }, .6);
  }

  /* ------------------------------------------------------------------ */
  /* Navigation, progression, curseur                                    */
  /* ------------------------------------------------------------------ */
  const nav = $('#nav');
  let lastY = 0;
  addEventListener('scroll', () => {
    const y = scrollY, d = y - lastY;
    nav.classList.toggle('is-solid', y > 70);
    if (Math.abs(d) > 4) {
      if (!nav.classList.contains('menu-open')) nav.classList.toggle('is-hidden', d > 0 && y > 260);
      lastY = y;
    }
  }, { passive: true });

  const barSet = gsap.quickSetter('.progress span', 'scaleX');
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: s => barSet(s.progress) });

  if (finePointer && !reduce) {
    const dot = $('.cursor__dot'), ring = $('.cursor__ring'), cur = $('.cursor');
    const rx = gsap.quickTo(ring, 'x', { duration: .55, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: .55, ease: 'power3' });
    const dx = gsap.quickTo(dot, 'x', { duration: .1 }), dy = gsap.quickTo(dot, 'y', { duration: .1 });
    addEventListener('pointermove', e => { rx(e.clientX); ry(e.clientY); dx(e.clientX); dy(e.clientY); }, { passive: true });
    document.addEventListener('pointerover', e => cur.classList.toggle('is-hover', !!e.target.closest('a,button,.row,summary,.gal,input,select,.reviews__track')));
  }

  /* boutons magnétiques */
  if (finePointer && !reduce) {
    $$('[data-magnetic]').forEach(el => {
      const xTo = gsap.quickTo(el, 'x', { duration: .7, ease: 'elastic.out(1,.55)' });
      const yTo = gsap.quickTo(el, 'y', { duration: .7, ease: 'elastic.out(1,.55)' });
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * .32);
        yTo((e.clientY - r.top - r.height / 2) * .4);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  /* inclinaison 3D + reflet qui suit la souris */
  if (finePointer && !reduce) {
    $$('.tilt').forEach(el => {
      const max = el.classList.contains('card') ? 9 : 12;
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        gsap.to(el, { rotateY: (px - .5) * max * 2, rotateX: -(py - .5) * max * 2, transformPerspective: 900, duration: .6, ease: 'power3.out', overwrite: 'auto' });
        el.style.setProperty('--mx', px * 100 + '%');
        el.style.setProperty('--my', py * 100 + '%');
      });
      el.addEventListener('pointerleave', () => gsap.to(el, { rotateX: 0, rotateY: 0, duration: .9, ease: 'power3.out', overwrite: 'auto' }));
    });
  }

  /* menu mobile plein écran */
  const burger = $('#burger'), menu = $('#menu');
  let menuOpen = false;
  function setMenu(open) {
    if (open === menuOpen) return;
    menuOpen = open;
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    menu.setAttribute('aria-hidden', !open);
    nav.classList.toggle('menu-open', open);
    if (open) {
      stopScroll();
      gsap.set(menu, { visibility: 'visible' });
      gsap.to(menu, { clipPath: 'circle(150% at 95% 4%)', duration: reduce ? .01 : 1, ease: 'power3.inOut' });
      gsap.fromTo('.menu nav a', { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: .06, duration: .9, delay: .3, ease: 'power4.out' });
      gsap.fromTo('.menu__foot', { opacity: 0 }, { opacity: 1, delay: .7, duration: .8 });
    } else {
      startScroll();
      gsap.to(menu, { clipPath: 'circle(0% at 95% 4%)', duration: reduce ? .01 : .7, ease: 'power3.inOut', onComplete: () => gsap.set(menu, { visibility: 'hidden' }) });
    }
  }
  burger.addEventListener('click', () => setMenu(!menuOpen));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  /* liens d'ancre */
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = id === '#top' ? document.body : $(id);
    if (!target) return;
    e.preventDefault();
    const wasOpen = menuOpen;
    setMenu(false);
    setTimeout(() => (id === '#top' ? (lenis ? lenis.scrollTo(0, { duration: 1.8 }) : scrollTo({ top: 0, behavior: 'smooth' })) : goTo(target)), wasOpen ? 450 : 0);
  }));

  /* ------------------------------------------------------------------ */
  /* Intro (loader) puis révélations au scroll                           */
  /* ------------------------------------------------------------------ */
  const video = $('.hero__video');
  if (video) { reduce ? video.pause() : video.play().catch(() => {}); }

  /* Parallaxe multicouche du hero */
  if (!reduce) {
    $$('[data-hero-layer]').forEach(el => {
      gsap.to(el, { y: () => innerHeight * parseFloat(el.dataset.heroLayer), ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    });
    gsap.to('.hero__inner', { y: -90, opacity: .15, ease: 'none', scrollTrigger: { trigger: '.hero', start: '30% top', end: 'bottom top', scrub: true } });
    $$('.fl').forEach(f => gsap.to(f, { y: () => -parseFloat(f.dataset.depth) * 140, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } }));
    if (finePointer) {
      $('.hero').addEventListener('pointermove', e => {
        const nx = e.clientX / innerWidth - .5, ny = e.clientY / innerHeight - .5;
        $$('.fl').forEach(f => { const d = parseFloat(f.dataset.depth); gsap.to(f, { xPercent: nx * d * 70, yPercent: ny * d * 70, duration: 1.4, ease: 'power3.out', overwrite: 'auto' }); });
        gsap.to('.hero__ghost', { x: nx * -50, duration: 1.6, ease: 'power3.out', overwrite: 'auto' });
      });
    }
  }

  /* titres de section : mots qui montent sous masque */
  if (!reduce) {
    headings.forEach(({ el, cs }) => gsap.from(cs, {
      yPercent: 118, rotate: 3, duration: 1.2, stagger: .07, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' } }));
    gsap.from(footChars, { yPercent: 115, duration: 1.4, stagger: .035, ease: 'expo.out',
      scrollTrigger: { trigger: '.foot__word', start: 'top 95%' } });
    $$('.kicker').forEach(k => gsap.from(k, { opacity: 0, x: -24, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: k, start: 'top 92%' } }));
  }

  /* ------------------------------------------------------------------ */
  /* Marquee : vitesse et sens pilotés par le scroll                     */
  /* ------------------------------------------------------------------ */
  const mq = $('.marquee__track');
  if (mq && !reduce) {
    const set = $('.marquee__set', mq);
    for (let i = 0; i < 2; i++) { const c = set.cloneNode(true); c.setAttribute('aria-hidden', 'true'); mq.appendChild(c); }
    const loop = gsap.to(mq, { xPercent: -100 / 3, ease: 'none', duration: 32, repeat: -1 });
    let inView = false, ts = 1, dir = 1, prev = scrollY;
    ScrollTrigger.create({ trigger: '.marquee', start: 'top bottom', end: 'bottom top', onToggle: s => (inView = s.isActive) });
    gsap.ticker.add(() => {
      const y = scrollY, v = y - prev; prev = y;
      if (!inView) return;
      if (Math.abs(v) > .4) dir = Math.sign(v);
      ts += (dir * (1 + Math.min(Math.abs(v) * .45, 9)) - ts) * .07;
      loop.timeScale(ts);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Écrans larges / petits écrans                                       */
  /* ------------------------------------------------------------------ */
  const mm = gsap.matchMedia();

  /* Savoir-faire : section épinglée, 4 étapes */
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const imgs = $$('.story__img'), steps = $$('.step');
    const numEl = $('.story__num span'), bar = $('.story__bar span');
    const mobile = matchMedia('(max-width: 900px)').matches;
    gsap.set(steps, { autoAlpha: 0, y: 46 });
    gsap.set(steps[0], { autoAlpha: 1, y: 0 });
    let current = 0;
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: '.story__pin', start: 'top top', end: () => '+=' + innerHeight * (mobile ? 3 : 3.6),
        pin: true, scrub: .7, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: s => {
          const idx = Math.min(3, Math.floor(s.progress * 4));
          if (idx !== current) {
            current = idx;
            numEl.textContent = '0' + (idx + 1);
            gsap.fromTo(numEl, { yPercent: 35, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .6, ease: 'power3.out' });
          }
        }
      }
    });
    tl.fromTo(imgs[0], { scale: 1.18 }, { scale: 1, duration: 1 }, 0);
    for (let i = 1; i < 4; i++) {
      tl.to(steps[i - 1], { autoAlpha: 0, y: -46, duration: .3 }, i - .32)
        .fromTo(imgs[i], { clipPath: 'inset(100% 0% 0% 0%)', scale: 1.3 }, { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, duration: .75, ease: 'power2.inOut' }, i - .42)
        .to(steps[i], { autoAlpha: 1, y: 0, duration: .32 }, i - .02);
    }
    tl.to(bar, { scaleX: 1, duration: 4 }, 0);
    gsap.fromTo('.story__arch', { rotate: -3 }, { rotate: 3, ease: 'none', scrollTrigger: { trigger: '.story', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.to('.badge-rot', { y: -60, ease: 'none', scrollTrigger: { trigger: '.story', start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* Prestations : défilement horizontal piloté par le scroll vertical (desktop) */
  mm.add('(min-width: 901px) and (prefers-reduced-motion: no-preference)', () => {
    const track = $('.services__track'), sticky = $('.services__sticky');
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    const move = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: sticky, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: .8, anticipatePin: 1, invalidateOnRefresh: true }
    });
    $$('.card').forEach(card => {
      const img = $('.card__img img', card);
      gsap.fromTo(img, { xPercent: -9, scale: 1.22 }, { xPercent: 9, scale: 1.22, ease: 'none',
        scrollTrigger: { trigger: card, containerAnimation: move, start: 'left right', end: 'right left', scrub: true } });
      gsap.from(card, { opacity: 0, y: 70, rotate: 2, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: card, containerAnimation: move, start: 'left 96%', toggleActions: 'play none none reverse' } });
    });
    gsap.from('.svc-intro > *', { opacity: 0, y: 40, stagger: .1, duration: 1, ease: 'power3.out', delay: .1,
      scrollTrigger: { trigger: sticky, start: 'top 70%' } });

    /* clavier : quand on tabule vers une carte hors écran, on fait avancer le scroll jusqu'à elle */
    const onFocus = e => {
      sticky.scrollLeft = 0;
      const card = e.target.closest('.card, .svc-outro');
      if (!card) return;
      const st = move.scrollTrigger, d = dist();
      const p = gsap.utils.clamp(0, 1, (card.offsetLeft - (innerWidth - card.offsetWidth) / 2) / d);
      const y = st.start + p * (st.end - st.start);
      if (lenis) lenis.scrollTo(y, { immediate: true }); else scrollTo(0, y);
    };
    track.addEventListener('focusin', onFocus);
    return () => track.removeEventListener('focusin', onFocus);
  });
  mm.add('(max-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
    gsap.from('.card', { opacity: 0, y: 50, duration: 1, stagger: .1, ease: 'power3.out', scrollTrigger: { trigger: '.services__track', start: 'top 85%' } });
  });

  /* ------------------------------------------------------------------ */
  /* Chiffres, galerie, studio, avis                                     */
  /* ------------------------------------------------------------------ */
  const fmt = (n, d) => n.toFixed(d).replace('.', ',');
  $$('[data-count]').forEach(el => {
    const target = parseFloat(el.dataset.count), dec = parseInt(el.dataset.dec || '0', 10);
    if (reduce) { el.textContent = fmt(target, dec); return; }
    const o = { v: 0 }; el.textContent = fmt(0, dec);
    gsap.to(o, { v: target, duration: 2.4, ease: 'power3.out', onUpdate: () => (el.textContent = fmt(o.v, dec)),
      scrollTrigger: { trigger: el, start: 'top 90%' } });
  });
  if (!reduce) {
    gsap.from('.stat', { y: 70, opacity: 0, duration: 1.2, stagger: .14, ease: 'expo.out', scrollTrigger: { trigger: '.stats__list', start: 'top 85%' } });
    gsap.from('.stat__line', { scaleX: 0, duration: 1.6, stagger: .14, ease: 'expo.inOut', scrollTrigger: { trigger: '.stats__list', start: 'top 80%' } });
    gsap.from('.stats .kicker', { opacity: 0, duration: 1, scrollTrigger: { trigger: '.stats', start: 'top 80%' } });

    /* galerie : colonnes à vitesses différentes + révélation en cercle */
    $$('.gal__col').forEach(col => gsap.to(col, { y: parseFloat(col.dataset.speed) * 2.2, ease: 'none',
      scrollTrigger: { trigger: '.gallery__cols', start: 'top bottom', end: 'bottom top', scrub: .6 } }));
    $$('.gal').forEach(g => {
      gsap.from($('.gal__in', g), { clipPath: 'circle(0% at 50% 50%)', duration: 1.5, ease: 'power3.out', clearProps: 'clipPath',
        scrollTrigger: { trigger: g, start: 'top 90%' } });
      gsap.from(g, { y: 70, opacity: 0, duration: 1.2, ease: 'power3.out', clearProps: 'opacity',
        scrollTrigger: { trigger: g, start: 'top 92%' } });
    });

    /* studio : rideau, Ken Burns, flottants */
    gsap.to('.curtain--l', { xPercent: -102, duration: 1.7, ease: 'expo.inOut', scrollTrigger: { trigger: '.curtain-wrap', start: 'top 78%' } });
    gsap.to('.curtain--r', { xPercent: 102, duration: 1.7, ease: 'expo.inOut', scrollTrigger: { trigger: '.curtain-wrap', start: 'top 78%' } });
    gsap.fromTo('.studio__big', { scale: 1.32 }, { scale: 1.04, ease: 'none', scrollTrigger: { trigger: '.curtain-wrap', start: 'top 85%', end: 'bottom top', scrub: true } });
    $$('[data-float]').forEach(f => gsap.fromTo(f, { y: -parseFloat(f.dataset.float) * .5 }, { y: parseFloat(f.dataset.float) * .5, ease: 'none',
      scrollTrigger: { trigger: '.studio', start: 'top bottom', end: 'bottom top', scrub: true } }));
    gsap.from('.meter b', { scaleX: 0, duration: 1.8, stagger: .15, ease: 'expo.out', scrollTrigger: { trigger: '.meters', start: 'top 88%' } });
    gsap.from('.studio__text > p, .meters li', { y: 30, opacity: 0, duration: 1, stagger: .08, ease: 'power3.out', scrollTrigger: { trigger: '.studio__text', start: 'top 80%' } });

    /* avis : entrée en cascade */
    gsap.from('.rev', { y: 80, opacity: 0, rotate: 3, duration: 1.2, stagger: .1, ease: 'power3.out', clearProps: 'transform,opacity',
      scrollTrigger: { trigger: '.reviews__track', start: 'top 88%' } });

    /* réservation */
    gsap.from('.book__form', { y: 90, opacity: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '.book__form', start: 'top 88%' } });
    gsap.from('.bizcard', { y: 80, rotate: -14, opacity: 0, duration: 1.4, ease: 'expo.out', clearProps: 'opacity', scrollTrigger: { trigger: '.bizcard', start: 'top 92%' } });
    gsap.fromTo('.book__bg', { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.book', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from('.find__info > *:not(h2), .find__map', { y: 40, opacity: 0, duration: 1.1, stagger: .09, ease: 'power3.out', scrollTrigger: { trigger: '.find__grid', start: 'top 82%' } });
    gsap.from('.faq details', { y: 30, opacity: 0, duration: .9, stagger: .08, ease: 'power3.out', scrollTrigger: { trigger: '.faq__list', start: 'top 88%' } });
  }

  /* carrousel d'avis : défilement natif + boutons + glisser + lecture auto */
  const track = $('#revTrack'), bar = $('#revBar');
  if (track) {
    const step = () => { const c = $('.rev', track); return c ? c.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 16) : 320; };
    const goRev = d => {
      const max = track.scrollWidth - track.clientWidth;
      if (d > 0 && track.scrollLeft >= max - 8) track.scrollTo({ left: 0, behavior: 'smooth' });
      else track.scrollBy({ left: d * step(), behavior: 'smooth' });
    };
    $('#revPrev').addEventListener('click', () => { pause(); goRev(-1); });
    $('#revNext').addEventListener('click', () => { pause(); goRev(1); });
    const barTo = gsap.quickSetter(bar, 'scaleX');
    const upd = () => barTo(Math.max(.08, (track.scrollLeft + track.clientWidth) / track.scrollWidth));
    track.addEventListener('scroll', upd, { passive: true }); upd();
    track.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { goRev(1); e.preventDefault(); } if (e.key === 'ArrowLeft') { goRev(-1); e.preventDefault(); } });

    let drag = null;
    track.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse') return;
      drag = { x: e.clientX, left: track.scrollLeft, moved: false };
      track.style.scrollSnapType = 'none'; pause();
    });
    addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x; if (Math.abs(dx) > 4) drag.moved = true; track.scrollLeft = drag.left - dx; });
    addEventListener('pointerup', () => { if (!drag) return; drag = null; track.style.scrollSnapType = ''; });

    let timer = null, over = false;
    function play() { if (reduce || timer) return; timer = setInterval(() => { if (!over && !document.hidden) goRev(1); }, 5200); }
    function pause() { clearInterval(timer); timer = null; }
    track.addEventListener('pointerenter', () => (over = true));
    track.addEventListener('pointerleave', () => (over = false));
    track.addEventListener('focusin', pause);
    ScrollTrigger.create({ trigger: '.reviews', start: 'top 70%', end: 'bottom 20%', onEnter: play, onEnterBack: play, onLeave: pause, onLeaveBack: pause });
  }

  /* ------------------------------------------------------------------ */
  /* Lightbox galerie                                                    */
  /* ------------------------------------------------------------------ */
  const lb = $('#lightbox');
  if (lb) {
    const lbImg = $('img', lb), lbCap = $('figcaption', lb), lbClose = $('.lightbox__close', lb);
    let opener = null;
    const open = btn => {
      opener = btn;
      lbImg.src = btn.dataset.full; lbImg.alt = $('img', btn).alt; lbCap.textContent = btn.dataset.cap || '';
      lb.hidden = false; stopScroll();
      gsap.fromTo(lb, { opacity: 0 }, { opacity: 1, duration: .5 });
      gsap.fromTo($('figure', lb), { scale: .92, y: 30 }, { scale: 1, y: 0, duration: .8, ease: 'expo.out' });
      lbClose.focus();
    };
    const close = () => {
      gsap.to(lb, { opacity: 0, duration: .35, onComplete: () => { lb.hidden = true; startScroll(); opener && opener.focus(); } });
    };
    $$('.gal').forEach(b => b.addEventListener('click', () => open(b)));
    lbClose.addEventListener('click', close);
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && !lb.hidden) close(); });
  }

  initPlain();

  /* ------------------------------------------------------------------ */
  /* Ce qui marche aussi sans animations : réservation, horaires, FAQ    */
  /* ------------------------------------------------------------------ */
  function initPlain() {
    /* Formulaire de demande : fabrique un message WhatsApp / SMS pré-rempli (aucun serveur) */
    const svc = $('#svc'), day = $('#day'), slot = $('#slot'), who = $('#who');
    if (svc) {
      $$('.card').forEach(card => {
        const og = document.createElement('optgroup'); og.label = card.dataset.cat;
        $$('.row', card).forEach(r => {
          const price = $('.row__price', r).textContent.replace(/ /g, ' ');
          og.appendChild(new Option(r.dataset.service + ' · ' + price, r.dataset.service));
        });
        svc.appendChild(og);
      });
      const t = new Date(); t.setMinutes(t.getMinutes() - t.getTimezoneOffset());
      day.min = t.toISOString().slice(0, 10);

      const wa = $('#bkWa'), sms = $('#bkSms'), prev = $('#bkPreview');
      const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent);
      const build = () => {
        const s = svc.value, d = day.value, name = who.value.trim();
        let m = 'Bonjour Yana, ' + (name ? `c’est ${name}. ` : '') + 'je souhaiterais réserver ' + (s ? `« ${s} »` : 'un rendez-vous');
        m += d ? `, ${new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}, ${slot.value}` : `, de préférence ${slot.value}`;
        m += '. Merci !';
        wa.href = 'https://wa.me/33647336714?text=' + encodeURIComponent(m);
        sms.href = 'sms:+33647336714' + (isIOS ? '&' : '?') + 'body=' + encodeURIComponent(m);
        prev.textContent = (s || d || name) ? 'Message prêt à partir : ' + m : '';
      };
      [svc, day, slot].forEach(el => el.addEventListener('change', build));
      who.addEventListener('input', build);
      build();

      $$('.row').forEach(r => r.addEventListener('click', () => {
        svc.value = r.dataset.service;
        $$('.row.is-picked').forEach(x => x.classList.remove('is-picked'));
        r.classList.add('is-picked');
        build();
        goTo('#bookForm', -110);
        if (window.gsap) gsap.fromTo('#bookForm', { boxShadow: '0 0 0 0 rgba(184,137,75,.9)' }, { boxShadow: '0 0 0 14px rgba(184,137,75,0)', duration: 1.4, delay: .9, ease: 'power2.out' });
      }));
    }

    /* Horaires : jour courant + ouvert / fermé (heure de Paris) */
    const state = $('#openState');
    if (state) {
      const p = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
      const get = t => p.find(x => x.type === t).value;
      const dow = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[get('weekday')];
      const mins = parseInt(get('hour'), 10) * 60 + parseInt(get('minute'), 10);
      const close = dow === 0 ? 17 : 20;
      const li = $(`#hours li[data-day="${dow}"]`); if (li) li.classList.add('is-today');
      const label = $('span', state);
      if (mins >= 9 * 60 && mins < close * 60) { label.textContent = `Ouvert maintenant · jusqu’à ${close} h`; state.classList.remove('is-closed'); }
      else { label.textContent = mins < 9 * 60 ? 'Fermé · ouvre à 9 h' : 'Fermé · ouvre demain à 9 h'; state.classList.add('is-closed'); }
    }

    /* FAQ : ouverture animée */
    $$('.faq details').forEach(d => {
      const body = $(':scope > div', d);
      $('summary', d).addEventListener('click', e => {
        e.preventDefault();
        if (!window.gsap || reduce) { d.open = !d.open; return; }
        if (d.open) gsap.to(body, { height: 0, duration: .6, ease: 'power3.inOut', onComplete: () => { d.open = false; body.style.height = ''; ScrollTrigger.refresh(); } });
        else { d.open = true; gsap.fromTo(body, { height: 0 }, { height: 'auto', duration: .8, ease: 'power3.out', onComplete: () => { body.style.height = ''; ScrollTrigger.refresh(); } }); }
      });
    });

    /* ratio des vignettes de la galerie */
    $$('.gal').forEach(g => { const inner = $('.gal__in', g); if (inner) inner.style.setProperty('--ar', g.dataset.ar || '3/4'); });
  }

  /* ------------------------------------------------------------------ */
  /* Go                                                                  */
  /* ------------------------------------------------------------------ */
  runLoader();
  addEventListener('load', () => ScrollTrigger.refresh());
  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());

  /* le bouton flottant mobile s'efface quand on est sur la réservation */
  ScrollTrigger.create({ trigger: '#reserver', start: 'top 70%', end: 'bottom 30%', toggleClass: { targets: '#fab', className: 'is-away' } });
  ScrollTrigger.create({ trigger: '.hero', start: 'top top', end: 'bottom 55%', toggleClass: { targets: '#fab', className: 'is-away' } });

  /* filet de sécurité : si l'intro ne s'est pas terminée (onglet en arrière-plan, erreur…), on dévoile quand même la page */
  setTimeout(() => {
    const l = $('#loader');
    if (!l) return;
    l.remove(); startScroll();
    gsap.set(heroChars, { yPercent: 0, rotate: 0 });
    gsap.set(['[data-hero-in]', '.nav > *'], { opacity: 1, y: 0 });
  }, 14000);
})();
