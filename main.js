/* ============================================================
   VELVET ARCHIVE — 사이트 동작
   내용은 content 폴더의 JSON 파일에서 불러와요 (관리 화면이 고치는 파일).
   평소에는 이 파일을 고칠 필요가 없어요.
   ============================================================ */
(async function () {
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const url = (p) => (p ? encodeURI(String(p).replace(/^\//, "")) : "");
  const won = (n) => Number(n || 0).toLocaleString("ko-KR");
  const stars = (n) => "★".repeat(Math.max(1, Math.min(5, Number(n) || 3)));
  const pad = (n, l = 2) => String(n).padStart(l, "0");
  const strip = (html) => String(html || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(pointer: fine)").matches;
  const G = window.gsap && window.ScrollTrigger && !reduce ? window.gsap : null;
  if (G) gsap.registerPlugin(ScrollTrigger);
  const boot = $("boot");
  const endBoot = () => boot.classList.add("done");

  /* ---------- 0. 내용 불러오기 ---------- */
  const load = async (p) => { const r = await fetch(p, { cache: "no-cache" }); if (!r.ok) throw new Error(p); return r.json(); };
  let S, P, F, J;
  try {
    [S, P, F, J] = await Promise.all(["content/site.json", "content/prices.json", "content/folders.json", "content/journal.json"].map(load));
  } catch (e) {
    endBoot();
    document.querySelector("main").insertAdjacentHTML("afterbegin",
      `<p class="wrap" style="padding-top:120px;color:var(--red)">내용 파일을 불러오지 못했어요. 컴퓨터에서 index.html을 바로 열었다면, VS Code의 Live Server로 열어 주세요. (사용법.md 참고)</p>`);
    return;
  }
  F = (F || []).filter((f) => f && f.works && f.works.length);
  J = (J || []).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const now = new Date();
  const ymd = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}`;
  const c = S.commission || {};
  const MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

  /* ---------- 1. 표지 ---------- */
  document.title = S.siteName || document.title;
  ["siteName", "footName"].forEach((id) => { $(id).textContent = S.siteName || ""; });
  $("issueLine").textContent = S.issue || "";
  $("recLine").textContent = `REC ● ${ymd}`;
  $("badgeNo").textContent = String(S.issue || "01").replace(/\D/g, "").slice(-2) || "01";
  $("sideDate").textContent = `${S.role || ""} / ${now.getFullYear()}`;
  $("barcodeNo").textContent = `${pad(now.getMonth() + 1)}${pad(now.getDate())} ∞ ${pad(F.length)}${pad(F.reduce((n, f) => n + f.works.length, 0), 3)}`;
  const words = String(S.nameEn || "").trim().split(/\s+/).filter(Boolean);
  $("coverName").innerHTML = words.map((w, i) => `<span class="w ${i % 2 ? "w-b" : "w-a"}"><span>${esc(w)}</span></span>`).join("");
  $("coverName").setAttribute("aria-label", `${S.nameEn || ""} ${S.nameKr || ""}`);
  $("tabL").textContent = S.nameKr || words[0] || "";
  $("tabR").textContent = S.role || "";
  $("heroImg").src = $("heroMono").src = $("heroDuo").src = url(S.heroImage);
  $("tagline").textContent = S.tagline || "";
  $("intro").textContent = S.intro || "";
  const slotTxt = c.open ? `OPEN ${Number(c.slotsLeft)}/${Number(c.slotsTotal)}` : "CLOSED";
  $("slotLine").innerHTML = `<i></i>COMMISSION ${slotTxt}`;
  $("mhStatus").innerHTML = `<i></i>${slotTxt}`;
  $("mhStatus").classList.toggle("closed", !c.open);

  /* ---------- 2. 프로필 ---------- */
  const pr = S.profile || {};
  $("pAbout").textContent = pr.about || "";
  $("pName").textContent = S.nameKr || "";
  $("pClass").textContent = pr.class || "";
  $("pElement").textContent = pr.element || "";
  $("pTools").textContent = (pr.tools || []).join(", ");
  $("pStats").innerHTML = (pr.stats || []).map((s) => {
    const v = Math.max(0, Math.min(100, Number(s.value) || 0));
    const on = Math.round(v / 5);
    return `<div class="stat"><span class="stat-label">${esc(s.label)}</span>
      <span class="stat-seg">${Array.from({ length: 20 }, (_, k) => `<i${k < on ? ' class="on"' : ""}></i>`).join("")}</span>
      <span class="stat-num">${pad(v, 3)}</span></div>`;
  }).join("");
  const pfWork = (F[0] && (F[0].works[1] || F[0].works[0])) || null;
  $("pfImg").src = url(pfWork ? pfWork.image : S.heroImage);
  $("pfCap").textContent = pfWork ? pfWork.title : "Cover Art";

  /* ---------- 3. 아카이브: 다이얼 + 파일 탭 ---------- */
  const N = F.length;
  const total = F.reduce((n, f) => n + f.works.length, 0);
  $("archiveCount").textContent = `${N}개 폴더 · ${total}점`;
  $("discText").textContent = `VELVET ARCHIVE ✦ SIDE A ✦ ${F.map((f) => (f.en || f.name).toUpperCase()).join(" ✦ ")} ✦ 33⅓ RPM ✦ `;
  const coverOf = (f) => f.cover || f.works[0].image;

  // 눈금 링
  (function ticks() {
    let h = `<circle r="112"/><circle r="104"/>`;
    for (let k = 0; k < 72; k++) {
      const a = (k * 5 - 90) * Math.PI / 180, major = k % 6 === 0;
      const r1 = major ? 104 : 107, r2 = 112;
      h += `<line class="${major ? "major" : ""}" x1="${(Math.cos(a) * r1).toFixed(2)}" y1="${(Math.sin(a) * r1).toFixed(2)}" x2="${(Math.cos(a) * r2).toFixed(2)}" y2="${(Math.sin(a) * r2).toFixed(2)}"/>`;
      if (major) h += `<text x="${(Math.cos(a) * 118).toFixed(2)}" y="${(Math.sin(a) * 118 + 1.6).toFixed(2)}" text-anchor="middle">${pad(k * 5, 3)}</text>`;
    }
    $("ticks").innerHTML = h;
  })();

  const dial = $("dial"), disc = $("disc"), holesBox = $("holes"), strips = $("strips");
  const step = N ? 360 / N : 360;
  const state = { r: 0 };
  let sel = 0;

  if (!N) {
    strips.innerHTML = `<p class="empty">관리 화면의 "작품 폴더"에서 첫 폴더를 만들어 주세요.</p>`;
  } else {
    const hk = Math.min(0.19, ((2 * Math.PI * 0.355) / N) * 0.62);
    dial.style.setProperty("--hk", hk.toFixed(3));
    holesBox.innerHTML = F.map((f, i) => `
      <button class="hole" type="button" tabindex="-1" role="option" id="hole-${i}" data-i="${i}" style="--a:${(i * step).toFixed(3)}deg" aria-label="${esc(f.name)}">
        <span class="hole-in"><img src="${esc(url(coverOf(f)))}" alt="" draggable="false"><span class="hole-no">${pad(i + 1)}</span></span>
      </button>`).join("");
    strips.innerHTML = F.map((f, i) => `
      <button class="strip${i % 3 === 1 ? " duo" : ""}" type="button" role="tab" data-i="${i}" style="--i:${i % 8}" aria-label="${esc(f.name)} 폴더">
        <span class="strip-tab" aria-hidden="true"><span>${pad(i + 1)}</span></span>
        <span class="strip-img"><img src="${esc(url(coverOf(f)))}" alt="" loading="lazy" draggable="false"></span>
        <span class="strip-vert" data-no="${pad(i + 1)}">${esc(f.en || f.name)}</span>
        <span class="strip-info">
          <span class="si-no">TRACK ${pad(i + 1)} / ${pad(N)} — SIDE A</span>
          <span class="si-en">${esc(f.en || f.name)}</span>
          <span class="si-kr">${esc(f.name)} · ${f.works.length} WORKS</span>
          ${f.desc ? `<span class="si-desc">${esc(f.desc)}</span>` : ""}
          <span class="si-open">폴더 열기 ↗</span>
        </span>
      </button>`).join("");
  }

  const idxOf = (k) => ((k % N) + N) % N;
  const nearest = (r) => Math.round(-r / step);
  function apply(r) {
    disc.style.transform = `rotate(${r}deg)`;
    disc.style.setProperty("--R", `${r}deg`);
    const deg = Math.round(((-r % 360) + 360) % 360);
    $("dialRead").textContent = `TRACK ${pad(sel + 1)} / ${pad(N)} · ${pad(deg, 3)}°`;
  }
  function setSel(i, animate) {
    if (!N) return;
    const changed = i !== sel;
    sel = i;
    $("labelImg").src = url(coverOf(F[i]));
    holesBox.querySelectorAll(".hole").forEach((h, k) => { h.classList.toggle("is-on", k === i); h.setAttribute("aria-selected", k === i); });
    strips.querySelectorAll(".strip").forEach((s, k) => { s.classList.toggle("is-on", k === i); s.setAttribute("aria-selected", k === i); });
    dial.setAttribute("aria-activedescendant", `hole-${i}`);
    apply(state.r);
    if (G && animate && changed) gsap.fromTo("#labelImg", { rotate: -30, scale: .88 }, { rotate: 0, scale: 1, duration: .6, ease: "back.out(2)", overwrite: true });
  }
  function snapTo(k) {
    const target = -k * step;
    sel = idxOf(k);
    if (G) gsap.to(state, { r: target, duration: .8, ease: "back.out(1.25)", overwrite: true, onUpdate: () => apply(state.r) });
    else { state.r = target; apply(target); }
    setSel(idxOf(k), true);
  }
  const go = (d) => { if (N) snapTo(nearest(state.r) + d); };
  function goTo(i) {
    const base = nearest(state.r);
    let diff = idxOf(i - idxOf(base));
    if (diff > N / 2) diff -= N;
    snapTo(base + diff);
  }

  let dragging = false, last = 0, moved = 0;
  const angle = (e) => {
    const r = dial.getBoundingClientRect();
    return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI;
  };
  dial.addEventListener("pointerdown", (e) => {
    if (!N || e.button !== 0) return;
    dragging = true; moved = 0; last = angle(e);
    if (G) gsap.killTweensOf(state);
    dial.setPointerCapture(e.pointerId);
    dial.classList.add("is-drag");
  });
  dial.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const a = angle(e);
    let d = a - last; if (d > 180) d -= 360; if (d < -180) d += 360;
    last = a; state.r += d; moved += Math.abs(d);
    const live = idxOf(nearest(state.r));
    if (live !== sel) setSel(live, true); else apply(state.r);
  });
  const release = (e) => {
    if (!dragging) return;
    dragging = false; dial.classList.remove("is-drag");
    if (moved < 3) {
      const t = document.elementFromPoint(e.clientX, e.clientY);
      const hole = t && t.closest(".hole");
      if (hole) { const i = +hole.dataset.i; if (i === sel) openFolder(i); else goTo(i); return; }
      if (t && t.closest(".label")) { snapTo(nearest(state.r)); openFolder(sel); return; }
    }
    snapTo(nearest(state.r));
  };
  dial.addEventListener("pointerup", release);
  dial.addEventListener("pointercancel", release);
  let lastWheel = 0;
  dial.addEventListener("wheel", (e) => {
    if (!N) return;
    e.preventDefault();
    const t = performance.now();
    if (t - lastWheel < 260) return;
    lastWheel = t; go((e.deltaY || e.deltaX) > 0 ? 1 : -1);
  }, { passive: false });
  dial.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); go(1); }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); go(-1); }
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openFolder(sel); }
  });
  $("dialPrev").addEventListener("click", () => go(-1));
  $("dialNext").addEventListener("click", () => go(1));
  strips.addEventListener("click", (e) => {
    const s = e.target.closest(".strip"); if (!s) return;
    const i = +s.dataset.i;
    if (i === sel) openFolder(i); else goTo(i);
  });
  if (N) { apply(0); setSel(0, false); }

  /* ---------- 폴더 안 / 글 화면 ---------- */
  const fv = $("folderView"), masonry = $("masonry");
  let current = null;
  function openSheet(dlg, titleSel) {
    dlg.showModal(); dlg.scrollTop = 0;
    document.documentElement.style.overflow = "hidden";
    if (G) {
      gsap.fromTo(dlg, { clipPath: "inset(0 0 0 100%)" }, { clipPath: "inset(0 0 0 0%)", duration: .85, ease: "expo.inOut" });
      if (titleSel) gsap.from(titleSel, { yPercent: 110, duration: 1, delay: .4, ease: "expo.out" });
    }
  }
  function closeSheet(dlg) {
    const done = () => { dlg.close(); document.documentElement.style.overflow = ""; };
    if (G) gsap.to(dlg, { clipPath: "inset(0 100% 0 0)", duration: .6, ease: "expo.inOut", onComplete: () => { done(); gsap.set(dlg, { clearProps: "clipPath" }); } });
    else done();
  }
  function openFolder(i) {
    current = F[i]; if (!current) return;
    $("fvNo").textContent = `{TRACK.${pad(i + 1)}} — SIDE A / ${pad(N)}`;
    $("fvEn").textContent = current.en || current.name;
    $("fvKr").textContent = current.name;
    $("fvDesc").textContent = current.desc || "";
    $("fvCount").textContent = `${current.works.length} WORKS`;
    masonry.innerHTML = current.works.map((w, j) => `
      <button class="piece" type="button" data-j="${j}">
        <span class="piece-img"><img src="${esc(url(w.image))}" alt="${esc(w.title)}" loading="lazy"></span>
        <span class="piece-cap"><span>${esc(w.title)}</span><span>FIG.${pad(j + 1)}${w.date ? " · " + esc(w.date) : ""}</span></span>
      </button>`).join("");
    openSheet(fv, "#fvEn");
    if (G) gsap.from("#masonry .piece", { y: 70, opacity: 0, duration: .9, delay: .45, stagger: .06, ease: "power3.out" });
  }
  $("fvBack").addEventListener("click", () => closeSheet(fv));
  fv.addEventListener("cancel", (e) => { e.preventDefault(); closeSheet(fv); });

  const lb = $("lightbox");
  let idx = 0;
  function show(j) {
    const list = current.works;
    idx = (j + list.length) % list.length;
    const w = list[idx];
    $("lbImg").src = url(w.image); $("lbImg").alt = w.title || "";
    $("lbFolder").textContent = `{${(current.en || current.name).toUpperCase()}}`;
    $("lbTitle").textContent = w.title || "";
    $("lbMeta").textContent = `FIG.${pad(idx + 1)} / ${pad(list.length)}${w.date ? " · " + w.date : ""}`;
    $("lbNote").textContent = w.note || "";
    if (G) gsap.fromTo("#lbImg", { opacity: 0, x: 24 }, { opacity: 1, x: 0, duration: .5, ease: "power2.out" });
  }
  masonry.addEventListener("click", (e) => { const p = e.target.closest(".piece"); if (p) { show(+p.dataset.j); lb.showModal(); } });
  $("lbPrev").addEventListener("click", () => show(idx - 1));
  $("lbNext").addEventListener("click", () => show(idx + 1));
  $("lbClose").addEventListener("click", () => lb.close());
  lb.addEventListener("click", (e) => { if (e.target === lb) lb.close(); });
  lb.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") show(idx - 1); if (e.key === "ArrowRight") show(idx + 1); });

  /* ---------- 4. 작업일지 ---------- */
  $("posts").innerHTML = J.map((p, i) => {
    const d = new Date(p.date);
    const ok = !isNaN(d);
    return `
    <button class="post${i === 0 ? " featured" : ""}" type="button" data-p="${i}">
      <span class="post-date"><b>${ok ? pad(d.getDate()) : "--"}</b><span>${ok ? MON[d.getMonth()] : ""}<br>${ok ? d.getFullYear() : ""}</span></span>
      <span class="post-img">${p.cover ? `<img src="${esc(url(p.cover))}" alt="" loading="lazy">` : ""}</span>
      <span class="post-body">
        <span class="post-tag">// ${esc(p.tag || "작업일지")}</span>
        <span class="post-title">${esc(p.title)}</span>
        <span class="post-excerpt">${esc(strip(p.body).slice(0, 140))}</span>
      </span>
      <span class="post-arrow" aria-hidden="true">↗</span>
    </button>`;
  }).join("") || `<p class="empty">아직 글이 없어요.</p>`;
  const pv = $("postView");
  $("posts").addEventListener("click", (e) => {
    const b = e.target.closest(".post"); if (!b) return;
    const p = J[+b.dataset.p];
    $("pvTitle").textContent = p.title;
    $("pvMeta").textContent = `// ${p.tag || "작업일지"} · ${p.date || ""}`;
    $("pvCover").src = p.cover ? url(p.cover) : "";
    $("pvBody").innerHTML = p.body || "";   // 관리 화면에서 작가 본인이 쓴 글
    openSheet(pv, null);
  });
  $("pvBack").addEventListener("click", () => closeSheet(pv));
  pv.addEventListener("cancel", (e) => { e.preventDefault(); closeSheet(pv); });

  /* ---------- 5. 커미션 ---------- */
  const tiers = P.tiers || [];
  $("statusLine").innerHTML = c.open ? `SLOTS LEFT <b>${pad(Number(c.slotsLeft))}</b> / ${pad(Number(c.slotsTotal))}` : `지금은 신청을 받지 않아요`;
  $("tiers").innerHTML = tiers.map((t) => `
    <article class="tp ${Number(t.rarity) >= 5 ? "tp-ink" : "tp-paper"} tier">
      <span class="tp-tab tp-l">${esc(t.en)}</span>
      <span class="tp-tab tp-r">${stars(t.rarity)}</span>
      <h3 class="tier-name">${esc(t.name)}</h3>
      <div class="tier-price">${won(t.price)}<small>원</small></div>
      <span class="tier-days">LEAD TIME — ${esc(t.days)}</span>
      <ul>${(t.includes || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
      <a class="tier-btn" href="#contact" data-tier="${esc(t.name)}">이 등급으로 신청</a>
    </article>`).join("");
  $("options").innerHTML = (P.options || []).map((o) => `<tr><td>${esc(o.name)}</td><td>${esc(o.price)}</td></tr>`).join("");
  $("rules").innerHTML = (P.rules || []).map((r) => `<li>${esc(r)}</li>`).join("");
  $("notAccepted").textContent = (P.notAccepted || []).join(" · ");

  /* ---------- 6. 신청서 ---------- */
  $("email").textContent = S.email || "";
  $("sns").innerHTML = (S.sns || []).map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)} ↗</a></li>`).join("");
  $("year").textContent = now.getFullYear();
  $("reqNo").textContent = `No. ${ymd.replace(/\./g, "")}`;
  const tierSel = $("f-tier");
  tierSel.innerHTML = tiers.map((t) => `<option value="${esc(t.name)}">${esc(t.name)} · ${won(t.price)}원</option>`).join("")
    + `<option value="상담 후 결정">잘 모르겠어요 (상담)</option>`;
  $("tiers").addEventListener("click", (e) => { const a = e.target.closest("[data-tier]"); if (a) tierSel.value = a.dataset.tier; });

  const form = $("applyForm"), msg = $("formMsg"), btn = $("submitBtn");
  if (!c.open) { btn.disabled = true; btn.textContent = "지금은 신청을 받지 않아요"; }
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.className = "form-msg wide";
    let bad = null;
    form.querySelectorAll("[required]").forEach((el) => {
      const ok = el.type === "checkbox" ? el.checked : el.checkValidity() && el.value.trim() !== "";
      el.classList.toggle("invalid", !ok);
      if (!ok && !bad) bad = el;
    });
    if (bad) { msg.textContent = "빈칸이나 이메일 형식을 확인해 주세요."; bad.focus(); return; }
    if (!S.formEndpoint) { msg.textContent = "연습 모드예요. 관리 화면의 사이트 기본 정보에 Formspree 주소를 넣으면 진짜로 이메일이 와요."; return; }
    btn.disabled = true; btn.textContent = "보내는 중…";
    try {
      const res = await fetch(S.formEndpoint, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(res.status);
      form.reset();
      msg.textContent = "신청서가 전송됐어요! 확인 후 이메일로 답장드릴게요.";
      msg.classList.add("ok");
    } catch (err) {
      msg.textContent = "전송하지 못했어요. 잠시 후 다시 시도하거나 위 이메일로 직접 연락해 주세요.";
    } finally { btn.disabled = false; btn.textContent = "신청서 보내기 ↗"; }
  });

  /* ---------- 7. 커서 · HUD ---------- */
  const hx = $("hudX"), hy = $("hudY"), hs = $("hudS");
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    hs.textContent = pad(Math.round((scrollY / Math.max(1, max)) * 100), 3);
  };
  addEventListener("scroll", onScroll, { passive: true }); onScroll();
  if (fine) {
    const cur = $("cursor");
    const mx = G ? gsap.quickTo(cur, "x", { duration: .35, ease: "power3" }) : (v) => { cur.style.left = v + "px"; };
    const my = G ? gsap.quickTo(cur, "y", { duration: .35, ease: "power3" }) : (v) => { cur.style.top = v + "px"; };
    addEventListener("pointermove", (e) => {
      cur.classList.add("on"); mx(e.clientX); my(e.clientY);
      hx.textContent = pad(Math.round(e.clientX), 4); hy.textContent = pad(Math.round(e.clientY), 4);
      cur.classList.toggle("hot", !!e.target.closest("a, button, .dial, input, select, textarea"));
    });
    document.addEventListener("pointerleave", () => cur.classList.remove("on"));
  }

  /* ---------- 8. 움직임 ---------- */
  setTimeout(endBoot, reduce ? 0 : 1500);
  if (!G) return;

  // 글자 해독 효과 (영문 표기)
  const CH = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#*+/<>";
  function scramble(el) {
    const final = el.dataset.final || (el.dataset.final = el.textContent);
    let f = 0; const total = 18;
    const tick = () => {
      f++;
      el.textContent = final.split("").map((ch, k) => (ch === " " || k < (f / total) * final.length) ? ch : CH[(Math.random() * CH.length) | 0]).join("");
      if (f < total) requestAnimationFrame(tick); else el.textContent = final;
    };
    tick();
  }
  document.querySelectorAll("[data-scramble]").forEach((el) => {
    ScrollTrigger.create({ trigger: el, start: "top 92%", once: true, onEnter: () => scramble(el) });
  });

  // 제목 줄 단위로 감싸기
  document.querySelectorAll(".headline > .h-sans, .headline > .h-serif").forEach((s) => {
    const inner = document.createElement("span"); inner.textContent = s.textContent;
    s.textContent = ""; s.classList.add("line"); s.appendChild(inner);
  });

  // 표지 등장 (부팅 화면이 걷힌 뒤)
  const lineLen = (el) => { try { return el.getTotalLength(); } catch (e) { return 600; } };
  document.querySelectorAll(".cst-ring, .cst-lines line").forEach((el) => {
    const L = lineLen(el); el.style.strokeDasharray = L; el.style.strokeDashoffset = L;
  });
  gsap.timeline({ delay: reduce ? 0 : 1.6, defaults: { ease: "expo.out" } })
    .from(".hero-meta span", { y: 10, opacity: 0, duration: .6, stagger: .06 })
    .from(".hero-name .w > span", { yPercent: 110, duration: 1.2, stagger: .1 }, 0.05)
    .from(".hero-img", { clipPath: "inset(0 0 100% 0 round 14px)", duration: 1.2, ease: "expo.inOut" }, 0.1)
    .from(".img-color", { clipPath: "inset(0 100% 0 0)", duration: 1.4, ease: "expo.inOut" }, 1.0)
    .to(".cst-ring", { strokeDashoffset: 0, duration: 1.4, stagger: .15, ease: "power2.inOut" }, 0.4)
    .to(".cst-lines line", { strokeDashoffset: 0, duration: 1.2, stagger: .1, ease: "power2.inOut" }, 0.9)
    .from(".cst-star", { scale: 0, duration: .8, stagger: .1, ease: "back.out(3)" }, 1.2)
    .from(".hero-panel", { y: 60, opacity: 0, duration: 1 }, 0.7)
    .from(".duo-band", { clipPath: "inset(0 100% 0 0 round 14px)", duration: 1.2, ease: "expo.inOut" }, 0.9)
    .from(".hero-index li", { x: -20, opacity: 0, duration: .6, stagger: .06 }, 1.0)
    .from(".hero-side > *", { opacity: 0, duration: .6, stagger: .06 }, 0.3);

  // 표지 스크롤
  const coverST = { trigger: "#cover", start: "top top", end: "bottom top", scrub: true };
  gsap.to(".img-color, .img-mono", { yPercent: 6, scale: 1.06, ease: "none", scrollTrigger: coverST });
  gsap.to(".constellation", { yPercent: -12, ease: "none", scrollTrigger: coverST });
  gsap.to(".duo-band img", { objectPosition: "50% 70%", ease: "none", scrollTrigger: coverST });

  // 각 쪽 제목
  gsap.utils.toArray(".headline").forEach((h) => {
    gsap.from(h.querySelectorAll(".line > span"), { yPercent: 110, duration: 1.1, stagger: .1, ease: "expo.out", scrollTrigger: { trigger: h, start: "top 92%", once: true } });
  });
  gsap.utils.toArray(".folio i").forEach((i) => {
    gsap.from(i, { scaleX: 0, transformOrigin: "left", duration: 1.2, ease: "expo.inOut", scrollTrigger: { trigger: i, start: "top 95%", once: true } });
  });
  gsap.from(".stat-seg i.on", { opacity: 0, duration: .05, stagger: .012, scrollTrigger: { trigger: ".stats", start: "top 85%", once: true } });
  gsap.from(".pf-img", { clipPath: "inset(100% 0 0 0)", duration: 1.2, ease: "expo.inOut", scrollTrigger: { trigger: ".pf-visual", start: "top 80%", once: true } });

  // 아카이브: 레코드가 돌며 들어오고, 파일 탭이 하나씩 꽂혀요
  if (N) {
    ScrollTrigger.create({
      trigger: "#archive", start: "top 65%", once: true,
      onEnter: () => {
        const target = state.r;
        gsap.fromTo(state, { r: target - 360 }, { r: target, duration: 2.2, ease: "expo.out", onUpdate: () => apply(state.r) });
        gsap.from(".dial-wrap", { scale: .85, opacity: 0, duration: 1.4, ease: "expo.out" });
        gsap.from(".ticks", { rotate: 60, opacity: 0, duration: 1.6, ease: "expo.out" });
        gsap.from(".strip", { yPercent: 30, opacity: 0, duration: 1, stagger: .08, delay: .2, ease: "expo.out" });
      }
    });
  }

  ScrollTrigger.batch(".post", { start: "top 90%", once: true, onEnter: (els) => gsap.from(els, { y: 40, opacity: 0, duration: .9, stagger: .1, ease: "power3.out" }) });
  ScrollTrigger.batch(".tier", { start: "top 90%", once: true, onEnter: (els) => gsap.from(els, { y: 60, opacity: 0, duration: .9, stagger: .1, ease: "power3.out" }) });
  gsap.from(".apply", { y: 50, opacity: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: ".contact", start: "top 75%", once: true } });
  gsap.from(".colophon-mark", { yPercent: 60, opacity: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: ".colophon", start: "top 90%", once: true } });

  addEventListener("load", () => ScrollTrigger.refresh());
})();
