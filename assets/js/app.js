/* Madinah Real Estate — демо Telegram Mini App. Без сборки и без сервера. */
(function () {
  'use strict';

  var D = window.DATA;
  var TG = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData !== undefined ? window.Telegram.WebApp : null;
  var inTelegram = !!(TG && TG.platform && TG.platform !== 'unknown');
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var state = { period: 'all', district: 'all', flags: {}, view: 'list', open: null, who: 'Семья', term: '3 месяца', people: 2 };
  var favs = loadFavs();

  /* ---------- утилиты ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function plural(n, one, few, many) { var a = n % 10, b = n % 100; return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many; }
  function haptic(kind) { try { if (inTelegram && TG.HapticFeedback) TG.HapticFeedback.impactOccurred(kind || 'light'); } catch (e) {} }
  function toast(text) {
    var t = $('#toast'); t.textContent = text; t.hidden = false;
    clearTimeout(toast.tm); toast.tm = setTimeout(function () { t.hidden = true; }, 2600);
  }
  function loadFavs() { try { return JSON.parse(localStorage.getItem('mre-favs') || '[]'); } catch (e) { return []; } }
  function saveFavs() { try { localStorage.setItem('mre-favs', JSON.stringify(favs)); } catch (e) {} }
  function isFav(id) { return favs.indexOf(id) >= 0; }

  function tgLink(text) { return 'https://t.me/' + D.contacts.telegram + (text ? '?text=' + encodeURIComponent(text) : ''); }
  function waLink(text) { return 'https://wa.me/' + D.contacts.whatsapp + (text ? '?text=' + encodeURIComponent(text) : ''); }
  function postLink(id) { return 'https://t.me/' + D.contacts.channel + '/' + id; }
  function openLink(url) {
    if (inTelegram && /^https:\/\/t\.me\//.test(url) && TG.openTelegramLink) { TG.openTelegramLink(url); return; }
    if (inTelegram && TG.openLink) { TG.openLink(url); return; }
    window.open(url, '_blank', 'noopener');
  }
  // все ссылки наружу — через openLink, чтобы внутри Telegram они открывались правильно
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-out]');
    if (!a) return;
    e.preventDefault(); haptic(); openLink(a.getAttribute('href'));
  });

  /* ---------- данные квартиры ---------- */
  function geoOf(l) { return l.geo || D.districts[l.district].geo; }
  function km(a, b) {
    var R = 6371, r = Math.PI / 180, dLat = (b[0] - a[0]) * r, dLon = (b[1] - a[1]) * r;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function distText(l) {
    if (l.walk) return l.walk + ' пешком до Харама';
    var d = km(geoOf(l), D.haram.geo) * 1.3;           // по улицам примерно на треть длиннее
    return '≈ ' + d.toFixed(1).replace('.', ',') + ' км до Харама';
  }
  function priceHtml(l, small) {
    if (!l.price) return 'По запросу';
    return num(l.price) + (small ? '<small>' + (l.period === 'year' ? 'SAR/год' : 'SAR/мес') + '</small>' : '');
  }
  function roomsText(l) {
    var s = l.rooms + ' ' + plural(l.rooms, 'комната', 'комнаты', 'комнат');
    if (l.hall) s += ' + зал';
    return s + ' · ' + l.baths + ' ' + plural(l.baths, 'санузел', 'санузла', 'санузлов');
  }
  function cover(l) { var m = l.media[0]; return m.poster || m.src; }
  function hasVideo(l) { return l.media.some(function (m) { return m.type === 'video' || m.type === 'post'; }); }
  function tagsHtml(l) {
    var t = [];
    if (l.isNew) t.push('<span class="tag tag--gold">Новый дом</span>');
    if (l.women) t.push('<span class="tag tag--gold">Для сестёр</span>');
    if (l.family) t.push('<span class="tag">Для семей</span>');
    if (l.utilities) t.push('<span class="tag">Коммуналка включена</span>');
    if (hasVideo(l)) t.push('<span class="tag tag--video">Видео</span>');
    return t.join('');
  }

  var FLAGS = [
    { id: 'furnished', label: 'С мебелью', test: function (l) { return l.furnished; } },
    { id: 'utilities', label: 'Коммуналка включена', test: function (l) { return l.utilities; } },
    { id: 'family', label: 'Для семей', test: function (l) { return l.family; } },
    { id: 'women', label: 'Для сестёр', test: function (l) { return l.women; } },
    { id: 'cheap', label: 'До 2 500 в месяц', test: function (l) { return l.period === 'month' && l.price && l.price <= 2500; } },
    { id: 'fav', label: '♥ Избранное', test: function (l) { return isFav(l.id); } }
  ];

  function visible() {
    return D.listings.filter(function (l) {
      if (state.period !== 'all' && l.period !== state.period) return false;
      if (state.district !== 'all' && l.district !== state.district) return false;
      for (var i = 0; i < FLAGS.length; i++) if (state.flags[FLAGS[i].id] && !FLAGS[i].test(l)) return false;
      return true;
    });
  }

  /* ---------- список ---------- */
  var HEART = '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-9-9.2C1.7 7.4 4 4 7.4 4c2 0 3.3 1 4.6 2.6C13.3 5 14.6 4 16.6 4 20 4 22.3 7.4 21 10.8 19 15.6 12 20 12 20Z"/></svg>';
  var FRAME = '<svg class="card__frame" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M3.5 100V31C3.5 16.5 24 8 50 3.6 76 8 96.5 16.5 96.5 31V100"/></svg>';

  function renderFilters() {
    var counts = {};
    D.listings.forEach(function (l) { counts[l.district] = (counts[l.district] || 0) + 1; });
    var html = '<button data-v="all" class="' + (state.district === 'all' ? 'is-on' : '') + '">Все районы<span class="n">' + D.listings.length + '</span></button>';
    Object.keys(D.districts).sort(function (a, b) { return (counts[b] || 0) - (counts[a] || 0); }).forEach(function (k) {
      if (!counts[k]) return;
      html += '<button data-v="' + k + '" class="' + (state.district === k ? 'is-on' : '') + '">' + esc(D.districts[k].name) + '<span class="n">' + counts[k] + '</span></button>';
    });
    $('#chipsDistrict').innerHTML = html;
    $('#chipsFlags').innerHTML = FLAGS.map(function (f) {
      return '<button data-v="' + f.id + '" class="' + (state.flags[f.id] ? 'is-on' : '') + '">' + esc(f.label) + '</button>';
    }).join('');
  }

  function renderList() {
    var items = visible();
    $('#list').innerHTML = items.map(function (l, i) {
      var d = D.districts[l.district];
      return '<article class="card" style="animation-delay:' + Math.min(i, 6) * 60 + 'ms">' +
        '<button class="card__open" type="button" data-open="' + l.id + '">' +
          '<div class="card__media"><img src="' + esc(cover(l)) + '" alt="" loading="' + (i < 2 ? 'eager' : 'lazy') + '">' + FRAME +
            '<div class="card__tags">' + tagsHtml(l) + '</div></div>' +
          '<div class="card__body">' +
            '<div class="card__row"><span class="card__price">' + priceHtml(l, true) + '</span><span class="card__dist">' + esc(distText(l)) + '</span></div>' +
            '<h3 class="card__title">' + esc(l.title) + '</h3>' +
            '<p class="card__meta"><b>' + esc(d.name) + '</b> · ' + esc(roomsText(l)) + '</p>' +
          '</div>' +
        '</button>' +
        '<button class="card__fav' + (isFav(l.id) ? ' is-fav' : '') + '" type="button" data-fav="' + l.id + '" aria-label="В избранное">' + HEART + '</button>' +
      '</article>';
    }).join('');
    $('#empty').hidden = items.length > 0;
    var n = items.length;
    $('#heroSub').textContent = n + ' ' + plural(n, 'предложение', 'предложения', 'предложений') + ' · фото и видео из канала @' + D.contacts.channel;
    if (map) drawPins();
  }

  function render() { renderFilters(); renderList(); }

  $('#segPeriod').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    state.period = b.dataset.v; haptic();
    $$('#segPeriod button').forEach(function (x) { x.classList.toggle('is-on', x === b); });
    renderList();
  });
  $('#chipsDistrict').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    state.district = b.dataset.v; haptic(); render();
    if (map) fitPins();
  });
  $('#chipsFlags').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    state.flags[b.dataset.v] = !state.flags[b.dataset.v]; haptic(); render();
  });
  $('#resetFilters').addEventListener('click', function () {
    state.period = 'all'; state.district = 'all'; state.flags = {};
    $$('#segPeriod button').forEach(function (x) { x.classList.toggle('is-on', x.dataset.v === 'all'); });
    render();
  });
  document.addEventListener('click', function (e) {
    var f = e.target.closest('[data-fav]');
    if (f) { toggleFav(+f.dataset.fav); return; }
    var o = e.target.closest('[data-open]');
    if (o) openDetail(+o.dataset.open);
  });

  function toggleFav(id) {
    var i = favs.indexOf(id);
    if (i >= 0) favs.splice(i, 1); else favs.push(id);
    saveFavs(); haptic('medium');
    toast(i >= 0 ? 'Убрано из избранного' : 'Добавлено в избранное');
    $$('[data-fav="' + id + '"]').forEach(function (b) { b.classList.toggle('is-fav', i < 0); });
    if (state.flags.fav) renderList();
  }

  /* ---------- карта ---------- */
  var TILES = [
    { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', attr: 'Esri · © OpenStreetMap' },
    { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attr: '© OpenStreetMap' }
  ];
  function addTiles(m) {
    var i = 0, good = 0, bad = 0, layer;
    (function add() {
      layer = L.tileLayer(TILES[i].url, { maxZoom: 19, attribution: TILES[i].attr });
      layer.on('tileload', function () { good++; });
      layer.on('tileerror', function () {
        bad++;
        if (!good && bad > 4 && i + 1 < TILES.length) { i++; m.removeLayer(layer); bad = 0; add(); }   // источник молчит — берём запасной
      });
      layer.addTo(m);
    })();
  }
  var DOME = '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="#0F3D2E" stroke="#D9B56C" stroke-width="2"/><path d="M13 33h22v-3H13zM15 30c0-7 4-11 9-11s9 4 9 11zM24 19v-4" fill="#1F7A55" stroke="#D9B56C" stroke-width="1.4"/><path d="M11 33V20M9.5 20h3" stroke="#D9B56C" stroke-width="1.6"/></svg>';
  function haramMarker() {
    return L.marker(D.haram.geo, { icon: L.divIcon({ className: 'pin pin--haram', html: DOME, iconSize: [44, 44], iconAnchor: [22, 22] }), zIndexOffset: 1000 })
      .bindTooltip(D.haram.name, { direction: 'top', offset: [0, -20] });
  }

  var map = null, pins = [], active = null;
  // квартиры одного района с одной точкой раскладываем по маленькой спирали, чтобы метки не слипались
  function spread(list) {
    var seen = {};
    return list.map(function (l) {
      var g = geoOf(l), key = g.join(','), n = seen[key] = (seen[key] || 0) + 1;
      if (n === 1) return g;
      var a = n * 2.4, r = 0.0011 * Math.sqrt(n);
      return [g[0] + r * Math.cos(a), g[1] + r * Math.sin(a) * 1.1];
    });
  }
  var CLUSTER_ZOOM = 15;   // дальше этого масштаба квартиры района собираются в одну метку
  function drawPins() {
    pins.forEach(function (p) { map.removeLayer(p); }); pins = [];
    var items = visible(), pts = spread(items);
    if (map.getZoom() < CLUSTER_ZOOM) {
      var groups = {};
      items.forEach(function (l) { (groups[l.district] = groups[l.district] || []).push(l); });
      Object.keys(groups).forEach(function (k) {
        var g = groups[k];
        if (g.length === 1) return;
        var prices = g.filter(function (l) { return l.price && l.period === 'month'; }).map(function (l) { return l.price; });
        var label = esc(D.districts[k].name) + ' · ' + g.length + (prices.length ? '<em>от ' + num(Math.min.apply(null, prices)) + '</em>' : '');
        var p = L.marker(D.districts[k].geo, { icon: L.divIcon({ className: 'pin pin--group', html: '<b>' + label + '</b>', iconSize: [0, 0] }) }).addTo(map);
        p.on('click', function () { haptic(); map.flyTo(D.districts[k].geo, CLUSTER_ZOOM + 1, { duration: .6 }); });
        pins.push(p);
        items = items.filter(function (l) { return l.district !== k; });
      });
      pts = spread(items);
    }
    items.forEach(function (l, i) {
      var label = l.price ? num(l.price) + (l.period === 'year' ? '/год' : '') : 'Новый дом';
      var p = L.marker(pts[i], { icon: L.divIcon({ className: 'pin', html: '<b>' + label + '</b>', iconSize: [0, 0] }), riseOnHover: true }).addTo(map);
      p.on('click', function () { showMapCard(l, p); });
      p.listing = l;
      pins.push(p);
    });
    $('#mapCard').hidden = true;
  }
  function fitPins() {
    var pts = visible().map(geoOf).concat([D.haram.geo]);
    map.fitBounds(L.latLngBounds(pts), { paddingTopLeft: [40, 150], paddingBottomRight: [40, 110], maxZoom: 15 });
  }
  function showMapCard(l, pin) {
    haptic();
    if (active) L.DomUtil.removeClass(active._icon, 'is-active');
    active = pin; L.DomUtil.addClass(pin._icon, 'is-active');
    var c = $('#mapCard');
    c.innerHTML = '<img src="' + esc(cover(l)) + '" alt="">' +
      '<div><div class="mapcard__price">' + priceHtml(l) + (l.price ? ' <small style="font:600 12px var(--sans);color:var(--muted)">' + (l.period === 'year' ? 'SAR/год' : 'SAR/мес') + '</small>' : '') + '</div>' +
      '<p class="mapcard__title">' + esc(l.title) + '</p>' +
      '<p class="mapcard__meta">' + esc(D.districts[l.district].name) + ' · ' + esc(distText(l)) + '</p>' +
      '<button class="btn btn--green" type="button" data-open="' + l.id + '">Смотреть квартиру</button></div>';
    c.hidden = false;
  }
  function initMap() {
    if (map || !window.L) return;
    map = L.map('map', { zoomControl: false, attributionControl: true }).setView(D.haram.geo, 13);
    addTiles(map);
    haramMarker().addTo(map);
    var wasGrouped = true;
    map.on('zoomend', function () {
      var g = map.getZoom() < CLUSTER_ZOOM;
      if (g !== wasGrouped) { wasGrouped = g; drawPins(); }
    });
    map.on('click', function () { $('#mapCard').hidden = true; if (active) L.DomUtil.removeClass(active._icon, 'is-active'); active = null; });
    drawPins(); fitPins();
  }

  function setView(v) {
    state.view = v; haptic();
    document.body.classList.toggle('is-map', v === 'map');
    $('#screenMap').hidden = v !== 'map';
    $('#viewToggleText').textContent = v === 'map' ? 'Список' : 'Карта';
    // фильтры остаются над картой: прокручиваем так, чтобы они прилипли под шапкой
    if (v === 'map') window.scrollTo(0, Math.max(window.scrollY, $('.hero').offsetTop + $('.hero').offsetHeight));
    if (v === 'map') { initMap(); setTimeout(function () { map.invalidateSize(); fitPins(); }, 60); }
    syncBack();
  }
  $('#viewToggle').addEventListener('click', function () { setView(state.view === 'map' ? 'list' : 'map'); });

  /* ---------- страница квартиры ---------- */
  var BACK = '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>';
  var WALK = '<svg viewBox="0 0 48 48"><path d="M6 42h36M10 42V26h28v16M14 26c0-9 4.5-14 10-14s10 5 10 14M24 12V7"/><path d="M40 42V14M38 14h4M38 22h4"/></svg>';
  var CHAT = '<svg viewBox="0 0 24 24"><path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/></svg>';
  var miniMap = null;

  /* Облегчённая версия выкладывается без видеофайлов (media/*.mp4 не в репозитории).
     Проверяем один ролик: нет его на сервере — вместо плеера обложка и кнопка «Смотреть видео в канале». */
  var videosOk = true;
  (function () {
    var first = null;
    D.listings.some(function (l) { return l.media.some(function (m) { if (m.type === 'video') { first = m.src; return true; } }); });
    if (!first || location.protocol === 'file:') return;
    fetch(first, { method: 'HEAD' }).then(function (r) {
      var type = r.headers.get('content-type') || '';
      videosOk = r.ok && type.indexOf('video') === 0;
    }).catch(function () { videosOk = false; });
  })();

  function slideHtml(m, l) {
    var poster = m.poster || m.src;
    var bg = '<i class="bg" style="background-image:url(\'' + esc(poster) + '\')"></i>';
    if (m.type === 'photo') return '<div class="dt__slide">' + bg + '<img src="' + esc(m.src) + '" alt=""></div>';
    if (m.type === 'video' && videosOk) return '<div class="dt__slide">' + bg +
      '<video src="' + esc(m.src) + '" poster="' + esc(poster) + '" preload="none" playsinline controls controlslist="nodownload"></video>' +
      '<button class="dt__play" type="button" aria-label="Смотреть видео"></button></div>';
    return '<div class="dt__slide">' + bg + '<img src="' + esc(poster) + '" alt="">' +
      '<a class="btn btn--gold dt__post" data-out href="' + postLink(l.id) + '">Смотреть видео в канале</a></div>';
  }

  function openDetail(id) {
    var l = D.listings.filter(function (x) { return x.id === id; })[0];
    if (!l) return;
    haptic(); state.open = l;
    var d = D.districts[l.district], el = $('#detail');
    var monthly = l.price && l.period === 'year' ? '≈ ' + num(Math.round(l.price / 12 / 50) * 50) + ' SAR в месяц' + (l.payments ? ', оплата в ' + l.payments + ' платежа' : '') : (l.price ? 'в месяц' : 'уточните у риелтора');
    var way = l.walk ? l.walk + ' пешком' + (l.car ? ', ' + l.car + ' на машине' : '') : distText(l).replace(' до Харама', ' по городу');
    el.innerHTML =
      '<div class="dt">' +
      '<div class="dt__bar"><button type="button" data-close-detail aria-label="Назад">' + BACK + '</button>' +
        '<button type="button" class="dt__fav' + (isFav(l.id) ? ' is-fav' : '') + '" data-fav="' + l.id + '" aria-label="В избранное">' + HEART + '</button></div>' +
      '<div class="dt__gallery"><div class="dt__strip" id="dtStrip">' + l.media.map(function (m) { return slideHtml(m, l); }).join('') + '</div>' +
        (l.media.length > 1 ? '<div class="dt__dots">' + l.media.map(function (_, i) { return '<i class="' + (i ? '' : 'is-on') + '"></i>'; }).join('') + '</div>' : '') + '</div>' +
      '<div class="dt__sheet">' +
        '<p class="dt__district">' + esc(d.name) + (d.ar ? '<span lang="ar">' + esc(d.ar) + '</span>' : '') + '</p>' +
        '<h2 class="dt__title">' + esc(l.title) + '</h2>' +
        '<div class="dt__price"><div><small>Аренда</small><b>' + (l.price ? num(l.price) : 'По запросу') + '</b><em>' + (l.price ? (l.period === 'year' ? 'SAR за год · ' : 'SAR · ') : '') + esc(monthly) + '</em></div>' +
          '<div><small>Комиссия</small><b>' + (l.fee ? num(l.fee) : '—') + '</b><em>' + (l.fee ? 'SAR, один раз' : 'уточните у риелтора') + '</em></div></div>' +
        '<div class="dt__facts"><div><b>' + l.rooms + '</b><span>' + plural(l.rooms, 'комната', 'комнаты', 'комнат') + '</span></div>' +
          '<div><b>' + (l.hall ? 'Да' : 'Нет') + '</b><span>зал</span></div>' +
          '<div><b>' + l.baths + '</b><span>' + plural(l.baths, 'санузел', 'санузла', 'санузлов') + '</span></div></div>' +
        (l.note ? '<p class="dt__note">' + esc(l.note) + '</p>' : '') +
        '<h4>Что в квартире</h4><ul class="dt__features">' + l.features.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') +
          (l.utilities ? '<li>Коммунальные услуги включены</li>' : '') + (l.wifi ? '<li>Wi-Fi включён</li>' : '') + '</ul>' +
        '<h4>До Пророческой мечети</h4>' +
        '<div class="dt__way">' + WALK + '<p><b>' + esc(way) + '</b><br><small>' + (l.exact ? 'Точка по ссылке из объявления' : 'Расстояние от центра района, примерно') + '</small></p></div>' +
        '<div class="dt__map" id="dtMap"></div>' +
        '<div class="dt__links">' +
          (l.exact ? '<a class="btn btn--ghost" data-out href="https://maps.google.com/?q=' + geoOf(l).join(',') + '">Открыть в Google Maps</a>' : '') +
          '<a class="btn btn--ghost" data-out href="' + postLink(l.id) + '">Пост в канале</a></div>' +
        '<h4>Как забронировать</h4><ol class="dt__features" style="grid-template-columns:1fr">' + D.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' +
      '</div>' +
      '<div class="dt__cta"><button class="btn btn--gold" type="button" id="dtBook">Забронировать</button>' +
        '<a class="btn btn--tg dt__ask" data-out href="' + tgLink(askText(l)) + '" aria-label="Задать вопрос в Telegram">' + CHAT + '</a></div>' +
      '</div>';
    el.hidden = false; el.scrollTop = 0;
    document.body.classList.add('is-detail');

    var strip = $('#dtStrip'), dots = $$('.dt__dots i', el);
    strip.addEventListener('scroll', function () {
      var i = Math.round(strip.scrollLeft / strip.clientWidth);
      dots.forEach(function (x, k) { x.classList.toggle('is-on', k === i); });
      $$('video', strip).forEach(function (v, k) { if (!v.paused && v.closest('.dt__slide') !== strip.children[i]) v.pause(); });
    }, { passive: true });
    $$('.dt__play', el).forEach(function (b) {
      var v = b.previousElementSibling;
      b.addEventListener('click', function () { b.hidden = true; v.play(); haptic(); });
      v.addEventListener('play', function () { b.hidden = true; });
    });
    $('#dtBook').addEventListener('click', openSheet);

    setTimeout(function () {
      if (!window.L) return;
      if (miniMap) { miniMap.remove(); miniMap = null; }
      miniMap = L.map('dtMap', { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, touchZoom: false, doubleClickZoom: false });
      addTiles(miniMap);
      haramMarker().addTo(miniMap);
      L.marker(geoOf(l), { icon: L.divIcon({ className: 'pin is-active', html: '<b>' + esc(d.name) + '</b>', iconSize: [0, 0] }) }).addTo(miniMap);
      if (!l.exact) L.circle(geoOf(l), { radius: 450, color: '#B8893B', weight: 1.5, fillOpacity: .12 }).addTo(miniMap);
      miniMap.fitBounds(L.latLngBounds([geoOf(l), D.haram.geo]), { padding: [36, 36] });
    }, 120);
    syncBack();
  }
  function closeDetail() {
    var el = $('#detail');
    $$('video', el).forEach(function (v) { v.pause(); });
    if (miniMap) { miniMap.remove(); miniMap = null; }
    el.hidden = true; el.innerHTML = ''; state.open = null;
    document.body.classList.remove('is-detail');
    syncBack();
  }
  $('#detail').addEventListener('click', function (e) { if (e.target.closest('[data-close-detail]')) closeDetail(); });

  /* ---------- бронь ---------- */
  function line(l) {
    var price = l.price ? num(l.price) + ' SAR ' + (l.period === 'year' ? 'в год' : 'в месяц') : 'цена по запросу';
    return l.title + ' — ' + D.districts[l.district].name + ', ' + price + (l.fee ? ', комиссия ' + num(l.fee) : '');
  }
  function askText(l) {
    return 'Ассаляму алейкум! Вопрос по квартире из приложения:\n🏠 ' + line(l) + '\n' + postLink(l.id) + '\n\n';
  }
  function bookText() {
    var l = state.open, f = $('#bookForm');
    var name = f.name.value.trim(), date = f.date.value, comment = f.comment.value.trim();
    var dt = date ? date.split('-').reverse().join('.') : 'пока не знаю';
    return [
      'Ассаляму алейкум! Хочу забронировать квартиру.',
      '',
      '🏠 ' + line(l),
      '👤 Имя: ' + (name || '—'),
      '👥 Кто будет жить: ' + state.who + ', ' + state.people + ' чел.',
      '📅 Заезд: ' + dt + ', срок: ' + state.term,
      comment ? '💬 ' + comment : '',
      '',
      'Объявление: ' + postLink(l.id)
    ].filter(function (s, i, a) { return s !== '' || a[i - 1] !== ''; }).join('\n');
  }
  function openSheet() {
    var l = state.open; if (!l) return;
    haptic('medium');
    $('#bookWhat').textContent = line(l);
    $('#people').textContent = state.people;
    var dIn = $('#bookForm').date;
    if (!dIn.min) { var t = new Date(); dIn.min = t.toISOString().slice(0, 10); }
    $('#sheet').hidden = false;
    syncBack();
  }
  function closeSheet() { $('#sheet').hidden = true; syncBack(); }
  $('#sheet').addEventListener('click', function (e) { if (e.target.hasAttribute('data-close')) closeSheet(); });
  function pick(sel, key) {
    $(sel).addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      state[key] = b.dataset.v; haptic();
      $$(sel + ' button').forEach(function (x) { x.classList.toggle('is-on', x === b); });
    });
  }
  pick('#pickWho', 'who'); pick('#pickTerm', 'term');
  $$('.stepper button').forEach(function (b) {
    b.addEventListener('click', function () {
      state.people = Math.max(1, Math.min(15, state.people + (+b.dataset.step)));
      $('#people').textContent = state.people; haptic();
    });
  });
  $('#bookForm').addEventListener('submit', function (e) { e.preventDefault(); });
  $('#sendTg').addEventListener('click', function () { openLink(tgLink(bookText())); closeSheet(); toast('Открываем чат с риелтором…'); });
  $('#sendWa').addEventListener('click', function () { openLink(waLink(bookText())); closeSheet(); toast('Открываем WhatsApp…'); });

  /* ---------- кнопка «Назад» Telegram ---------- */
  function back() {
    if (!$('#sheet').hidden) return closeSheet();
    if (state.open) return closeDetail();
    if (state.view === 'map') return setView('list');
  }
  function syncBack() {
    if (!inTelegram || !TG.BackButton) return;
    var need = !$('#sheet').hidden || !!state.open || state.view === 'map';
    if (need) TG.BackButton.show(); else TG.BackButton.hide();
  }
  if (inTelegram && TG.BackButton) TG.BackButton.onClick(back);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') back(); });

  /* ---------- статичные блоки ---------- */
  $('#steps').innerHTML = D.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
  [['#topChannel', 'https://t.me/' + D.contacts.channel], ['#footChannel', 'https://t.me/' + D.contacts.channel],
   ['#agentTg', tgLink('Ассаляму алейкум! Пишу из приложения Madinah Real Estate. Ищу квартиру в Медине.')],
   ['#agentWa', waLink('Ассаляму алейкум! Пишу из приложения Madinah Real Estate. Ищу квартиру в Медине.')]]
    .forEach(function (p) { var a = $(p[0]); a.href = p[1]; a.setAttribute('data-out', ''); });
  $('#agentPhone').textContent = 'WhatsApp: ' + D.contacts.phoneText + ' · Telegram: @' + D.contacts.telegram;
  $('#brandTop').addEventListener('click', function (e) { e.preventDefault(); if (state.view === 'map') setView('list'); window.scrollTo({ top: 0, behavior: 'smooth' }); });

  if (inTelegram) {
    try { TG.ready(); TG.expand(); TG.setHeaderColor('#F4EEE2'); TG.setBackgroundColor('#F4EEE2'); } catch (e) {}
  }
  render();

  /* ---------- заставка ----------
     Стартует только когда страница реально видна (иначе в фоне «сгорает»),
     держится минимум 3,5 с, закрывается не раньше загрузки, есть аварийный выход. */
  (function intro() {
    var el = $('#intro'), body = document.body, started = false, shownAt = 0, loaded = document.readyState === 'complete', done = false;
    var MIN = 3600, CAP = 6500;
    function finish() {
      if (done) return; done = true;
      el.classList.add('is-opening'); haptic('medium');
      setTimeout(function () { el.remove(); body.classList.remove('is-locked'); }, 1000);
    }
    function maybeFinish() {
      if (!started || done) return;
      var t = performance.now() - shownAt;
      if (t >= CAP || (t >= MIN && loaded)) finish();
      else setTimeout(maybeFinish, Math.max(120, (loaded ? MIN : CAP) - t));
    }
    function start() {
      if (started || document.visibilityState !== 'visible') return;
      started = true;
      var go = function () {
        if (shownAt) return;
        shownAt = performance.now(); el.classList.add('is-playing');
        setTimeout(function () { haptic('rigid'); }, 2000);    // щелчок ключа
        maybeFinish();
      };
      requestAnimationFrame(function () { requestAnimationFrame(go); });
      setTimeout(function () {                                   // кадры не пришли — показываем статикой
        if (!shownAt && document.visibilityState === 'visible') { el.classList.add('is-poster'); go(); }
      }, 400);
    }
    window.addEventListener('load', function () { loaded = true; maybeFinish(); });
    document.addEventListener('visibilitychange', start);
    $('#introSkip').addEventListener('click', finish);
    setTimeout(finish, 10000);                                   // аварийный выход: видимости так и не случилось
    start();
  })();
})();
