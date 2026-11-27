
(function(){ try{
  // 8 更新履歴(左の列)は新しい5件
  const hl=document.getElementById("side-history"), hb=document.querySelector(".side.left .histmore");
  const histSet=open=>{ [...hl.children].forEach((li,i)=>{ li.hidden=!open&&i>=5; }); hb.textContent=open?"閉じる":"もっと見る"; hb.setAttribute("aria-expanded",open); };
  if(hl.children.length>5){ hb.hidden=false; histSet(false); hb.addEventListener("click",()=>histSet(hb.getAttribute("aria-expanded")!=="true")); }
  // 2 目次ボタン(幅1360px未満)
  const nav=document.getElementById("side-nav"), fab=document.getElementById("tocfab"), toc=document.getElementById("side-toc");
  const narrow=matchMedia("(max-width:1359px)");
  let bg=null;
  const tocSet=open=>{ nav.classList.toggle("sheet",open); fab.setAttribute("aria-expanded",open);
    if(open){ bg=document.createElement("div"); bg.id="tocbg"; bg.addEventListener("click",()=>tocSet(false)); document.body.appendChild(bg); const a=toc.querySelector("a.on"); if(a) a.scrollIntoView({block:"center"}); nav.querySelector(".tocx").focus(); }
    else { if(bg){ bg.remove(); bg=null; } } };
  fab.addEventListener("click",()=>tocSet(!nav.classList.contains("sheet")));
  nav.querySelector(".tocx").addEventListener("click",()=>{ tocSet(false); fab.focus(); });
  nav.querySelector(".toctop").addEventListener("click",()=>{ tocSet(false); scrollTo({top:0,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"}); });
  toc.addEventListener("click",e=>{ if(e.target.closest("a")&&nav.classList.contains("sheet")) tocSet(false); });
  document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&nav.classList.contains("sheet")){ tocSet(false); fab.focus(); } });
  narrow.addEventListener("change",()=>{ if(!narrow.matches) tocSet(false); });
  // 4 今読んでいる見出し
  let raf=0; const spy=()=>{ raf=0; let cur=null; const as=[...toc.querySelectorAll("a")];
    for(const a of as){ const t=document.getElementById(a.getAttribute("href").slice(1)); if(!t) continue; const r=t.getBoundingClientRect(); if(!r.height) continue; if(r.top<=140) cur=a; }
    as.forEach(a=>a.classList.toggle("on",a===cur)); };
  addEventListener("scroll",()=>{ if(!raf) raf=requestAnimationFrame(spy); },{passive:true});
  new MutationObserver(()=>{ if(!raf) raf=requestAnimationFrame(spy); }).observe(toc,{childList:true});
  spy();
  // 1 スマホ: キャンパーLvの細い帯
  const mini=document.getElementById("lvmini"), mb=mini.querySelector(".lvmbtn"), ms=mini.querySelector(".seg"), cur=mini.querySelector(".lvmcur"), ctl=document.querySelector(".controls"), segL=document.getElementById("seg-level");
  const sync=()=>{ const on=segL.querySelector('button[aria-pressed="true"]'); cur.textContent=on?on.textContent:"";
    ms.innerHTML=[...segL.querySelectorAll("button")].map(b=>`<button type="button" data-mlv="${b.dataset.lv}" aria-pressed="${b.getAttribute("aria-pressed")}">${b.textContent}</button>`).join(""); };
  const miniOpen=o=>{ mini.classList.toggle("open",o); mb.setAttribute("aria-expanded",o); };
  sync(); new MutationObserver(sync).observe(segL,{attributes:true,subtree:true,attributeFilter:["aria-pressed"]});
  mb.addEventListener("click",()=>miniOpen(!mini.classList.contains("open")));
  ms.addEventListener("click",e=>{ const b=e.target.closest("button[data-mlv]"); if(!b) return; const t=document.getElementById("lv"+b.dataset.mlv); if(t) t.click(); miniOpen(false); });
  new IntersectionObserver(es=>{ const out=!es[0].isIntersecting&&es[0].boundingClientRect.top<0; mini.classList.toggle("show",out); mini.setAttribute("aria-hidden",!out); if(!out) miniOpen(false); }).observe(ctl);
}catch(e){} })();
