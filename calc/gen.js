// 11/22 ブラウザ計算: gen.py の config() を JS に(解 x → 配置データ pagedata の1件)。S = static.json
(function (G) {
function pyround(v) { const f = Math.floor(v), d = v - f; if (d === 0.5) return f % 2 === 0 ? f : f + 1; return Math.round(v); }
function gfmt(v) { return String(Number(v.toPrecision(6))); }
function make(S) {
  const RECIPE = {}; const PTSET = {}; for (const [o, p, ins, ml, pt] of S.R) { RECIPE[o] = [p, ins]; if (pt) PTSET[o] = pt; }
  const FAC = {}; for (const [f, rs] of Object.entries(S.FACS)) for (const r of rs) FAC[r] = f;
  const EVN = S.EVN, COMBO = S.COMBO;
  const NAME_FARM = { '通常ジャガイモ': 'ジャガイモ', '通常小麦': '小麦', '高速リュウゼツラン': '高速レシピ・リュウゼツラン', '小麦': '高速レシピ・小麦', 'ジャガイモ': '高速レシピ・ジャガイモ', '高速イネ': '高速レシピ・イネ', '高速イチゴ': '高速レシピ・イチゴ', '大根': EVN['大根'], '椒': EVN['椒'] };
  const NAME_FOREST = { '高速カエデ': '高速レシピ・カエデシロップ', '高速竹': '高速レシピ・竹', '高速レモン': '高速レシピ・レモン', 'カエデ': 'カエデシロップ', 'シュロ': 'シュロの皮' };
  const ENVJP = { '暖': '暖かい', '猛': '猛暑', '涼': '涼しい', '凍': '凍結' };
  const DEVJP = { '暖': 'ヒーター', '猛': 'ヒーター', '涼': 'クーラー', '凍': 'クーラー', 'L': '日光ランプ' };
  const DISP = { '椒': EVN['椒'], '大根': EVN['大根'], 'カエデ': 'カエデシロップ', 'シュロ': 'シュロの皮' };
  function effCov(env, mode) { if (env === '日') return mode === 'L' ? 1.0 : 0.0; const wa = env === '暖' || env === '猛', dw = mode === '暖' || mode === '猛'; if (mode === 'L') return null; if (wa !== dw) return 0.2; return env === mode ? 1.0 : 0.8; }
  function effNone(env) { if (env === null || env === undefined) return 1.0; if (env === '日') return 0.0; return (env === '暖' || env === '涼') ? 0.8 : 0.5; }
  function config(xs, r, lv, opt) {
    opt = opt || {}; const MX = opt.mx || {};   // 11/25 施設Lvの条件: 施設ごとの一番高いLv
    const FWo = f => MX[f] !== undefined ? (f === '鉱山' || f === '井戸' ? 30 : 15) * MX[f] : S.FW[lv][f], FMLo = f => MX[f] !== undefined ? MX[f] : S.FML[lv][f];
    // xs: [[name, value], …](変数の順。|v|>1e-6 のものだけ)
    const x = new Map(xs); const g = k => x.has(k) ? x.get(k) : 0; const ent = () => xs;
    const uses = item => { const out = [];
      for (const [o, [p, ins]] of Object.entries(RECIPE)) if (item in ins && g('作:' + o) > 1e-6) out.push([o, g('作:' + o) * ins[item]]);
      if (g('売:' + item) > 1e-6) out.push(['売る', g('売:' + item)]); if (g('食:' + item) > 1e-6) out.push(['食料', g('食:' + item)]);
      return stableSort(out, (a, b) => b[1] - a[1]); };
    const chain = item => { const us = uses(item); const tot = us.reduce((a, t) => a + t[1], 0) || 1; return [us.filter(t => t[1] / tot >= 0.005).map(t => [t[0], t[1] / tot]), tot]; };
    const describe = item => {
      const [main] = chain(item); if (!main.length) return [[], 'そのまま売る'];
      const first = main[0][0]; const subs = [];
      const follow = o => { const path = [[o, FAC[o] || '']]; let cur = o; for (let i = 0; i < 3; i++) { const [m2] = chain(cur); if (!m2.length || m2[0][0] === '売る' || m2[0][0] === '食料') break; cur = m2[0][0]; path.push([cur, FAC[cur] || '']); } return path; };
      let to;
      if (first === '売る') { to = []; subs.push('そのまま売る'); } else if (first === '食料') to = [['食料箱に入れる', '']]; else to = follow(first);
      for (const [c] of main.slice(1)) { if (c === '売る') subs.push('余りはそのまま売る'); else if (c === '食料') subs.push('一部を食料箱へ'); else { const p = follow(c); subs.push('一部は' + p.map(([a, b]) => b ? `${a}(${b})` : a).join('→')); } }
      let s2 = subs; if (first === '売る' && subs.length > 1) s2 = subs.slice(1).concat(['残りはそのまま売る']);
      return [to, s2.join('。')];
    };
    const envnote = (kind, name, md) => {
      const env = kind === '畑' ? S.FARM[name][3] : S.FOREST[name][5]; if (env === null) return '';
      if (md in COMBO) return `ヒーター(${ENVJP[md[0]]})とクーラー(${ENVJP[md[1]]})の範囲が重なる所に植える(${ENVJP[COMBO[md]]}になる)`;
      if (md && md !== 'None') { const e = effCov(env, md); const t = `${DEVJP[md]}(${ENVJP[md] || ''})の範囲内に植える`.replace('()', ''); return t + (e && e < 1 ? `(時間は${gfmt(1 / e)}倍)` : ''); }
      const e = effNone(env); const dev = (env === '暖' || env === '猛') ? 'ヒーター' : 'クーラー'; return e < 1 ? `${dev}なしでOK(時間は${gfmt(1 / e)}倍)` : '';
    };
    const ceil = v => Math.ceil(v - 1e-3);
    const areas = [];
    for (const [kind, title] of [['森', '森（植林地）'], ['鉱山', '鉱山'], ['畑', '畑'], ['井', '井戸']]) {
      const rows = [];
      if (kind === '畑' || kind === '森') {
        const agg = new Map();
        for (const [k, v] of ent()) if (k.startsWith(kind + ':') && v > 0.5) { const [, name, md] = k.split(':'); const kk = name + '\u0000' + md; agg.set(kk, (agg.get(kk) || 0) + pyround(v)); }
        for (const [kk, n] of stableSort([...agg.entries()], (a, b) => b[1] - a[1])) {
          const [name, md] = kk.split('\u0000');
          const item = kind === '畑' ? (S.FARM_PROD[name] || name) : S.FOREST[name][0];
          const [to, sub] = describe(item); const note = envnote(kind, name, md);
          const nm = kind === '畑' ? (NAME_FARM[name] || name) : (NAME_FOREST[name] || name);
          let tag = (name === '大根' || name === '椒') ? ['moon', S.EVTAG] : null; const fsub = [];
          for (const [fk, fv] of ent()) if (fk.startsWith('食:') && fv * 1440 >= 0.5) {
            const fi = fk.slice(2);
            if (fi === item || (fi in RECIPE && item in RECIPE[fi][1]) || (fi === 'パン' && item === '小麦')) {
              fsub.push(fi !== item ? `${fi}1日約${ceil(fv * 1440)}個は食料箱へ` : `1日約${ceil(fv * 1440)}個は食料箱へ`);
              if (fi === item && tag === null) tag = ['food', '食料にも'];
            }
          }
          rows.push({ p: nm, n, to, sub: [note, sub, ...fsub].filter(Boolean).join('。'), tag });
        }
      } else if (kind === '鉱山') {
        for (const [key, item] of [['鉱:銀', '銀鉱石'], ['鉱:宝石', '宝石'], ['鉱:石英', '石英鉱石'], ['鉱:銅', '銅鉱石'], ['鉱山', '貝殻'], ['鉱:岩石', '岩石'], ['鉱:粘土', '粘土']]) {
          const n = pyround(g(key)); if (n) { const [to, sub] = describe(item); rows.push({ p: item, n, to, sub }); } }
      } else {
        for (const [rec, item, key] of [['雪解けの冷泉', '雪解けの冷泉', '雪解けの冷泉'], ['高速レシピ・天然鉱泉', '天然鉱泉', '高速天然鉱泉'], ['天然鉱泉', '天然鉱泉', '天然鉱泉'], ['高速レシピ・深層湧水', '深層湧水', '高速深層湧水'], ['深層湧水', '深層湧水', '深層湧水'], ['高速レシピ・井戸水', '井戸水', '井戸水'], ['高速レシピ・清水', '清水', '高速清水'], ['清水', '清水', '清水']]) {
          const n = pyround(g('井:' + key)); if (!n) continue;
          const us = uses(item).map(t => t[0]).filter(c => c !== '売る');
          let to = us.slice(0, 1).map(c => [c !== '食料' ? c : 'パン(食料)', FAC[c] || '']);
          const [dto] = describe(item); if (dto.length && us.length && dto[0][0] === us[0]) to = dto;
          let sub = us.slice(1).map(c => c === 'パン' ? 'パン' : c).join('、'); sub = sub ? 'ほかに' + sub + 'にも使う' : '';
          if (g('売:' + item) > 0.05) sub = (sub ? sub + '。' : '') + '余りはそのまま売る';
          rows.push({ p: rec, n, to, sub });
        }
      }
      if (rows.length) areas.push([title, rows]);
    }
    let fac = [];
    for (const [pk, note] of [['砂城:真珠:暖', 'ヒーター(暖かい)の範囲内に置く'], ['砂城:真珠:猛涼', 'ヒーター(猛暑)とクーラー(涼しい)の範囲が重なる所に置く(暖かいになる)'], ['砂城:真珠:None', 'ヒーターなしでOK(時間は1.25倍)'], ['砂城:真珠:旧', 'ヒーターなしでOK(時間は1.25倍)']]) {
      if (pyround(g(pk))) { const [to, sub] = describe('真珠');
        if (lv >= S.PEARL_FAST_LV && pk === '砂城:真珠:None') { fac.push({ fac: '潮の砂城', p: '高速レシピ・真珠', n: pyround(g(pk)), to, sub }); continue; }
        fac.push({ fac: '潮の砂城', p: '真珠', n: pyround(g(pk)), to, sub: [note, sub].filter(Boolean).join('。') }); } }
    if (pyround(g('砂城:交互'))) fac.push({ fac: '潮の砂城', p: '高速レシピ・海塩と真珠を交互に', n: 1, to: [], sub: '潮の砂城が1つなので、高速レシピ・海塩と真珠を交互に作る(真珠はヒーターなしでOK)' });
    if (pyround(g('砂城'))) { const [to, sub] = describe('海塩'); fac.push({ fac: '潮の砂城', p: lv >= 8 ? '高速レシピ・海塩' : '海塩', n: pyround(g('砂城')), to, sub }); }
    if (pyround(g('砂城:低'))) { const [to, sub] = describe('海塩'); fac.push({ fac: '潮の砂城', p: '海塩', n: pyround(g('砂城:低')), to, sub }); }
    if (pyround(g('ミツドリ'))) { const [to, sub] = describe('香晶'); fac.push({ fac: 'ミツドリハウス', p: lv >= 11 ? '高速レシピ・香晶' : '香晶', n: pyround(g('ミツドリ')), to, sub }); }
    if (pyround(g('ミツドリ:低'))) { const [to, sub] = describe('香晶'); fac.push({ fac: 'ミツドリハウス', p: '香晶', n: pyround(g('ミツドリ:低')), to, sub }); }
    for (const [hk, note] of [['ハンモック:涼', 'クーラー(涼しい)の範囲内に置く'], ['ハンモック:暖凍', 'ヒーター(暖かい)とクーラー(凍結)の範囲が重なる所に置く(涼しいになる)'], ['ハンモック:None', 'クーラーなしでOK(時間は1.25倍)']])
      if (pyround(g(hk))) { const [to, sub] = describe('星'); fac.push({ fac: '星降るハンモック', p: '星', n: pyround(g(hk)), to, sub: [note, sub].filter(Boolean).join('。') }); }
    for (const [hk, note] of [['ハンモック:傘:暖', 'ヒーター(暖かい)の範囲内に置く'], ['ハンモック:傘:猛涼', 'ヒーター(猛暑)とクーラー(涼しい)の範囲が重なる所に置く(暖かいになる)'], ['ハンモック:傘:None', 'ヒーターなしでOK(時間は1.25倍)']])
      if (pyround(g(hk))) { const [to, sub] = describe('金粉の傘'); fac.push({ fac: '星降るハンモック', p: '金粉の傘', n: pyround(g(hk)), to, sub: [note, sub].filter(Boolean).join('。') }); }
    for (const wk of ['風車', '風車:低']) if (pyround(g(wk))) { const [to, sub] = describe('鱗粉'); fac.push({ fac: '花舞風車', p: '鱗粉', n: pyround(g(wk)), to, sub: ['日光ランプの範囲内に置く', sub].filter(Boolean).join('。') }); }
    const nw = pyround(g('わたぐも') + g('わたぐも:高速'));
    if (nw) { const [to, sub] = describe('羊毛'); fac.push({ fac: 'わたぐも草ベッド', p: pyround(g('わたぐも:高速')) ? '高速レシピ・羊毛' : '羊毛', n: nw, to, sub }); }
    if (pyround(g('わたぐも:花びら'))) { const [to, sub] = describe('花びら'); fac.push({ fac: 'わたぐも草ベッド', p: '花びら', n: pyround(g('わたぐも:花びら')), to, sub }); }
    for (const [k, d, md] of [['H暖', 'ヒーター', '暖かい'], ['H猛', 'ヒーター', '猛暑'], ['C涼', 'クーラー', '涼しい'], ['C凍', 'クーラー', '凍結'], ['L', '日光ランプ', '十分な日光']])
      if (pyround(g(k))) fac.push({ fac: d, p: md, n: pyround(g(k)), to: [], sub: '環境設備' });
    let occ = r.occ; const nmine = pyround(g('鉱山') + g('鉱:岩石') + g('鉱:粘土') + g('鉱:銅') + g('鉱:石英') + g('鉱:宝石') + g('鉱:銀'));
    let best = lv >= 21 ? '銀鉱石' : lv >= 18 ? '宝石' : '石英鉱石';
    if (opt.mx) { const ar = areas.find(a => a[0] === '鉱山'); const have = ar ? ar[1].map(r2 => r2.p) : []; const b2 = ['銀鉱石', '宝石', '石英鉱石'].find(p => have.includes(p)); if (b2) best = b2; }   // 11/25 鉱山のLvを下げたとき
    const findArea = t => areas.filter(a => a[0] === t);
    if (lv >= 15) {
      const p4 = pyround(g('電:鉱4')), p5 = pyround(g('電:鉱5'));
      if (opt.mx && !p4) {   // 11/25 鉱山のLvを下げたとき: 電力モードの枠を Lv の高い鉱石から順に
        let left5 = p5; for (const [t, rows] of findArea('鉱山')) for (const p of ['銀鉱石', '宝石', '石英鉱石', '銅鉱石']) for (const rw of rows) if (rw.p === p && left5 > 0) {
          const q = Math.min(left5, rw.n); left5 -= q; rw._pq = q; rw.sub = (rw.n > q ? `うち${q}枠は` : '') + '電力モード(アニモ不要)' + (rw.sub ? '。' + rw.sub : ''); }
      } else for (const [t, rows] of findArea('鉱山')) for (const rw of rows) {
        if (rw.p === best) { const q = Math.min(p5, rw.n); rw._pq = q; rw.sub = (q ? (rw.n > q ? `うち${q}枠は` : '') + '電力モード(アニモ不要)' : '') + (rw.sub ? '。' + rw.sub : ''); }
        if (rw.p === '銅鉱石' && lv >= 15 && !p4) { const nq = rows.filter(r2 => r2.p === best).reduce((a, r2) => a + r2.n, 0); const q = Math.min(p5 - Math.min(p5, nq), rw.n); if (q) rw.sub = (rw.n > q ? `うち${q}枠は` : '') + '電力モード(アニモ不要)' + (rw.sub ? '。' + rw.sub : ''); }
        else if (rw.p === '銅鉱石') rw.sub = (p4 ? 'Lv.4のまま。' + (rw.n > p4 ? `うち${p4}枠は` : '') + '電力モード(アニモ不要)' : '') + (rw.sub ? '。' + rw.sub : '');
      }
      const npole = pyround(g('電:ポール')), pwl = pyround(g('電:井戸')); const lim = npole * (opt.poleW !== undefined ? opt.poleW : S.POLE[lv].w) / 1.2;
      let left = pwl;
      for (const [t, rows] of findArea('井戸')) {
        const pws = xs.some(([k, v]) => k.startsWith('電井:') && v > 0.5);
        for (const rw of stableSort(rows.slice(), (a, b) => (a.p.includes('清水') ? 0 : 1) - (b.p.includes('清水') ? 0 : 1))) {
          const q = pws ? Math.min(left, rw.n, pyround(g('電井:' + (S.RB_WELLKEY[rw.p] || '')))) : Math.min(left, rw.n); left -= q;
          if (q) rw.sub = (rw.n > q ? `うち${q}つは` : '') + '電力モード(アニモ不要)' + (rw.sub ? '。' + rw.sub : '');
        }
      }
      let w = 120 * p4 + FWo('鉱山') * p5 + FWo('井戸') * pwl; const parts = [];
      if (p5) parts.push(`Lv.${FMLo('鉱山')}の鉱山${p5}枠`); if (p4) parts.push(`Lv.4のままの鉱山${p4}枠`); if (pwl) parts.push(`井戸${pwl}つ`);
      let extra = '';
      if (g('作:高麗人参の滋養がゆ') > 0.5 / 60 && w + 60 <= lim) { extra = '、高麗人参の滋養がゆを作るLv.4のままの煮込み鍋1台'; w += 60; }
      else if (g('作:米') > 0.5 / 60 && w + FWo('メリーゴーランド式ミル') <= lim) { extra = '、米を作るメリーゴーランド式ミル1台'; w += FWo('メリーゴーランド式ミル'); }
      const its = parts.concat(extra ? [extra.slice(1)] : []); const body = its.length === 1 ? its[0] : its.slice(0, -1).join('、') + 'と、' + its[its.length - 1];
      const head = npole >= 2 ? `発電ポールを${npole}本置いて1つの電力網につなぐ。` : '雷のホーム能力Lv2以上のアニモを置く。';
      const psub = `${head}${body}を電力モードで動かす(必要電力${w}W・給電率120%)`;
      if (npole) fac.unshift({ fac: 'パチパチ発電ポール', p: '電力', n: npole, to: [], sub: psub });
    } else if (lv >= 12 && nmine >= 4) {
      const npw0 = lv >= 15 ? 4 : ((lv >= 14 && nmine >= 5) ? 5 : 4);
      const nwell = pyround(g('井:高速清水')); const aroma = g('作:上級レモンアロマ') > 1e-4;
      const mix3 = (lv === 12) && nwell >= 1 && aroma;   // WELL3 なし(11/22〜 施設は全部最大Lv)
      const mix14 = false; const mpw = mix3 ? 3 : npw0; const wpw = mix3 ? 1 : 0; const npw = npw0;
      for (const [t, rows] of areas) {
        if (t === '鉱山') for (const rw of rows) if (rw.p === (lv >= 21 ? '銀鉱石' : lv >= 18 ? '宝石' : lv >= 15 ? '石英鉱石' : '銅鉱石')) rw.sub = `うち${mpw}枠は電力モード(アニモ不要)。` + rw.sub;
        if (t === '井戸' && wpw) for (const rw of rows) if (rw.p === '高速レシピ・清水') { const head = rw.n <= wpw ? '電力モード(アニモ不要)' : `うち${wpw}つは電力モード(アニモ不要)`; rw.sub = head + (rw.sub ? '。' + rw.sub : ''); }
      }
      let psub;
      if (lv >= 14) {
        psub = '雷のホーム能力Lv2以上のアニモを置く。鉱山5枠を電力モードで動かす(必要電力600W・給電率120%)';
        if (g('作:高麗人参の滋養がゆ') > 0.5 / 60) psub = '雷のホーム能力Lv2以上のアニモを置く。鉱山5枠と、高麗人参の滋養がゆを作る煮込み鍋1台を電力モードで動かす(必要電力660W・給電率120%)';
        else if (g('作:米') > 0.5 / 60) psub = '雷のホーム能力Lv2以上のアニモを置く。鉱山5枠と、米を作るメリーゴーランド式ミル1台を電力モードで動かす(必要電力660W・給電率120%)';
      } else {
        psub = '雷のホーム能力のアニモを置く。鉱山4枠を電力モードで動かす(必要電力480W・給電率120%)';
        if (mix3) psub = '雷のホーム能力のアニモを置く。鉱山3枠・井戸1つ・蓄音機ふう調香台1台を電力モードで動かす(必要電力495W・給電率120%)。調香台を電力で動かすと、アロマドリを固定編成しなくてよくなる';
      }
      fac.unshift({ fac: 'パチパチ発電ポール', p: '電力', n: 1, to: [], sub: psub });
      occ -= npw - 1;
    }
    for (const [t, rows] of areas) if (t === '鉱山' && rows.length) { const rw = rows[0]; rw.sub = (rw.sub ? rw.sub + '。' : '') + '枠を減らす場合は、下の「鉱山の枠数」を参照'; }
    const pre = [];
    for (const a of areas.slice()) if (a[0] === '鉱山' || a[0] === '井戸') { for (const rw of a[1]) pre.push(Object.assign({ fac: a[0] }, rw)); areas.splice(areas.indexOf(a), 1); }
    fac = pre.concat(fac);
    rbTag(xs, x, fac, lv);
    if (fac.length) areas.push(['アニモを占有する施設', fac]);
    const KEEP = ['交互', '鉱山Lv.5', 'Lv.4のまま', '範囲内', 'なしでOK', '電力', '環境設備', '雷', '鉱山の枠数', 'Lv.3のまま', '重なる'];
    for (const [t, rows] of areas) for (const rw of rows) { rw.to = []; rw.sub = (rw.sub || '').split('。').filter(f => f && KEEP.some(k => f.includes(k))).join('。'); }
    const proc = [];
    for (const [f, rs] of Object.entries(S.FACS)) {
      const lst = [];
      for (const o of rs) { const v = g('作:' + o) * 1440;
        if (v >= 1) { const it = {}; if (g('食:' + o) * 1440 >= 0.5) it.food = 1; if (g('e:' + o) > 0.5) it.e = 1;
          if (xs.some(([k, vv]) => k.startsWith('止:') && k.endsWith(':' + o) && vv > 0.5)) it.lim = 1;
          it.r = o; it.d = ceil(v); it.ins = Object.keys(RECIPE[o][1]).map(k => DISP[k] || k).join('・'); lst.push(it); } }
      if (lst.length) proc.push({ f, items: lst });
    }
    const rawsell = stableSort(xs.slice(), (a, b) => b[1] - a[1]).filter(([k, v]) => k.startsWith('売:') && v * 1440 >= 1 && !(k.slice(2) in RECIPE)).map(([k]) => DISP[k.slice(2)] || k.slice(2));
    const fd = stableSort(xs.filter(([k, v]) => k.startsWith('食:') && v * 1440 >= 0.5).map(([k, v]) => [k.slice(2), v * 1440]), (a, b) => b[1] - a[1]);
    const unit = n => n === 'サトウキビ' ? '本' : '個';
    const food = '食料は' + fd.map(([n, c]) => `${n}1日約${ceil(c)}${unit(n)}`).join('と') + 'を食料箱へ';
    const L = S.LEVEL[lv];
    const feff = k => { const [, t, md] = k.split(':'); const env = S.FOREST[t][5]; if (md === 'None') return effNone(env); return effCov(env, COMBO[md] || md) || 0.0; };
    let wood = 0; for (const [k, v] of xs) if (k.startsWith('森:')) { const t = k.split(':')[1]; wood += v * S.FOREST[t][2] / S.FOREST[t][3] * feff(k); }
    const ore = pyround(g('鉱:銀')) * 165 / 25 + pyround(g('鉱:宝石')) * 122 / 25 + pyround(g('鉱:石英')) * S.MINE_QUARTZ[1] + pyround(g('鉱:銅')) * S.MINE_COPPER[1] + pyround(g('鉱山')) * S.MINE_SHELL[1] + pyround(g('鉱:岩石')) * 3 / 6.25 + pyround(g('鉱:粘土')) * 16 / 17.857 + rbOre(g);
    let pts = 0; for (const [k, v] of xs) if (k.startsWith('畑:') && (k.split(':')[1] === '大根' || k.split(':')[1] === '椒')) { const c = S.FARM[k.split(':')[1]]; pts += v * (c[0] + 2) / c[1]; }
    for (const [o, pt] of Object.entries(PTSET)) pts += g('作:' + o) * pt;
    const R_ = k => pyround(g(k));
    const facs = { mine: nmine, well: pyround(['井:井戸水', '井:清水', '井:高速清水', '井:深層湧水', '井:高速深層湧水', '井:天然鉱泉', '井:高速天然鉱泉', '井:雪解けの冷泉'].reduce((a, k) => a + g(k), 0)), windmill: R_('風車') + R_('風車:低'),
      hammock: pyround(['ハンモック:None', 'ハンモック:涼', 'ハンモック:暖凍', 'ハンモック:傘:None', 'ハンモック:傘:暖', 'ハンモック:傘:猛涼'].reduce((a, k) => a + g(k), 0)),
      salt: pyround(['砂城', '砂城:真珠:None', '砂城:真珠:暖', '砂城:真珠:猛涼', '砂城:交互', '砂城:低', '砂城:真珠:旧'].reduce((a, k) => a + g(k), 0)), mitsu: R_('ミツドリ') + R_('ミツドリ:低'), wata: pyround(g('わたぐも') + g('わたぐも:高速') + g('わたぐも:花びら')),
      heat: pyround(g('H暖') + g('H猛')), cool: pyround(g('C涼') + g('C凍')), lamp: R_('L') };
    if (lv >= 15) { facs.pole = R_('電:ポール'); facs.mine_animo = pyround(g('鉱:銀') + g('鉱:宝石') + g('鉱:銅') + g('鉱:石英') + g('鉱山') + g('鉱:岩石') + g('鉱:粘土') - g('電:鉱4') - g('電:鉱5')); }
    return { coin: r.coin, pts, occ, areas, food, proc, rawsell, wood, ore, woodT: L.wood_req ? L.wood_req / wood / 60 : 0, oreT: L.ore_req ? L.ore_req / ore / 60 : 0, facs, removed: null };
  }
  function rbTag(xs, x, fac, lv) {
    if (!xs.some(([k, v]) => k.startsWith('虹:') && v > 0.5)) return;
    const rbUsed = {};
    for (const r of fac) { const f = r.fac; let k = 0;
      if (f === '鉱山' && r.p in S.RB_MINEKEY) k = pyround(x.get('虹:' + S.RB_MINEKEY[r.p]) || 0);
      else if (f === '井戸' && r.p in S.RB_WELLKEY) k = pyround(x.get('虹:' + S.RB_WELLKEY[r.p]) || 0);
      else if (f in S.RB_FULL) {   // 11/27 持っている数で一部だけ虹色のこともある → レシピごとの虹の台数(同じレシピの行が続くときは前から)
        const p = r.p || '', sel = f === '潮の砂城' ? (kk => p.includes('真珠') === kk.includes('真珠')) : f === '星降るハンモック' ? (kk => p.includes('傘') === kk.includes('傘'))
          : f === 'わたぐも草ベッド' ? (kk => p.includes('花びら') ? kk.includes('花びら') : p.includes('高速') ? kk.includes(':高速') : kk === '虹:わたぐも') : (() => true);
        let tot = 0; for (const [kk, v] of xs) if (kk.startsWith(S.RB_FULL[f]) && sel(kk)) tot += v;
        const key = f + '|' + p, used = rbUsed[key] || 0; k = Math.max(0, Math.min(r.n, pyround(tot) - used)); rbUsed[key] = used + k; }
      else if (f === 'パチパチ発電ポール' && lv >= 20) k = r.n;
      if (k) r.rb = k; }
  }
  function rbOre(g) { return (pyround(g('虹:鉱:銀')) * 165 / 25 + pyround(g('虹:鉱:宝石')) * 122 / 25 + pyround(g('虹:鉱:石英')) * S.MINE_QUARTZ[1] + pyround(g('虹:鉱:銅')) * S.MINE_COPPER[1]) / 3 + pyround(g('虹:鉱山')) * S.MINE_SHELL[1] * 2 / 7 + pyround(g('虹:鉱:岩石')) * 3 / 6.25 / 4 + pyround(g('虹:鉱:粘土')) * 16 / 17.857 * 2 / 7; }
  return { config };
}
function stableSort(a, cmp) { return a.map((v, i) => [v, i]).sort((p, q) => cmp(p[0], q[0]) || p[1] - q[1]).map(p => p[0]); }
const API = { make, pyround };
if (typeof module !== 'undefined') module.exports = API; else G.AniimoGen = API;
})(typeof self !== 'undefined' ? self : this);
