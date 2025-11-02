// Nghe Gan Day page logic (copied from played.js)
// Build list using the same data rendered in Queue (.q-item)
(function () {
  function buildFromQueue() {
    const body = document.getElementById("played-body");
    if (!body) return false;

    const items = Array.from(document.querySelectorAll(".q-item"));
    if (items.length === 0) return false;

    body.innerHTML = "";
    items.forEach((rowEl, idx) => {
      const img = rowEl.querySelector(".q-cover img");
      const titleEl = rowEl.querySelector(".q-title-text");
      const artistEl = rowEl.querySelector(".q-artist");
      const timeEl = rowEl.querySelector(".q-time");
      const qi = rowEl.getAttribute("data-index") ?? String(idx);
      const row = document.createElement("div");
      row.className = "pt-row";
      row.setAttribute("role", "row");
      row.innerHTML = `
        <div class="pt-col idx">${idx + 1}</div>
        <div class="pt-col track">
          <div class="pt-cover" style="background-image:url('${img ? img.src : ""}')"></div>
          <div>
            <div class="pt-title">${titleEl ? titleEl.textContent : ""}</div>
          </div>
        </div>
        <div class="pt-col artist">${artistEl ? artistEl.textContent : ""}</div>
        <div class="pt-col time" id="ptime-${qi}">${timeEl ? timeEl.textContent : "--:--"}</div>
      `;
      row.addEventListener("click", () => rowEl.click());
      body.appendChild(row);
    });

    return true;
  }

  function init() {
    if (buildFromQueue()) return;
    const obs = new MutationObserver(() => {
      if (buildFromQueue()) obs.disconnect();
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

// Keep Time column in sync with Queue times (which load async)
(function () {
  function handleMutation(muts) {
    muts.forEach(() => {
      const times = document.querySelectorAll('.q-time[id^="qtime-"]');
      times.forEach((t) => {
        const idx = t.id.replace("qtime-", "");
        const target = document.getElementById("ptime-" + idx);
        if (target && target.textContent !== t.textContent) {
          target.textContent = t.textContent;
        }
      });
    });
  }

  function start() {
    const qlist = document.getElementById("queue-list");
    if (!qlist) return;
    const mo = new MutationObserver(handleMutation);
    mo.observe(qlist, { childList: true, subtree: true, characterData: true });
    handleMutation([{ type: "childList" }]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
