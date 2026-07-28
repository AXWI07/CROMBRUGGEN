/* ------------------------------------------------------------------
   Lightbox — click any content image to view it enlarged.
   Shared by all pages. Images inside links/buttons keep their action.
------------------------------------------------------------------ */
(function () {
    'use strict';

    var ov = document.createElement('div');
    ov.className = 'lightbox';
    ov.setAttribute('aria-hidden', 'true');

    var closeBtn = document.createElement('button');
    closeBtn.className = 'lightbox-close';
    closeBtn.setAttribute('aria-label', 'Sluiten');
    closeBtn.innerHTML = '&times;';

    var big = document.createElement('img');
    big.className = 'lightbox-img';
    big.alt = '';

    ov.appendChild(closeBtn);
    ov.appendChild(big);
    (document.body || document.documentElement).appendChild(ov);

    function open(src, alt) {
        big.src = src;
        big.alt = alt || '';
        ov.classList.add('open');
        ov.setAttribute('aria-hidden', 'false');
        document.documentElement.style.overflow = 'hidden';
    }
    function close() {
        ov.classList.remove('open');
        ov.setAttribute('aria-hidden', 'true');
        document.documentElement.style.overflow = '';
    }

    document.addEventListener('click', function (e) {
        var img = e.target && e.target.closest ? e.target.closest('img') : null;
        // only the photos inside a fotografie gallery tile
        if (!img || !img.closest('.work-item')) return;
        e.preventDefault();
        open(img.currentSrc || img.src, img.alt);
    });

    ov.addEventListener('click', function (e) {
        if (e.target === ov || e.target === closeBtn) close();
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && ov.classList.contains('open')) close();
    });
})();
