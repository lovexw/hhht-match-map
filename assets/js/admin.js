/* ============================================================
   青城有你 · 运营管理后台
   ============================================================ */
(function () {
  'use strict';
  var H = window.HHHT, DATA = window.HHHT_DATA;
  var P = DATA.profiles;

  /* ---------- 登录 ---------- */
  var login = document.getElementById('login');
  function showApp() {
    login.classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
  }
  if (H.storeGet('admin')) showApp();
  document.getElementById('loginBtn').onclick = function () {
    var u = document.getElementById('loginUser').value.trim();
    var p = document.getElementById('loginPass').value.trim();
    var err = document.getElementById('loginErr');
    if (u === 'admin' && p === 'hhht@123') {
      H.storeSet('admin', { user: u, at: Date.now() });
      err.textContent = '';
      showApp();
      boot();
    } else {
      err.textContent = '账号或密码不正确，请使用演示账号 admin / hhht@123';
    }
  };
  document.getElementById('loginPass').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') document.getElementById('loginBtn').click();
  });
  document.getElementById('logoutBtn').onclick = function () {
    H.storeDel('admin');
    location.reload();
  };

  /* ---------- 伪随机（确定性） ---------- */
  function rnd(seed) {
    var s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return function () { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; };
  }

  /* ---------- 统计工具 ---------- */
  function group(arr, keyFn) {
    var m = {};
    arr.forEach(function (x) { var k = keyFn(x); m[k] = (m[k] || 0) + 1; });
    return m;
  }
  var ROSE = '#f43f5e', ROSE_L = '#fb7185', BLUE = '#3b82f6', BLUE_L = '#60a5fa',
    GOLD = '#c9912f', GREEN = '#10b981', ORANGE = '#f59e0b', INK = '#1f2937', GRID = '#eef0f4';
  var charts = {};
  function ec(id) {
    var el = document.getElementById(id);
    if (charts[id]) { charts[id].dispose(); }
    var c = echarts.init(el);
    charts[id] = c;
    return c;
  }
  var baseAxis = {
    axisLine: { lineStyle: { color: '#d8dce4' } },
    axisTick: { show: false },
    axisLabel: { color: '#8a93a4', fontSize: 11 },
    splitLine: { lineStyle: { color: GRID, type: 'dashed' } }
  };

  /* ---------- KPI ---------- */
  function renderKPI() {
    var totalHearts = P.reduce(function (s, p) { return s + p.hearts; }, 0);
    var verified = P.filter(function (p) { return p.verified; }).length;
    var kpis = [
      { ic: 'r', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6"/><path d="M17 4a4 4 0 0 1 0 8M22 21c0-3-2-5-5-5.5"/></svg>', v: '12,907', l: '累计注册用户', t: '+3.8%', up: true },
      { ic: 'b', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>', v: '41', l: '今日新增用户', t: '+12.5%', up: true },
      { ic: 'g', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>', v: '1,842', l: '今日活跃用户', t: '+6.1%', up: true },
      { ic: 'o', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/></svg>', v: '2,199', l: '付费会员数', t: '+2.3%', up: true },
      { ic: 'r', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>', v: '¥12,860', l: '今日营收', t: '+18.6%', up: true },
      { ic: 'o', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7-4.35-7-9.6C5 8.3 7.3 6 10 6c1.1 0 2 .6 2 1.5C12 6.6 12.9 6 14 6c2.7 0 5 2.3 5 5.4C19 16.65 12 21 12 21z"/></svg>', v: (38460 + totalHearts).toLocaleString(), l: '累计心动次数', t: '+9.4%', up: true },
      { ic: 'g', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 6L9 17l-5-5"/></svg>', v: (87.2 + (verified / P.length * 100 - 87) / 2).toFixed(1) + '%', l: '实名认证率', t: '+1.2%', up: true },
      { ic: 'b', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6"/></svg>', v: '48 : 52', l: '女 : 男 比例', t: '-0.4%', up: false }
    ];
    document.getElementById('kpiGrid').innerHTML = kpis.map(function (k) {
      return '<div class="kpi"><div class="ic ' + k.ic + '">' + k.svg + '</div>' +
        '<div class="v">' + k.v + '</div><div class="l">' + k.l + '</div>' +
        '<div class="trend ' + (k.up ? 'up' : 'down') + '">' + k.t + '</div></div>';
    }).join('');
  }

  /* ---------- 30 天注册趋势 ---------- */
  function chGrowth() {
    var r = rnd(20261027);
    var days = [], fm = [], mm = [];
    for (var i = 29; i >= 0; i--) {
      var d = new Date(2026, 9, 27);
      d.setDate(d.getDate() - i);
      days.push((d.getMonth() + 1) + '/' + d.getDate());
      var weekend = (d.getDay() === 0 || d.getDay() === 6) ? 1.25 : 1;
      var growth = 1 + (29 - i) * 0.006;
      fm.push(Math.round((18 + r() * 12) * weekend * growth));
      mm.push(Math.round((19 + r() * 13) * weekend * growth));
    }
    ec('chGrowth').setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { data: ['女生', '男生'], right: 0, top: 0, icon: 'circle', textStyle: { fontSize: 11, color: '#8a93a4' } },
      grid: { left: 38, right: 16, top: 34, bottom: 26 },
      xAxis: { type: 'category', data: days, axisLine: baseAxis.axisLine, axisTick: { show: false }, axisLabel: { color: '#8a93a4', fontSize: 10, interval: 2 } },
      yAxis: { type: 'value', splitLine: baseAxis.splitLine, axisLabel: { color: '#8a93a4', fontSize: 10 } },
      series: [
        { name: '女生', type: 'line', stack: 'x', smooth: true, showSymbol: false, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(244,63,94,.35)' }, { offset: 1, color: 'rgba(244,63,94,.02)' }]) }, lineStyle: { color: ROSE, width: 2 }, itemStyle: { color: ROSE }, data: fm },
        { name: '男生', type: 'line', stack: 'x', smooth: true, showSymbol: false, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(59,130,246,.3)' }, { offset: 1, color: 'rgba(59,130,246,.02)' }]) }, lineStyle: { color: BLUE, width: 2 }, itemStyle: { color: BLUE }, data: mm }
      ]
    });
  }

  function chGender() {
    var nf = P.filter(function (p) { return p.gender === 'F'; }).length;
    var nm = P.length - nf;
    ec('chGender').setOption({
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0, icon: 'circle', textStyle: { fontSize: 12, color: '#4b5563' } },
      series: [{
        type: 'pie', radius: ['50%', '74%'], center: ['50%', '46%'], avoidLabelOverlap: true,
        label: { show: true, position: 'inside', formatter: '{d}%', color: '#fff', fontSize: 14, fontWeight: 700 },
        itemStyle: { borderColor: '#fff', borderWidth: 3 },
        data: [
          { value: Math.round(12907 * nf / P.length), name: '女生', itemStyle: { color: ROSE } },
          { value: 12907 - Math.round(12907 * nf / P.length), name: '男生', itemStyle: { color: BLUE } }
        ]
      }]
    });
  }

  function chDistrict() {
    var names = DATA.districts.map(function (d) { return d.name; });
    var fv = DATA.districts.map(function (d) { return d.female; });
    var mv = DATA.districts.map(function (d) { return d.male; });
    var scale = 220;
    ec('chDistrict').setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { data: ['女生', '男生'], right: 0, top: 0, icon: 'circle', textStyle: { fontSize: 11, color: '#8a93a4' } },
      grid: { left: 44, right: 12, top: 34, bottom: 26 },
      xAxis: { type: 'category', data: names, axisLine: baseAxis.axisLine, axisTick: { show: false }, axisLabel: { color: '#4b5563', fontSize: 12 } },
      yAxis: { type: 'value', splitLine: baseAxis.splitLine, axisLabel: { color: '#8a93a4', fontSize: 10 } },
      series: [
        { name: '女生', type: 'bar', stack: 'a', barWidth: 26, itemStyle: { color: ROSE, borderRadius: [0, 0, 0, 0] }, data: fv.map(function (v) { return v * scale; }) },
        { name: '男生', type: 'bar', stack: 'a', itemStyle: { color: BLUE, borderRadius: [6, 6, 0, 0] }, data: mv.map(function (v) { return v * scale; }) }
      ]
    });
  }

  function chAge() {
    var bins = {};
    P.forEach(function (p) {
      var b = p.age - p.age % 2;
      bins[b] = (bins[b] || 0) + 1;
    });
    var keys = Object.keys(bins).map(Number).sort(function (a, b) { return a - b; });
    ec('chAge').setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: 36, right: 14, top: 20, bottom: 26 },
      xAxis: { type: 'category', data: keys.map(function (k) { return k + '-' + (k + 1); }), axisLine: baseAxis.axisLine, axisTick: { show: false }, axisLabel: { color: '#8a93a4', fontSize: 10 } },
      yAxis: { type: 'value', splitLine: baseAxis.splitLine, axisLabel: { color: '#8a93a4', fontSize: 10 } },
      series: [{
        type: 'bar', barWidth: '55%',
        itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: ROSE_L }, { offset: 1, color: '#f9a8b8' }]), borderRadius: [6, 6, 0, 0] },
        data: keys.map(function (k) { return bins[k]; })
      }]
    });
  }

  function chEdu() {
    var g = group(P, function (p) { return p.education; });
    var order = ['高中', '中专', '大专', '本科', '硕士', '博士'];
    var colors = ['#fda4af', '#fb7185', '#f43f5e', '#e11d48', '#9f1239', '#881337'];
    ec('chEdu').setOption({
      tooltip: { trigger: 'item', formatter: '{b}: {c}人 ({d}%)' },
      legend: { bottom: 0, icon: 'circle', textStyle: { fontSize: 10, color: '#4b5563' }, itemWidth: 10, itemHeight: 10 },
      series: [{
        type: 'pie', radius: ['42%', '68%'], center: ['50%', '42%'],
        label: { fontSize: 11, color: '#4b5563' },
        itemStyle: { borderColor: '#fff', borderWidth: 2 },
        data: order.filter(function (e) { return g[e]; }).map(function (e, i) {
          return { value: g[e], name: e, itemStyle: { color: colors[i] } };
        })
      }]
    });
  }

  function chJobs() {
    var g = group(P, function (p) { return p.job; });
    var arr = Object.keys(g).map(function (k) { return [k, g[k]]; }).sort(function (a, b) { return a[1] - b[1]; }).slice(-10);
    ec('chJobs').setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 96, right: 24, top: 10, bottom: 24 },
      xAxis: { type: 'value', splitLine: baseAxis.splitLine, axisLabel: { color: '#8a93a4', fontSize: 10 } },
      yAxis: { type: 'category', data: arr.map(function (x) { return x[0]; }), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#4b5563', fontSize: 11 } },
      series: [{
        type: 'bar', barWidth: 13,
        itemStyle: { color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [{ offset: 0, color: BLUE }, { offset: 1, color: '#93c5fd' }]), borderRadius: [0, 7, 7, 0] },
        label: { show: true, position: 'right', color: '#4b5563', fontSize: 11 },
        data: arr.map(function (x) { return x[1]; })
      }]
    });
  }

  function chFunnel() {
    ec('chFunnel').setOption({
      tooltip: { trigger: 'item', formatter: '{b}: {c}' },
      series: [{
        type: 'funnel', left: '6%', right: '6%', top: 10, bottom: 10, minSize: '20%',
        label: { position: 'inside', color: '#fff', fontSize: 12, formatter: '{b}\n{c}' },
        itemStyle: { borderColor: '#fff', borderWidth: 2 },
        data: [
          { value: 86000, name: '访问用户', itemStyle: { color: '#93c5fd' } },
          { value: 12907, name: '完成注册', itemStyle: { color: '#60a5fa' } },
          { value: 11260, name: '实名认证', itemStyle: { color: '#3b82f6' } },
          { value: 7420, name: '产生心动', itemStyle: { color: '#fb7185' } },
          { value: 2199, name: '开通会员', itemStyle: { color: '#e11d48' } }
        ]
      }]
    });
  }

  function chHeat() {
    var r = rnd(777);
    var weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    var data = [];
    for (var d = 0; d < 7; d++) {
      for (var h = 0; h < 24; h++) {
        var v = 8;
        if (h >= 12 && h <= 13) v += 35;
        if (h >= 19 && h <= 23) v += 65;
        if (h >= 0 && h <= 5) v = 4;
        if (d >= 5 && h >= 20) v += 25;
        if (d >= 5 && h >= 10 && h <= 16) v += 20;
        v += r() * 18;
        data.push([h, d, Math.round(v)]);
      }
    }
    var max = 0;
    data.forEach(function (x) { max = Math.max(max, x[2]); });
    ec('chHeat').setOption({
      tooltip: { position: 'top', formatter: function (p) { return weekdays[p.value[1]] + ' ' + p.value[0] + ':00 · 活跃 ' + p.value[2]; } },
      grid: { left: 46, right: 10, top: 6, bottom: 46 },
      xAxis: { type: 'category', data: (function () { var a = []; for (var i = 0; i < 24; i++) a.push(i + '时'); return a; })(), axisLine: { show: false }, axisTick: { show: false }, splitArea: { show: false }, axisLabel: { color: '#8a93a4', fontSize: 9, interval: 1 } },
      yAxis: { type: 'category', data: weekdays, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#4b5563', fontSize: 11 } },
      visualMap: { min: 0, max: max, calculable: false, orient: 'horizontal', left: 'center', bottom: 4, itemHeight: 110, textStyle: { fontSize: 10, color: '#8a93a4' }, inRange: { color: ['#fef3f2', '#fecdd6', '#fb7185', '#e11d48', '#881337'] } },
      series: [{
        type: 'heatmap', data: data,
        label: { show: false },
        itemStyle: { borderColor: '#fff', borderWidth: 2, borderRadius: 4 },
        emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(225,29,72,.4)' } }
      }]
    });
  }

  function chPlans() {
    ec('chPlans').setOption({
      tooltip: { trigger: 'item', formatter: '{b}: {d}%' },
      legend: { bottom: 0, icon: 'circle', textStyle: { fontSize: 11, color: '#4b5563' } },
      series: [{
        type: 'pie', radius: ['44%', '70%'], center: ['50%', '42%'],
        label: { formatter: '{d}%', fontSize: 11, color: '#4b5563' },
        itemStyle: { borderColor: '#fff', borderWidth: 3 },
        data: [
          { value: 38, name: '月卡', itemStyle: { color: '#fda4af' } },
          { value: 31, name: '季卡', itemStyle: { color: ROSE } },
          { value: 23, name: '年卡', itemStyle: { color: GOLD } },
          { value: 8, name: '终身卡', itemStyle: { color: '#881337' } }
        ]
      }]
    });
  }

  function chHearts() {
    var arr = P.slice().sort(function (a, b) { return H.heartsOf(b) - H.heartsOf(a); }).slice(0, 10);
    ec('chHearts').setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: function (ps) { var p = arr[ps[0].dataIndex]; return p.nickname + ' · ' + p.job + '<br/>心动值 ' + H.heartsOf(p) + ' · ' + p.district; } },
      grid: { left: 80, right: 40, top: 10, bottom: 26 },
      xAxis: { type: 'value', splitLine: baseAxis.splitLine, axisLabel: { color: '#8a93a4', fontSize: 10 } },
      yAxis: { type: 'category', inverse: true, data: arr.map(function (p) { return p.nickname + ' · ' + p.gender; }), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#4b5563', fontSize: 12 } },
      series: [{
        type: 'bar', barWidth: 14,
        itemStyle: {
          color: function (p) { return arr[p.dataIndex].gender === 'F' ? ROSE : BLUE; },
          borderRadius: [0, 8, 8, 0]
        },
        label: { show: true, position: 'right', color: '#4b5563', fontSize: 11, formatter: function (p) { return H.heartsOf(arr[p.dataIndex]); } },
        data: arr.map(function (p) { return H.heartsOf(p); })
      }]
    });
  }

  /* ---------- 用户表 ---------- */
  var uFilter = { kw: '', gender: '', district: '', vip: '', verified: '' };
  var uPage = 1;
  function uFiltered() {
    return P.filter(function (p) {
      if (uFilter.gender && p.gender !== uFilter.gender) return false;
      if (uFilter.district && p.district !== uFilter.district) return false;
      if (uFilter.vip && p.vipLevel !== uFilter.vip) return false;
      if (uFilter.verified === '1' && !p.verified) return false;
      if (uFilter.verified === '0' && p.verified) return false;
      if (uFilter.kw) {
        var k = uFilter.kw.toLowerCase();
        if ((p.nickname + p.job + p.tags.join(',') + p.industry).toLowerCase().indexOf(k) < 0) return false;
      }
      return true;
    });
  }
  function vipTag(p) {
    if (p.vipLevel === '钻石') return '<span class="tag diamond">钻石</span>';
    if (p.vipLevel === '黄金') return '<span class="tag gold">黄金</span>';
    return '<span class="tag normal">普通</span>';
  }
  function renderUsers() {
    var list = uFiltered();
    var size = 10, pages = Math.max(1, Math.ceil(list.length / size));
    uPage = Math.min(uPage, pages);
    var slice = list.slice((uPage - 1) * size, uPage * size);
    document.getElementById('userTbody').innerHTML = slice.map(function (p) {
      return '<tr>' +
        '<td><div class="u-cell"><img src="' + p.avatar + '"><div><b>' + p.nickname + '</b><small>' + p.id + ' · ' + p.registeredAt + '</small></div></div></td>' +
        '<td><span class="tag ' + (p.gender === 'F' ? 'f' : 'm') + '">' + (p.gender === 'F' ? '女' : '男') + ' ' + p.age + '</span></td>' +
        '<td>' + p.district + '</td>' +
        '<td>' + p.age + '岁</td>' +
        '<td style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + p.job + '</td>' +
        '<td>' + p.education + '</td>' +
        '<td>' + p.incomeBand + '</td>' +
        '<td><b style="color:var(--rose-deep)">' + H.heartsOf(p) + '</b></td>' +
        '<td>' + (p.verified ? '<span class="tag green">已认证</span>' : '<span class="tag gray">未认证</span>') + '</td>' +
        '<td>' + vipTag(p) + '</td>' +
        '<td>' + (p.online === '在线' ? '<span class="tag green">在线</span>' : '<span class="tag gray">' + p.lastActive + '</span>') + '</td>' +
        '<td><div class="ops"><button data-act="view" data-id="' + p.id + '">查看</button><button data-act="freeze" data-id="' + p.id + '">冻结</button><button data-act="rec" data-id="' + p.id + '">推荐</button></div></td>' +
      '</tr>';
    }).join('');
    var pg = document.getElementById('pager');
    pg.innerHTML = '<span class="info">共 ' + list.length + ' 人，第 ' + uPage + '/' + pages + ' 页</span>';
    for (var i = 1; i <= pages; i++) {
      pg.innerHTML += '<button class="' + (i === uPage ? 'cur' : '') + '" data-p="' + i + '">' + i + '</button>';
    }
    pg.querySelectorAll('button').forEach(function (b) {
      b.onclick = function () { uPage = Number(b.dataset.p); renderUsers(); };
    });
    pg.querySelectorAll('[data-act]').forEach(function () {});
  }
  document.getElementById('userTbody').addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (!b) return;
    var p = P.find(function (x) { return x.id === b.dataset.id; });
    if (b.dataset.act === 'view') openUserModal(p);
    if (b.dataset.act === 'freeze') H.toast('已冻结用户 ' + p.nickname + '（演示，不会真实生效）', '');
    if (b.dataset.act === 'rec') H.toast('已将 ' + p.nickname + ' 加入首页推荐位（演示）', '');
  });
  function openUserModal(p) {
    var b = document.getElementById('uModalBody');
    b.innerHTML =
      '<div style="display:flex;gap:14px;align-items:center;margin-bottom:16px">' +
      '<img src="' + p.avatar + '" style="width:72px;height:96px;border-radius:14px;object-fit:cover">' +
      '<div><b style="font-size:17px">' + p.nickname + ' <span style="font-size:12px;color:var(--ink-3)">' + p.id + '</span></b>' +
      '<p style="font-size:12.5px;color:var(--ink-3);margin:6px 0">' + (p.gender === 'F' ? '女' : '男') + ' · ' + p.age + '岁 · ' + p.height + 'cm · ' + p.district + ' · ' + p.place + '</p>' +
      '<div style="display:flex;gap:6px">' + (p.verified ? '<span class="tag green">已实名</span>' : '') + vipTag(p) +
      '<span class="tag ' + (p.online === '在线' ? 'green' : 'gray') + '">' + p.online + '</span></div></div></div>' +
      '<div class="info-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
      [['职业', p.job], ['行业', p.industry], ['学历', p.education], ['收入', p.incomeBand],
       ['婚姻', p.marital], ['住房', p.house], ['购车', p.car], ['民族', p.ethnicity],
       ['籍贯', p.hometown], ['注册时间', p.registeredAt], ['浏览量', p.views.toLocaleString() + ' 次'], ['心动值', H.heartsOf(p) + '']].map(function (x) {
        return '<div style="background:#fafafc;border-radius:10px;padding:9px 11px"><small style="display:block;font-size:11px;color:var(--ink-3)">' + x[0] + '</small><b style="font-size:13px">' + x[1] + '</b></div>';
      }).join('') + '</div>' +
      '<p style="font-size:12.5px;line-height:1.9;color:var(--ink-2);margin-top:14px;background:#fafafc;padding:12px;border-radius:12px">' + p.intro + '</p>';
    document.getElementById('uModal').classList.remove('hidden');
  }
  document.getElementById('uModalClose').onclick = function () { document.getElementById('uModal').classList.add('hidden'); };
  document.getElementById('uModal').addEventListener('click', function (e) {
    if (e.target === this) this.classList.add('hidden');
  });

  /* ---------- 后台地图 ---------- */
  var adminMap = null, heatLayer = null, pointLayer = null, adminMode = 'heat';
  function initAdminMap() {
    adminMap = L.map('adminMap', { center: [DATA.meta.center[1], DATA.meta.center[0]], zoom: 12, minZoom: 11, maxZoom: 18, zoomControl: true });
    window.__adminMap = adminMap;
    L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
      { subdomains: ['1', '2', '3', '4'], maxZoom: 19, attribution: '© 高德地图 AutoNavi' }).addTo(adminMap);
    fetch('assets/data/districts.json').then(function (r) { return r.json(); }).then(function (geo) {
      L.geoJSON(geo, {
        style: function (f) {
          var d = DATA.districts.find(function (x) { return x.code === f.properties.adcode; });
          return { color: d.color, weight: 2, fillOpacity: .05, fillColor: d.color };
        }
      }).addTo(adminMap);
      adminMap.fitBounds(L.geoJSON(geo).getBounds().pad(0.12));
    });
    heatLayer = L.heatLayer([], { radius: 30, blur: 24, max: 0.6, minOpacity: .25, gradient: { .2: '#fecdd6', .45: '#fb7185', .7: '#e11d48', 1: '#881337' } });
    pointLayer = L.layerGroup();
    P.forEach(function (p) {
      var g = H.wgs2gcj(p.lng, p.lat);
      var c = L.circleMarker([g[1], g[0]], {
        radius: 7, color: '#fff', weight: 2,
        fillColor: p.gender === 'F' ? ROSE : BLUE, fillOpacity: .9
      });
      c.bindTooltip(p.nickname + ' · ' + p.district + ' · 心动 ' + H.heartsOf(p), { direction: 'top' });
      pointLayer.addLayer(c);
    });
    heatLayer.addTo(adminMap);
    P.forEach(function (p) {
      var g = H.wgs2gcj(p.lng, p.lat);
      var intensity = Math.min(1, 0.35 + H.heartsOf(p) / 1200);
      heatLayer.addLatLng([g[1], g[0], intensity]);
    });
    document.getElementById('adminLayerSeg').addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      this.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
      adminMode = b.dataset.mode;
      if (adminMode === 'heat') { adminMap.removeLayer(pointLayer); heatLayer.addTo(adminMap); }
      else { adminMap.removeLayer(heatLayer); pointLayer.addTo(adminMap); }
    });
  }
  function renderMiniStat() {
    var html = DATA.districts.map(function (d) {
      var n = d.female + d.male;
      return '<div class="mini-stat" style="border-left:3px solid ' + d.color + '"><b>' + n * 220 + '</b><small>' + d.name + ' · 女' + d.female + ' / 男' + d.male + '（样例）</small></div>';
    }).join('');
    document.getElementById('adminMiniStat').innerHTML = html;
  }

  /* ---------- 订单 ---------- */
  function genOrders() {
    var r = rnd(5555);
    var plans = H.PLANS;
    var ways = [{ id: 'wx', name: '微信支付', cls: 'wx', txt: '微' }, { id: 'zfb', name: '支付宝', cls: 'zfb', txt: '支' }];
    var rows = [];
    for (var i = 0; i < 30; i++) {
      var p = P[Math.floor(r() * P.length)];
      var plan = plans[Math.floor(r() * plans.length)];
      var day = Math.floor(r() * 29);
      var d = new Date(2026, 9, 27);
      d.setDate(d.getDate() - day);
      d.setHours(9 + Math.floor(r() * 12), Math.floor(r() * 60));
      var way = ways[Math.floor(r() * 2)];
      var status = r() < 0.94 ? '已支付' : '已退款';
      rows.push({
        no: 'HHHT' + (d.getFullYear() + '' + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0')) + String(10000 + Math.floor(r() * 89999)),
        plan: plan.name, price: plan.price, way: way, user: p.nickname,
        time: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'),
        status: status, note: status === '已退款' ? '用户主动退款' : '已自动开通'
      });
    }
    var vip = H.storeGet('vip');
    if (vip) {
      var now = new Date();
      var w = vip.way === '微信支付' ? ways[0] : ways[1];
      rows.unshift({
        no: 'HHHT' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + '99999',
        plan: vip.planName, price: vip.price, way: w, user: '前台演示用户',
        time: now.toLocaleString('zh-CN', { hour12: false }),
        status: '已支付', note: '前台演示支付'
      });
    }
    return rows.sort(function (a, b) { return a.time < b.time ? 1 : -1; });
  }
  function renderOrders() {
    var rows = genOrders();
    document.getElementById('orderTbody').innerHTML = rows.map(function (o) {
      return '<tr>' +
        '<td style="font-size:12px">' + o.no + '</td>' +
        '<td><span class="tag ' + (o.plan === '终身卡' || o.plan === '年卡' ? 'gold' : 'normal') + '">' + o.plan + '</span></td>' +
        '<td class="amount">¥' + o.price + '</td>' +
        '<td><span class="pay-way-cell"><span class="ic ' + o.way.cls + '">' + o.way.txt + '</span>' + o.way.name + '</span></td>' +
        '<td>' + o.user + '</td>' +
        '<td style="font-size:12px">' + o.time + '</td>' +
        '<td>' + (o.status === '已支付' ? '<span class="tag green">已支付</span>' : '<span class="tag orange">已退款</span>') + '</td>' +
        '<td style="font-size:12px;color:var(--ink-3)">' + o.note + '</td></tr>';
    }).join('');
  }

  /* ---------- 导航 ---------- */
  var TITLES = { dashboard: ['数据总览', '数据总览'], users: ['用户管理', '用户管理'], map: ['相亲地图', '相亲地图'], orders: ['会员订单', '会员订单'], settings: ['运营设置', '运营设置'] };
  var chartsRendered = false;
  function switchView(v) {
    document.querySelectorAll('.sb-item').forEach(function (x) { x.classList.toggle('on', x.dataset.view === v); });
    document.querySelectorAll('.view').forEach(function (x) { x.classList.remove('on'); });
    document.getElementById('view-' + v).classList.add('on');
    document.getElementById('pageTitle').textContent = TITLES[v][0];
    document.getElementById('crumb').textContent = TITLES[v][1];
    if (v === 'dashboard' && !chartsRendered) {
      renderCharts();
      chartsRendered = true;
    } else if (v === 'dashboard') {
      setTimeout(function () { Object.keys(charts).forEach(function (k) { charts[k].resize(); }); }, 60);
    }
    if (v === 'map') {
      if (!adminMap) initAdminMap();
      setTimeout(function () { adminMap.invalidateSize(); }, 80);
    }
    if (v === 'orders') renderOrders();
  }
  document.querySelectorAll('.sb-item').forEach(function (x) {
    x.onclick = function () { switchView(x.dataset.view); };
  });

  function renderCharts() {
    chGrowth(); chGender(); chDistrict(); chAge(); chEdu(); chJobs(); chFunnel(); chHeat(); chPlans(); chHearts();
  }
  window.addEventListener('resize', function () {
    Object.keys(charts).forEach(function (k) { charts[k].resize(); });
  });

  /* ---------- 表格筛选 ---------- */
  function initUserFilters() {
    var ds = document.getElementById('uDistrict');
    DATA.districts.forEach(function (d) {
      ds.innerHTML += '<option>' + d.name + '</option>';
    });
    var t;
    document.getElementById('uSearch').addEventListener('input', function () {
      clearTimeout(t);
      var v = this.value.trim();
      t = setTimeout(function () { uFilter.kw = v; uPage = 1; renderUsers(); }, 180);
    });
    document.getElementById('uGender').onchange = function () { uFilter.gender = this.value; uPage = 1; renderUsers(); };
    document.getElementById('uDistrict').onchange = function () { uFilter.district = this.value; uPage = 1; renderUsers(); };
    document.getElementById('uVip').onchange = function () { uFilter.vip = this.value; uPage = 1; renderUsers(); };
    document.getElementById('uVerified').onchange = function () { uFilter.verified = this.value; uPage = 1; renderUsers(); };
    document.getElementById('uExport').onclick = function () {
      var rows = [['ID', '昵称', '性别', '年龄', '身高', '区域', '地标', '职业', '行业', '学历', '收入', '婚姻', '民族', '住房', '购车', '实名认证', '会员', '心动值', '注册时间']];
      uFiltered().forEach(function (p) {
        rows.push([p.id, p.nickname, p.gender === 'F' ? '女' : '男', p.age, p.height, p.district, p.place, p.job, p.industry, p.education, p.incomeBand, p.marital, p.ethnicity, p.house, p.car, p.verified ? '已认证' : '未认证', p.vipLevel, H.heartsOf(p), p.registeredAt]);
      });
      var csv = '\ufeff' + rows.map(function (r) { return r.map(function (x) { return '"' + String(x).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = '青城有你_用户数据_' + new Date().toISOString().slice(0, 10) + '.csv';
      a.click();
      H.toast('已导出 ' + (rows.length - 1) + ' 条用户数据（CSV）');
    };
  }

  /* ---------- 设置开关 ---------- */
  document.addEventListener('click', function (e) {
    if (e.target.classList.contains('switch')) e.target.classList.toggle('on');
  });
  document.getElementById('saveSet').onclick = function () {
    H.toast('设置已保存（演示环境）');
  };

  /* ---------- 启动 ---------- */
  function boot() {
    renderKPI();
    renderUsers();
    renderMiniStat();
    initUserFilters();
    document.getElementById('sbUserCount').textContent = P.length;
    renderCharts();
    chartsRendered = true;
  }
  if (H.storeGet('admin')) boot();
})();
