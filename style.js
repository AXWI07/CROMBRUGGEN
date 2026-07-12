/* ------------------------------------------------------------------
   Crombruggen — shutter intro + WebGL mask-distortion hero
   Distortion math adapted from the Unicorn.Studio "Mask Distortion"
   scene (perlin + fbm domain-warped mask edge, mouse parallax).
------------------------------------------------------------------ */

(function () {
    'use strict';

    /* --------------------------------------------------------------
       1. Begin screen: one scroll gesture triggers the opening,
       which then plays out on its own (time-based, eased).
    -------------------------------------------------------------- */

    var shutter = document.getElementById('shutter');
    var introProgress = 0;   // 0..1, also drives the blob reveal
    var introStarted = false;

    // no page scrolling while the begin screen is up
    document.body.classList.add('is-locked');

    var INTRO_DURATION = 2200; // ms

    // very soft start and landing
    function easeInOutQuint(t) {
        return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
    }

    function playIntro() {
        if (introStarted) return;
        introStarted = true;
        var t0 = performance.now();

        function step(now) {
            var p = Math.min((now - t0) / INTRO_DURATION, 1);
            var e = easeInOutQuint(p);
            shutter.style.setProperty('--split', e.toFixed(4));
            introProgress = e;
            if (p < 1) {
                requestAnimationFrame(step);
            } else {
                shutter.parentNode.removeChild(shutter);
                document.body.classList.remove('is-locked');
            }
        }
        requestAnimationFrame(step);
    }

    window.addEventListener('wheel', playIntro, { passive: true, once: false });
    window.addEventListener('touchmove', playIntro, { passive: true });
    window.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ' || e.key === 'Enter') {
            playIntro();
        }
    });

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
       2. Message section: scroll-scrubbed rows / photo / signature
    -------------------------------------------------------------- */

    var msgTrack = document.getElementById('message-track');
    var msgLabel = document.getElementById('message-label');
    var msgRowA = document.getElementById('message-row-a');
    var msgRowB = document.getElementById('message-row-b');
    var msgPhoto = document.getElementById('message-photo');
    var msgSig = document.getElementById('message-signature');

    function clamp01(v) { return Math.min(Math.max(v, 0), 1); }
    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

    var msgP = 0;

    function messageFrame() {
        requestAnimationFrame(messageFrame);
        var rect = msgTrack.getBoundingClientRect();
        var total = msgTrack.offsetHeight - window.innerHeight;
        var target = total > 0 ? clamp01(-rect.top / total) : 0;

        // inertia so wheel steps become one continuous glide
        msgP += (target - msgP) * 0.09;
        if (Math.abs(target - msgP) < 0.0005) msgP = target;

        // type rows slide in opposite directions
        msgRowA.style.transform = 'translate3d(' + (-6 - 16 * msgP) + '%, 0, 0)';
        msgRowB.style.transform = 'translate3d(' + (-24 + 16 * msgP) + '%, 0, 0)';

        // photo settles from large to card size
        var settle = easeOut(clamp01(msgP / 0.55));
        msgPhoto.style.transform =
            'translate(-50%, -50%) scale(' + (1.45 - 0.45 * settle) + ')';

        // signature writes itself left-to-right
        var sig = clamp01((msgP - 0.3) / 0.55);
        msgSig.style.clipPath = 'inset(-30% ' + ((1 - sig) * 100) + '% -30% 0)';

        msgLabel.style.opacity = clamp01(msgP * 4).toFixed(3);
    }
    requestAnimationFrame(messageFrame);

    /* --------------------------------------------------------------
       2b. About section: word-by-word reveal on scroll
    -------------------------------------------------------------- */

    var aboutTrack = document.getElementById('about-track');
    var aboutText = document.getElementById('about-text');

    // wrap every word in a span, keeping accent styling intact
    var aboutWords = [];
    Array.prototype.slice.call(aboutText.childNodes).forEach(function (node) {
        var isAccent = node.nodeType === 1 && node.classList.contains('about-accent');
        var text = node.textContent;
        var frag = document.createDocumentFragment();
        text.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) {
                frag.appendChild(document.createTextNode(part));
            } else {
                var span = document.createElement('span');
                span.className = 'about-word' + (isAccent ? ' about-accent' : '');
                span.textContent = part;
                frag.appendChild(span);
                aboutWords.push(span);
            }
        });
        aboutText.replaceChild(frag, node);
    });

    var aboutP = 0;

    function aboutFrame() {
        requestAnimationFrame(aboutFrame);
        var rect = aboutTrack.getBoundingClientRect();
        var total = aboutTrack.offsetHeight - window.innerHeight;
        var target = total > 0 ? clamp01(-rect.top / total) : 0;

        aboutP += (target - aboutP) * 0.1;
        if (Math.abs(target - aboutP) < 0.0005) aboutP = target;

        var n = aboutWords.length;
        for (var i = 0; i < n; i++) {
            var w = clamp01(aboutP * (n + 3) - i);
            aboutWords[i].style.opacity = (0.12 + 0.88 * w).toFixed(3);
        }
    }
    requestAnimationFrame(aboutFrame);

    /* --------------------------------------------------------------
       2c. Contact form: opens the visitor's mail client, prefilled
    -------------------------------------------------------------- */

    var contactForm = document.getElementById('contact-form');
    contactForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var naam = contactForm.naam.value.trim();
        var email = contactForm.email.value.trim();
        var bericht = contactForm.bericht.value.trim();
        var subject = 'Contact via crombruggen — ' + naam;
        var body = bericht + '\n\n— ' + naam + ' (' + email + ')';
        window.location.href = 'mailto:axelwillockx@gmail.com'
            + '?subject=' + encodeURIComponent(subject)
            + '&body=' + encodeURIComponent(body);
    });

    /* --------------------------------------------------------------
       3. WebGL mask-distortion hero
    -------------------------------------------------------------- */

    var canvas = document.getElementById('mask-canvas');
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
