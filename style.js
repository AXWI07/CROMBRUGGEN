/* ------------------------------------------------------------------
   Crombruggen - shutter intro + WebGL mask-distortion hero
   Distortion math adapted from the Unicorn.Studio "Mask Distortion"
   scene (perlin + fbm domain-warped mask edge, mouse parallax).
------------------------------------------------------------------ */

(function () {
    'use strict';

    /* --------------------------------------------------------------
       1. Begin screen: one scroll gesture triggers the opening,
       which then plays out on its own (time-based, eased).
    -------------------------------------------------------------- */

    var loader = document.getElementById('loader');
    var introProgress = 0;   // 0..1, also drives the hero blob reveal
    var introStarted = false;

    // no page scrolling while the loading screen is up
    document.body.classList.add('is-locked');

    // keep the hero video playing (muted autoplay is sometimes blocked until a
    // gesture) - force play and retry on the first interaction
    var heroVideo = document.querySelector('.hero-video');
    if (heroVideo) {
        heroVideo.muted = true;
        var heroPlay = function () { var p = heroVideo.play(); if (p && p.catch) p.catch(function () {}); };
        heroPlay();
        document.addEventListener('visibilitychange', function () { if (!document.hidden) heroPlay(); });
        window.addEventListener('pointerdown', heroPlay, { once: true });
        window.addEventListener('wheel', heroPlay, { once: true, passive: true });
        window.addEventListener('touchstart', heroPlay, { once: true, passive: true });
    }

    // ease the hero in once the loading screen lifts away
    function revealHero() {
        var t0 = performance.now();
        (function grow(now) {
            introProgress = Math.min((now - t0) / 1400, 1);
            if (introProgress < 1) requestAnimationFrame(grow);
        })(t0);
    }

    // once the symbol has filled, lift the loading screen up to reveal the hero;
    // the page stays locked until the loader is fully gone
    function endIntro() {
        loader.classList.add('is-up');
        revealHero();
        var done = function (e) {
            if (e && e.target !== loader) return; // ignore bubbled child transitions
            if (loader && loader.parentNode) loader.parentNode.removeChild(loader);
            document.body.classList.remove('is-locked');
            initSmoothScroll();
        };
        loader.addEventListener('transitionend', done);
        setTimeout(done, 1300); // fallback if transitionend doesn't fire
    }

    // Loading screen (pikeproductions.be style): the white symbol fills
    // left-to-right and a progress bar grows, then it lifts away. Runs on its
    // own - no scroll needed. Progress eases 0 -> 1 over ~2s, then holds a beat.
    function playIntro() {
        if (introStarted) return;
        introStarted = true;
        var fill = document.getElementById('loader-logo-fill');
        var bar  = document.getElementById('loader-bar-fill');
        var t0 = performance.now();
        var DUR = 2000;
        (function tick(now) {
            var t = Math.min((now - t0) / DUR, 1);
            // easeInOutCubic so it accelerates then settles
            var p = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            introProgress = p;
            if (fill) fill.style.clipPath = 'inset(0 ' + ((1 - p) * 100).toFixed(2) + '% 0 0)';
            if (bar)  bar.style.transform  = 'scaleX(' + p.toFixed(4) + ')';
            if (t < 1) { requestAnimationFrame(tick); }
            else { setTimeout(endIntro, 280); }   // hold full for a beat, then lift
        })(t0);
    }

    /* Lenis smooth scrolling - turns every notched wheel step into a ~1.2s
       eased glide, the same recipe as the portfolio. This is what makes the
       scroll-scrubbed sections (message / about / footer) feel high-end.
       Started only after the intro, and only at desktop widths (wheel input);
       touch gestures stay native, so phones/tablets are unaffected. */
    function initSmoothScroll() {
        if (window.innerWidth < 1025 || typeof Lenis === 'undefined') return;
        document.documentElement.style.scrollBehavior = 'auto';
        var lenis = new Lenis({
            duration: 1.2,
            easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
            smoothWheel: true,
            wheelMultiplier: 1
        });
        function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
        requestAnimationFrame(raf);
        // let same-page anchors glide through Lenis instead of jumping
        document.querySelectorAll('a[href^="#"]').forEach(function (a) {
            a.addEventListener('click', function (e) {
                var href = a.getAttribute('href');
                if (href.length < 2) return;
                var target = document.querySelector(href);
                if (target) { e.preventDefault(); lenis.scrollTo(target, { duration: 1.4 }); }
            });
        });
    }

    // the loading screen runs on its own as soon as the page is ready
    if (document.readyState === 'complete') playIntro();
    else window.addEventListener('load', playIntro);
    // safety net: never leave the loader stuck if 'load' is slow to fire
    setTimeout(playIntro, 1200);

    /* Arriving via an in-page anchor (e.g. "← Projecten" back from a project
       page loads index.html#projecten): skip the begin screen entirely and
       land straight on that section instead of the intro. */
    function skipIntroTo(hash) {
        introStarted = true;
        introProgress = 1;
        if (loader && loader.parentNode) loader.parentNode.removeChild(loader);
        document.body.classList.remove('is-locked');
        initSmoothScroll();
        var jump = function () {
            var el = document.querySelector(hash);
            if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY);
        };
        // wait for the tall sections to lay out, then jump to the target
        requestAnimationFrame(function () { requestAnimationFrame(jump); });
        window.addEventListener('load', jump);
    }

    (function () {
        var h = window.location.hash;
        if (h && h.length > 1) {
            try {
                if (document.querySelector(h)) skipIntroTo(h);
            } catch (err) { /* invalid selector - ignore */ }
        }
    })();

    /* --------------------------------------------------------------
       1b. Mobile / tablet menu
    -------------------------------------------------------------- */

    var menuToggle = document.getElementById('menu-toggle');
    var mobileMenu = document.getElementById('mobile-menu');
    var menuClose = document.getElementById('mobile-menu-close');

    function setMenu(open) {
        mobileMenu.classList.toggle('is-open', open);
        mobileMenu.setAttribute('aria-hidden', String(!open));
        menuToggle.setAttribute('aria-expanded', String(open));
        if (open) menuClose.focus();
        else menuToggle.focus();
    }

    menuToggle.addEventListener('click', function () { setMenu(true); });
    menuClose.addEventListener('click', function () { setMenu(false); });
    mobileMenu.addEventListener('click', function (e) {
        if (e.target.closest('a')) setMenu(false);
    });
    window.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && mobileMenu.classList.contains('is-open')) setMenu(false);
    });

    /* --------------------------------------------------------------
       2. Over Senne: portrait pushes in, statement brightens word by
       word, signature writes itself - one reveal when scrolled into view
    -------------------------------------------------------------- */

    function clamp01(v) { return Math.min(Math.max(v, 0), 1); }

    var overSection = document.getElementById('over');
    var overText = document.getElementById('over-text');

    // wrap every word of the statement in a span, keeping accent styling intact
    var overWords = [];
    Array.prototype.slice.call(overText.childNodes).forEach(function (node) {
        var isAccent = node.nodeType === 1 && node.classList.contains('over-accent');
        var text = node.textContent;
        var frag = document.createDocumentFragment();
        text.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) {
                frag.appendChild(document.createTextNode(part));
            } else {
                var span = document.createElement('span');
                span.className = 'over-word' + (isAccent ? ' over-accent' : '');
                span.textContent = part;
                frag.appendChild(span);
                overWords.push(span);
            }
        });
        overText.replaceChild(frag, node);
    });

    // stagger the brighten so it reads left-to-right after the photo lands
    overWords.forEach(function (w, i) {
        w.style.transitionDelay = (0.25 + i * 0.05) + 's';
    });

    // reveal when the section scrolls into view; reverse on leave so it replays
    var overIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                overSection.classList.add('is-in');
                overWords.forEach(function (w) { w.style.opacity = '1'; });
            } else {
                overSection.classList.remove('is-in');
                overWords.forEach(function (w) { w.style.opacity = ''; });
            }
        });
    }, { threshold: 0.35 });
    overIO.observe(overSection);

    /* count-up stats at the end of Over Senne - ease 0→target once in view.
       rect-based (the preview pane never fires IntersectionObserver). */
    var overStats = document.getElementById('over-stats');
    if (overStats) {
        var counters = [].slice.call(overStats.querySelectorAll('[data-count]'));
        var counted = false;
        var easeOutCubicC = function (t) { return 1 - Math.pow(1 - t, 3); };
        function runCount() {
            counters.forEach(function (el) {
                var target = parseFloat(el.getAttribute('data-count')) || 0;
                var t0 = performance.now(), DUR = 1300;
                (function step(now) {
                    var p = Math.min((now - t0) / DUR, 1);
                    el.textContent = Math.round(easeOutCubicC(p) * target).toLocaleString('nl-NL');
                    if (p < 1) requestAnimationFrame(step);
                })(t0);
            });
            // safety net: guarantee final values even if rAF stalls
            setTimeout(function () {
                counters.forEach(function (el) {
                    el.textContent = (parseFloat(el.getAttribute('data-count')) || 0).toLocaleString('nl-NL');
                });
            }, 1800);
        }
        function statsReveal() {
            if (counted) return;
            var vh = window.innerHeight || document.documentElement.clientHeight;
            if (overStats.getBoundingClientRect().top < vh * 0.9) {
                counted = true;
                runCount();
                window.removeEventListener('scroll', statsReveal);
            }
        }
        window.addEventListener('scroll', statsReveal, { passive: true });
        window.addEventListener('resize', statsReveal);
        window.addEventListener('load', statsReveal);
        statsReveal();
    }

    /* --------------------------------------------------------------
       2a. Van idee tot beeld: 4-step process - fade+rise reveal, staggered
    -------------------------------------------------------------- */

    var processEl = document.getElementById('proces');
    if (processEl) {
        var pSteps = [].slice.call(processEl.querySelectorAll('.process-step'));
        pSteps.forEach(function (s, i) {
            s.style.setProperty('--d', (0.15 + i * 0.13) + 's'); // per-step stagger, read by CSS
        });
        var pShown = false;
        function processReveal() {
            if (pShown) return;
            var vh = window.innerHeight || document.documentElement.clientHeight;
            if (processEl.getBoundingClientRect().top < vh * 0.82) {
                pShown = true;
                processEl.classList.add('is-in');
                window.removeEventListener('scroll', processReveal);
            }
        }
        window.addEventListener('scroll', processReveal, { passive: true });
        window.addEventListener('resize', processReveal);
        window.addEventListener('load', processReveal);
        processReveal();
        // (blank-ship guard is the prefers-reduced-motion CSS fallback, which
        // keeps the steps visible in headless/preview where transitions pause)
    }

    /* --------------------------------------------------------------
       2b-1. Projects: horizontal scroll with a black→white fade on entry
    -------------------------------------------------------------- */

    var projHscroll = document.getElementById('projects-hscroll');
    var projSticky = document.getElementById('projects-sticky');
    var projTrack = document.getElementById('projects-track');
    var projBar = document.getElementById('projects-bar');
    var projParallax = Array.prototype.slice.call(document.querySelectorAll('.hpanel-media [data-parallax]'));

    var INK = [10, 10, 11], PAPER = [251, 250, 248];
    var P_TEXT = [19, 18, 17], P_LIGHT = [251, 250, 248];
    var P_MUTED = [122, 118, 111], P_MUTEDL = [138, 135, 131];
    function mix(a, b, t) {
        return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * t) + ',' +
                        Math.round(a[1] + (b[1] - a[1]) * t) + ',' +
                        Math.round(a[2] + (b[2] - a[2]) * t) + ')';
    }

    var projCur = 0; // smoothed horizontal progress 0..1

    function projectsFrame() {
        requestAnimationFrame(projectsFrame);
        if (!projHscroll) return;

        // mobile/tablet: native side-swipe carousel — don't scroll-jack, and
        // clear any inline styles a prior desktop frame may have left behind
        if (window.innerWidth <= 1024) {
            if (projTrack.style.transform) projTrack.style.transform = '';
            if (projSticky.style.backgroundColor) {
                projSticky.style.backgroundColor = '';
                projSticky.style.removeProperty('--panel-text');
                projSticky.style.removeProperty('--panel-muted');
            }
            return;
        }

        var vw = window.innerWidth, vh = window.innerHeight;

        var rect = projHscroll.getBoundingClientRect();
        var total = projHscroll.offsetHeight - vh;
        var target = total > 0 ? clamp01(-rect.top / total) : 0;

        // inertia so the horizontal motion glides instead of stepping
        projCur += (target - projCur) * 0.09;
        if (Math.abs(target - projCur) < 0.0004) projCur = target;

        // translate the track horizontally across its overflow
        var maxX = projTrack.scrollWidth - vw;
        projTrack.style.transform = 'translate3d(' + (-Math.min(projCur / 0.85, 1) * maxX).toFixed(2) + 'px, 0, 0)';
        if (projBar) projBar.style.transform = 'scaleX(' + projCur.toFixed(4) + ')';

        // black → white fade over the first 18% of the pin (smoothstep), so it
        // continues the black Over-Senne section and turns white as panels start
        var raw = clamp01(projCur / 0.18);
        var f = raw * raw * (3 - 2 * raw);
        projSticky.style.backgroundColor = mix(INK, PAPER, f);
        projSticky.style.setProperty('--panel-text', mix(P_LIGHT, P_TEXT, f));
        projSticky.style.setProperty('--panel-muted', mix(P_MUTEDL, P_MUTED, f));

        // gentle parallax inside each panel image (clamped so it stays within
        // the image overscan and never reveals the beige media background)
        for (var i = 0; i < projParallax.length; i++) {
            var pr = projParallax[i].parentNode.getBoundingClientRect();
            var prog = (pr.left + pr.width / 2 - vw / 2) / vw;
            var px = Math.max(-7, Math.min(7, prog * -6));
            projParallax[i].style.transform = 'translate3d(' + px.toFixed(2) + '%, 0, 0)';
        }
    }
    requestAnimationFrame(projectsFrame);



    /* --------------------------------------------------------------
       2c. Contact form: submits straight to Senne's inbox via FormSubmit
       (no mail client opens). No API key needed - the very first message
       triggers a one-time confirmation email to vancrombruggensenne@gmail.com;
       click "Activate Form" in it once, and every submission after that is
       delivered directly to the inbox.
    -------------------------------------------------------------- */

    var CONTACT_ENDPOINT = 'https://formsubmit.co/ajax/vancrombruggensenne@gmail.com';

    var contactForm = document.getElementById('contact-form');
    var formStatus = document.getElementById('form-status');
    var formSubmit = contactForm ? contactForm.querySelector('.form-submit') : null;

    function setStatus(msg, kind) {
        if (!formStatus) return;
        formStatus.textContent = msg;
        formStatus.className = 'form-status' + (kind ? ' is-' + kind : '');
    }

    if (contactForm) contactForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var naam = contactForm.naam.value.trim();
        var email = contactForm.email.value.trim();
        var bericht = contactForm.bericht.value.trim();

        setStatus('Versturen…', 'sending');
        formSubmit.disabled = true;

        fetch(CONTACT_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
                name: naam,
                email: email,
                message: bericht,
                _subject: 'Contact via crombruggen - ' + naam,
                _template: 'table',
                _captcha: 'false'
            })
        }).then(function (r) { return r.json(); }).then(function (data) {
            if (data && (data.success === 'true' || data.success === true)) {
                setStatus('Bedankt! Je bericht is verzonden.', 'ok');
                contactForm.reset();
            } else if (data && /activ/i.test(data.message || '')) {
                // one-time: form not yet activated (owner must confirm via email)
                setStatus('Formulier wordt nog geactiveerd. Probeer straks opnieuw.', 'err');
            } else {
                setStatus('Er ging iets mis. Probeer het later opnieuw.', 'err');
            }
        }).catch(function () {
            setStatus('Er ging iets mis. Probeer het later opnieuw.', 'err');
        }).then(function () {
            formSubmit.disabled = false;
        });
    });

    /* --------------------------------------------------------------
       2d. Footer reveal - headline flips up, the rest fades in on enter
    -------------------------------------------------------------- */

    var footerEl = document.querySelector('.footer');
    if (footerEl) {
        var fHead = footerEl.querySelector('.fc3-head');
        var fRvs = [].slice.call(footerEl.querySelectorAll('.footer-rv'));
        if (fHead) {
            [].forEach.call(fHead.querySelectorAll('.w span'), function (s, i) {
                s.style.transitionDelay = (i * 0.09) + 's';
            });
        }
        var footerShown = false;
        function footerReveal() {
            if (footerShown) return;
            var vh = window.innerHeight || document.documentElement.clientHeight;
            if (footerEl.getBoundingClientRect().top < vh * 0.82) {
                footerShown = true;
                if (fHead) fHead.classList.add('in');
                fRvs.forEach(function (el, i) {
                    el.style.transitionDelay = (0.15 + i * 0.09) + 's';
                    el.classList.add('in');
                });
                window.removeEventListener('scroll', footerReveal);
            }
        }
        window.addEventListener('scroll', footerReveal, { passive: true });
        window.addEventListener('resize', footerReveal);
        window.addEventListener('load', footerReveal);
        footerReveal();
    }

    /* --------------------------------------------------------------
       3. WebGL mask-distortion hero (only if the canvas exists; the hero
          is now a video, so this is skipped)
    -------------------------------------------------------------- */

    var canvas = document.getElementById('mask-canvas');
    if (!canvas) return;
    var gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: true });

    if (!gl) {
        document.body.classList.add('no-webgl');
        return;
    }

    var VERT = [
        '#version 300 es',
        'const vec2 pos[3] = vec2[3](vec2(-1.,-1.), vec2(3.,-1.), vec2(-1.,3.));',
        'out vec2 vUv;',
        'void main() {',
        '  vec2 p = pos[gl_VertexID];',
        '  vUv = p * 0.5 + 0.5;',
        '  gl_Position = vec4(p, 0., 1.);',
        '}'
    ].join('\n');

    var FRAG = [
        '#version 300 es',
        'precision highp float;',
        'in vec2 vUv;',
        'uniform vec2 uRes;',
        'uniform float uTime;',
        'uniform vec2 uMouse;',
        'uniform float uMaskRadiusPx;',
        'uniform sampler2D uImage;',
        'uniform vec2 uImageSize;',
        'out vec4 fragColor;',

        'const float PI = 3.14159265359;',
        'mat2 rotHalf = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));',

        // -- perlin noise (from the reference scene) --
        'vec3 hash33(vec3 p3) {',
        '  p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));',
        '  p3 += dot(p3, p3.yxz + 19.19);',
        '  return -1.0 + 2.0 * fract(vec3(',
        '    (p3.x + p3.y) * p3.z,',
        '    (p3.x + p3.z) * p3.y,',
        '    (p3.y + p3.z) * p3.x));',
        '}',
        'float pnoise(vec3 p) {',
        '  vec3 pi = floor(p);',
        '  vec3 pf = p - pi;',
        '  vec3 w = pf * pf * (3.0 - 2.0 * pf);',
        '  float n000 = dot(pf - vec3(0,0,0), hash33(pi + vec3(0,0,0)));',
        '  float n100 = dot(pf - vec3(1,0,0), hash33(pi + vec3(1,0,0)));',
        '  float n010 = dot(pf - vec3(0,1,0), hash33(pi + vec3(0,1,0)));',
        '  float n110 = dot(pf - vec3(1,1,0), hash33(pi + vec3(1,1,0)));',
        '  float n001 = dot(pf - vec3(0,0,1), hash33(pi + vec3(0,0,1)));',
        '  float n101 = dot(pf - vec3(1,0,1), hash33(pi + vec3(1,0,1)));',
        '  float n011 = dot(pf - vec3(0,1,1), hash33(pi + vec3(0,1,1)));',
        '  float n111 = dot(pf - vec3(1,1,1), hash33(pi + vec3(1,1,1)));',
        '  float nx00 = mix(n000, n100, w.x);',
        '  float nx01 = mix(n001, n101, w.x);',
        '  float nx10 = mix(n010, n110, w.x);',
        '  float nx11 = mix(n011, n111, w.x);',
        '  float nxy0 = mix(nx00, nx10, w.y);',
        '  float nxy1 = mix(nx01, nx11, w.y);',
        '  return mix(nxy0, nxy1, w.z);',
        '}',
        'float fbm(vec3 st, float amplitude, int octaves) {',
        '  float value = 0.0;',
        '  float amp = 0.25;',
        '  float aM = 0.1 + amplitude * 0.65;',
        '  vec2 shift = vec2(100.0);',
        '  for (int i = 0; i < octaves; i++) {',
        '    value += amp * pnoise(st);',
        '    st.xy *= rotHalf * 2.5;',
        '    st.xy += shift;',
        '    amp *= aM;',
        '  }',
        '  return value;',
        '}',

        // -- fbm domain-warp distortion (scene layer 90102) --
        'vec2 distortFbm(vec2 uv, float t) {',
        '  float ar = uRes.x / uRes.y;',
        '  float multiplier = 6.0 * (0.27 / ((ar + 1.0) / 2.0));',
        '  vec2 st = ((uv - 0.5) * vec2(ar, 1.0)) * multiplier * ar;',
        '  vec2 drift = vec2(0.0, t * 0.005);',
        '  float z = 0.58 * 25.0 + t * 0.025;',
        '  vec2 r = vec2(',
        '    fbm(vec3(st - drift + vec2(1.7, 9.2), z), 0.52, 8),',
        '    fbm(vec3(st - drift + vec2(8.2, 1.3), z), 0.52, 8));',
        '  float f = fbm(vec3(st + r - drift, z), 0.52, 8) * 0.24;',
        '  return uv + (f * 2.0 + r * 0.24);',
        '}',

        // -- perlin ripple distortion (scene layer 90101) --
        'vec2 distortNoise(vec2 uv, float t) {',
        '  float ar = uRes.x / uRes.y;',
        '  vec2 st = (uv - 0.5) * vec2(ar, 1.0) * 12.0 * 0.26;',
        '  vec2 skew = vec2(0.49, 0.51);',
        '  float phase = t * 0.03;',
        '  float nx = pnoise(vec3(st * skew, phase));',
        '  float ny = pnoise(vec3((st + vec2(4.37)) * skew, phase));',
        '  vec2 off = vec2(nx, ny) * 1.5 * 0.5 + 0.5;',
        '  return mix(uv, off, 0.26 * 1.2);',
        '}',

        // -- circular mask with mouse parallax --
        'float maskAlpha(vec2 uv) {',
        '  vec2 par = (uMouse - 0.5) * 0.24;',
        '  uv -= par;',
        '  vec2 posPx = uv * uRes;',
        '  float d = length(posPx - 0.5 * uRes) - uMaskRadiusPx;',
        '  float aa = max(fwidth(d), 0.75);',
        '  return 1.0 - smoothstep(0.0, aa, d);',
        '}',

        // -- portrait, cover-fit to the canvas --
        'vec4 sampleImage(vec2 uv) {',
        '  float imageAspect = uImageSize.x / uImageSize.y;',
        '  float canvasAspect = uRes.x / uRes.y;',
        '  vec2 scale = (canvasAspect < imageAspect)',
        '    ? vec2(canvasAspect / imageAspect, 1.0)',
        '    : vec2(1.0, imageAspect / canvasAspect);',
        '  vec2 iuv = (uv - 0.5) * scale * 0.88 + 0.5;', // slight zoom keeps the shift inside the texture
        '  iuv.y += 0.06;', // raise the face toward the mask center
        '  return texture(uImage, iuv);',
        '}',

        'void main() {',
        '  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);',
        '  vec2 duv = distortFbm(uv, uTime * 15.0);',
        '  duv = distortNoise(duv, uTime * 12.0);',
        '  float alpha = maskAlpha(duv);',
        '  vec4 img = sampleImage(uv);',
        '  fragColor = vec4(img.rgb * alpha, alpha);',
        '}'
    ].join('\n');

    function compile(type, source) {
        var sh = gl.createShader(type);
        gl.shaderSource(sh, source);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(sh));
            return null;
        }
        return sh;
    }

    var vs = compile(gl.VERTEX_SHADER, VERT);
    var fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) {
        document.body.classList.add('no-webgl');
        return;
    }

    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    var uRes = gl.getUniformLocation(prog, 'uRes');
    var uTime = gl.getUniformLocation(prog, 'uTime');
    var uMouse = gl.getUniformLocation(prog, 'uMouse');
    var uMaskRadiusPx = gl.getUniformLocation(prog, 'uMaskRadiusPx');
    var uImageSize = gl.getUniformLocation(prog, 'uImageSize');
    gl.uniform1i(gl.getUniformLocation(prog, 'uImage'), 0);

    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        var w = canvas.clientWidth, h = canvas.clientHeight;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(uRes, canvas.width, canvas.height);
    }
    window.addEventListener('resize', resize);
    resize();

    // mouse with momentum (reference scene uses smoothed tracking)
    var mouseTarget = { x: 0.5, y: 0.5 };
    var mouse = { x: 0.5, y: 0.5 };
    // cursor movement pumps "energy" into the mask, making it grow
    var moveEnergy = 0;
    var growth = 0;
    window.addEventListener('pointermove', function (e) {
        var nx = e.clientX / window.innerWidth;
        var ny = e.clientY / window.innerHeight;
        moveEnergy = Math.min(1, moveEnergy + Math.hypot(nx - mouseTarget.x, ny - mouseTarget.y) * 4);
        mouseTarget.x = nx;
        mouseTarget.y = ny;
    });

    // portrait texture
    var textureReady = false;
    var img = new Image();
    img.src = 'images/landscape.JPG';
    img.onload = function () {
        var tex = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.uniform2f(uImageSize, img.naturalWidth, img.naturalHeight);
        textureReady = true;
    };

    // mask radius eases in as the shutter opens (0 -> full)
    var maskReveal = 0;

    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

    var start = performance.now();

    function frame(now) {
        requestAnimationFrame(frame);
        if (!textureReady) return;

        var t = (now - start) / 1000;

        // blob starts growing once the iris is ~25% open
        var target = easeOutCubic(Math.min(Math.max((introProgress - 0.25) / 0.6, 0), 1));
        maskReveal += (target - maskReveal) * 0.08;

        mouse.x += (mouseTarget.x - mouse.x) * 0.05;
        mouse.y += (mouseTarget.y - mouse.y) * 0.05;

        // grow with cursor activity, ease back down when the cursor rests
        moveEnergy *= 0.97;
        growth += (moveEnergy - growth) * 0.06;

        var radius = 0.26 * Math.min(canvas.width, canvas.height) * maskReveal * (1 + growth * 0.55);
        // never let the blob outgrow a narrow (mobile) screen
        radius = Math.min(radius, 0.32 * canvas.width);

        gl.uniform1f(uTime, t);
        gl.uniform2f(uMouse, mouse.x, mouse.y);
        gl.uniform1f(uMaskRadiusPx, radius);

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    requestAnimationFrame(frame);
})();
