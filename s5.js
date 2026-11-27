
document.addEventListener("click",e=>{ const a=e.target.closest&&e.target.closest("a.wk"); if(!a) return;
  const L=(document.documentElement.lang||"ja").toLowerCase(), P={ja:"ja/",en:"",es:"es/",ko:"ko/","zh-cn":"zh-cn/","zh-tw":"zh-tw/"};
  const p=P[L]!==undefined?P[L]:(P[L.split("-")[0]]!==undefined?P[L.split("-")[0]]:"");
  a.href="https://wikily.gg/"+p+(a.dataset.wi?"aniimo/"+a.dataset.wi:"aniimo/aniilog/"+a.dataset.wk+"/location"); },true);
