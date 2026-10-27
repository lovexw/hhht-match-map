/* ============================================================
   青城有你 · 相亲地图  用户端主逻辑
   ============================================================ */
(function () {
  'use strict';
  var H = window.HHHT, DATA = window.HHHT_DATA;
  var I = H.ICONS;

  /* ---------- 筛选状态 ---------- */
  var filters = {
    gender: 'A', district: 0,
    ageMin: 22, ageMax: 36,
    height: 0, education: '', marital: '',
    onlineOnly: false, verifiedOnly: false,
    keyword: ''
  };
  var HEIGHTS = [[0, 0, '不限'], [0, 159, '160以下'], [160, 165, '160-165'], [166, 170, '166-170'],
  [171, 175, '171-175'], [176, 180, '176-180'], [181, 220, '180以上']];
  var EDUS = ['高中', '中专', '大专', '本科', '硕士', '博士'];
  var EDU_RANK = { '高中': 0, '中专': 1, '大专': 2, '本科': 3, '硕士': 4, '博士': 5 };

  /* ---------- 初始化地图 ---------- */
  var map = L.map('map', {
    center: [DATA.meta.center[1], DATA.meta.center[0]],
    zoom: 12,
    minZoom: 11,
    maxZoom: 18,
    zoomControl: false,
    zoomSnap: 0.5,
    attributionControl: true
  });
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  var vecLayer = L.tileLayer(
    'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
    { subdomains: ['1', '2', '3', '4'], maxZoom: 19, attribution: '© 高德地图 AutoNavi' }
  );
  var satImg = L.tileLayer(
    'https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
    { subdomains: ['1', '2', '3', '4'], maxZoom: 19, attribution: '© 高德地图 AutoNavi' }
  );
  var satCvb = L.tileLayer(
    'https://webst0{s}.is.autonavi.com/appmaptile?style=8&x={x}&y={y}&z={z}',
    { subdomains: ['1', '2', '3', '4'], maxZoom: 19, opacity: 0.9 });
  var satLayer = L.layerGroup([satImg, satCvb]);
  vecLayer.addTo(map);

  /* ---------- 行政区边界 ---------- */
  var districtBounds = {};
  fetch('assets/data/districts.json')
    .then(function (r) { return r.json(); })
    .then(function (geo) {
      L.geoJSON(geo, {
        style: function (f) {
          var d = DATA.districts.find(function (x) { return x.code === f.properties.adcode; });
          return { color: d ? d.color : '#f43f5e', weight: 2, opacity: .75, fillOpacity: .07, fillColor: d ? d.color : '#f43f5e' };
        },
        onEachFeature: function (f, layer) {
          var d = DATA.districts.find(function (x) { return x.code === f.properties.adcode; });
          districtBounds[f.properties.adcode] = layer.getBounds();
          layer.bindTooltip(
            '<div class="dist-box"><b>' + d.name + '</b><small>' + (d.female + d.male) + ' 位单身 · 点击查看</small></div>',
            { permanent: true, direction: 'center', className: 'dist-label', offset: [0, 0] });
          layer.on('click', function () {
            filters.district = d.code;
            syncDistrictChips();
            renderAll();
            map.flyToBounds(districtBounds[d.code], { padding: [40, 40], duration: .8 });
          });
        }
      }).addTo(map);
      var all = L.geoJSON(geo).getBounds();
      map.fitBounds(all.pad(0.12));
    });

  /* ---------- 标记 ---------- */
  var cluster = L.markerClusterGroup({
    maxClusterRadius: 48,
    iconCreateFunction: function (cl) {
      var fs = 0, ms = 0, n = cl.getChildCount();
      cl.getAllChildMarkers().forEach(function (mk) {
        if (mk._p.gender === 'F') fs++; else ms++;
      });
      var cls = fs && ms ? 'c-mix' : (fs ? 'c-f' : 'c-m');
      return L.divIcon({ html: '<div class="p-cluster ' + cls + '"><span>' + n + '</span></div>', className: '', iconSize: [48, 48], iconAnchor: [24, 48] });
    },
    spiderfyOnMaxZoom: true,
    showCoverageOn: false,
    zoomToBoundsOnClick: true
  });
  map.addLayer(cluster);

  var markers = {};
  function gcjOf(p) { var g = H.wgs2gcj(p.lng, p.lat); return [g[1], g[0]]; /* Leaflet 用 [lat, lng] */ }
  function markerHtml(p) {
    var liked = H.isLiked(p.id);
    return '<div class="p-marker ' + (p.gender === 'F' ? 'female' : 'male') + (H.isVip() ? '' : ' guest') + (liked ? ' liked' : '') + '">' +
      (p.online === '在线' ? '<div class="pulse"></div>' : '') +
      '<div class="ring"></div>' +
      (p.online === '在线' ? '<div class="on-dot"></div>' : '') +
      '<div class="pin"><img src="' + p.avatar + '" alt=""></div>' +
      '<div class="lock-flag" style="display:' + (H.isVip() ? 'none' : 'flex') + '">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg></div>' +
      (p.vipLevel !== '普通' ? '<div class="vip-corner">' + I.star + '</div>' : '') +
      '<div class="heart-num">' + I.heartFill + H.heartsOf(p) + '</div>' +
      '</div>';
  }
  function makeMarker(p) {
    var ll = gcjOf(p);
    var mk = L.marker(ll, {
      icon: L.divIcon({ html: markerHtml(p), className: '', iconSize: [52, 52], iconAnchor: [26, 52] }),
      title: p.nickname
    });
    mk._p = p;
    mk.on('click', function () {
      selectProfile(p);
    });
    return mk;
  }

  /* ---------- 筛选 ---------- */
  function passFilters(p) {
    if (filters.gender !== 'A' && p.gender !== filters.gender) return false;
    if (filters.district && p.districtCode !== filters.district) return false;
    if (p.age < filters.ageMin || p.age > filters.ageMax) return false;
    if (filters.height) {
      var h = HEIGHTS[filters.height];
      if (p.height < h[0] || p.height > h[1]) return false;
    }
    if (filters.education && EDU_RANK[p.education] < EDU_RANK[filters.education]) return false;
    if (filters.marital && p.marital !== filters.marital) return false;
    if (filters.onlineOnly && p.online !== '在线') return false;
    if (filters.verifiedOnly && !p.verified) return false;
    if (filters.keyword) {
      var k = filters.keyword.toLowerCase();
      var hay = (p.nickname + p.job + p.industry + p.place + p.district + p.tags.join(',') + p.employerType).toLowerCase();
      if (hay.indexOf(k) < 0) return false;
    }
    return true;
  }
  function filtered() { return DATA.profiles.filter(passFilters); }

  function renderAll() {
    var list = filtered();
    cluster.clearLayers();
    markers = {};
    list.forEach(function (p) {
      var mk = makeMarker(p);
      markers[p.id] = mk;
      cluster.addLayer(mk);
    });
    document.getElementById('resultCount').textContent = list.length + ' 人';
    document.getElementById('fabCount').textContent = list.length;
    renderCards(list);
    if (currentDetail && list.some(function (p) { return p.id === currentDetail.id; })) {
      // 详情保持
    }
    refreshMarkersLikeState();
  }

  /* ---------- 顶部统计 ---------- */
  function renderStats() {
    var online = DATA.profiles.filter(function (p) { return p.online === '在线'; }).length;
    document.getElementById('statOnline').textContent = online + 218;
    document.getElementById('statNew').textContent = 12 + DATA.profiles.filter(function (p) { return p.registeredAt >= '2026-10-20'; }).length;
    document.getElementById('statVip').textContent = 186 + DATA.profiles.filter(function (p) { return p.vipLevel !== '普通'; }).length;
  }

  /* ---------- 筛选面板 UI ---------- */
  function initFilters() {
    var chips = document.getElementById('districtChips');
    var allChip = document.createElement('button');
    allChip.className = 'chip on';
    allChip.dataset.code = '0';
    allChip.innerHTML = '全部 <small>' + DATA.profiles.length + '</small>';
    chips.appendChild(allChip);
    DATA.districts.forEach(function (d) {
      var b = document.createElement('button');
      b.className = 'chip';
      b.dataset.code = d.code;
      b.innerHTML = d.name + ' <small>' + (d.female + d.male) + '</small>';
      chips.appendChild(b);
    });
    chips.addEventListener('click', function (e) {
      var btn = e.target.closest('.chip');
      if (!btn) return;
      filters.district = Number(btn.dataset.code);
      syncDistrictChips();
      renderAll();
    });

    var hc = document.getElementById('heightChips');
    HEIGHTS.forEach(function (h, i) {
      var b = document.createElement('button');
      b.className = 'chip' + (i === 0 ? ' on' : '');
      b.textContent = h[2];
      b.onclick = function () {
        filters.height = i;
        hc.querySelectorAll('.chip').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        renderAll();
      };
      hc.appendChild(b);
    });

    var eduSel = document.getElementById('eduSel');
    EDUS.forEach(function (e) {
      var o = document.createElement('option');
      o.value = e; o.textContent = e + '及以上';
      eduSel.appendChild(o);
    });

    document.getElementById('genderTabs').addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      filters.gender = btn.dataset.g;
      this.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === btn); });
      renderAll();
    });
    var amin = document.getElementById('ageMin'), amax = document.getElementById('ageMax');
    function ageSync() {
      if (Number(amin.value) > Number(amax.value)) {
        if (this === amin) amax.value = amin.value; else amin.value = amax.value;
      }
      filters.ageMin = Number(amin.value);
      filters.ageMax = Number(amax.value);
      document.getElementById('ageLabel').textContent = filters.ageMin + ' - ' + filters.ageMax + ' 岁';
      renderAll();
    }
    amin.oninput = ageSync; amax.oninput = ageSync;
    document.getElementById('ageLabel').textContent = '22 - 36 岁';
    eduSel.onchange = function () { filters.education = eduSel.value; renderAll(); };
    document.getElementById('marSel').onchange = function () { filters.marital = this.value; renderAll(); };
    bindSwitch('swOnline', function (v) { filters.onlineOnly = v; renderAll(); });
    bindSwitch('swVerified', function (v) { filters.verifiedOnly = v; renderAll(); });
    document.getElementById('resetBtn').onclick = function () {
      filters = { gender: 'A', district: 0, ageMin: 22, ageMax: 36, height: 0, education: '', marital: '', onlineOnly: false, verifiedOnly: false, keyword: '' };
      amin.value = 22; amax.value = 36; eduSel.value = ''; document.getElementById('marSel').value = '';
      document.getElementById('searchInput').value = '';
      document.querySelectorAll('#genderTabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.g === 'A'); });
      document.querySelectorAll('#heightChips .chip').forEach(function (b, i) { b.classList.toggle('on', i === 0); });
      document.getElementById('swOnline').classList.remove('on');
      document.getElementById('swVerified').classList.remove('on');
      syncDistrictChips();
      ageSync.call(amin);
      map.flyTo([DATA.meta.center[1], DATA.meta.center[0]], 12, { duration: .8 });
    };
    var t;
    document.getElementById('searchInput').addEventListener('input', function () {
      var v = this.value.trim();
      clearTimeout(t);
      t = setTimeout(function () { filters.keyword = v; renderAll(); }, 180);
    });

    // 区统计
    var ds = document.getElementById('distStat');
    DATA.districts.forEach(function (d) {
      var total = DATA.profiles.length;
      var n = d.female + d.male;
      ds.innerHTML += '<div class="ds"><i style="background:' + d.color + '"></i><span>' + d.name + '</span>' +
        '<div class="bar"><i style="background:' + d.color + ';width:' + (n / total * 100) + '%"></i></div><b>' + n + '</b></div>';
    });
  }
  function syncDistrictChips() {
    document.querySelectorAll('#districtChips .chip').forEach(function (b) {
      b.classList.toggle('on', Number(b.dataset.code) === filters.district);
    });
  }
  function bindSwitch(id, cb) {
    var el = document.getElementById(id);
    el.onclick = function () {
      el.classList.toggle('on');
      cb(el.classList.contains('on'));
    };
  }

  /* ---------- 详情 ---------- */
  var currentDetail = null;
  function distanceText(p) {
    var origin = H.state.location || { lng: DATA.meta.centerWgs[0], lat: DATA.meta.centerWgs[1] };
    var km = H.haversine(origin.lng, origin.lat, p.lng, p.lat);
    var label = H.state.location ? '距你' : '距市中心';
    return label + ' ' + (km < 1 ? Math.round(km * 1000) + ' m' : km.toFixed(1) + ' km');
  }

  function infoItem(label, value, full) {
    return '<div class="info-item' + (full ? ' full' : '') + '"><small>' + label + '</small><b>' + value + '</b></div>';
  }

  function renderDetail(p) {
    var vip = H.isVip();
    var liked = H.isLiked(p.id);
    var gc = p.gender === 'F' ? 'gender-f' : 'gender-m';
    var body = document.getElementById('detailBody');

    body.innerHTML =
      '<div class="detail-hero' + (vip ? '' : ' guest') + '">' +
      '<img src="' + p.avatar + '" alt="' + H.esc(p.nickname) + '">' +
      '<div class="hero-veil"></div>' +
      '<div class="hero-top">' +
        (p.verified ? '<span class="badge verified">' + I.verify + ' 实名认证</span>' : '') +
        (p.vipLevel !== '普通' ? '<span class="badge vip">' + I.star + ' ' + p.vipLevel + '会员</span>' : '') +
        (p.online === '在线' ? '<span class="badge online">在线</span>' : '') +
        '<span class="badge zone">' + p.district + ' · ' + p.place + '</span>' +
      '</div>' +
      '<div class="hero-tags">' + p.tags.map(function (t) { return '<span>' + t + '</span>'; }).join('') + '</div>' +
      '<div class="hero-info">' +
        '<div class="name"><b>' + H.esc(p.nickname) + '</b><span>' + (p.gender === 'F' ? '女生 ♀' : '男生 ♂') + ' · ' + p.age + '岁</span>' +
        '<span style="font-size:12px;opacity:.85">' + p.zodiac + ' · ' + p.ethnicity + '</span></div>' +
        '<div class="meta"><span>' + p.height + 'cm</span><span>' + p.weight + 'kg</span><span>' + p.marital + '</span><span>' + p.education + '</span></div>' +
      '</div>' +
      (vip ? '' :
        '<div class="lock-mask">' +
          '<div class="lock-icon">' + I.lock + '</div>' +
          '<h4>资料已模糊处理</h4>' +
          '<p>开通会员查看高清照片、完整资料与精确距离<br>每天仅需几毛钱，遇见对的人</p>' +
          '<button class="btn-primary" id="heroUnlock">开通会员，全部解锁</button>' +
        '</div>') +
      '</div>' +

      '<div class="detail-distance' + (vip ? '' : ' guest') + '">' + I.pin +
        (vip ? '<span>' + distanceText(p) + ' · 资料完整度 ' + p.complete + '%</span>' : '<span>精确位置已隐藏</span><span class="unlock" id="distUnlock">开通查看</span>') +
      '</div>' +

      '<div class="section"><h4>' + I.check + '基础信息</h4><div class="info-grid">' +
        infoItem('年龄', p.age + '岁（' + p.birthYear + '年）') +
        infoItem('身高 / 体重', p.height + 'cm / ' + p.weight + 'kg') +
        infoItem('学历', p.education) +
        infoItem('婚姻状况', p.marital + (p.children !== '无' ? ' · ' + p.children : '')) +
        infoItem('所在区域', p.district) +
        infoItem('星座 / 民族', p.zodiac + ' / ' + p.ethnicity) +
      '</div></div>' +

      '<div class="lock-zone"><div class="lock-zone-inner' + (vip ? '' : ' guest') + '">' +
        '<div class="section"><h4>' + I.verify + '工作与生活</h4><div class="info-grid">' +
          infoItem('职业', H.esc(p.job)) +
          infoItem('所在行业', H.esc(p.industry)) +
          infoItem('单位类型', H.esc(p.employerType)) +
          infoItem('年收入', p.incomeBand) +
          infoItem('住房情况', p.house) +
          infoItem('购车情况', p.car) +
          infoItem('吸烟 / 饮酒', p.smoke + ' / ' + p.drink) +
          infoItem('生育意愿', p.wantKids) +
          infoItem('结婚计划', p.marriagePlan + '结婚') +
          infoItem('籍贯 / 来呼市', H.esc(p.hometown) + ' / ' + p.yearsInCity + '年') +
          infoItem('毕业院校', H.esc(p.school), true) +
        '</div></div>' +

        '<div class="section"><h4>' + I.heart + '自我介绍</h4><p class="intro-txt">' + H.esc(p.intro) + '</p></div>' +

        '<div class="section"><h4>' + I.star + '择偶要求</h4><ul class="req-list">' +
          '<li>' + I.check + '<span>年龄 ' + p.req.ageMin + ' - ' + p.req.ageMax + ' 岁</span></li>' +
          '<li>' + I.check + '<span>身高 ' + (p.gender === 'F' ? p.req.heightMin + 'cm 以上' : p.req.heightMin + 'cm 以上') + '</span></li>' +
          (p.req.educationMin !== '不限' ? '<li>' + I.check + '<span>学历 ' + p.req.educationMin + '及以上</span></li>' : '') +
          (p.req.incomeMin ? '<li>' + I.check + '<span>年收入 ' + p.req.incomeMin + '万以上</span></li>' : '') +
          '<li>' + I.check + '<span>' + H.esc(p.req.note) + '</span></li>' +
        '</ul></div>' +

        '<div class="report-line">注册于 ' + p.registeredAt + ' · 浏览 ' + p.views.toLocaleString() + ' 次 · ' +
          '<button id="reportBtn">举报</button><button id="shieldBtn">拉黑</button></div>' +
      '</div>' +
      (vip ? '' :
        '<div class="lock-zone-mask"><div class="lock-icon">' + I.lock + '</div>' +
          '<h4>开通会员查看完整资料</h4><p>职业收入、住房购车、自我介绍<br>择偶要求、精确距离全部可见</p>' +
          '<button id="zoneUnlock">立即开通</button></div>') +
      '</div>';

    if (liked) {
      body.insertAdjacentHTML('afterbegin',
        '<div class="like-mutual">' + I.heartFill +
        '<span>你已对 Ta 心动' + (willMutual(p) ? '，系统检测到你们有很高的互相心动概率' : '') + '</span></div>');
    }

    document.getElementById('actLike').classList.toggle('on', liked);
    document.getElementById('actLikeTxt').textContent = liked ? '已心动' : '心动';
    document.getElementById('actLikeNum').textContent = H.heartsOf(p);

    var unlock1 = document.getElementById('heroUnlock');
    var unlock2 = document.getElementById('zoneUnlock');
    var unlock3 = document.getElementById('distUnlock');
    [unlock1, unlock2, unlock3].forEach(function (b) {
      if (b) b.onclick = openPay;
    });
    document.getElementById('reportBtn').onclick = function () { H.toast('已收到举报，平台会在 24 小时内核实处理', '', I.verify); };
    document.getElementById('shieldBtn').onclick = function () { H.toast('已加入黑名单，演示环境不会真实生效', '', I.lock); };
  }

  function selectProfile(p, opts) {
    currentDetail = p;
    renderDetail(p);
    document.getElementById('detailDrawer').classList.add('show');
    document.getElementById('detailMask').classList.add('show');
    if (opts && opts.fly) {
      var ll = gcjOf(p);
      map.flyTo(ll, Math.max(map.getZoom(), 14), { duration: .6 });
    }
    if (markers[p.id]) {
      var el = markers[p.id]._icon;
      if (el) {
        document.querySelectorAll('.p-marker.active').forEach(function (x) { x.classList.remove('active'); });
        el.querySelector('.p-marker').classList.add('active');
      }
    }
  }
  function closeDetail() {
    document.getElementById('detailDrawer').classList.remove('show');
    document.getElementById('detailMask').classList.remove('show');
    document.querySelectorAll('.p-marker.active').forEach(function (x) { x.classList.remove('active'); });
  }
  document.getElementById('detailClose').onclick = closeDetail;
  document.getElementById('detailMask').onclick = closeDetail;

  /* ---------- 心动 ---------- */
  function willMutual(p) {
    // 确定性伪随机：约 28% 的人会“互相心动”
    var s = 0;
    var str = p.id + 'mutual';
    for (var i = 0; i < str.length; i++) s = (s * 31 + str.charCodeAt(i)) % 1000;
    return s % 100 < 28;
  }
  function doLike(p) {
    var nowLiked = H.toggleLike(p.id);
    if (nowLiked) {
      H.toast('已对 ' + p.nickname + ' 心动，心动值 +1', 'heart', I.heartFill);
      if (willMutual(p)) {
        setTimeout(function () { showMatch(p); }, 650);
      }
    } else {
      H.toast('已取消心动');
    }
    refreshLikeUI();
    renderAll();
    if (currentDetail && currentDetail.id === p.id) renderDetail(p);
  }
  document.getElementById('actLike').onclick = function () {
    if (!currentDetail) return;
    doLike(currentDetail);
  };
  document.getElementById('actChat').onclick = function () {
    if (!currentDetail) return;
    if (!H.isVip()) { openPay(); return; }
    H.toast('已向 ' + currentDetail.nickname + ' 发出打招呼，对方回复后会通知你', '', I.check);
  };
  document.getElementById('actGift').onclick = function () {
    if (!currentDetail) return;
    if (!H.isVip()) { openPay(); return; }
    H.toast('礼物商城即将上线，演示环境暂不可送', '', I.star);
  };

  function showMatch(p) {
    document.getElementById('matchTa').src = p.avatar;
    document.getElementById('matchYou').src = p.avatar; // 演示用对方头像占位，正式版取当前用户头像
    document.getElementById('matchText').textContent = p.nickname + ' 也对你心动了，缘分来了，赶紧打个招呼吧';
    document.getElementById('matchPop').classList.add('show');
    document.getElementById('matchGo').onclick = function () {
      document.getElementById('matchPop').classList.remove('show');
      H.toast('已帮你发起对话（演示）', '', I.check);
    };
    document.getElementById('matchSkip').onclick = function () {
      document.getElementById('matchPop').classList.remove('show');
    };
  }

  /* ---------- 心动列表 ---------- */
  function refreshLikeUI() {
    var n = H.likeCount();
    var dot = document.getElementById('likesDot');
    dot.textContent = n;
    dot.classList.toggle('hidden', n === 0);
    var body = document.getElementById('likesBody');
    var rows = Object.keys(H.state.likes);
    if (!rows.length) {
      body.innerHTML = '<div class="like-empty">' + I.heart +
        '<p>还没有心动的人<br>去地图上发现身边的缘分吧</p></div>';
      return;
    }
    var html = '<div class="match-banner">' + I.heartFill +
      '<span>已心动 ' + n + ' 人，其中约 ' + Math.round(n * .3) + ' 人有较高概率与你互相心动，会员可优先匹配</span></div>';
    rows.forEach(function (id) {
      var p = DATA.profiles.find(function (x) { return x.id === id; });
      if (!p) return;
      html += '<div class="like-row" data-id="' + p.id + '">' +
        '<img src="' + p.avatar + '" alt="">' +
        '<div class="lr"><b>' + H.esc(p.nickname) + ' · ' + p.age + '岁</b>' +
        '<p>' + p.district + ' · ' + p.place + ' · ' + H.esc(p.job) + '</p></div>' +
        '<button class="rm" data-rm="' + p.id + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>';
    });
    body.innerHTML = html;
    body.querySelectorAll('.like-row').forEach(function (r) {
      r.onclick = function (e) {
        if (e.target.closest('[data-rm]')) return;
        var p = DATA.profiles.find(function (x) { return x.id === r.dataset.id; });
        closeLikes();
        selectProfile(p, { fly: true });
      };
    });
    body.querySelectorAll('[data-rm]').forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        var id = b.dataset.rm;
        H.toggleLike(id);
        refreshLikeUI();
        renderAll();
        if (currentDetail && currentDetail.id === id) renderDetail(currentDetail);
      };
    });
  }
  function openLikes() {
    refreshLikeUI();
    document.getElementById('likesDrawer').classList.add('show');
    document.getElementById('detailMask').classList.add('show');
  }
  function closeLikes() {
    document.getElementById('likesDrawer').classList.remove('show');
    if (!document.getElementById('detailDrawer').classList.contains('show')) {
      document.getElementById('detailMask').classList.remove('show');
    }
  }
  document.getElementById('likesBtn').onclick = openLikes;
  document.getElementById('likesClose').onclick = closeLikes;

  function refreshMarkersLikeState() {
    Object.keys(markers).forEach(function (id) {
      var p = markers[id]._p;
      var el = markers[id]._icon;
      if (el) {
        var box = el.querySelector('.p-marker');
        box.classList.toggle('liked', H.isLiked(id));
        var num = box.querySelector('.heart-num');
        if (num) num.innerHTML = I.heartFill + H.heartsOf(p);
      }
    });
  }

  /* ---------- 卡片视图 ---------- */
  function cardHtml(p) {
    var liked = H.isLiked(p.id);
    var vip = H.isVip();
    return '<div class="pcard" data-id="' + p.id + '">' +
      '<div class="cover' + (vip ? '' : ' guest') + '">' +
        '<img loading="lazy" src="' + p.avatar + '" alt="">' +
        '<div class="cover-veil"></div>' +
        '<div class="verify">' +
          (p.verified ? '<span class="v ok">' + I.verify + '</span>' : '') +
          (p.vipLevel !== '普通' ? '<span class="v gold">' + I.star + '</span>' : '') +
        '</div>' +
        (p.online === '在线' ? '<span class="onlinechip">在线</span>' : '') +
        (vip ? '' : '<span class="badge lockchip" style="background:rgba(31,41,55,.72);color:#fff">' + I.lock + ' 已模糊</span>') +
        '<div class="cover-info"><div class="nm"><b>' + H.esc(p.nickname) + '</b>' +
          '<span>' + (p.gender === 'F' ? '♀' : '♂') + ' ' + p.age + '岁 · ' + p.height + 'cm</span></div>' +
          '<div class="pl"><span class="' + (p.gender === 'F' ? 'gender-f' : 'gender-m') + '">' + p.district + '</span>' +
          '<span>' + p.place + '</span>' + (vip ? '<span>' + H.esc(p.job) + '</span>' : '<span>资料开通可见</span>') + '</div></div>' +
      '</div>' +
      '<div class="body">' +
        '<div class="tags">' + p.tags.slice(0, 4).map(function (t) {
          return '<span class="' + (p.gender === 'M' ? 'mtag' : '') + '">' + t + '</span>';
        }).join('') + '</div>' +
        '<div class="row"><span>' + (p.online === '在线' ? '当前在线' : p.lastActive) + ' · ' + p.education + '</span>' +
        '<span class="h">' + I.heart + H.heartsOf(p) + '</span></div>' +
      '</div>' +
      '<button class="like-btn' + (liked ? ' on' : '') + '" data-like="' + p.id + '">' + I.heart + '</button>' +
    '</div>';
  }
  function renderCards(list) {
    var grid = document.getElementById('cardGrid');
    if (!list.length) {
      grid.innerHTML = '<div class="empty">' + I.pin + '<p>没有找到符合条件的人，试试放宽筛选条件</p></div>';
      return;
    }
    grid.innerHTML = list.map(cardHtml).join('');
    grid.querySelectorAll('.pcard').forEach(function (c) {
      c.addEventListener('click', function (e) {
        if (e.target.closest('[data-like]')) return;
        var p = DATA.profiles.find(function (x) { return x.id === c.dataset.id; });
        selectProfile(p);
      });
    });
    grid.querySelectorAll('[data-like]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var p = DATA.profiles.find(function (x) { return x.id === b.dataset.like; });
        doLike(p);
        if (H.isVip() === false) { /* 游客也可以心动 */ }
      });
    });
  }

  /* ---------- 视图切换 ---------- */
  var view = 'map';
  document.getElementById('viewSeg').addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    view = btn.dataset.view;
    this.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === btn); });
    var cv = document.getElementById('cardView');
    if (view === 'cards') {
      cv.classList.remove('hidden');
      document.getElementById('listFab').style.display = 'none';
      document.querySelector('.map-stat').style.display = 'none';
      document.querySelector('.map-tools').style.display = 'none';
      setTimeout(function () { map.invalidateSize(); }, 50);
    } else {
      cv.classList.add('hidden');
      document.getElementById('listFab').style.display = '';
      document.querySelector('.map-stat').style.display = '';
      document.querySelector('.map-tools').style.display = '';
      setTimeout(function () { map.invalidateSize(); }, 50);
    }
  });
  document.getElementById('listFab').onclick = function () {
    document.querySelector('#viewSeg [data-view="cards"]').click();
    document.getElementById('cardView').scrollTop = 0;
  };

  /* ---------- 移动端筛选抽屉 ---------- */
  document.getElementById('mobileFilterBtn').onclick = function () {
    document.getElementById('filterPanel').classList.add('show');
  };
  document.addEventListener('click', function (e) {
    if (e.target.id === 'detailMask') {
      if (document.getElementById('likesDrawer').classList.contains('show')) closeLikes();
    }
  });
  document.getElementById('filterPanel').addEventListener('click', function () {
    if (window.innerWidth <= 860) {
      /* 选择后不立即关闭，方便连续筛选；由底部空白处理 */
    }
  });

  /* ---------- 底图切换 / 定位 ---------- */
  document.getElementById('layerBtn').onclick = function (e) {
    e.stopPropagation();
    document.getElementById('layerPop').classList.toggle('hidden');
  };
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.layer-switch')) document.getElementById('layerPop').classList.add('hidden');
  });
  document.querySelectorAll('#layerPop button').forEach(function (b) {
    b.onclick = function () {
      document.querySelectorAll('#layerPop button').forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      if (b.dataset.layer === 'sat') { map.removeLayer(vecLayer); satLayer.addTo(map); }
      else { map.removeLayer(satLayer); vecLayer.addTo(map); }
      document.getElementById('layerPop').classList.add('hidden');
    };
  });
  document.getElementById('locateBtn').onclick = function () {
    if (!navigator.geolocation) { H.toast('当前浏览器不支持定位', '', I.lock); return; }
    H.toast('正在定位…', '', I.pin);
    navigator.geolocation.getCurrentPosition(function (pos) {
      var ll = [pos.coords.longitude, pos.coords.latitude];
      H.state.location = { lng: ll[0], lat: ll[1], accuracy: pos.coords.accuracy };
      H.storeSet('loc', H.state.location);
      var g = H.wgs2gcj(ll[0], ll[1]);
      map.flyTo([g[1], g[0]], 14, { duration: .8 });
      if (window._me) map.removeLayer(window._me);
      window._me = L.circleMarker([g[1], g[0]], {
        radius: 9, color: '#fff', weight: 3, fillColor: '#3b82f6', fillOpacity: 1
      }).addTo(map).bindTooltip('你的位置', { direction: 'top' });
      H.toast('定位成功，距离按你的真实位置计算', '', I.check);
      if (currentDetail) renderDetail(currentDetail);
    }, function () {
      H.toast('定位失败，已按市中心计算距离', '', I.lock);
    }, { timeout: 7000, enableHighAccuracy: true });
  };

  /* ---------- 会员 / 支付 ---------- */
  var pay = { plan: 1, way: 'wx' };
  function openPay() {
    document.getElementById('payModal').classList.remove('hidden');
    requestAnimationFrame(function () { document.getElementById('payModal').classList.add('show'); });
    renderPayBody();
  }
  function closePay() {
    document.getElementById('payModal').classList.remove('show');
    setTimeout(function () { document.getElementById('payModal').classList.add('hidden'); }, 260);
  }
  function renderPayBody() {
    var body = document.getElementById('payBody');
    body.innerHTML =
      '<div class="plans">' + H.PLANS.map(function (p, i) {
        return '<button class="plan' + (i === pay.plan ? ' on' : '') + '" data-i="' + i + '">' +
          (p.tag ? '<span class="tag">' + p.tag + '</span>' : '') +
          '<div class="pn">' + p.name + '</div><div class="pp"><b>¥' + p.price + '</b><s>¥' + p.orig + '</s></div>' +
          '<div class="pd">' + p.desc + '</div></button>';
      }).join('') + '</div>' +
      '<ul class="pay-perks">' +
        '<li>' + I.check + '高清照片与完整资料</li><li>' + I.check + '精确距离与位置</li>' +
        '<li>' + I.check + '不限次心动与打招呼</li><li>' + I.check + '会员专属标识与优先推荐</li></ul>' +
      '<div class="pay-ways">' +
        '<button class="pay-way' + (pay.way === 'wx' ? ' on' : '') + '" data-way="wx"><span class="ic wx">微</span>微信支付</button>' +
        '<button class="pay-way' + (pay.way === 'zfb' ? ' on' : '') + '" data-way="zfb"><span class="ic zfb">支</span>支付宝</button>' +
      '</div>' +
      '<button class="pay-btn" id="payBtn">立即支付 ¥' + H.PLANS[pay.plan].price + '</button>' +
      '<p class="pay-tip">演示环境：点击支付即模拟开通，不产生真实交易。<br>正式版接入微信 / 支付宝扫码与 Apple Pay。</p>';
    body.querySelectorAll('.plan').forEach(function (b) {
      b.onclick = function () { pay.plan = Number(b.dataset.i); renderPayBody(); };
    });
    body.querySelectorAll('.pay-way').forEach(function (b) {
      b.onclick = function () { pay.way = b.dataset.way; renderPayBody(); };
    });
    document.getElementById('payBtn').onclick = doPay;
  }
  function doPay() {
    var plan = H.PLANS[pay.plan];
    var box = document.getElementById('payBox');
    box.querySelector('.pay-body').innerHTML =
      '<div class="pay-loading"><div class="spinner"></div>' +
      '<p style="font-size:14px;color:var(--ink-2)">正在唤起' + (pay.way === 'wx' ? '微信支付' : '支付宝') + '…</p>' +
      '<p style="font-size:12px;color:var(--ink-3)">金额 ¥' + plan.price + ' · 演示环境不会真实扣款</p></div>';
    setTimeout(function () {
      var info = {
        plan: plan.id, planName: plan.name, price: plan.price,
        way: pay.way === 'wx' ? '微信支付' : '支付宝',
        paidAt: new Date().toISOString()
      };
      H.state.vip = info;
      H.storeSet('vip', info);
      box.querySelector('.pay-body').innerHTML =
        '<div class="pay-success"><div class="circle">' + I.check + '</div>' +
        '<h3>开通成功</h3><p>恭喜成为「青城心动会员 · ' + plan.name + '」<br>全部资料已解锁，去遇见对的人吧</p>' +
        '<button class="btn-primary" style="margin-top:18px" id="payDone">开始浏览</button></div>';
      document.getElementById('payDone').onclick = function () {
        closePay();
        afterVipChanged();
      };
    }, 1600);
  }
  function afterVipChanged() {
    var vip = H.isVip();
    document.getElementById('guestBanner').classList.toggle('hidden', vip);
    var pill = document.getElementById('vipEntry');
    pill.classList.toggle('on', vip);
    pill.classList.toggle('off', !vip);
    document.getElementById('vipEntryTxt').textContent = vip ? '会员 · ' + H.state.vip.planName : '开通会员';
    renderAll();
    if (currentDetail) renderDetail(currentDetail);
    H.toast(vip ? '会员已开通，全部资料已解锁' : '已退出会员状态', vip ? 'gold' : '', I.star);
  }
  document.getElementById('vipEntry').onclick = function () {
    if (H.isVip()) {
      if (confirm('当前为演示会员，是否退出会员回到游客模糊模式？')) {
        H.storeDel('vip');
        H.state.vip = null;
        afterVipChanged();
      }
    } else openPay();
  };
  document.getElementById('guestBannerBtn').onclick = openPay;
  document.getElementById('payClose').onclick = function () {
    closePay();
    if (H.isVip()) afterVipChanged();
  };
  document.getElementById('payMask').onclick = function () {
    closePay();
    if (H.isVip()) afterVipChanged();
  };

  /* ---------- 启动 ---------- */
  initFilters();
  renderStats();
  renderAll();
  refreshLikeUI();
  afterVipChanged();
  document.getElementById('guestBanner').classList.toggle('hidden', H.isVip());
  // 点击遮罩关闭移动端筛选
  document.addEventListener('click', function (e) {
    if (e.target.id === 'detailMask') {
      document.getElementById('filterPanel').classList.remove('show');
    }
  });

})();
