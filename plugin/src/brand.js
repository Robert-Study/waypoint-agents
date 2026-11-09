(function (CC) {
  // Product identity for the harness, independent of the dsh distribution underneath.
  // Change the name or mark here only: the sidebar, the blank-session hero, the tab title and the
  // favicon all read CC.BRAND.
  //
  // How it fits dsh without editing it: `sidebar.brand.mark`, `sidebar.brand.name` (ui-sidebar) and
  // `conversation.hero.brand.mark` (ui-conversation) are declared replaceable `single` seats. dsh's
  // slot registry keeps every registration sorted by `priority` and renders the lowest, so we
  // register below the official occupant (priority 0) instead of disabling its row. If a dsh update
  // removes a seat, inject() simply never fires and dsh's own brand shows; if registration throws,
  // CC.contribute logs one [waypoint] warning and carries on.
  CC.BRAND = { name: 'Waypoint' };
  // Everything between the markers is written by scripts/make_icons.py from its CONFIG block (the
  // sidebar glyph and the icon data URIs); never edit it by hand.
  // @generated-art begin (scripts/make_icons.py; edit CONFIG there, never here)
  CC.BRAND.concept = 'constellation';
  CC.BRAND.mark = 'M5.4 18L9.6 11.6L14.4 14.8L18.6 6.8M9.6 11.6L5.8 7.2M3.4 18A2 2 0 1 1 7.4 18A2 2 0 1 1 3.4 18M7.6 11.6A2 2 0 1 1 11.6 11.6A2 2 0 1 1 7.6 11.6M12.4 14.8A2 2 0 1 1 16.4 14.8A2 2 0 1 1 12.4 14.8M15.8 6.8A2.8 2.8 0 1 1 21.4 6.8A2.8 2.8 0 1 1 15.8 6.8M4.4 7.2A1.4 1.4 0 1 1 7.2 7.2A1.4 1.4 0 1 1 4.4 7.2';
  CC.BRAND.svgUri = 'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%20256%20256%22%20width=%22256%22%20height=%22256%22%3E%3Crect%20x=%228%22%20y=%228%22%20width=%22240%22%20height=%22240%22%20rx=%2256%22%20fill=%22%230b3b2e%22/%3E%3Cpath%20d=%22M62%20188%20L104%20124%20L152%20156%20L194%2076%20M104%20124%20L66%2080%22%20fill=%22none%22%20stroke=%22%2334d399%22%20stroke-width=%2212%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22/%3E%3Ccircle%20cx=%2262%22%20cy=%22188%22%20r=%2220%22%20fill=%22%2334d399%22/%3E%3Ccircle%20cx=%22104%22%20cy=%22124%22%20r=%2220%22%20fill=%22%2334d399%22/%3E%3Ccircle%20cx=%22152%22%20cy=%22156%22%20r=%2220%22%20fill=%22%2334d399%22/%3E%3Ccircle%20cx=%22194%22%20cy=%2276%22%20r=%2228%22%20fill=%22%2334d399%22/%3E%3Ccircle%20cx=%2266%22%20cy=%2280%22%20r=%2214%22%20fill=%22%2334d399%22/%3E%3C/svg%3E';
  CC.BRAND.png = {
      16: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABBElEQVR42mNggAJuaz1DIC4D4gYCGKTGkAEZQAX/k4jLkG3+TyY2JNp24Ujn/3p7O/8bnZ78X7o8AuEKqL/AAlrrG/4bHO3HaoDK9Pz/JpdngjHIIKh4A4YBIAWKPekYBij2ZcANUF9cjt0AEFbqzwQr0lhR/V8wyA4urjqr8L/JpRn/FbpS//PYG+I2AIQNjvRDndoF8X+UC8Rl3WnoLsNhwLEJcOfqbG35r7ur/b/RmSn/eV1MCBug2Avxq3i673/JguD/xuenoQccbgOUp+SAFStPzkEYCAxQkJhCewp+AyQLQ+DOFvC3ITYhNcATknC4EziRgPxLUnKmOClTnJkozc4ATWZ1X0p4mzEAAAAASUVORK5CYII=',
      32: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAB+0lEQVR42mNgGGyA21pPDog7gfgyEP8C4v8U4l9Qs0BmyhGyPIVKluJzTAo+y//TCadgC/ZfdHTAL5TogMbPfzrjTmQHXKa2BYrdaf8Njvb/N7k447/W2rr/oome6GouIzuAqsGvMi3vv8nlmagY6BDhcCeUaEB2AFaDlCZl/9dcVfNfPMOPaMsFfK0xLYdikMOQ1eJ1gGxNDFyjwZF+oh0ACmpcDgBFBVkOMD43lf4hAIsCvb2dYM2gREXlNEDYAXCHTMgCGyJTE02UA0SiXcDqjc5MwZcLiHcACKstKIUYenbqf8NTk/4rtKfgVKu+qOy/0anJ/3mdTfCaSZIDJLIDMIJVIssfMxEmQRKhXHMiQTNJcgDIx+gOwBYKGiuq/xsc7vvPbatPXQeAfIvuAO3NTf8FA2zhakDlBUhctjaGqLRCkgPEkrwgWfL8NHAa0FheBWaDMIgNEjO+OP2/4YmJROcWkhygs7UFmCW7/vPYGcDFQL4HhQIxaYMiByh0peI0mNi0QbYDROLcwYYqo5Vi+NIGVUJAdW4xOE6NzwHj/PjE/7xOxnhzCCgNECofiHaAYm8GRjHK52ZG9UYJTgeAik70YMVWlFLTAb/whQAoKmgQAr/wNslgaUBvX9d/yfxgWrQJLw+qRunANssHvGMyKLpmg6JzOhAAAIZYfsAlmIV3AAAAAElFTkSuQmCC',
      48: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAADJUlEQVR42mNgGAmA21rPFIhTgLgGiBtojGugdplS6mg2qGH3gfj/AOH7UDewkep4nwF2ODaP+BDr+JRB5HB0nEJMyP8f5NgHX5q/PwQ8cB9rnoBmlv9DBNdg88D9IeSB+9jK+QFzkHCk83/VucX/DY9P+G9yeeZ//f3d/xX7Mv7zuZri02c6KEoeqcIQsKOxYZBHhMIcCZdIA5X+BYPscDoehrU3NxPOB9AqnKCF8s2J/1VmFf6XLg2nigeUJmUT9AAIS+YFYdPfQJIHNFdWoxiq0J1GsQd0t7cS5QGQRynygHCUC4ahRqcmU+wBUBonxgMqMwto4IGzUyn2gMaKaqI8IAdMulRPQiAsmuBBkQdAeYkYD4AyO8UegGVitXkl/w2O9IMNNjjc918wwJYiT6gvqcDrePn2ZFx6SfcAPElFOP03Oj0ZXszxOBiR7QGhUAdSkw7lHgBh8XRfuEWgUJQqDv2v0J4CpkkxR3V2EaTSOtD9X7YmBhzioKTF72FOSC9lHgCn4fIIrCGnt6cTXw0KxyIxrnA9ZNQtlHsAXBQe6sVeg25sJJz+F5WD1epsbSHHbso9AAplfBkQXyyIJXkRqmlp7wFQMYrPA/iKWVixrLWuntwCgHIP8LqY4C8CW7CXIuKZfnA1oMJgwDwAScdleD0BCmlQUQluOkNLKr29nWA5jeVVlNQhlHsA1OEwONIHaVqcmQIvgWQb4v4rT8lF8YjhsQkYnqOwVUu5B1RmFIAdYnxu6n8BfxsMeYks//96+7pwt/WJKKlo5gGJnEC4Q2SqoklqCBJbUtHMA7yORsCasweSjpdV0qykopkH4On70oz/gsH2FJVUIHm6eABU2YDaKcqTc+CWy9bFEmUZqOTB5niQOM3zAKhRBcps6JaTWv3L1saASyh4SQXkU9ghIs4Daguxl/MGR/sHenCLsAcIpV9QjTqoPSDga43XA6S2/WnpAZwDW/oHe2lRhlN3gBff0KJ0RST2oY5peYNnsoPQ4C4oqehsgwxCgWIET0ebnth0+AyvD5cJjqE9xTTkJ/mGxTTrsJjoHhZLDYbFYo+hAgAQ9G5mMVhtOQAAAABJRU5ErkJggg==',
      256: 'data:image/png;base64,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'
  };
  // @generated-art end
  var PRIORITY = -10;
  var SLOTS = { mark: 'sidebar.brand.mark', name: 'sidebar.brand.name', hero: 'conversation.hero.brand.mark' };
  var UPSTREAM_TITLE = /DeepSeek Harness/;
  CC.BRAND_SLOTS = [SLOTS.mark, SLOTS.name, SLOTS.hero];

  // app.js (loaded later) defines CC.warn; until then log the same prefixed line directly.
  function warn(what, err) {
    if (typeof CC.warn === 'function') return CC.warn(what, err);
    try { console.warn('[waypoint] ' + what + (err ? ': ' + (err.message || err) : '')); } catch (e) { /* never throw */ }
  }

  function BrandMark(props) {
    var size = (props && props.size) || 24;
    var attrs = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
      strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, 'data-cc-brand': 'mark' };
    if (props && props.className) attrs.className = props.className;
    return CC.h('svg', attrs, CC.h('path', { d: CC.BRAND.mark }));
  }

  function BrandName() {
    var t = CC.tokens || {};
    return CC.h('span', { 'data-cc-brand': 'name', style: {
      fontSize: (t.size && t.size.section) || 17, fontWeight: (t.weight && t.weight.semibold) || 600,
      letterSpacing: '-0.005em', lineHeight: 1, whiteSpace: 'nowrap', color: 'currentColor' } }, CC.BRAND.name);
  }
  CC.BrandMark = BrandMark;
  CC.BrandName = BrandName;

  // ui-layout's DocumentTitle rewrites the tab title to "<session title> — DeepSeek Harness" (a
  // hard-coded product title) whenever the selected session changes, so we swap just the product
  // part and keep the session prefix.
  function brandTitle(current) {
    var name = CC.BRAND.name;
    if (!current) return name;
    return UPSTREAM_TITLE.test(current) ? current.replace(UPSTREAM_TITLE, name) : current;
  }
  CC.brandTitle = brandTitle;

  // The icon is one flat, full-colour tile, so it reads on light and dark tab strips and taskbars alike
  // (no per-scheme variants). The vector goes in as `sizes=any`; sharp PNGs (drawn with optical sizing at
  // 16 and 32 px) and an apple-touch-icon sit beside it, all as data URIs so no served asset is needed.
  function faviconUri() { return CC.BRAND.svgUri || ''; }
  CC.faviconUri = faviconUri;

  function iconSpecs() {
    var png = CC.BRAND.png || {};
    var specs = [];
    if (CC.BRAND.svgUri) specs.push({ rel: 'icon', type: 'image/svg+xml', sizes: 'any', href: CC.BRAND.svgUri });
    [16, 32, 48, 256].forEach(function (n) {
      if (png[n]) specs.push({ rel: 'icon', type: 'image/png', sizes: n + 'x' + n, href: png[n] });
    });
    if (png[256]) specs.push({ rel: 'apple-touch-icon', sizes: '256x256', href: png[256] });
    return specs;
  }
  CC.iconSpecs = iconSpecs;

  function setLink(l, spec) {
    ['rel', 'type', 'sizes', 'href'].forEach(function (k) {
      if (spec[k]) l.setAttribute(k, spec[k]); else if (l.removeAttribute) l.removeAttribute(k);
    });
  }

  // Re-brand every later title write. Our replacement never matches UPSTREAM_TITLE, so the observer
  // cannot loop. One observer per page: a bundle reload (HMR) disconnects the previous one.
  function watchTitle(doc) {
    var g = typeof globalThis !== 'undefined' ? globalThis : {};
    if (typeof g.MutationObserver !== 'function' || !doc.head) return;
    if (g.__ccBrandTitleObserver) { try { g.__ccBrandTitleObserver.disconnect(); } catch (e) { /* gone */ } }
    var obs = new g.MutationObserver(function () {
      try { if (UPSTREAM_TITLE.test(doc.title)) doc.title = brandTitle(doc.title); } catch (e) { /* never throw */ }
    });
    obs.observe(doc.head, { subtree: true, childList: true, characterData: true });
    g.__ccBrandTitleObserver = obs;
  }

  function applyDocument() {
    var doc = typeof document !== 'undefined' ? document : null;
    if (!doc) return;
    try { doc.title = brandTitle(doc.title); watchTitle(doc); } catch (e) { warn('tab title not set', e); }
    try {
      var specs = iconSpecs();
      if (!specs.length) return;
      var all = doc.querySelectorAll ? Array.prototype.slice.call(doc.querySelectorAll('link[rel~="icon"]')) : [];
      var ours = {};
      var theirs = [];
      var mine = doc.querySelectorAll ? Array.prototype.slice.call(doc.querySelectorAll('link[data-cc-icon]')) : [];
      mine.forEach(function (l) {
        var key = l.getAttribute && l.getAttribute('data-cc-icon');
        if (key) ours[key] = l;
      });
      all.forEach(function (l) { if (!(l.getAttribute && l.getAttribute('data-cc-icon'))) theirs.push(l); });
      // dsh's own icon links (one per colour scheme) now show the vector tile for both schemes.
      theirs.forEach(function (l) {
        setLink(l, specs[0]);
        if (l.removeAttribute) l.removeAttribute('media'); else l.setAttribute('media', 'all');
      });
      specs.forEach(function (spec, i) {
        if (i === 0 && theirs.length) return;
        var key = spec.rel + ':' + spec.sizes;
        var l = ours[key];
        if (!l && doc.createElement && doc.head) {
          l = doc.createElement('link');
          doc.head.appendChild(l);
        }
        if (!l) return;
        setLink(l, spec);
        l.setAttribute('data-cc-icon', key);
      });
    } catch (e) { warn('favicon not set', e); }
  }

  CC.applyBrand = function applyBrand(ctx) {
    try {
      if (typeof CC.contribute !== 'function') { warn('brand helper missing; dsh brand kept'); return; }
      CC.contribute(ctx, SLOTS.mark, { name: SLOTS.mark, priority: PRIORITY }, BrandMark, 'brand mark');
      CC.contribute(ctx, SLOTS.name, { name: SLOTS.name, priority: PRIORITY }, BrandName, 'brand name');
      CC.contribute(ctx, SLOTS.hero, { name: SLOTS.hero, priority: PRIORITY }, BrandMark, 'hero brand mark');
      applyDocument();
    } catch (e) { warn('brand not applied; dsh brand kept', e); }
  };
})(CC);
