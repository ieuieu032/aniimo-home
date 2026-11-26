// 11/22 早見表「自分の条件で計算」の裏の計算(Web Worker)。highs.js・calc.js・gen.js・post.js と tpl/ を同じフォルダから読む
importScripts('highs.js', 'calc.js', 'gen.js', 'post.js');
let H = null, S = null, GEN = null, POST = null; const TPL = {};
async function ready() {
  if (!H) { const bin = await (await fetch('highs.wasm')).arrayBuffer();
    H = await Module({ instantiateWasm: (info, receive) => { WebAssembly.instantiate(bin, info).then(r => receive(r.instance)); return {}; } }); }
  if (!S) { S = await (await fetch('tpl/static.json')).json(); GEN = AniimoGen.make(S); POST = AniimoPost.make(S); }
}
async function tpl(lv) { if (!TPL[lv]) TPL[lv] = await (await fetch(`tpl/lv${lv}.json`)).json(); return TPL[lv]; }
function toPage(T, r, lv, cond) {
  const xs = []; T.vars.forEach((v, k) => { if (Math.abs(r.x[k]) > 1e-6) xs.push([v[0], r.x[k]]); });
  const sw = cond.sw ? Object.fromEntries(xs.filter(([k]) => k.startsWith('z:')).map(([k, v]) => [k.slice(2), v])) : null;
  const mx = {}; if (cond.fl) for (const [f, ls] of Object.entries(cond.fl)) mx[f] = Math.max(0, ...ls);   // 11/25 施設Lvの条件
  const ms = cond.ms ? { sub: {}, sec: {}, z: {} } : null;   // サブの量(1日の個数)と、アニモの台の1個あたりの秒(全速)
  if (ms) for (const [r, c0] of Object.entries(T._c0 || {})) ms.sec[r] = 0.9 * 60 / c0;
  if (ms && r.names) r.names.forEach((nm, k) => { if (nm.startsWith('z:') && r.x[k] > 1.5) ms.z[nm.slice(2)] = Math.round(r.x[k]); if (nm.startsWith('サブ:') && r.x[k] * 1440 >= 0.5) ms.sub[nm.slice(3)] = r.x[k] * 1440; });
  const human = []; if (cond.human > 0 && r.names) r.names.forEach((nm, k) => { if (nm.startsWith('人:') && r.x[k] * 24 >= 0.05) human.push([nm.slice(2), Math.round(r.x[k] * 24 * 10) / 10]); });   // 11/26 プレイヤーの放置作業(レシピ, 1日の時間)
  const page = POST.page(GEN.config(xs, { coin: r.coin, occ: r.occ }, lv, cond.fl ? { mx, poleW: cond.pole_w } : {}), lv, { fl: cond.fl, poles: cond.poles, ms, poleW: cond.pole_w, poleLv: cond.poleLv, poleL4: cond.poleL4, sw, swMax: cond.swMax, must: (cond.must || []).map(m => m.item) });
  page.human = human; return page;
}
// 11/24 ユーザー: 組めないときは原因を出す。必ず含める品物の材料のうち、取り合いの余りを外すと組めるものを探す(切り替えなしのとき)
function why(T, cond) {
  if (cond.sw || !Array.isArray(cond.must) || !cond.must.length) return [];
  const tree = (it, acc) => { for (const k of Object.keys(S.INS[it] || {})) if (!acc.has(k)) { acc.add(k); tree(k, acc); } return acc; };
  const use = {}; for (const m of cond.must) for (const k of tree(m.item, new Set([m.item]))) (use[k] = use[k] || []).push(m.item);
  const has = new Set(T.vars.filter(v => v[0].startsWith('予:')).map(v => v[0].split(':')[1]));
  const out = [];
  for (const k of Object.keys(use)) { if (!has.has(k) && !T.vars.some(v => v[0].startsWith('止:' + k + ':'))) continue;
    const c = Object.assign({}, cond, { resOff: (cond.resOff || []).concat([k]) });
    if (AniimoCalc.calc(T, c, H, { quick: true })) { out.push([k, use[k].filter(x => x !== k), 'res']); continue; }   // 余りを残せないだけ(持っている材料にチェックで解決)
    if (AniimoCalc.calc(T, Object.assign({}, c, { stopOff: [k] }), H, { quick: true })) out.push([k, use[k].filter(x => x !== k), 'stop']); }   // 切り替えなしだと台が材料切れで止まる
  return out;
}
onmessage = async (e) => {
  const { id, lv, cond } = e.data;
  try {
    await ready(); const T = await tpl(lv); const t0 = Date.now();
    if (cond.sw && cond.swMax) {   // 11/24 ユーザー: 1台で切り替えるレシピの数の上限
      AniimoCalc.prep(T); cond.swGroups = [];
      for (const [f, rs0] of Object.entries(S.FACS)) { const cnt = cond.fl && cond.fl[f] ? cond.fl[f].filter(l => l > 0).length : ((S.FACCOUNT[String(lv)] || {})[f] || 1); if (!cnt) continue; const rs = rs0.filter(r => T.ix['z:' + r] !== undefined); if (rs.length > 1) cond.swGroups.push([rs, cond.swMax * cnt, cnt]); }
    }
    if (cond.ms) {   // 11/25 ユーザー: メイン＋サブ(切り替えなし + 空き時間のサブ1台1つまで)
      AniimoCalc.prep(T); cond.msGroups = [];
      for (const [f, rs0] of Object.entries(S.FACS)) { const cnt = cond.fl && cond.fl[f] ? cond.fl[f].filter(l => l > 0).length : ((S.FACCOUNT[String(lv)] || {})[f] || 1); if (!cnt) continue; const rs = rs0.filter(r => T.ix['z:' + r] !== undefined); if (rs.length) cond.msGroups.push([rs, cnt]); }
    }
    const full = AniimoCalc.calc(T, cond, H, { onStep: (n, r, p) => postMessage({ id, type: 'step', n, p }) });   // 11/22 ユーザー: 仮の結果は出さない
    if (!full) { postMessage({ id, type: 'none', why: why(T, cond) }); return; }
    postMessage({ id, type: 'final', o: toPage(T, full, lv, cond), solves: full.solves, ms: Date.now() - t0 });
  } catch (err) { postMessage({ id, type: 'error', err: String(err && err.message || err) }); }
};
