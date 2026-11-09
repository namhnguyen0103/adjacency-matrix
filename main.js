// Foreign aid adjacency matrix: donors (columns) x recipients (rows).
// Cell value = sum of Amount for that donor -> recipient pair in the current selection.

const CELL_W = 26;
const CELL_H = 16;
const LABEL_W = 200;     // left gutter for recipient names
const COL_LABEL_H = 108; // height of rotated donor labels
const GROUP_H = 30;      // height of a recipient-group header row
const GROUP_GAP = 6;

const GROUPS = [
  { key: "Country", label: "Countries" },
  { key: "Regional", label: "Regions" },
  { key: "Unspecified", label: "Unspecified" },
];

// Sequential blue ramp (light -> dark on light surface; dark -> light on dark surface)
const RAMP = {
  light: ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"],
  dark: ["#184f95", "#1c5cab", "#2a78d6", "#5598e7", "#86b6ef", "#b7d3f6", "#cde2fb"],
};

const fmtShort = (v) => d3.format(".3~s")(v).replace("G", "B");
const fmtFull = d3.format(",.0f");
const fmtPct = d3.format(".1%");

function recipientType(name) {
  if (name === "Bilateral, unspecified") return "Unspecified";
  if (/, regional$/i.test(name) || /^Sts Ex-Yugo/i.test(name)) return "Regional";
  return "Country";
}

const truncate = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

