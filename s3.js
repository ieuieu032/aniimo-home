
document.addEventListener("click",e=>{ const b=e.target.closest&&e.target.closest("[data-goto]"); if(!b) return; const t=document.getElementById(b.dataset.goto); if(!t) return;
  if(t.tagName==="DETAILS") t.open=true; t.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"}); });
