// 11/22 ブラウザ計算の中身: ひな形(export_tpl.py)に条件を当てて HiGHS で解く。run3_par.py と同じ手順。
// node でも ブラウザ(Worker)でも動く。 calc(T, cond, highs) → {coin, occ, pts, x}
//   cond: { slots: イベント枠(0=通常), pole_w: 発電ポール1本のW数, rb: 'none'|'all'|{施設の印: true/false},
//           rbMinMine: 鉱山の虹の最小枠, occMax: 占有の上限, noRecipe: [レシピ名], extraRows: [...] }
(function (G) {
const CAPK = ['mine', 'well', 'hammock', 'salt', 'mitsu', 'wata', 'heat', 'cool', 'lamp', 'windmill', 'pole', 'mine_animo'];   // run3_par の caps と同じ順
const CAPV = {
  mine: ['鉱山', '鉱:岩石', '鉱:粘土', '鉱:銅', '鉱:石英', '鉱:宝石', '鉱:銀'],
  well: ['井:井戸水', '井:清水', '井:高速清水', '井:深層湧水', '井:高速深層湧水', '井:天然鉱泉', '井:高速天然鉱泉', '井:雪解けの冷泉'],
  hammock: ['ハンモック:None', 'ハンモック:涼', 'ハンモック:暖凍', 'ハンモック:傘:None', 'ハンモック:傘:暖', 'ハンモック:傘:猛涼'],
  salt: ['砂城', '砂城:真珠:None', '砂城:真珠:暖', '砂城:真珠:猛涼', '砂城:低', '砂城:真珠:旧'], mitsu: ['ミツドリ', 'ミツドリ:低'], wata: ['わたぐも', 'わたぐも:高速', 'わたぐも:花びら'],
  heat: ['H暖', 'H猛'], cool: ['C涼', 'C凍'], lamp: ['L'], windmill: ['風車', '風車:低'] };
// 11/25 ユーザー: 施設を1台ずつ「なし〜最大Lv」。cond.fl = {施設名: [1台ずつのLv(0=なし)]}。台数の上限(al_)の印 ↔ 施設名
const FLK = { mine: '鉱山', well: '井戸', salt: '潮の砂城', mitsu: 'ミツドリハウス', wata: 'わたぐも草ベッド', hammock: '星降るハンモック', windmill: '花舞風車' };
function caps(T, x) {
  const g = n => { const i = T.ix[n]; return i === undefined ? 0 : Math.round(x[i] || 0); };
  const c = {}; for (const k of ['mine', 'well', 'hammock', 'salt', 'mitsu', 'wata', 'heat', 'cool', 'lamp', 'windmill']) c[k] = CAPV[k].reduce((a, n) => a + g(n), 0);
  if (T.ix['電:ポール'] !== undefined) { c.pole = g('電:ポール'); c.mine_animo = c.mine - g('電:鉱4') - g('電:鉱5'); }
  return c;
}
function prep(T) {   // 名前→番号
  if (T.ix) return T; T.ix = {}; T.vars.forEach((v, i) => { T.ix[v[0]] = i; }); return T;
}
// 条件を当てた変数・式を作る(ひな形は書き換えない)
function apply(T, cond, allow) {
  prep(T);
  const V = T.vars.map(v => [v[0], v[1], v[2] === null ? Infinity : v[2], v[3], v[4]]);
  const R = T.rows.map(r => [r[0].map(t => [t[0], t[1]]), r[1] === null ? -Infinity : r[1], r[2] === null ? Infinity : r[2]]);
  const rowCo = R.map(r => { const m = new Map(); r[0].forEach(([i, c], k) => m.set(i, k)); return m; });
  function par(name, val) {
    const P = T.params[name]; if (!P || !P.d || val === undefined || val === null || val === P.base) return;
    const dv = val - P.base;
    for (const e of P.d) {
      if (e[0] === 'v') { const j = { lb: 1, ub: 2, obj: 4 }[e[2]]; if (e[3] === null) { if (dv !== 0) V[e[1]][j] = e[4] === null ? Infinity : e[4]; } else V[e[1]][j] += e[3] * dv; }
      else if (e[0] === 'r') { const j = { lb: 1, ub: 2 }[e[2]]; if (e[3] === null) { if (dv !== 0) R[e[1]][j] = e[4] === null ? (j === 1 ? -Infinity : Infinity) : e[4]; } else R[e[1]][j] += e[3] * dv; }
      else if (e[0] === 'c') { const k = rowCo[e[1]].get(e[2]); R[e[1]][0][k][1] += e[3] * dv; }
    }
  }
  if (cond.slots !== undefined) par('slots', cond.slots);
  if (cond.pole_w !== undefined) par('pole_w', cond.pole_w);
  const fl = cond.fl || null, nOf = (f, k) => (fl[f] || []).filter(l => l >= (k || 1)).length;
  const cnt = {};   // 施設Lvの条件から決まる台数
  if (fl) { for (const [k, f] of Object.entries(FLK)) if (fl[f]) cnt[k] = nOf(f); }
  if (cond.dev) for (const k of ['heat', 'cool', 'lamp']) if (cond.dev[k] !== undefined) cnt[k] = cond.dev[k];
  if (cond.poleN !== undefined) cnt.pole = cond.poleN;
  const eff = {}; for (const k of CAPK) { let v = allow && allow[k] !== undefined ? allow[k] : undefined; if (cnt[k] !== undefined) v = v === undefined ? cnt[k] : Math.min(v, cnt[k]); eff[k] = v; if (v !== undefined) par('al_' + k, v); }
  const devOk = nm => { const md = nm.split(':')[2]; if (!md || md === 'None') return true; const need = { '暖': ['heat'], '猛': ['heat'], '涼': ['cool'], '凍': ['cool'], 'L': ['lamp'], '暖凍': ['heat', 'cool'], '猛涼': ['heat', 'cool'] }[md] || []; return need.every(k => eff[k] === undefined || eff[k] > 0); };   // 11/25 環境設備がない置き方は使えない
  // 虹色
  const drop = new Set();
  const rb = cond.rb === undefined ? 'none' : cond.rb;
  for (const i of T.rb_vars) {
    const nm = V[i][0].slice(2);
    const on = cond.rbOwn ? true : rb === 'all' ? true : rb === 'none' ? false : !!rb[rbKey(nm)];
    if (!on) V[i][2] = 0;
  }
  for (const i of T.rb_force) {   // 「全部虹」の式: 'all' のときだけ残す(施設ごとの指定では、使うかどうかは計算に任せる)
    const nm = T.vars[R[i][0][0][0]][0]; const base = nm.startsWith('虹:') ? nm.slice(2) : T.vars[R[i][0][1][0]][0];
    if (!(rb === 'all')) drop.add(i);
  }
  if (T.rb_mine_row !== null && T.rb_mine_row !== undefined) R[T.rb_mine_row][1] = (rb === 'none' && !cond.rbOwn) ? 0 : (cond.rbMinMine || 0);
  // 11/22 ユーザー: 施設ごとに虹を置ける台数(数で指定)。鉱山の5枠の上限もその台数にする
  const rbRows = [];
  // 11/23 ユーザー: 虹色はアニモ単位。cond.rbOwn = [[持っている数, [施設のグループ…]], …](同じアニモが2つの施設に入れる場合もある)
  //   アニモ→施設の割り当て y を足し、「施設の虹の台数 ≦ 割り当てた数」「アニモごとの割り当ての合計 ≦ 持っている数」
  if (cond.rbOwn) {
    const grp = {};
    for (const i of T.rb_vars) { const g = rbGroup(V[i][0].slice(2)); (grp[g] = grp[g] || []).push(i); }
    const need = {};   // グループ → [y の番号]
    cond.rbOwn.forEach(([n, gs], a) => {
      const ys = [];
      for (const g of gs) if (grp[g]) { V.push(['割虹:' + a + ':' + g, 0, Infinity, 0, 0]); const yi = V.length - 1; ys.push([yi, 1]); (need[g] = need[g] || []).push(yi); }
      if (ys.length) rbRows.push([ys, -Infinity, n]);
    });
    for (const [g, is] of Object.entries(grp)) rbRows.push([is.map(i => [i, 1]).concat((need[g] || []).map(yi => [yi, -1])), -Infinity, 0]);
    if (T.rb_mine_row !== null && T.rb_mine_row !== undefined) R[T.rb_mine_row][2] = Infinity;
  }
  if (rb && typeof rb === 'object') {
    const grp = {};
    for (const i of T.rb_vars) { const k = rbKey(V[i][0].slice(2)); (grp[k] = grp[k] || []).push(i); }
    for (const [k, n] of Object.entries(rb)) if (typeof n === 'number' && grp[k]) {
      rbRows.push([grp[k].map(i => [i, 1]), -Infinity, n]);
      if (k === 'mine' && T.rb_mine_row !== null && T.rb_mine_row !== undefined) R[T.rb_mine_row][2] = Math.max(n, R[T.rb_mine_row][1]);
    }
  }
  if (cond.sw) V.forEach(v => { if (v[0].startsWith('z:')) v[3] = 0; });
  // 11/24 ユーザー: 切り替えありで、1台あたりのレシピ数の上限(施設ごとに「使うレシピの数 ≦ 台数 × 上限」)。cond.swGroups = [[レシピ…], 上限, 台数]
  if (cond.sw && cond.swGroups) for (const [rs, cap, cnt] of cond.swGroups) {
    const as = [];
    for (const r of rs) { const zi = T.ix['z:' + r]; if (zi === undefined) continue; V.push(['使:' + r, 0, cnt, 1, 0]); const ai = V.length - 1; as.push([ai, 1]); R.push([[[zi, 1], [ai, -1]], -Infinity, 0]); }   // 使 = そのレシピが入る台の数(端数で2台にまたがれば2)
    if (as.length > cap) R.push([as, -Infinity, cap]);
  }
  if (cond.stopOff && cond.stopOff.length) {   // 11/24 組めない原因を調べるときだけ: 取り合う材料で「台が止まらない」の式を外す
    const so = new Set(cond.stopOff);
    R.forEach((r, i) => { if (r[0].length === 1 && r[2] === 0 && V[r[0][0][0]][0].startsWith('止:') && so.has(V[r[0][0][0]][0].split(':')[1])) drop.add(i); });
  }
  if (cond.sw || (cond.resOff && cond.resOff.length)) {   // 11/24 ユーザー: 取り合う材料の余り(能力Lv4で速くなる分を売る分から出せる)は、レシピを切り替えずに回すときのルール。切り替えありでは使わない(「予:」の式を外す)
    // 切り替えなしでも、「もう持っている材料」にチェックした材料(cond.resOff)は在庫が余りの代わりになるので外す
    const off = cond.sw ? null : new Set(cond.resOff);
    const yo = new Set(); V.forEach((v, i) => { if (v[0].startsWith('予:') && (!off || off.has(v[0].split(':')[1]))) yo.add(i); });
    R.forEach((r, i) => { if (r[0].some(([j]) => yo.has(j))) drop.add(i); });
  }   // 11/22 レシピ切り替え有り: 1台を複数のレシピで時間を分けて使う(台数の割り当てを小数に)
  for (const nm of (cond.noRecipe || [])) { const i = T.ix['作:' + nm]; if (i !== undefined) V[i][2] = 0; }
  // 11/26 ユーザー: プレイヤーが放置で水汲み・採掘する時間(1日 cond.human 時間)。人は作業量を1秒あたり2.0 進める(11/6 実測)。
  //   アニモ1台分の量に対する倍率 = 2.0 ÷ (アニモの作業の速さ: 推奨Lv1・240% 2.4 / 推奨Lv2・168% 2.1 / 推奨Lv3・120% 1.8)。そのレシピの井戸・鉱山があるときだけ(一緒に作業する)
  if (cond.human > 0) {
    const HF = { '井:井戸水': 2 / 2.4, '井:清水': 2 / 2.1, '井:高速清水': 2 / 1.8, '井:深層湧水': 2 / 1.8, '井:高速深層湧水': 2 / 1.8, '井:天然鉱泉': 2 / 1.8, '井:高速天然鉱泉': 2 / 1.8, '井:雪解けの冷泉': 2 / 1.8,
      '鉱:岩石': 2 / 2.4, '鉱:粘土': 2 / 2.1, '鉱山': 2 / 2.1, '鉱:銅': 2 / 1.8, '鉱:石英': 2 / 1.8, '鉱:宝石': 2 / 1.8, '鉱:銀': 2 / 1.8 };
    const hs = [], hv = {};
    for (const [nm, f] of Object.entries(HF)) { const vi = T.ix[nm]; if (vi === undefined || V[vi][2] <= 0) continue;
      V.push(['人:' + nm, 0, 1, 0, 0]); const hi = V.length - 1; hs.push([hi, 1]);
      for (const ri of Object.values(T.bal_row)) for (const [i, c] of R[ri][0]) if (i === vi && c > 0) { R[ri][0].push([hi, c * f]); break; }   // 1日ずっとなら1台分×倍率
      const ei = T.ix['電井:' + nm];   // 11/26 ユーザー: 電力モードの施設では人は作業できない
      R.push([[[hi, 1], [vi, -1]].concat(ei !== undefined ? [[ei, 1]] : []), -Infinity, 0]); hv[nm] = hi; }
    if (hs.length) R.push([hs, -Infinity, Math.min(24, cond.human) / 24]);
    const mn = ['鉱:銅', '鉱:石英', '鉱:宝石', '鉱:銀'].filter(n => hv[n] !== undefined), p4 = T.ix['電:鉱4'], p5 = T.ix['電:鉱5'];   // 鉱山の電力モードは鉱石をまとめた数
    if (mn.length && (p4 !== undefined || p5 !== undefined)) R.push([mn.map(n => [hv[n], 1]).concat(mn.map(n => [T.ix[n], -1]), p4 !== undefined ? [[p4, 1]] : [], p5 !== undefined ? [[p5, 1]] : []), -Infinity, 0]);
  }
  // 11/25 ユーザー: メイン＋サブ。切り替えなしの配置(メイン = セットしっぱなし。止め忘れの心配なしの決まりはそのまま)に、
  //   メインの台の空き時間で、売る分の材料だけを使って時々作るサブ(1台に1つまで)を足す。サブを回し忘れても、切り替えなしの配置に戻るだけ
  if (!cond.sw && cond.msGroups) {
    if (!T._c0) { T._c0 = {}; T._cr = {};   // レシピ1台がずっと動いたときの量(作/分)
      for (const [co] of T.rows) { const nz = co.filter(([i]) => V[i][0].startsWith('z:')), nk = co.filter(([i]) => V[i][0].startsWith('作:'));
        if (nz.length !== 1 || nk.length !== 1 || co.length > 3) continue; const r = V[nz[0][0]][0].slice(2); if (V[nk[0][0]][0] !== '作:' + r) continue;
        const ce = co.find(([i]) => V[i][0] === 'e:' + r); if (nk[0][1] > 0 && nz[0][1] < 0) { T._c0[r] = -nz[0][1] / nk[0][1]; T._cr[r] = (-nz[0][1] - (ce ? ce[1] : 0)) / nk[0][1]; } } }
    if (!T._bal) { T._bal = {}; for (const [k, ri] of Object.entries(T.bal_row)) for (const [i, c] of T.rows[ri][0]) if (V[i][0].startsWith('作:')) (T._bal[V[i][0].slice(2)] = T._bal[V[i][0].slice(2)] || []).push([k, c]); }   // レシピ → [品物, 係数(作る+ / 使う−)]
    const ptsV = new Set(Object.keys(T.pts).map(i => V[+i][0]));
    const stops = V.map((v, i) => v[0].startsWith('止:') ? i : -1).filter(i => i >= 0);
    const subUse = {};   // 材料k → [[サブ, 個数]]
    for (const [rs, cnt] of cond.msGroups) {
      const time = [], sbs = [], zs = [], ys = [], dom = [];
      for (const r of rs) { const zi = T.ix['z:' + r], ki = T.ix['作:' + r], c0 = T._c0[r]; if (zi === undefined || ki === undefined || !c0) continue;
        zs.push([zi, -1]); time.push([ki, 1 / c0]); dom.push([ki, -1 / c0]); const ei = T.ix['e:' + r]; if (ei !== undefined) time.push([ei, -(T._cr[r] / c0 - 1)]);
        V.push(['メ有:' + r, 0, 1, 1, 0]); const ai = V.length - 1; R.push([[[ki, 1], [ai, -2 / 1440]], 0, Infinity]);   // メインが何か作っている(1日2個以上)
        V.push(['メ台:' + r, 0, cnt, 0, 0]); const yi = V.length - 1; R.push([[[yi, 1], [zi, -1]], -Infinity, 0]); R.push([[[yi, 1], [ai, -cnt]], -Infinity, 0]); ys.push([yi, -1]);   // サブを入れられるのは、メインが動いている台だけ
        if (V[ki][2] <= 0 || ptsV.has('作:' + r)) continue;
        V.push(['サブ:' + r, 0, Infinity, 0, 0]); const si = V.length - 1; time.push([si, 1 / c0]); dom.push([si, 1 / c0]);
        for (const [k, c] of T._bal[r] || []) { R[T.bal_row[k]][0].push([si, c]); if (c < 0) (subUse[k] = subUse[k] || []).push([si, -c]); }
        V.push(['サ有:' + r, 0, 1, 1, 0]); const bi = V.length - 1; R.push([[[si, 1], [bi, -cnt * c0 * 2]], -Infinity, 0]); sbs.push([bi, 1]);
        R.push([[[zi, 1], [bi, cnt]], -Infinity, cnt]); }   // メインにしたレシピはサブにしない(同じレシピならメインを多めに回すだけになるので)
      if (time.length) R.push([time.concat(zs), -Infinity, 0]);   // メインの台の時間(メイン+サブ) ≦ 台数
      if (dom.some(([i, c]) => c > 0)) R.push([dom, -Infinity, 0]);   // サブは時々: サブの時間はメインの時間まで
      if (sbs.length) R.push([sbs.concat(ys), -Infinity, 0]);    // サブは1台に1つまで(メインが動いている台)
    }
    for (const ui of stops) { const k = V[ui][0].split(':')[1]; const us = subUse[k]; if (!us) continue;   // メインが材料kで止まって使い切るなら、サブはkを使わない
      const BIG = 1e4; R.push([us.concat([[ui, BIG]]), -Infinity, BIG]); }
  }
  for (const pre of (cond.noVarPrefix || [])) V.forEach(v => { if (v[0].startsWith(pre)) v[2] = 0; });   // 例: '森:高速レモン:'(高速レシピ・レモンを解放していない)
  for (const nm of (cond.noVar || [])) { const i = T.ix[nm]; if (i !== undefined) V[i][2] = 0; }   // 11/25 ツールパックで解放していないもの
  const flRows = [];
  if (fl && T.vlv) {   // 11/25 施設Lv: 「Lv.k以上が要る変数の合計 ≦ Lv.k以上の台数」(k=1 は台数そのもの)
    const by = {}; for (const [i, [f, rq]] of Object.entries(T.vlv)) (by[f] = by[f] || []).push([+i, rq]);
    const mx = f => Math.max(0, ...(fl[f] || []));
    for (const [f, vs] of Object.entries(by)) { if (!fl[f]) continue;
      const top = Math.max(...vs.map(v => v[1]));
      for (let k = 1; k <= top; k++) { const co = vs.filter(v => v[1] >= k).map(v => [v[0], 1]); if (co.length) flRows.push([co, -Infinity, nOf(f, k)]); }
      const tz = T.tags || {}; for (const key of ['zs:' + f, 'ld:' + f]) if (tz[key] !== undefined) R[tz[key]][2] = Math.min(R[tz[key]][2], nOf(f));
    }
    const tg = T.tags || {}, lbOf = (ri, f) => {   // 「全部を一番よいレシピに」の下限: 1台ずつ、そのLvで使える一番よい量の合計
      if (ri === undefined || !fl[f]) return; const co = R[ri][0]; let s = 0;
      for (const l of fl[f]) { if (!l) continue; let b = 0; for (const [i, c] of co) { const q = T.vlv[i]; if (q && q[1] <= l && V[i][2] > 0 && devOk(V[i][0])) b = Math.max(b, c); } s += b; }
      R[ri][1] = s - 1e-6; };
    lbOf(tg.wood, '森'); lbOf(tg.ore, '鉱山');
    if (tg.mineall !== undefined && fl['鉱山']) R[tg.mineall][1] = nOf('鉱山');
    if (tg.pw !== undefined) {   // 電力モードのW数は、その施設の一番高いLvで
      const row = R[tg.pw][0];
      for (const t of row) { const nm = V[t[0]][0];
        if (nm === '電:鉱5' && fl['鉱山']) t[1] = 30 * mx('鉱山'); else if (nm === '電:井戸' && fl['井戸']) t[1] = 30 * mx('井戸');
        else if (nm.startsWith('e:')) { const q = T.vlv[T.ix['z:' + nm.slice(2)]]; if (q && fl[q[0]]) t[1] = 15 * mx(q[0]); } }
    }
  }
  // 11/22 必ず含める: 品物を1日 perDay 個以上残す(売る・食料・ほかの加工に回さない分)。持っている材料は作らなくてよい
  //   11/22 ユーザー: 5つまで(cond.must が配列)。owned は [材料, 品物1個あたりの数](末端まで掛け合わせた数)
  for (const mu of (Array.isArray(cond.must) ? cond.must : (cond.must && cond.must.item ? [cond.must] : []))) {
    const per = (mu.perDay || 40) / 1440, ri = T.bal_row && T.bal_row[mu.item];
    if (ri === undefined) return null;
    V.push(['残:' + mu.item, per, per, 0, 0]); R[ri][0].push([V.length - 1, -1]);
    const mk = T.ix['作:' + mu.item];
    for (const [k, q] of (mu.owned || [])) {
      const rk = T.bal_row[k]; if (rk === undefined) continue;
      V.push(['持:' + k, 0, q * per, 0, 0]); const vi = V.length - 1; R[rk][0].push([vi, 1]);
      if (mk !== undefined) R.push([[[vi, 1], [mk, -q]], -Infinity, 0]);
    }
  }
  // 11/27 必ず含める品物の材料を森・鉱山で作ると木材・鉱砂が最大にならないとき、下限をそこまで下げる(lbFix が決める)
  if (cond.lbOver) { const tg = T.tags || {}; for (const [k, v] of Object.entries(cond.lbOver)) if (tg[k] !== undefined) R[tg[k]][1] = v; }
  const rows = R.filter((r, i) => !drop.has(i));
  for (const r of rbRows) rows.push(r);
  for (const r of flRows) rows.push(r);
  for (const r of (cond.extraRows || [])) rows.push(r);
  if (cond.occMax !== undefined && cond.occMax !== null) rows.push([Object.entries(T.occ).map(([i, c]) => [+i, c]), -Infinity, cond.occMax]);
  return { V, rows, R };
}
function rbGroup(nm) {   // 11/23 虹色の変数名 → 置けるアニモが同じ施設のグループ
  if (nm.startsWith('鉱')) return 'mine'; if (nm.startsWith('井')) return 'well';
  if (nm.startsWith('砂城:真珠')) return 'salt_pearl'; if (nm.startsWith('砂城')) return 'salt';
  if (nm.startsWith('ハンモック:傘')) return 'hammock_cap';   // 11/24 金粉の傘はゼニマクラ専用なので星と分ける
  if (nm.startsWith('ハンモック')) return 'hammock'; if (nm.startsWith('わたぐも:花びら')) return 'wata_petal';
  if (nm.startsWith('わたぐも')) return 'wata'; if (nm.startsWith('風車')) return 'windmill'; return 'other';
}
function rbKey(nm) {   // 虹色の変数名 → 施設の印
  if (nm.startsWith('鉱')) return 'mine'; if (nm.startsWith('井') || nm.startsWith('電井')) return 'well';
  if (nm.startsWith('砂城')) return 'salt'; if (nm.startsWith('ハンモック')) return 'hammock';
  if (nm.startsWith('わたぐも')) return 'wata'; if (nm.startsWith('風車')) return 'windmill'; return 'other';
}
function fmt(x) { return Number.isInteger(x) ? String(x) : x.toPrecision(12).replace(/\.?0+(e|$)/, '$1'); }
function toLP(M, obj, extra) {
  const t = (c, i) => (c >= 0 ? '+ ' : '- ') + fmt(Math.abs(c)) + ' x' + i;
  const L = ['Maximize', ' obj: ' + (obj.map((c, i) => c ? t(c, i) : '').filter(Boolean).join(' ') || '0 x0'), 'Subject To'];
  let n = 0;
  for (const [co, lb, ub] of M.rows.concat(extra || [])) {
    const cs = co.filter(([i, c]) => c); if (!cs.length) continue;
    const e = cs.map(([i, c]) => t(c, i)).join(' ');
    if (lb === ub) L.push(` r${n++}: ${e} = ${fmt(lb)}`);
    else { if (lb > -Infinity) L.push(` r${n++}: ${e} >= ${fmt(lb)}`); if (ub < Infinity) L.push(` r${n++}: ${e} <= ${fmt(ub)}`); }
  }
  L.push('Bounds');
  M.V.forEach((v, i) => { L.push(v[2] < Infinity ? ` ${fmt(v[1])} <= x${i} <= ${fmt(v[2])}` : ` x${i} >= ${fmt(v[1])}`); });
  const gi = M.V.map((v, i) => v[3] ? 'x' + i : null).filter(Boolean);
  if (gi.length) { L.push('General'); for (let i = 0; i < gi.length; i += 20) L.push(' ' + gi.slice(i, i + 20).join(' ')); }
  L.push('End'); return L.join('\n');
}
function solveOnce(T, H, cond, allow, mode, ptMin) {
  const M = apply(T, cond, allow); if (!M) return null;
  let obj;
  if (mode === 'pts') { obj = M.V.map(() => 0); for (const [i, c] of Object.entries(T.pts)) obj[+i] = c; }
  else if (typeof mode === 'number') { obj = M.V.map(() => 0); for (const [i, c] of M.R[mode][0]) obj[+i] += c; }   // 11/27 行の式を最大に(木材・鉱砂)
  else {   // tiebreak(m3.py と同じ)
    obj = M.V.map(v => v[4]);
    M.V.forEach((v, i) => { if (v[0].endsWith(':猛涼') || v[0].endsWith(':暖凍')) obj[i] -= 1e-4; });
    for (const [i, c] of Object.entries(T.occ)) obj[+i] -= 1e-2 * c;
    if (T.ix['電:ポール'] !== undefined) obj[T.ix['電:ポール']] += 5e-3;
    if (cond.sw) M.V.forEach((v, i) => { if (v[0].startsWith('z:')) obj[i] -= 1e-4; });   // 11/25 1e-6 だと解く誤差の範囲で台数分が1のまま残ることがあった   // 切り替え有り: 台数分を必要な分だけに
  }
  const extra = [];
  if (ptMin !== null && ptMin !== undefined && Object.keys(T.pts).length) extra.push([Object.entries(T.pts).map(([i, c]) => [+i, c]), ptMin, Infinity]);
  const r = H.solve(toLP(M, obj, extra), { mip_rel_gap: 1e-7, time_limit: 60 });
  if (r.Status !== 'Optimal' && r.Status !== 'Time limit reached') return null;
  const x = new Float64Array(M.V.length);
  for (const [nm, c] of Object.entries(r.Columns)) { const i = +nm.slice(1); x[i] = c.Primal; }
  const dot = d => Object.entries(d).reduce((a, [i, c]) => a + c * x[+i], 0);
  return { x, names: M.V.map(v => v[0]), coin: dot(T.coin), pts: dot(T.pts), occ: Math.round(dot(T.occ)), status: r.Status };
}
// run3_par.py と同じ: ポイント最大 → その中でコイン最大 → 施設を1つずつ減らしてもコインが0.5以内なら減らす
// 11/27 必ず含める品物が「木材・鉱砂を最大」の前提とぶつかって組めないとき: 品物を作れる範囲で木材→鉱砂の順に最大にした値を下限にして解き直す
function hasMust(cond) { return Array.isArray(cond.must) ? cond.must.length > 0 : !!(cond.must && cond.must.item); }
function lbFix(T, H, cond) {
  prep(T); const tg = T.tags || {}; const keys = ['wood', 'ore'].filter(k => tg[k] !== undefined); if (!keys.length) return null;
  const base = apply(T, cond); if (!base) return null;
  const c = Object.assign({}, cond, { lbOver: {} }); for (const k of keys) c.lbOver[k] = -Infinity;
  const cut = {};
  for (const k of keys) {
    const r = solveOnce(T, H, c, null, tg[k], null); if (!r) return null;
    const M = apply(T, c); let v = 0; for (const [i, co] of M.R[tg[k]][0]) v += co * r.x[+i];
    const lb0 = base.R[tg[k]][1]; c.lbOver[k] = Math.min(lb0, v - Math.max(1e-6, Math.abs(v) * 1e-7));
    if (lb0 > 0 && v < lb0 - 1e-6) cut[k] = Math.max(1, Math.round((1 - v / lb0) * 100));
  }
  c._cut = cut; return c;
}
function calc(T, cond, H, opt) {
  const r = calc0(T, cond, H, opt);
  if (r || cond.lbOver || !hasMust(cond)) return r;
  const c = lbFix(T, H, cond); if (!c || !Object.keys(c._cut).length) return null;
  const r2 = calc0(T, c, H, opt); if (r2) r2.lbCut = c._cut; return r2;
}
function calc0(T, cond, H, opt) {
  opt = opt || {};
  if (cond.ms && cond.msGroups && !cond.sw) {   // 11/25 メイン＋サブ: 先に切り替えなしで解いて(施設を減らすところまで)、その施設の数のままサブを足して解き直す(まとめて解くと遅い)
    const t0 = Date.now(), c0 = Object.assign({}, cond, { ms: false, msGroups: undefined });
    const on = opt.onStep, base = calc0(T, c0, H, Object.assign({}, opt, { onStep: on ? (n, r, p) => on(n, r, p * 0.85) : undefined })); if (!base) return null;
    if (opt.quick && !base.caps) base.caps = caps(T, base.x);
    const pm = (T.lv !== 9 && (cond.slots || 0) > 0) ? base.pts - 1e-4 : null;
    const r = solveOnce(T, H, cond, base.caps, 'coin', pm); if (on) on(base.solves + 1, r, 0.99);
    return Object.assign(r && r.coin >= base.coin - 1e-6 ? r : base, { solves: base.solves + 1, ms: Date.now() - t0, caps: base.caps }); }
  prep(T); const t0 = Date.now(); let n = 0;
  // 11/23 ユーザー: 計算中は進み具合を%で。最初の解き(〜30%)と、施設を減らせるかの解き直し(残り、回数は条件しだいなので目安)
  let red = 0, K = 1; const prog = () => red ? 0.30 + 0.68 * (1 - Math.exp(-red / Math.max(K, 1) * 1.2)) : Math.min(0.30, n * 0.10);
  const S = (al, mode, pm) => { n++; if (al) red++; const r = solveOnce(T, H, cond, al, mode, pm); if (opt.onStep) opt.onStep(n, r, prog()); return r; };
  let pm = null;
  if (T.lv !== 9 && (cond.slots || 0) > 0) { const p = S(null, 'pts', null); if (!p) return null; pm = p.pts - 1e-4; }
  const top = S(null, 'coin', pm); if (!top) return null;
  if (opt.quick) return Object.assign(top, { solves: n, ms: Date.now() - t0 });
  let cur = caps(T, top.x); K = Object.keys(cur).filter(k => cur[k] > 0 && k !== 'mine' && k !== 'pole').length + 1; let r0 = S(cur, 'coin', pm) || top;
  for (;;) {
    let dropped = false;
    for (const k of Object.keys(cur)) {
      const v = cur[k]; if (v <= 0 || k === 'mine' || k === 'pole') continue;
      const al = Object.assign({}, cur); al[k] = v - 1;
      const r = S(al, 'coin', pm);
      if (r && r.coin >= r0.coin - 0.5) { cur = caps(T, r.x); r0 = r; dropped = true; break; }
    }
    if (!dropped) break;
  }
  return Object.assign(r0, { solves: n, ms: Date.now() - t0, caps: cur });
}
const API = { calc, solveOnce, apply, toLP, caps, prep, rbGroup };
if (typeof module !== 'undefined') module.exports = API; else G.AniimoCalc = API;
})(typeof self !== 'undefined' ? self : this);