function isDark() {
  const t = document.documentElement.dataset.theme;
  if (t === "dark") return true;
  if (t === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// ---------- tooltip ----------
const tip = document.getElementById("tooltip");
function showTip(event, html) {
  tip.innerHTML = html;
  tip.hidden = false;
  moveTip(event);
}
function moveTip(event) {
  const pad = 14;
  const { innerWidth: W, innerHeight: H } = window;
  const r = tip.getBoundingClientRect();
  let x = event.clientX + pad;
  let y = event.clientY + pad;
  if (x + r.width > W - 8) x = event.clientX - r.width - pad;
  if (y + r.height > H - 8) y = event.clientY - r.height - pad;
  tip.style.left = `${Math.max(8, x)}px`;
  tip.style.top = `${Math.max(8, y)}px`;
}
function hideTip() { tip.hidden = true; }

// ---------- data ----------
let raw = [];
const el = {
  yearFrom: document.getElementById("yearFrom"),
  yearTo: document.getElementById("yearTo"),
  purpose: document.getElementById("purpose"),
  sort: document.getElementById("sort"),
  count: document.getElementById("count"),
};

d3.csv("aid.csv", (d) => {
  const amount = +d.Amount;
  const donor = (d["Donor name"] || "").trim();
  const recipient = (d["Recipient name"] || "").trim();
  if (!d.Amount || Number.isNaN(amount) || !donor || !recipient) return null;
  return { year: +d.Year, donor, recipient, amount, purpose: (d.Purpose || "").trim() };
}).then((rows) => {
  raw = rows;
  initControls();
  render();
}).catch((err) => {
  document.getElementById("empty").hidden = false;
  document.getElementById("empty").textContent =
    "Could not load aid.csv. Open this page through a local server (python3 -m http.server).";
  console.error(err);
});

function initControls() {
  const [y0, y1] = d3.extent(raw, (d) => d.year);
  const years = d3.range(y0, y1 + 1);
  for (const s of [el.yearFrom, el.yearTo]) {
    s.innerHTML = years.map((y) => `<option value="${y}">${y}</option>`).join("");
  }
  el.yearFrom.value = y0;
  el.yearTo.value = y1;

  const purposes = Array.from(new Set(raw.map((d) => d.purpose))).sort(d3.ascending);
  el.purpose.innerHTML =
    `<option value="">All purposes (${purposes.length})</option>` +
    purposes.map((p) => `<option value="${escapeAttr(p)}" title="${escapeAttr(p)}">${escapeHtml(truncate(p, 60))}</option>`).join("");

  for (const s of [el.yearFrom, el.yearTo, el.purpose, el.sort]) s.addEventListener("change", render);
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", render);
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
const escapeAttr = escapeHtml;

// ---------- render ----------
function render() {
  let lo = +el.yearFrom.value;
  let hi = +el.yearTo.value;
  if (lo > hi) [lo, hi] = [hi, lo];
  const purpose = el.purpose.value;
  const byName = el.sort.value === "name";

  const data = raw.filter((d) => d.year >= lo && d.year <= hi && (!purpose || d.purpose === purpose));
  el.count.textContent = `${data.length} of ${raw.length} records`;

  const head = d3.select("#head");
  const body = d3.select("#body");
  head.selectAll("*").remove();
  body.selectAll("*").remove();
  document.getElementById("empty").hidden = data.length > 0;
  if (!data.length) {
    head.attr("width", 0).attr("height", 0);
    body.attr("width", 0).attr("height", 0);
    renderSummary(null);
    d3.select("#legend").selectAll("*").remove();
    return;
  }

  // Aggregate
  const grand = d3.sum(data, (d) => d.amount);
  const donorTot = d3.rollup(data, (v) => d3.sum(v, (d) => d.amount), (d) => d.donor);
  const recTot = d3.rollup(data, (v) => d3.sum(v, (d) => d.amount), (d) => d.recipient);
  const pairs = d3.rollup(
    data,
    (v) => ({ total: d3.sum(v, (d) => d.amount), n: v.length }),
    (d) => d.donor,
    (d) => d.recipient,
  );
  const donorRecipCount = new Map([...pairs].map(([d, m]) => [d, m.size]));
  const recipDonors = d3.rollup(data, (v) => new Set(v.map((d) => d.donor)).size, (d) => d.recipient);
  const topDonorOf = new Map();
  for (const [donor, m] of pairs) {
    for (const [r, v] of m) {
      const cur = topDonorOf.get(r);
      if (!cur || v.total > cur.total) topDonorOf.set(r, { donor, total: v.total });
    }
  }

  const donorSort = byName ? d3.ascending : (a, b) => donorTot.get(b) - donorTot.get(a);
  const recSort = byName ? d3.ascending : (a, b) => recTot.get(b) - recTot.get(a);
  const donors = [...donorTot.keys()].sort(donorSort);

  // Row layout grouped by recipient type
  const rowY = new Map();
  const groupLayout = [];
  let y = 0;
  for (const g of GROUPS) {
    const members = [...recTot.keys()].filter((r) => recipientType(r) === g.key).sort(recSort);
    if (!members.length) continue;
    groupLayout.push({ ...g, y, members, total: d3.sum(members, (m) => recTot.get(m)) });
    y += GROUP_H;
    for (const m of members) { rowY.set(m, y); y += CELL_H; }
    y += GROUP_GAP;
  }
  const bodyH = y;
  const recipients = [...rowY.keys()];

  const x = d3.scaleBand().domain(donors).range([LABEL_W, LABEL_W + donors.length * CELL_W]);
  const matrixRight = LABEL_W + donors.length * CELL_W;
  const width = matrixRight + 16;

  // Color scale (log)
  const pairValues = [];
  for (const m of pairs.values()) for (const v of m.values()) if (v.total > 0) pairValues.push(v.total);
  let [cMin, cMax] = d3.extent(pairValues);
  if (cMin === undefined) { cMin = 1; cMax = 10; }
  if (cMin === cMax) cMin = cMax / 10;
  const color = d3.scaleSequentialLog(d3.interpolateRgbBasis(isDark() ? RAMP.dark : RAMP.light)).domain([cMin, cMax]);

  renderLegend(color, cMin, cMax);

  // ---------- header (donor labels) ----------
  head.attr("width", width).attr("height", COL_LABEL_H);

  const colLabels = head.append("g").selectAll("text").data(donors).join("text")
    .attr("class", "label col-label")
    .attr("transform", (d) => `translate(${x(d) + CELL_W / 2 + 4},${COL_LABEL_H - 8}) rotate(-90)`)
    .attr("text-anchor", "start")
    .attr("pointer-events", "none")
    .text((d) => truncate(d, 17));

  // hit target per donor column in the header
  head.append("g").selectAll("rect").data(donors).join("rect").attr("class", "hit")
    .attr("x", (d) => x(d)).attr("y", 0).attr("width", CELL_W).attr("height", COL_LABEL_H)
    .on("pointerenter", (ev, d) => { highlight(null, d); showTip(ev, donorTip(d)); })
    .on("pointermove", moveTip)
    .on("pointerleave", () => { highlight(null, null); hideTip(); });

  head.append("text").attr("class", "title-text").attr("x", LABEL_W - 10).attr("y", COL_LABEL_H - 10)
    .attr("text-anchor", "end").text("Recipient ↓   Donor →");

  function donorTip(d) {
    return `<div class="t">${escapeHtml(d)}</div>
      <div>Total given: <b>${fmtFull(donorTot.get(d))}</b></div>
      <div>${fmtPct(donorTot.get(d) / grand)} of all aid in selection</div>
      <div>${donorRecipCount.get(d)} recipient${donorRecipCount.get(d) === 1 ? "" : "s"}</div>`;
  }

  // ---------- body (matrix + recipient totals) ----------
  body.attr("width", width).attr("height", bodyH);

  // group headers
  const gh = body.append("g").selectAll("g").data(groupLayout).join("g");
  gh.append("text").attr("class", "group-text").attr("x", 12).attr("y", (g) => g.y + GROUP_H - 10)
    .text((g) => `${g.label} · ${g.members.length}`);
  gh.append("text").attr("class", "title-text").attr("x", width - 12).attr("y", (g) => g.y + GROUP_H - 10)
    .attr("text-anchor", "end").text((g) => `${fmtShort(g.total)} received`);
  gh.append("line").attr("class", "axis-line").attr("x1", 12).attr("x2", width - 12)
    .attr("y1", (g) => g.y + GROUP_H - 3.5).attr("y2", (g) => g.y + GROUP_H - 3.5);

  // row labels
  const rowLabels = body.append("g").selectAll("text").data(recipients).join("text")
    .attr("class", "label row-label")
    .attr("x", LABEL_W - 10).attr("y", (r) => rowY.get(r) + CELL_H / 2)
    .attr("dominant-baseline", "central").attr("text-anchor", "end")
    .text((r) => truncate(r, 32));

  // cells
  const cellData = recipients.flatMap((r) => donors.map((d) => ({ r, d, v: pairs.get(d)?.get(r) })));
  body.append("g").selectAll("rect").data(cellData).join("rect")
    .attr("class", (c) => (c.v ? "cell" : "cell empty"))
    .attr("x", (c) => x(c.d)).attr("y", (c) => rowY.get(c.r))
    .attr("width", CELL_W).attr("height", CELL_H).attr("rx", 4)
    .attr("fill", (c) => (c.v ? color(c.v.total) : null))
    .on("pointerenter", (ev, c) => { highlight(c.r, c.d); showTip(ev, cellTip(c)); })
    .on("pointermove", moveTip)
    .on("pointerleave", () => { highlight(null, null); hideTip(); });

  function cellTip(c) {
    const head = `<div class="t">${escapeHtml(c.d)} → ${escapeHtml(c.r)}</div>`;
    if (!c.v) return head + `<div>No recorded aid in this selection</div>`;
    return head + `<div>Total: <b>${fmtFull(c.v.total)}</b></div>
      <div>${c.v.n} project${c.v.n === 1 ? "" : "s"}</div>`;
  }

  // hit targets on the row label area
  body.append("g").selectAll("rect").data(recipients).join("rect")
    .attr("class", "hit").attr("x", 0).attr("y", (r) => rowY.get(r)).attr("width", LABEL_W).attr("height", CELL_H)
    .on("pointerenter", (ev, r) => { highlight(r, null); showTip(ev, recTip(r)); })
    .on("pointermove", moveTip)
    .on("pointerleave", () => { highlight(null, null); hideTip(); });

  function recTip(r) {
    const top = topDonorOf.get(r);
    const n = recipDonors.get(r);
    return `<div class="t">${escapeHtml(r)}</div>
      <div>Total received: <b>${fmtFull(recTot.get(r))}</b></div>
      <div>${fmtPct(recTot.get(r) / grand)} of all aid in selection</div>
      <div>${n} donor${n === 1 ? "" : "s"}; largest: ${escapeHtml(top.donor)} (${fmtShort(top.total)})</div>`;
  }

  // highlight overlays
  const hiRow = body.append("rect").attr("class", "hi hi-band").attr("rx", 4).style("display", "none");
  const hiColBody = body.append("rect").attr("class", "hi hi-band").attr("rx", 4).style("display", "none");
  const hiColHead = head.append("rect").attr("class", "hi hi-band").attr("rx", 4).style("display", "none");
  const hiCell = body.append("rect").attr("class", "hi hi-cell").attr("rx", 4).style("display", "none");

  function highlight(r, d) {
    rowLabels.classed("active", (x) => x === r);
    colLabels.classed("active", (x) => x === d);
    if (r) {
      hiRow.style("display", null).attr("x", LABEL_W + 0.5).attr("y", rowY.get(r) + 0.5)
        .attr("width", donors.length * CELL_W - 1).attr("height", CELL_H - 1);
    } else hiRow.style("display", "none");
    if (d) {
      hiColBody.style("display", null).attr("x", x(d) + 0.5).attr("y", 0.5)
        .attr("width", CELL_W - 1).attr("height", bodyH - 1);
      hiColHead.style("display", null).attr("x", x(d) + 0.5).attr("y", 0.5)
        .attr("width", CELL_W - 1).attr("height", COL_LABEL_H - 1);
    } else { hiColBody.style("display", "none"); hiColHead.style("display", "none"); }
    if (r && d) {
      hiCell.style("display", null).attr("x", x(d) + 1).attr("y", rowY.get(r) + 1)
        .attr("width", CELL_W - 2).attr("height", CELL_H - 2);
    } else hiCell.style("display", "none");
  }

  // ---------- summary cards ----------
  const ranked = (map) => [...map].sort((a, b) => b[1] - a[1]);
  renderSummary({
    donors: ranked(donorTot),
    countries: ranked(recTot).filter(([r]) => recipientType(r) === "Country"),
  });
}

function renderLegend(color, lo, hi) {
  const svg = d3.select("#legend");
  svg.selectAll("*").remove();
  const W = 300, x0 = 8, x1 = W - 12, barY = 4, barH = 10;
  const xs = d3.scaleLog().domain([lo, hi]).range([x0, x1]);
  const grad = svg.append("defs").append("linearGradient").attr("id", "legendGrad");
  d3.range(0, 1.0001, 0.1).forEach((t) => {
    grad.append("stop").attr("offset", `${t * 100}%`).attr("stop-color", color(lo * Math.pow(hi / lo, t)));
  });
  svg.append("rect").attr("x", x0).attr("y", barY).attr("width", x1 - x0).attr("height", barH)
    .attr("rx", 3).attr("fill", "url(#legendGrad)");
  const p0 = Math.ceil(Math.log10(lo)), p1 = Math.floor(Math.log10(hi));
  let ticks = d3.range(p0, p1 + 1).map((p) => 10 ** p);
  if (ticks.length > 6) ticks = ticks.filter((_, i) => i % 2 === 0);
  const g = svg.append("g").selectAll("g").data(ticks).join("g").attr("transform", (t) => `translate(${xs(t)},0)`);
  g.append("line").attr("class", "axis-line").attr("y1", barY + barH).attr("y2", barY + barH + 4);
  g.append("text").attr("class", "value-text").attr("y", barY + barH + 15).attr("text-anchor", "middle")
    .text((t) => fmtShort(t));
}

function renderSummary(s) {
  const box = document.getElementById("summary");
  if (!s) { box.innerHTML = ""; return; }
  const card = (k, entry) => {
    if (!entry) return `<div class="card"><div class="k">${k}</div><div class="name">—</div><div class="v">None in selection</div></div>`;
    const [name, v] = entry;
    return `<div class="card"><div class="k">${k}</div><div class="name">${escapeHtml(name)}</div>
      <div class="v">${fmtShort(v)}</div></div>`;
  };
  box.innerHTML =
    card("Top donor", s.donors[0]) +
    card("Top recipient country", s.countries[0]);
}
