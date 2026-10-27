/* ============================================================
   青城有你 · 公共工具：坐标转换 / 本地状态 / 通用方法
   ============================================================ */
(function () {
  'use strict';

  /* ---------- WGS84 -> GCJ02（高德/腾讯底图坐标） ---------- */
  var PI = Math.PI, A = 6378245.0, EE = 0.00669342162296594323;
  function outOfChina(lng, lat) {
    return !(lng > 73.66 && lng < 135.05 && lat > 3.86 && lat < 53.55);
  }
  function tLat(x, y) {
    var r = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    r += (20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2 / 3;
    r += (20 * Math.sin(y * PI) + 40 * Math.sin(y / 3 * PI)) * 2 / 3;
    r += (160 * Math.sin(y / 12 * PI) + 320 * Math.sin(y * PI / 30)) * 2 / 3;
    return r;
  }
  function tLng(x, y) {
    var r = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    r += (20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2 / 3;
    r += (20 * Math.sin(x * PI) + 40 * Math.sin(x / 3 * PI)) * 2 / 3;
    r += (150 * Math.sin(x / 12 * PI) + 300 * Math.sin(x / 30 * PI)) * 2 / 3;
    return r;
  }
  function wgs2gcj(lng, lat) {
    if (outOfChina(lng, lat)) return [lng, lat];
    var dLat = tLat(lng - 105, lat - 35);
    var dLng = tLng(lng - 105, lat - 35);
    var rad = lat / 180 * PI;
    var magic = 1 - EE * Math.sin(rad) * Math.sin(rad);
    var sq = Math.sqrt(magic);
    dLat = (dLat * 180) / ((A * (1 - EE)) / (magic * sq) * PI);
    dLng = (dLng * 180) / (A / sq * Math.cos(rad) * PI);
    return [lng + dLng, lat + dLat];
  }

  /* ---------- 距离 ---------- */
  function haversine(lng1, lat1, lng2, lat2) {
    var R = 6371, toR = PI / 180;
    var dLat = (lat2 - lat1) * toR, dLng = (lng2 - lng1) * toR;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * toR) * Math.cos(lat2 * toR) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /* ---------- 本地存储 ---------- */
  var KEYS = { vip: 'hhht_vip', likes: 'hhht_likes', admin: 'hhht_admin', loc: 'hhht_loc' };
  function storeGet(k) {
    try { return JSON.parse(localStorage.getItem(KEYS[k])); } catch (e) { return null; }
  }
  function storeSet(k, v) {
    try { localStorage.setItem(KEYS[k], JSON.stringify(v)); } catch (e) {}
  }
  function storeDel(k) {
    try { localStorage.removeItem(KEYS[k]); } catch (e) {}
  }

  /* ---------- 状态 ---------- */
  var state = {
    vip: storeGet('vip'),
    likes: storeGet('likes') || {},
    location: storeGet('loc'), // {lng, lat, accuracy}
    onLikesChange: null
  };
  function isVip() { return !!state.vip; }
  function isLiked(id) { return !!state.likes[id]; }
  function toggleLike(id) {
    if (state.likes[id]) {
      delete state.likes[id];
      storeSet('likes', state.likes);
      return false;
    }
    state.likes[id] = Date.now();
    storeSet('likes', state.likes);
    return true;
  }
  function likeCount() { return Object.keys(state.likes).length; }

  /* ---------- 心动值（含本地点击） ---------- */
  function heartsOf(p) {
    return p.hearts + (isLiked(p.id) ? 1 : 0);
  }

  /* ---------- toast ---------- */
  function toast(msg, type, icon) {
    var wrap = document.getElementById('toastWrap');
    if (!wrap) return;
    var el = document.createElement('div');
    el.className = 'toast' + (type ? ' ' + type : '');
    el.innerHTML = (icon ? icon : '') + '<span>' + msg + '</span>';
    wrap.appendChild(el);
    setTimeout(function () {
      el.style.transition = 'opacity .3s, transform .3s';
      el.style.opacity = '0';
      el.style.transform = 'translateY(-8px)';
      setTimeout(function () { el.remove(); }, 320);
    }, 2200);
  }

  /* ---------- SVG 图标 ---------- */
  var ICONS = {
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-4.35-7-9.6C5 8.3 7.3 6 10 6c1.1 0 2 .6 2 1.5C12 6.6 12.9 6 14 6c2.7 0 5 2.3 5 5.4C19 16.65 12 21 12 21z"/></svg>',
    heartFill: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7-4.35-7-9.6C5 8.3 7.3 6 10 6c1.1 0 2 .6 2 1.5C12 6.6 12.9 6 14 6c2.7 0 5 2.3 5 5.4C19 16.65 12 21 12 21z"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
    verify: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 2l2.6 1.8 3.2-.3 1 3 2.7 1.8-1.2 2.9 1.2 2.9-2.7 1.8-1 3-3.2-.3L12 22l-2.6-1.8-3.2.3-1-3-2.7-1.8 1.2-2.9L2.5 9.9l2.7-1.8 1-3 3.2.3z"/><path d="M9 12l2 2 4-4"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.2 6.8.7-5.1 4.6 1.5 6.7L12 17l-6.1 3.2 1.5-6.7L2.3 8.9l6.8-.7z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 6L9 17l-5-5"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s7-6.4 7-11a7 7 0 1 0-14 0c0 4.6 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>'
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- 支付 ---------- */
  var PLANS = [
    { id: 'month', name: '月卡', price: 39.9, orig: 59.9, desc: '每月 39.9 元', tag: '' },
    { id: 'quarter', name: '季卡', price: 99, orig: 179.7, desc: '每月 33 元', tag: '热门' },
    { id: 'year', name: '年卡', price: 199, orig: 718.8, desc: '每月 16.6 元', tag: '最划算' },
    { id: 'forever', name: '终身卡', price: 399, orig: 999, desc: '一次开通永久有效', tag: '' }
  ];

  window.HHHT = {
    wgs2gcj: wgs2gcj,
    haversine: haversine,
    state: state,
    KEYS: KEYS,
    storeGet: storeGet,
    storeSet: storeSet,
    storeDel: storeDel,
    isVip: isVip,
    isLiked: isLiked,
    toggleLike: toggleLike,
    likeCount: likeCount,
    heartsOf: heartsOf,
    toast: toast,
    ICONS: ICONS,
    esc: esc,
    PLANS: PLANS
  };
})();
