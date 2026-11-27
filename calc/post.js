// 11/22 ブラウザ計算: gen の結果(pagedata の1件)→ ページの D の opts の1件。build_modes.sh の順に:
//   upd.conv(add16)→ levels.py → tidy.py → lvupproc.py → power_proc.py → ui_1103.py(印を消す)→ ui_1103b.py → ui_1105.py(虹色の行)→ ui_1108.py(ポールの虹色)
//   井戸Lv.3・未解放の切り替えはなし(11/22〜 施設は全部最大Lv)。英・西の文は別(C で)
(function (G) {
const pyround = (v, d) => { if (!d) { const f = Math.floor(v), r = v - f; return r === 0.5 ? (f % 2 === 0 ? f : f + 1) : Math.round(v); } return Number(v.toFixed(d)) === Number(v.toFixed(d)) ? Math.round(v * Math.pow(10, d)) / Math.pow(10, d) : v; };   // Python の round(ちょうど .5 だけ偶数に)
const clone = o => JSON.parse(JSON.stringify(o));
function make(S) {
  const WORK = S.WORK, SH = S.SH;
  let CUR = null;   // 11/25 ユーザー: 施設Lvの条件(page の opt.fl)。{ml: 短い名前→一番高いLv, fc: 施設→台数, lo: 施設→一番低いLv(0=なし除く)}
  const ML = lv => CUR ? Object.assign({}, S.MAXLV[lv], CUR.ml) : S.MAXLV[lv];
  const FC = (lv, f) => (CUR && CUR.fc[f] !== undefined) ? CUR.fc[f] : ((S.FACCOUNT[lv] || {})[f] !== undefined ? S.FACCOUNT[lv][f] : 1);
  const rng = (f, mn, mx) => { if (CUR && CUR.lo[f] !== undefined && CUR.lo[f] < mx) { const lo = Math.max(mn, CUR.lo[f]); return lo >= mx ? mx : `${lo}〜${mx}`; } return mn >= mx ? mx : `${mn}〜${mx}`; };
  const occOf = o => { const a = o.areas.find(t => t[0] === 'アニモを占有する施設'); return a ? a[1] : []; };
  // upd.conv
  function conv(c) {
    const areas = c.areas.map(([t, rows]) => [t, rows.map(r => { const o = {}; for (const [k, v] of Object.entries(r)) { if (k === 'tag' && v === null) continue; if (k === 'sub' && v === '') continue; o[k] = v; } return o; })]);
    return { removed: c.removed, coin: pyround(c.coin, 1), animo: c.occ, pts: pyround(c.pts, 3), wood: Math.floor(c.wood * 10 + 0.5) / 10, ore: Math.floor(c.ore * 10 + 0.5) / 10,
      woodT: pyround(c.woodT), oreT: pyround(c.oreT), food: c.food, areas, proc: c.proc, rawsell: c.rawsell };
  }
  // levels.py fix(lv,o,well3=False,allup=False)
  function levels(lv, o) {
    if (lv < 12) return;
    const M = ML(lv); const occ = occOf(o);
    const pole = occ.filter(r => r.fac === 'パチパチ発電ポール'); const ps = pole.length ? pole[0].sub : '';
    if (pole.length) pole[0].sub = ps.replace('発電ポールをLv.2にして、', '');
    const wl = occ.filter(r => r.fac === '井戸');
    if (wl.length && !wl.some(r => 'lv' in r)) for (const r of wl) r.lv = (CUR && CUR.lo['井戸'] < M['井戸']) ? rng('井戸', WRQ[r.p] || 1, M['井戸']) : M['井戸'];
    for (const r of occ) {
      if (r.fac === '鉱山') r.lv = (CUR && CUR.lo['鉱山'] < M['鉱山']) ? rng('鉱山', MRQ[r.p] || 1, M['鉱山']) : M['鉱山'];
      if ((r.fac === '鉱山' || r.fac === '井戸') && r.sub) r.sub = r.sub.split('。').filter(x => x && !['鉱山Lv.5', 'Lv.3のままの井戸を使う', 'Lv.4のまま'].includes(x)).join('。');
    }
    let pwItem = null;
    if (ps.includes('煮込み鍋1台を電力') || (ps.includes('煮込み鍋1台') && ps.includes('電力'))) pwItem = ['煮込み鍋', '高麗人参の滋養がゆ', 4];
    else if (ps.includes('ミル1台')) pwItem = ['メリーゴーランド式ミル', '米', M['ミル']];
    else if (ps.includes('調香台1台')) pwItem = ['蓄音機ふう調香台', null, M['調香台']];
    let newp = [];
    for (const g of o.proc) {
      if (g.pw) { newp.push(g); continue; }
      const f = g.f, lvv = M[SH[f]];
      if (pwItem && f === pwItem[0]) {
        let its = g.items.filter(i => pwItem[1] === null || i.r === pwItem[1]);
        if (pwItem[1] === null && g.items.length > 1) { const a = g.items.filter(i => i.r === '上級レモンアロマ'); its = a.length ? a : its.slice(0, 1); }
        const rest = g.items.filter(i => !its.includes(i));
        if (rest.length) newp.push(Object.assign({ f }, lvv !== undefined ? { lv: lvv } : { lv: null }, { items: rest }));
        if (its.length) newp.push({ f, lv: pwItem[2], pw: 1, items: its });
      } else newp.push(Object.assign({}, g, { lv: lvv === undefined ? null : lvv }));
    }
    const sp = [];
    for (const g of newp) {
      const cnt = FC(lv, g.f), used = newp.filter(q => q.f === g.f).reduce((a, q) => a + q.items.length, 0);
      if (!g.pw && g.items.length > 1 && used <= cnt) for (const i of g.items) sp.push(Object.assign({}, g, { items: [i] })); else sp.push(g);
    }
    newp = sp;
    for (const g of newp) {
      if (g.pw) continue;
      const mx = M[SH[g.f]];
      const ls = g.items.map(i => Number.isInteger(WORK[i.r][0]) ? WORK[i.r][0] : S.EV10[g.f]);
      let mn = Math.max(...ls);
      if (FC(lv, g.f) === 1) mn = mx;
      if (newp.some(q => q.f === g.f && q.pw && Number.isInteger(q.lv) && q.lv < mx)) mn = mx;
      g.lv = (CUR && CUR.lo[g.f] !== undefined && CUR.lo[g.f] < mx && mn < mx) ? rng(g.f, mn, mx) : (mn >= mx ? mx : `${mn}〜${mx}`);
    }
    o.proc = newp;
  }
  const MRQ = { '岩石': 1, '粘土': 2, '貝殻': 3, '銅鉱石': 4, '石英鉱石': 5, '宝石': 6, '銀鉱石': 7 };
  const WRQ = { '高速レシピ・井戸水': 1, '清水': 2, '高速レシピ・清水': 3, '深層湧水': 4, '高速レシピ・深層湧水': 4, '天然鉱泉': 5, '高速レシピ・天然鉱泉': 5, '雪解けの冷泉': 6 };
  // tidy.py
  function tidy(o) {
    for (const [t, rows] of o.areas) for (const r of rows) {
      let sub = r.sub || ''; if (!sub) continue;
      sub = sub.split('。').filter(p => p && !['環境設備', '枠を減らす場合は、下の「鉱山の枠数」を参照', '調香台を電力で動かすと、アロマドリを固定編成しなくてよくなる'].includes(p)).join('。');
      if (r.fac === 'パチパチ発電ポール') sub = sub.replace(/を電力モードで動かす\(必要電力(\d+)W・給電率120%\)/g, 'を電力モードに($1W)');
      if (sub) r.sub = sub; else delete r.sub;
    }
  }
  // lvupproc.py
  const CH = [['木工台', ['木材', '荒材', '規格木材', '集成材の梁', '高密度木製部材'], 'wood'], ['煙突鍛造炉', ['鉱砂', '粗粒骨材', '焼結鉱石レンガ', '精錬鉱材', '微結晶鉱物板'], 'ore']];
  const RATIO = [null, 8, 8, 8, 4];
  function lvup(lv, o) {
    o.proc = o.proc.filter(g => !g.lvup); const n = S.STAGES[lv];
    for (const [fac, names, key] of CH) {
      const per = o[key] * 1440; let div = 1; let gs = [];
      for (let st = 1; st <= n; st++) { div *= RATIO[st]; const g = { f: fac, items: [{ r: names[st], d: pyround(per / div), ins: names[st - 1] }], lvup: true }; if (lv >= 12) g.lv = st === n ? st : `${st}〜${n}`; gs.push(g); }
      if (fac === '木工台' && n >= 4) {
        const g1 = gs[0], d1 = g1.items[0].d;
        const ga = Object.assign({}, g1, { items: [Object.assign({}, g1.items[0], { d: pyround(d1 / 2) })], sub: '荒材は量が多く、1台では追いつかないので2台で作る。' }), gb = Object.assign({}, ga);
        const g3 = gs[2], g4 = gs[3];
        const gc = { f: fac, items: [g3.items[0], g4.items[0]], lvup: true, sub: '集成材の梁と高密度木製部材は量が少ないので、1台でレシピを切り替えて作る。' };
        if ('lv' in g4) gc.lv = g4.lv;
        gs = [ga, gb, gs[1], gc].concat(gs.slice(4));
      }
      o.proc = o.proc.concat(gs);
    }
  }
  // power_proc.py
  const PB = { 0: 100, 1: 300, 2: 400, 3: 500 };
  const LVCH = { '荒材': [34, 2], '規格木材': [34, 2], '集成材の梁': [41, 3], '粗粒骨材': [34, 2], '焼結鉱石レンガ': [34, 2], '精錬鉱材': [41, 3], '高密度木製部材': [41, 3], '微結晶鉱物板': [41, 3] };
  const topLv = g => +String(g.lv).split('〜').pop();
  function label(lv, g) { const mx = ML(lv)[SH[g.f]]; let mn = Math.max(...g.items.map(it => Number.isInteger(WORK[it.r][0]) ? WORK[it.r][0] : S.EV10[g.f])); if (FC(lv, g.f) === 1) mn = mx; return rng(g.f, mn, mx); }
  function pwcount(r) { const sub = r.sub || ''; const m = sub.match(/うち(\d+)(?:枠|つ)は電力/) || sub.match(/(\d+)つは電力/); if (m) return +m[1]; return sub.includes('電力モード') ? r.n : 0; }
  function load(lv, g) { let sv = 0, tw = 0; for (const it of g.items) { const [fl, w] = WORK[it.r]; const rc = S.RECLV[g.f][String(fl)]; sv += it.d * w * 100 / (PB[3 - rc] * 1.2) / 86400; tw += it.d * w; } return [sv, tw / 1.8 <= 86400]; }
  function loadLv(g) { let sv = 0, tw = 0; for (const it of g.items) { const [w, rc] = LVCH[it.r]; sv += it.d * w * 100 / (PB[3 - rc] * 1.2) / 86400; tw += it.d * w; } return [sv, tw / 1.8 <= 86400]; }
  function power(lv, o, poleW, poleLv, poleL4, sw) {
    if (lv < 12) return;
    const occ = occOf(o); const pl = occ.filter(r => r.fac === 'パチパチ発電ポール'); if (!pl.length) return;
    const pole = pl[0], sub = pole.sub;
    const m = sub.match(/^(.*?。)(.*)を電力モードに\((\d+)W\)$/); if (!m) throw new Error('pole sub ' + sub);
    const head = m[1], lst = m[2], oldW = +m[3];
    let W = 0; for (const r of occ) if (r.fac === '鉱山' || r.fac === '井戸') { const n = pwcount(r); if (n) W += n * 30 * topLv(r); }
    const parts = lst.split(/と、|、|・/).filter(p => (p.includes('鉱山') || p.includes('井戸')) && !p.includes('作る'));
    const oldpw = o.proc.filter(g => g.pw); let oldPW = 0;
    const E_ = new Set(); o.proc.forEach((g, k) => { if (g.items.some(it => it.e)) E_.add(k); });
    const FIXED = new Set();
    if (lv >= 15) for (const k of E_) { const g = o.proc[k]; if (!g.lvup && g.f in SH && load(lv, g)[0] > 0.9 + 1e-9) FIXED.add(k); }
    const keep = [...FIXED].filter(k => E_.has(k) && lv >= 15).sort((a, b) => a - b);
    for (const g of oldpw) { oldPW += 15 * topLv(g); delete g.pw; }
    if (!sw && Math.abs(W + oldPW - oldW) > 1) throw new Error(`power W ${lv} ${W} ${oldPW} ${oldW}`);   // 11/24 切り替えありは先に1台ずつに分けるので、加工の電力は選び直す
    const pw = poleW !== undefined ? poleW : S.POLE[lv].w;
    let left = (lv >= 15 ? pole.n * pw / 1.2 : S.POLE[lv].n * S.POLE[lv].w / 1.2) - W;
    const kept = keep.map(k => [k, 15 * ML(lv)[SH[o.proc[k].f]], 0.0]);
    for (const g of o.proc) for (const it of g.items) { delete it.e; delete it.lim; }
    left -= kept.reduce((a, x) => a + x[1], 0);
    const cands = [];
    o.proc.forEach((g, k) => {
      if (FIXED.has(k)) return;
      if (g.lvup && g.items.every(it => it.r in LVCH)) { const [sv, ok] = loadLv(g); if (ok) cands.push([k, 15 * topLv(g), sv]); return; }
      if (g.lvup || !(g.f in SH)) return;
      const [sv, ok] = load(lv, g); if (!ok) return; cands.push([k, 15 * ML(lv)[SH[g.f]], sv]);
    });
    const st = new Map([['0,0', [0, 0, 0.0, []]]]);
    for (const c of cands) {
      const lu = o.proc[c[0]].lvup ? 1 : 0;
      for (const [key, [w0, l0, v0, t0]] of [...st.entries()]) {
        const w1 = w0 + c[1], l1 = l0 + lu; if (w1 > left + 1e-6) continue;
        const v1 = v0 + c[2], k1 = w1 + ',' + l1;
        if (!st.has(k1) || v1 > st.get(k1)[2] + 1e-9) st.set(k1, [w1, l1, v1, t0.concat([c])]);
      }
    }
    let best = [0, 0, []];
    for (const [w, l, v, t] of st.values()) { const sc = [Math.round(v * 1e4) / 1e4, -w, t]; if (sc[0] > best[0] || (sc[0] === best[0] && sc[1] > best[1])) best = sc; }
    const chosen = best[2].map((c, i) => [c, i]).sort((a, b) => (b[0][2] - a[0][2]) || (a[1] - b[1])).map(p => p[0]).concat(kept);
    for (const [k] of chosen) o.proc[k].pw = 1;
    for (const g of o.proc) if (g.f in SH && !g.lvup && 'lv' in g) g.lv = label(lv, g);
    const totW = W + chosen.reduce((a, x) => a + x[1], 0);
    o._pwLeft = left - best[2].reduce((a, x) => a + x[1], 0);   // 11/27 メイン＋サブで1つのレシピを2台に分けたとき、残りの電力で2台目も電力モードにする
    const pj = [];
    for (const p of parts) {
      let mm;
      if ((mm = p.match(/^Lv\.(\d+)の鉱山(\d+)枠$/))) { pj.push(`Lv.${mm[1]}の鉱山${mm[2]}枠`); continue; }
      if ((mm = p.match(/^鉱山(\d+)枠$/))) { pj.push(`鉱山${mm[1]}枠`); continue; }
      if ((mm = p.match(/^Lv\.(\d+)のままの井戸(\d+)つ$/))) { pj.push(`Lv.${mm[1]}のままの井戸${mm[2]}つ`); continue; }
      if ((mm = p.match(/^井戸(\d+)つ$/))) { pj.push(`井戸${mm[1]}つ`); continue; }
      throw new Error('power part ' + p);
    }
    for (const [k] of chosen) { const g = o.proc[k]; pj.push(g.items.map(it => it.r).join('と') + 'を作る' + g.f + '1台'); }
    let hj = head;
    const al_ = l => ({ 1: 1, 2: 2, 3: 3, 4: 3, 5: 4 })[l];
    if (head.startsWith('発電ポールを')) { const pl_ = poleLv !== undefined ? poleLv : S.POLE[lv].lv; const al = al_(pl_); const n_ = pole.n;
      // 11/23 ユーザー: Lv.5 で雷Lv4 が足りない分は雷Lv3(1本85%)
      const pls = (CUR && CUR.poles) ? CUR.poles.filter(l => l > 0).sort((a, b) => b - a) : null;
      if (pls && pls.length === n_ && new Set(pls).size > 1) {   // 11/25 ユーザー: ポールのLvがばらばら → Lvごとに置くアニモ
        const by = {}; for (const l of pls) by[l] = (by[l] || 0) + 1; const ps = [];
        for (const l of Object.keys(by).map(Number).sort((a, b) => b - a)) { const c = by[l];
          if (l >= 5 && poleL4 !== undefined && poleL4 < c) { if (poleL4 > 0) ps.push(`Lv.${l}の${poleL4}本に雷のホーム能力Lv4のアニモ`); ps.push(`Lv.${l}の${c - poleL4}本に雷のホーム能力Lv3のアニモ(85%)`); }
          else ps.push(`Lv.${l}の${c}本に雷のホーム能力Lv${al_(l)}以上のアニモ`); }
        pole.mix = ps.join('、') + 'を置き、'; hj = head; }
      else if (pl_ >= 5 && poleL4 !== undefined && poleL4 < n_) hj = (poleL4 > 0 ? `雷のホーム能力Lv4のアニモを${poleL4}本、Lv3のアニモを${n_ - poleL4}本に置く(Lv3の本は85%)。` : `雷のホーム能力Lv3以上のアニモを1本に1体ずつ置く(Lv3なら85%)。`) + head;
      else hj = `雷のホーム能力Lv${al}以上のアニモを1本に1体ずつ置く。` + head; }
    const join = pj.length <= 1 ? pj.join('') : pj.slice(0, -1).join('、') + 'と、' + pj[pj.length - 1];
    pole.sub = hj + join + `を電力モードに(${totW.toLocaleString('en-US')}W)`;
  }
  // ui_1103b.py fix_opt
  const PW = ['pw', '電力'], RB = ['rb', '虹色'];
  const LVUPW = { '荒材': 34, '規格木材': 34, '集成材の梁': 41, '高密度木製部材': 41, '粗粒骨材': 34, '焼結鉱石レンガ': 34, '精錬鉱材': 41, '微結晶鉱物板': 41 };
  function fixOcc(rows) {
    const out = [];
    for (let r of rows) {
      const sub = r.sub || ''; const m = sub.match(/^うち(\d+)(?:枠|つ)は電力モード\(アニモ不要\)$/);
      if (sub === '電力モード(アニモ不要)') { r = Object.assign({}, r); delete r.sub; r[r.tag ? 'tag2' : 'tag'] = PW; out.push(r); }
      else if (m) { const k = +m[1]; const a = Object.assign({}, r); delete a.sub; a.n = r.n - k; const b = Object.assign({}, a); b.n = k; b[b.tag ? 'tag2' : 'tag'] = PW; if (a.n > 0) out.push(a); out.push(b); }
      else if (r.fac === 'パチパチ発電ポール' && sub && r.mix && !('sub0' in r)) {   // 11/25 ポールのLvがばらばら
        const w = sub.match(/\(([\d,]+W)\)$/)[1]; r = Object.assign({}, r); r.sub0 = sub; r.sub = `${r.mix}${r.n}本を1つの電力網につなぐ。「電力」の付いた施設を動かします(${w})。`; delete r.mix; out.push(r); }
      else if (r.fac === 'パチパチ発電ポール' && sub && !('sub0' in r)) {
        const mx = sub.match(/雷のホーム能力Lv4のアニモを(\d+)本、Lv3のアニモを(\d+)本に置く/);   // 11/23 雷Lv4 と Lv3 の混在
        const ab = mx ? '' : sub.match(/(雷のホーム能力(?:Lv\d+以上)?のアニモ)/)[1]; const w = sub.match(/\(([\d,]+W)\)$/)[1];
        r = Object.assign({}, r); r.sub0 = sub;
        r.sub = mx ? `雷のホーム能力Lv4のアニモを${mx[1]}本、Lv3のアニモを${mx[2]}本に置き、${r.n}本を1つの電力網につなぐ。「電力」の付いた施設を動かします(${w})。` : r.n > 1 ? `${ab}を1本に1体ずつ置き、${r.n}本を1つの電力網につなぐ。「電力」の付いた施設を動かします(${w})。` : `${ab}を置く。「電力」の付いた施設を動かします(${w})。`;
        out.push(r);
      } else out.push(r);
    }
    return out;
  }
  function fix1103b(lv, o) {
    for (const a of o.areas) if (a[0] === 'アニモを占有する施設') a[1] = fixOcc(a[1]);
    for (const g of o.proc) for (const it of g.items) {
      delete it.ins;
      if (lv >= 12 && !g.pw) { const w = LVUPW[it.r] || (WORK[it.r] || [0, 0])[1]; if (w && it.d * w / 1.8 / 86400 > 1) it.nopw = 1; }
    }
    const m = (o.food || '').match(/食料は(.+?)1日約([\d,]+)個/); if (m) { o.foodN = m[1]; o.foodC = m[2]; }
  }
  // ui_1105.py split
  function splitRb(o) {
    for (const a of o.areas) if (a[0] === 'アニモを占有する施設') {
      const out = [];
      for (const r of a[1]) {
        const k = r.rb || 0; delete r.rb; const pw = [(r.tag || [''])[0], (r.tag2 || [''])[0]].includes('pw');
        if (k && pw && r.fac === 'パチパチ発電ポール') { r.tag2 = RB; out.push(r); continue; }
        if (!k || pw) { out.push(r); continue; }
        const kk = Math.min(k, r.n);
        if (kk < r.n) { const x = Object.assign({}, r); x.n = r.n - kk; out.push(x); }
        const b = Object.assign({}, r); b.n = kk; b[b.tag ? 'tag2' : 'tag'] = RB; out.push(b);
      }
      a[1] = out;
    }
  }
  // ui_1108.py: Lv.20〜 のポール(Lv.5)は雷Lv4 → 虹色。ポールLv.4 なら付けない
  function tagPole(lv, o, poleLv, off) {
    const pl = off ? 0 : (poleLv !== undefined ? poleLv : S.POLE[lv].lv);
    for (const a of o.areas) if (a[0] === 'アニモを占有する施設') for (const r of a[1]) if (r.fac === 'パチパチ発電ポール') {
      const has = (r.tag && r.tag[0] === 'rb') || (r.tag2 && r.tag2[0] === 'rb');
      if (lv >= 20 && pl >= 5) { if (!has) { if (r.tag) r.tag2 = RB; else r.tag = RB; } }
      else if (has) { if (r.tag2 && r.tag2[0] === 'rb') delete r.tag2; else if (r.tag && r.tag[0] === 'rb') { if (r.tag2) { r.tag = r.tag2; delete r.tag2; } else delete r.tag; } }
    }
  }
  // 11/22 レシピ切り替え有り: 施設ごとに、レシピの台数分(z)を1台ずつ詰めて(先頭から順に)、1台の中の時間の割合を付ける
  function swUnits(lv, o, z, mx) {   // 11/22 レシピ切り替え有り: 足りない施設だけ、1台で複数のレシピを時間で分ける
    const types = [...new Set(o.proc.map(g => g.f))]; const out = [];
    for (const f of types) {
      const gs = o.proc.filter(g => g.f === f), fixed = gs.filter(g => g.lvup), free = gs.filter(g => !g.lvup);   // 11/24 電力モードの台はこのあとの power() で選び直すので、ここでは分けない
      const its = free.flatMap(g => g.items).map(it => [it, Math.max(z[it.r] || 0, 1e-3)]);
      const room = FC(lv, f) - fixed.length, ceilSum = its.reduce((a, [, v]) => a + Math.ceil(v - 0.02), 0);
      if (!its.length || (ceilSum <= room && free.length <= room && !(mx && free.some(g => g.items.length > mx)))) { for (const g of free) for (const it of g.items) { const v = z[it.r] || 0; if (v > 0 && (g.items.length > 1 || v < 0.98)) it.pct = Math.max(1, Math.round(v * 100)); } out.push(...gs); continue; }   // 1台1レシピで足りる(11/24 1日の一部しか使わない台は時間の割合を出す)
      if (mx) {   // 11/24 1台のレシピ数の上限: 並べ方を変えて順に詰め、上限と台数に収まるものを使う(1つのレシピが2台にまたがってもよい)
        const asc = its.slice().sort((a, b) => a[1] - b[1]), desc = asc.slice().reverse(), alt = []; for (let i = 0, j = desc.length - 1; i <= j; i++, j--) { alt.push(desc[i]); if (i !== j) alt.push(desc[j]); }
        let got = null;
        const alt2 = []; for (let i = 0, j = asc.length - 1; i <= j; i++, j--) { alt2.push(asc[i]); if (i !== j) alt2.push(asc[j]); }
        const ords = [desc, alt, alt2, asc];
        if (its.length <= 7) { const perm = (a) => a.length <= 1 ? [a] : a.flatMap((x, i) => perm(a.slice(0, i).concat(a.slice(i + 1))).map(r => [x].concat(r))); ords.push(...perm(its)); }   // 少なければ全部の並べ方を試す
        else { let sd = 12345; const rnd = () => (sd = (sd * 1103515245 + 12345) % 2147483648) / 2147483648; for (let t = 0; t < 2000; t++) { const a2 = its.slice(); for (let i = a2.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a2[i], a2[j]] = [a2[j], a2[i]]; } ords.push(a2); } }   // 多いときは並べ方をいくつも試す
        for (const ord of ords) {
          const bs = []; let cur = null;
          for (const [it, vt] of ord) { let v = vt; while (v > 0.005) { if (!cur || cur.load >= 0.995 || cur.list.length >= mx) { cur = { list: [], load: 0 }; bs.push(cur); } const p = Math.min(v, 1 - cur.load); cur.list.push([it, p, vt]); cur.load += p; v -= p; } }
          if (bs.length <= room) { got = bs; break; }
        }
        if (got) { const units = got.map(b => { const items = b.list.map(([it, p, vt]) => { const n = Object.assign({}, it, { d: Math.max(1, Math.round(it.d * p / vt)) }); if (b.list.length > 1 || b.load < 0.98) n.pct = Math.max(1, Math.round(p * 100)); return n; }); return { f, items }; });
          for (const u of units) u.lv = label(lv, u); out.push(...units, ...fixed); continue; }
      }
      // 整数の分は専用の台、端数は大きい順に空きのある台へ(入らなければ順に詰める)
      const units = [], frac = [];
      for (const [it, v] of its) { const k = Math.floor(v + 0.02); for (let n = 0; n < k; n++) units.push({ f, items: [Object.assign({}, it, { d: Math.max(1, Math.round(it.d / v)) })], load: 1 }); if (v - k > 1e-3) frac.push([it, v - k, v]); }   // 11/24 端数が小さいレシピが消えていた(0.02未満)
      frac.sort((a, b) => b[1] - a[1]); const bins = []; let ok = true;
      for (const fr of frac) { const b = bins.find(b => b.load + fr[1] <= 1.0001 && (!mx || b.list.length < mx)); if (b) { b.list.push(fr); b.load += fr[1]; } else bins.push({ list: [fr], load: fr[1] }); }   // 11/24 mx: 1台のレシピ数の上限
      if (units.length + bins.length > room) {   // 順に詰める(1つのレシピが2台にまたがる)
        bins.length = 0; let cur = null;
        if (units.length && units.length + 1 > room) { units.length = 0; frac.length = 0; for (const [it, v] of its) frac.push([it, v, v]); }   // 11/27 0.99台分を1台と数えて台数を超えていた(ミル1台で米0.99＋ライスミルク0.01)→ 全部を順に詰める
        for (const [it, v0, vt] of frac) { let v = v0; while (v > 0.005) { if (!cur || cur.load >= 0.995) { cur = { list: [], load: 0 }; bins.push(cur); } const p = Math.min(v, 1 - cur.load); cur.list.push([it, p, vt]); cur.load += p; v -= p; } }
      }
      for (const b of bins) {
        const items = b.list.map(([it, p, vt]) => { const n = Object.assign({}, it, { d: Math.max(1, Math.round(it.d * p / vt)) }); if (b.list.length > 1 || b.load < 0.98) n.pct = Math.max(1, Math.round(p * 100)); return n; });   // 11/24 ユーザー: 1日のうちの時間の割合(合計が100%未満なら残りは空き)
        if (items.length > 1 && b.load > 0.98) { const sm = items.reduce((a, n) => a + n.pct, 0); items[0].pct += 100 - sm; }
        units.push({ f, items });
      }
      for (const u of units) { delete u.load; u.lv = label(lv, u); }
      out.push(...units, ...fixed);
    }
    o.proc = out;
  }
  function msUnits(lv, o, ms) {   // 11/25 ユーザー: メイン＋サブ。切り替えなしの台(メイン)の空き時間に、サブを1台1つまで入れる
    const tOf = (r, d, pw) => { const w = (WORK[r] || [0, 0])[1]; return pw ? d * w / 1.8 / 86400 : d * (ms.sec[r] || 0) / 86400; };   // 1日のうち動いている時間の割合
    const cap = pw => pw ? 1 : 0.9;
    if (ms.z) { const out = []; for (const g of o.proc) { const n = (!g.lvup && g.items.length === 1) ? (ms.z[g.items[0].r] || 1) : 1;   // 1つのレシピを2台で回すなら2台に分ける
        if (n <= 1) { out.push(g); continue; } for (let i = 0; i < n; i++) { const c = Object.assign({}, g, { items: g.items.map(it => Object.assign({}, it, { d: Math.max(1, Math.round(it.d / n)) })) }); if (i) { const cw = (g.pw && g.f in SH) ? 15 * ML(lv)[SH[g.f]] : 0; if (cw && o._pwLeft >= cw - 1e-6) { o._pwLeft -= cw; o._pwAdd = (o._pwAdd || 0) + cw; } else delete c.pw; } out.push(c); } }
      if (o._pwAdd) for (const a of o.areas || []) for (const r of a[1]) if (r.fac === 'パチパチ発電ポール' && r.sub) r.sub = r.sub.replace(/\(([\d,]+)W\)/, (m, x) => `(${(+x.replace(/,/g, '') + o._pwAdd).toLocaleString('en-US')}W)`);
      o.proc = out; }
    const subs = Object.entries(ms.sub).map(([r, d]) => [r, d]).sort((a, b) => tOf(b[0], b[1]) - tOf(a[0], a[1]));
    const byF = {}; for (const [r, d] of subs) { const f = Object.keys(S.FACS).find(f => S.FACS[f].includes(r)); if (f) (byF[f] = byF[f] || []).push([r, d]); }
    for (const [f, ss] of Object.entries(byF)) {
      const ms_ = o.proc.filter(g => g.f === f && !g.lvup);
      for (const g of ms_) { g._idle = cap(g.pw) - g.items.reduce((a, it) => a + tOf(it.r, it.d, g.pw), 0); for (const it of g.items) it.main = 1; }
      for (const [r, d0] of ss) { let d = d0;
        while (d >= 0.5) { const g = ms_.filter(g => !g._sub && g._idle > 0.005).sort((a, b) => b._idle - a._idle)[0]; if (!g) break;
          const per = tOf(r, 1, g.pw), n = Math.min(d, per > 0 ? g._idle / per : d); const take = (n < d && d - n < 0.5) ? d : n;
          g._sub = 1; g.items.push({ r, d: Math.max(1, Math.round(take)), sub: 1, pct: Math.max(1, Math.round(tOf(r, take, g.pw) * 100)) }); d -= take; }
        if (d >= 0.5) { const g = { f, items: [{ r, d: Math.round(d), sub: 1, pct: Math.max(1, Math.round(tOf(r, d) * 100)) }], _sub: 1 }; g.lv = label(lv, g); ms_.push(g); const at = o.proc.map(x => x.f).lastIndexOf(f); o.proc.splice(at + 1, 0, g); } }   // 入る台がなければ、サブだけの台(念のため)
      for (const g of ms_) { delete g._idle; delete g._sub; }
    }
    for (const g of o.proc) if (!g.lvup) for (const it of g.items) if (!it.sub) it.main = 1;
  }
  // 全部まとめて
  function page(c, lv, opt) {
    opt = opt || {}; CUR = null;
    if (opt.fl) { CUR = { ml: {}, fc: {}, lo: {}, poles: opt.poles || null }; for (const [f, ls] of Object.entries(opt.fl)) { const on = ls.filter(l => l > 0); CUR.ml[SH[f] || f] = on.length ? Math.max(...on) : 0; CUR.fc[f] = on.length; if (on.length) CUR.lo[f] = Math.min(...on); } }
    try { return page0(c, lv, opt); } finally { CUR = null; }
  }
  function page0(c, lv, opt) {
    const o = conv(clone(c));
    // 11/24 ユーザー: 切り替えありは、先に1台ずつに分けてから電力モードの台を選ぶ(まとめたままだと、時間の割合が出ない・台数より多く並ぶ)
    levels(lv, o); tidy(o); lvup(lv, o); if (opt.sw) swUnits(lv, o, opt.sw, opt.swMax); power(lv, o, opt.poleW, opt.poleLv, opt.poleL4, !!opt.sw);
    if (opt.ms && !opt.sw) msUnits(lv, o, opt.ms); delete o._pwLeft; delete o._pwAdd;   // 11/25 メイン＋サブ(電力モードの台が決まってから)
    if (opt.sw) for (const g of o.proc) if (g.pw && !g.lvup) {   // 電力モードの台は180%で止まらない: 1日のうち何%の時間で作り終わるか(使い過ぎ防止)
      for (const it of g.items) { const w = (WORK[it.r] || [0, 0])[1]; it.pct = w ? Math.max(1, Math.round(it.d * w / 1.8 / 86400 * 100)) : undefined; }
      if (g.items.length === 1 && g.items[0].pct >= 98) delete g.items[0].pct;
    }
    if (opt.sw) {   // 11/24 ユーザー: 止めなくても材料を食いすぎないレシピ(材料をほかのレシピ・食料箱・必ず含める品物で使わない)に印
      const users = {}; for (const g of o.proc) for (const it of g.items) for (const k of Object.keys(S.INS[it.r] || {})) (users[k] = users[k] || new Set()).add(it.r);
      const keep = new Set((opt.must || []).concat(o.foodN ? [o.foodN] : []));
      const fm = (o.food || '').match(/食料は(.+?)1日約/); if (fm) keep.add(fm[1]);
      for (const g of o.proc) if (!g.lvup && g.items.length === 1 && g.items[0].pct) { const it = g.items[0], ks = Object.keys(S.INS[it.r] || {});
        if (ks.length && ks.every(k => users[k].size === 1 && !keep.has(k))) it.free = 1; }
    }
    for (const g of o.proc) for (const it of g.items) { delete it.e; delete it.lim; }
    fix1103b(lv, o); splitRb(o); tagPole(lv, o, opt.poleLv, opt.poleTagOff || opt.poleL4 === 0);
    // 11/27 雷Lv4(虹色)が一部の本数だけのときは、虹色の印をその本数の行に分ける
    if (opt.poleL4 > 0) for (const a of o.areas) if (a[0] === 'アニモを占有する施設') { const out = [];
      for (const r of a[1]) { const isRb = (r.tag && r.tag[0] === 'rb') || (r.tag2 && r.tag2[0] === 'rb');
        if (r.fac === 'パチパチ発電ポール' && isRb && r.n > opt.poleL4) { const x = Object.assign({}, r, { n: r.n - opt.poleL4 }); if (x.tag && x.tag[0] === 'rb') delete x.tag; if (x.tag2 && x.tag2[0] === 'rb') delete x.tag2; delete x.sub; delete x.sub0;
          out.push(Object.assign({}, r, { n: opt.poleL4 }), x); } else out.push(r); }
      a[1] = out; }
    for (const [t, rows] of o.areas) for (const r of rows) if (r.sub) r.sub = r.sub.replace(/とクーラー\(([^)]+)\)の範囲が重なる所に/g, 'とクーラー($1)の両方の範囲にかかる所に');   // ui_1109.py
    return o;
  }
  return { page, conv, levels, tidy, lvup, power, fix1103b, splitRb, tagPole };
}
const API = { make };
if (typeof module !== 'undefined') module.exports = API; else G.AniimoPost = API;
})(typeof self !== 'undefined' ? self : this);
