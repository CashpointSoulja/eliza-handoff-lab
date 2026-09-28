import { marked } from "/vendor/marked.esm.js";
import { createLabRunner, selectionId, simulatePayload } from "/lab.js";

const $ = (sel) => document.querySelector(sel);
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const pct = (x) => `${Math.round(x * 100)}%`;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const PROVIDER_KEY = "ehl.provider.v1";
const REVIEWS_KEY = "ehl.reviews.v1";

const state = {
  meta: null,
  provider: null,
  selected: "S01",
  custom: false,
  reviews: JSON.parse(localStorage.getItem(REVIEWS_KEY) || "{}"),
  lastEval: null,
};

async function api(path, body) {
  const res = await fetch(path, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : undefined);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

const clone = (x) => JSON.parse(JSON.stringify(x));
const saveProvider = () => localStorage.setItem(PROVIDER_KEY, JSON.stringify(state.provider));

/* ---------- tabs ---------- */
const TAB_SECTIONS = { home: "home", playground: "lab", lab: "lab", provider: "provider", evals: "evals", docs: "docs" };

function currentTab() {
  const [tab, sub] = (location.hash.slice(1) || "home").split("/");
  return { name: tab in TAB_SECTIONS ? tab : "home", sub };
}

function setMenu(open) {
  document.body.classList.toggle("menu-open", open);
  $("#menu-btn").setAttribute("aria-expanded", String(open));
}

function route() {
  const { name: tab, sub } = currentTab();
  const name = TAB_SECTIONS[tab];
  const navTab = name === "lab" ? "playground" : name;
  setMenu(false);
  document.querySelectorAll(".tab").forEach((s) => (s.hidden = s.id !== `tab-${name}`));
  document.querySelectorAll(".tabs a").forEach((a) => {
    if (a.dataset.tab === navTab) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  document.body.dataset.tab = navTab;
  if (name === "docs") openDoc(sub || "prd");
  if (name === "evals" && !state.lastEval) runEval();
  if (name === "provider") renderProvider();
}

/* ---------- lab ---------- */
function policyOptions(sel, withNone) {
  const opts = state.meta.policies.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("");
  sel.innerHTML = (withNone ? `<option value="">(none)</option>` : "") + opts;
}

function scenarioLabel(s) {
  const d = new Date(`${s.startedAt}:00Z`);
  return `${DAYS[d.getUTCDay()]} ${s.startedAt.slice(11)} · ${s.channel}`;
}

function renderScenarioList() {
  $("#scenario-list").innerHTML = state.meta.scenarios
    .map(
      (s) => `<li><button type="button" class="scenario ${!state.custom && s.id === state.selected ? "active" : ""}" data-id="${s.id}">
        <span class="sid">${s.id}</span>
        <span class="stitle">${esc(s.title)}</span>
        <span class="smeta">${scenarioLabel(s)}${s.labels.safetyCritical ? ' · <b class="crit">safety-critical</b>' : ""}</span>
      </button></li>`,
    )
    .join("");
  $("#custom-btn").classList.toggle("active", state.custom);
  $("#custom-editor").hidden = !state.custom;
}

function customScenario() {
  return {
    id: "custom",
    title: "Your conversation",
    channel: $("#c-channel").value,
    startedAt: $("#c-time").value.slice(0, 16),
    trackingNumber: $("#c-tracking").value,
    callerNumber: $("#c-channel").value === "voice" ? $("#c-caller").value : undefined,
    turns: $("#c-turns").value.split("\n").map((t) => t.trim()).filter(Boolean),
  };
}

function renderScenarioHeader() {
  const el = $("#scenario-header");
  if (state.custom) {
    el.innerHTML = `<div class="panel"><h2>Your conversation</h2><p class="muted small">No label, so nothing is marked right or wrong. Violations are still checked against the provider's rules and rota.</p></div>`;
    return;
  }
  const s = state.meta.scenarios.find((x) => x.id === state.selected);
  const src = state.provider.tracking.find((t) => t.number === s.trackingNumber)?.source ?? "Unattributed";
  el.innerHTML = `<div class="panel">
    <div class="row-between"><h2>${s.id} · ${esc(s.title)}</h2><span class="pill">${esc(scenarioLabel(s))}</span></div>
    <p class="small"><b>Source:</b> ${esc(src)} (${esc(s.trackingNumber)})${s.callerNumber ? ` · <b>Caller ID:</b> ${esc(s.callerNumber)}` : " · no caller ID (chat)"}</p>
    <p class="small"><b>Expected:</b> <span class="route-tag">${esc(state.meta.routeLabels[s.labels.expectedRoute])}</span>, ${esc(s.labels.rationale)}</p>
  </div>`;
}

function renderPacket(p) {
  if (!p) return `<div class="packet empty">No handoff packet: not a care enquiry.</div>`;
  const li = (arr) => (arr.length ? `<ul>${arr.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : `<p class="muted small">None</p>`);
  return `<div class="packet">
    <div class="row-between"><h4>Handoff packet</h4><span class="prio prio-${p.priority.slice(0, 2)}">${esc(p.priority)}</span></div>
    <dl>
      <dt>To</dt><dd>${p.routeTo ? esc(p.routeTo.name) : "—"}</dd>
      <dt>Due</dt><dd>${esc(p.dueLabel)}</dd>
      <dt>Summary</dt><dd>${esc(p.summary)}</dd>
      <dt>Caller</dt><dd>${esc([p.caller.name, p.caller.relationship && `about their ${p.caller.relationship}`, p.caller.phone].filter(Boolean).join(" · ") || "unknown")}</dd>
      <dt>Funding</dt><dd>${esc(p.funding || "not discussed")}</dd>
      <dt>Source</dt><dd>${esc(p.source)} · ${esc(p.channel)}</dd>
    </dl>
    <h5>What Eliza committed to</h5>${li(p.elizaCommitments)}
    <h5>Open questions for the team</h5>${li(p.openQuestions)}
    <p class="small ${p.missingFields.length ? "warn-text" : "ok-text"}">Completeness ${pct(p.completeness)}${p.missingFields.length ? `, missing: ${esc(p.missingFields.join(", "))}` : ""}</p>
  </div>`;
}

function renderResult(data, policyId) {
  const r = data.result;
  const labels = data.labels;
  const policy = state.meta.policies.find((p) => p.id === policyId);
  const correct = labels ? r.route === labels.expectedRoute : null;
  const verdict =
    correct === null ? "" : correct ? `<span class="badge ok">Route correct</span>` : `<span class="badge bad">Wrong route</span>`;
  const viol = r.violations.length
    ? `<div class="violations"><b>${r.violations.length} provider-trust violation${r.violations.length > 1 ? "s" : ""}</b><ul>${r.violations
        .map((v) => `<li>${esc(state.meta.violationLabels[v])}</li>`)
        .join("")}</ul></div>`
    : `<div class="no-violations">No trust violations</div>`;
  const turns = r.trace
    .map(
      (t) => `<div class="bubble family"><span class="who">Family</span>${esc(t.family)}</div>
      <div class="bubble eliza"><span class="who">Eliza</span>${esc(t.eliza)}
        ${t.reasoning.length ? `<details class="why"><summary>Why</summary><ul>${t.reasoning.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></details>` : ""}
      </div>`,
    )
    .join("");
  const l = r.latency;
  return `<div class="panel result">
    <div class="row-between"><h3>${esc(policy.name)}</h3>${verdict}</div>
    <div class="outcome"><span class="route-tag big">${esc(r.routeLabel)}</span>${r.resolved ? "" : `<span class="badge bad">Unresolved: promise can't be kept</span>`}</div>
    ${viol}
    <div class="transcript">${turns}</div>
    ${renderPacket(r.packet)}
    <p class="muted small latency">Declared latency to first audio: ${l.totalMs} ms (STT ${l.sttEndpointMs} + model ${l.modelFirstTokenMs} + TTS ${l.ttsFirstAudioMs}). This is an assumption, not a measurement.</p>
  </div>`;
}

const labRunner = createLabRunner({
  simulate: (selection, policy) => api("/api/simulate", simulatePayload(selection, policy, state.provider)),
  renderLoading: (selection, policies) => {
    const out = $("#results");
    out.classList.toggle("compare", policies.length > 1);
    out.setAttribute("aria-busy", "true");
    out.dataset.scenario = selectionId(selection);
    out.innerHTML = policies.map(() => `<div class="panel result loading">Running ${esc(selectionId(selection))}…</div>`).join("");
  },
  render: (runs) => {
    const out = $("#results");
    out.removeAttribute("aria-busy");
    out.innerHTML = runs.map(([p, d]) => renderResult(d, p)).join("");
  },
  renderError: (e) => {
    const out = $("#results");
    out.removeAttribute("aria-busy");
    out.innerHTML = `<div class="panel error">${esc(e.message)}</div>`;
  },
});

function runLab() {
  const a = $("#policy-a").value;
  const b = $("#policy-b").value;
  const pol = state.meta.policies.find((p) => p.id === a);
  $("#policy-summary").textContent = pol.summary;
  renderScenarioHeader();
  const selection = state.custom ? { custom: true, scenario: customScenario() } : { custom: false, scenarioId: state.selected };
  return labRunner(selection, [a, b].filter(Boolean));
}

/* ---------- provider ---------- */
function onRota(contact, day, hour) {
  const hm = (s) => s.split(":").map(Number).reduce((h, m) => h * 60 + m);
  const m = hour * 60 + 30;
  return contact.rota.some((w) => {
    const s = hm(w.start), e = hm(w.end);
    if (s <= e) return w.days.includes(day) && m >= s && m <= e;
    return (w.days.includes(day) && m >= s) || (w.days.includes((day + 6) % 7) && m < e);
  });
}

function renderCoverage() {
  const p = state.provider;
  const order = [1, 2, 3, 4, 5, 6, 0];
  const hours = [...Array(24).keys()];
  const head = `<div class="cov-row cov-head"><span class="cov-name"></span>${order
    .map((d) => `<span class="cov-day">${DAYS[d]}</span>`)
    .join("")}</div>`;
  const rows = p.contacts
    .map(
      (c) => `<div class="cov-row"><span class="cov-name">${esc(c.name)}</span>${order
        .map(
          (d) => `<span class="cov-day cells">${hours
            .map((h) => `<i class="${onRota(c, d, h) ? "on" : ""}" title="${DAYS[d]} ${String(h).padStart(2, "0")}:00"></i>`)
            .join("")}</span>`,
        )
        .join("")}</div>`,
    )
    .join("");
  $("#coverage").innerHTML = head + rows + `<p class="muted small">Each cell is one hour, 00:00–23:00. Filled means on rota.</p>`;
}

function renderProvider() {
  const p = state.provider;
  $("#provider-title").textContent = `${p.name} · ${p.group}`;
  renderCoverage();
  $("#contacts").innerHTML = `<div class="table-wrap"><table class="table"><thead><tr><th>Contact</th><th>Role</th><th>Shifts (days · start–end)</th></tr></thead><tbody>${p.contacts
    .map(
      (c, ci) => `<tr><td>${esc(c.name)}</td><td>${esc(c.role.replace(/_/g, " "))}</td><td>${c.rota
        .map(
          (w, wi) => `<div class="shift">${[1, 2, 3, 4, 5, 6, 0]
            .map(
              (d) => `<label class="day"><input type="checkbox" data-c="${ci}" data-w="${wi}" data-day="${d}" ${w.days.includes(d) ? "checked" : ""}/>${DAYS[d][0]}</label>`,
            )
            .join("")}
            <input type="time" data-c="${ci}" data-w="${wi}" data-f="start" value="${w.start}" aria-label="${esc(c.name)} start"/>–<input type="time" data-c="${ci}" data-w="${wi}" data-f="end" value="${w.end}" aria-label="${esc(c.name)} end"/></div>`,
        )
        .join("")}</td></tr>`,
    )
    .join("")}</tbody></table></div>`;
  const r = p.rules;
  const opt = (v, cur, label) => `<option value="${v}" ${v === cur ? "selected" : ""}>${label}</option>`;
  $("#rules").innerHTML = `
    <label>Price policy <select data-rule="pricePolicy">${opt("no_prices", r.pricePolicy, "Never share prices")}${opt("from_price", r.pricePolicy, "Share a 'from' price only")}${opt("exact", r.pricePolicy, "Share exact weekly rates")}</select></label>
    <label>'From' price (£/week) <input type="number" min="0" step="10" data-rule="fromPriceWeekly" value="${r.fromPriceWeekly}"/></label>
    <label>Share room availability <select data-rule="discloseAvailability">${opt("true", String(r.discloseAvailability), "Yes")}${opt("false", String(r.discloseAvailability), "No: team confirms")}</select></label>
    <label>Urgent enquiry out of hours <select data-rule="urgentOutOfHours">${opt("on_call", r.urgentOutOfHours, "Page on-call manager")}${opt("next_business_morning", r.urgentOutOfHours, "Admissions, first thing next shift")}</select></label>
    <label>Priority callback target (minutes) <input type="number" min="5" max="240" step="5" data-rule="priorityCallbackMinutes" value="${r.priorityCallbackMinutes}"/></label>
    <label>Safeguarding lead <select data-rule="safeguardingLeadId">${p.contacts.map((c) => opt(c.id, r.safeguardingLeadId, esc(c.name))).join("")}</select></label>
    <p class="muted small">Internal weekly rates (never said unless the policy is "exact"): ${Object.entries(r.internalWeeklyRates).map(([k, v]) => `${k} £${v}`).join(", ")}.</p>`;
  $("#homes").innerHTML = p.homes
    .map(
      (h, hi) => `<div class="home"><b>${esc(h.name)}</b>${h.id === p.primaryHomeId ? ' <span class="pill">primary</span>' : ""}<div class="vac">${h.careTypes
        .map((ct) => `<label>${ct} <input type="number" min="0" max="50" data-home="${hi}" data-ct="${ct}" value="${h.vacancies[ct] ?? 0}"/></label>`)
        .join("")}</div></div>`,
    )
    .join("");
  $("#tracking").innerHTML = `<table class="table"><tbody>${p.tracking
    .map((t) => `<tr><td>${esc(t.number)}</td><td>${esc(t.source)}</td></tr>`)
    .join("")}</tbody></table>`;
}

function onProviderInput(e) {
  const t = e.target;
  const p = state.provider;
  if (t.dataset.day !== undefined) {
    const w = p.contacts[+t.dataset.c].rota[+t.dataset.w];
    const d = +t.dataset.day;
    w.days = t.checked ? [...new Set([...w.days, d])].sort() : w.days.filter((x) => x !== d);
  } else if (t.dataset.f) {
    if (!t.value) return;
    p.contacts[+t.dataset.c].rota[+t.dataset.w][t.dataset.f] = t.value;
  } else if (t.dataset.rule) {
    const k = t.dataset.rule;
    p.rules[k] =
      k === "discloseAvailability" ? t.value === "true" : t.type === "number" ? Math.max(0, Number(t.value) || 0) : t.value;
  } else if (t.dataset.home !== undefined) {
    p.homes[+t.dataset.home].vacancies[t.dataset.ct] = Math.max(0, Math.floor(Number(t.value) || 0));
  } else return;
  saveProvider();
  renderCoverage();
  state.lastEval = null;
}

/* ---------- evals ---------- */
function metricCard(label, key, fmt, better, run, base) {
  const v = run.metrics[key];
  const b = base.metrics[key];
  const d = v - b;
  const good = better === "up" ? d > 0 : d < 0;
  const delta = d === 0 ? `<span class="delta same">same as baseline</span>` : `<span class="delta ${good ? "up" : "down"}">${d > 0 ? "+" : ""}${fmt === pct ? `${Math.round(d * 100)} pts` : d} vs baseline</span>`;
  return `<div class="metric"><span class="mlabel">${label}</span><span class="mval">${fmt(v)}</span>${delta}<span class="mbase">baseline: ${fmt(b)}</span></div>`;
}

async function runEval() {
  const baseline = $("#eval-baseline").value;
  const candidate = $("#eval-candidate").value;
  try {
    const data = await api("/api/eval", { baseline, candidate, provider: state.provider });
    state.lastEval = data;
    renderEval(data);
  } catch (e) {
    $("#gate").innerHTML = `<div class="panel error">${esc(e.message)}</div>`;
  }
}

function renderEval({ baseline, candidate, gate }) {
  const ship = gate.decision === "ship";
  $("#gate").innerHTML = `<div class="panel gate ${ship ? "ship" : "block"}">
    <div class="row-between"><h2>${ship ? "SHIP" : "BLOCKED"}: ${esc(candidate.policyName)} vs baseline ${esc(baseline.policyName)}</h2></div>
    <ul class="checks">${gate.checks
      .map((c) => `<li class="${c.pass ? "pass" : c.blocking ? "fail" : "warn"}"><b>${c.pass ? "Pass" : c.blocking ? "Fail" : "Warn"}</b> ${esc(c.name)}: <span class="muted">${esc(c.detail)}</span></li>`)
      .join("")}</ul>
    ${gate.regressions.length ? `<p><b>Regressions:</b> ${gate.regressions.map((r) => `${r.id} ${esc(r.title)} (${esc(state.meta.routeLabels[r.baseline])} → ${esc(state.meta.routeLabels[r.candidate])})`).join("; ")}</p>` : ""}
    ${gate.fixes.length ? `<p><b>Fixed vs baseline:</b> ${gate.fixes.map((r) => r.id).join(", ")}</p>` : ""}
  </div>`;
  const P = pct;
  const N = (x) => String(x);
  const ms = (x) => `${x} ms`;
  $("#metrics").innerHTML = [
    metricCard("Route accuracy", "routeAccuracy", P, "up", candidate, baseline),
    metricCard("Containment", "containment", P, "up", candidate, baseline),
    metricCard("False containment (count)", "falseContainment", N, "down", candidate, baseline),
    metricCard("Resolution", "resolution", P, "up", candidate, baseline),
    metricCard("Escalation recall", "escalationRecall", P, "up", candidate, baseline),
    metricCard("Escalation precision", "escalationPrecision", P, "up", candidate, baseline),
    metricCard("Enquiry capture (conversion proxy)", "enquiryCapture", P, "up", candidate, baseline),
    metricCard("Provider trust", "providerTrust", P, "up", candidate, baseline),
    metricCard("Safety-critical pass", "safetyCriticalPass", P, "up", candidate, baseline),
    metricCard("Packet completeness", "packetCompleteness", P, "up", candidate, baseline),
    metricCard("Declared latency", "latencyToFirstAudioMs", ms, "down", candidate, baseline),
  ].join("");
  const baseById = Object.fromEntries(baseline.cases.map((c) => [c.id, c]));
  const reviewed = Object.keys(state.reviews).length;
  $("#cases").innerHTML = `<div class="row-between"><h2>Labelled cases</h2><span class="muted small">${reviewed} reviewed in this browser</span></div>
  <div class="table-wrap"><table class="table cases"><thead><tr><th>Case</th><th>Expected</th><th>Baseline: ${esc(baseline.policyId)}</th><th>Candidate: ${esc(candidate.policyId)}</th><th>Violations (candidate)</th><th>Review</th></tr></thead><tbody>${candidate.cases
    .map((c) => {
      const b = baseById[c.id];
      const rv = state.reviews[c.id];
      const cell = (x) => `<td class="${x.correct ? "ok" : "bad"}">${esc(state.meta.routeLabels[x.actual])}</td>`;
      return `<tr><td><a href="#playground" data-open="${c.id}">${c.id}</a> ${esc(c.title)}${c.safetyCritical ? ' <b class="crit">safety</b>' : ""}</td>
        <td>${esc(state.meta.routeLabels[c.expected])}</td>${cell(b)}${cell(c)}
        <td>${c.violations.map((v) => esc(state.meta.violationLabels[v])).join("<br/>") || "—"}</td>
        <td><button class="btn tiny ${rv ? "ghost" : ""}" data-review="${c.id}" type="button">${rv ? esc(rv.verdict.replace("_", " ")) : "Review"}</button></td></tr>`;
    })
    .join("")}</tbody></table></div>`;
}

function openReview(id) {
  const c = state.meta.scenarios.find((s) => s.id === id);
  const dlg = $("#review-dialog");
  const form = $("#review-form");
  $("#review-title").textContent = `Review ${id}: ${c.title}`;
  const existing = state.reviews[id];
  form.verdict.value = existing?.verdict ?? "agree";
  form.note.value = existing?.note ?? "";
  dlg.onclose = () => {
    if (dlg.returnValue !== "save") return;
    const cand = state.lastEval?.candidate.cases.find((k) => k.id === id);
    state.reviews[id] = {
      verdict: form.verdict.value,
      note: form.note.value.trim(),
      policy: state.lastEval?.candidate.policyId,
      route: cand?.actual,
      at: new Date().toISOString(),
    };
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(state.reviews));
    if (state.lastEval) renderEval(state.lastEval);
  };
  dlg.showModal();
}

function exportReviews() {
  const blob = new Blob([JSON.stringify(state.reviews, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "eliza-handoff-lab-reviews.json";
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ---------- docs ---------- */
let docsList = null;
async function openDoc(slug) {
  if (!docsList) {
    docsList = await api("/api/docs");
  }
  $("#docs-list").innerHTML = docsList
    .map((d) => `<li><a href="#docs/${d.slug}" class="${d.slug === slug ? "active" : ""}">${esc(d.title)}</a></li>`)
    .join("");
  try {
    const doc = await api(`/api/docs/${slug}`);
    $("#doc").innerHTML = marked.parse(doc.markdown);
    $("#doc").querySelectorAll("a[href^='http']").forEach((a) => {
      a.target = "_blank";
      a.rel = "noopener";
    });
  } catch (e) {
    $("#doc").innerHTML = `<p class="error">${esc(e.message)}</p>`;
  }
}

/* ---------- boot ---------- */
async function boot() {
  state.meta = await api("/api/meta");
  const saved = localStorage.getItem(PROVIDER_KEY);
  state.provider = saved ? JSON.parse(saved) : clone(state.meta.provider);
  policyOptions($("#policy-a"), false);
  policyOptions($("#policy-b"), true);
  $("#policy-a").value = "v1";
  $("#policy-b").value = "v2";
  policyOptions($("#eval-baseline"), false);
  policyOptions($("#eval-candidate"), false);
  $("#eval-baseline").value = "v2";
  $("#eval-candidate").value = "v3";
  $("#c-tracking").innerHTML = state.provider.tracking
    .map((t) => `<option value="${esc(t.number)}">${esc(t.source)} (${esc(t.number)})</option>`)
    .join("");
  $("#c-tracking").value = "0161 496 0101";

  $("#scenario-list").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-id]");
    if (!b) return;
    state.selected = b.dataset.id;
    state.custom = false;
    renderScenarioList();
    runLab();
  });
  $("#custom-btn").addEventListener("click", () => {
    state.custom = true;
    renderScenarioList();
    runLab();
  });
  $("#run-btn").addEventListener("click", runLab);
  $("#policy-a").addEventListener("change", runLab);
  $("#policy-b").addEventListener("change", runLab);
  $("#tab-provider").addEventListener("change", onProviderInput);
  $("#reset-provider").addEventListener("click", () => {
    state.provider = clone(state.meta.provider);
    saveProvider();
    state.lastEval = null;
    renderProvider();
  });
  $("#eval-run").addEventListener("click", runEval);
  $("#eval-baseline").addEventListener("change", runEval);
  $("#eval-candidate").addEventListener("change", runEval);
  $("#export-reviews").addEventListener("click", exportReviews);
  $("#cases").addEventListener("click", (e) => {
    const r = e.target.closest("[data-review]");
    if (r) return openReview(r.dataset.review);
    const o = e.target.closest("[data-open]");
    if (o) {
      state.selected = o.dataset.open;
      state.custom = false;
      renderScenarioList();
      $("#policy-a").value = $("#eval-baseline").value;
      $("#policy-b").value = $("#eval-candidate").value;
      runLab();
    }
  });
  $("#tab-home").addEventListener("click", (e) => {
    const o = e.target.closest("[data-home-open]");
    if (!o) return;
    state.selected = o.dataset.homeOpen;
    state.custom = false;
    renderScenarioList();
    $("#policy-a").value = o.dataset.a;
    $("#policy-b").value = o.dataset.b;
    location.hash = "#playground";
  });
  $("#menu-btn").addEventListener("click", () => setMenu(!document.body.classList.contains("menu-open")));
  $("#menu-close").addEventListener("click", () => setMenu(false));
  $("#nav").addEventListener("click", (e) => {
    if (e.target.closest("a")) setMenu(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setMenu(false);
  });
  window.addEventListener("hashchange", () => {
    route();
    if (TAB_SECTIONS[currentTab().name] === "lab") runLab();
    window.scrollTo(0, 0);
  });
  $("#home-count").textContent = String(state.meta.scenarios.length);
  $("#home-count-2").textContent = String(state.meta.scenarios.length);
  renderScenarioList();
  route();
  runLab();
}

boot().catch((e) => {
  document.querySelector("main").innerHTML = `<div class="panel error">Failed to load: ${esc(e.message)}</div>`;
});
