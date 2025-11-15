// popup.js
console.log("ApplyMate popup loaded");

// UI elements
const statusEl = id("status");
const jobsContainer = id("jobsContainer");
const logEl = id("log");

// profile inputs
const inputs = ["firstName","lastName","email","phone","city","linkedin","resumeNote"];
inputs.forEach(i => { const el = id(i); if (el) el.value = ""; });

// load saved data
chrome.storage.local.get(["applymate_profile","applymate_settings"], (data) => {
  if (data.applymate_profile) {
    Object.assign({}, data.applymate_profile);
    for (const k of inputs) if (data.applymate_profile[k]) id(k).value = data.applymate_profile[k];
  }
  if (data.applymate_settings && data.applymate_settings.dailyLimit) {
    // future use
  }
});

// save profile
id("saveProfile").addEventListener("click", () => {
  const profile = {};
  inputs.forEach(k => profile[k] = id(k).value.trim());
  chrome.storage.local.set({ applymate_profile: profile }, () => {
    appendLog("Profile saved");
    statusEl.innerText = "Profile saved";
  });
});

// scan button
id("scan").addEventListener("click", () => {
  appendLog("Requesting scan (ensure LinkedIn jobs tab is active)...");
  statusEl.innerText = "Scanning…";
  chrome.runtime.sendMessage({ action: "start_scan" }, (resp) => {
    if (resp && resp.error) {
      appendLog("Scan start error: " + resp.error);
      statusEl.innerText = "Scan failed";
    } else {
      appendLog("Scan requested");
    }
  });
});

// receive forwarded jobs
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "JOBS_FOUND") {
    appendLog("Jobs found: " + msg.jobs.length);
    statusEl.innerText = `Found ${msg.jobs.length} jobs`;
    renderJobs(msg.jobs);
  }
});

// render jobs list
function renderJobs(jobs) {
  jobsContainer.innerHTML = "";
  if (!jobs || jobs.length === 0) {
    jobsContainer.innerText = "No jobs found";
    return;
  }
  jobs.forEach((j, idx) => {
    const div = document.createElement("div");
    div.className = "jobRow";
    div.innerHTML = `
      <input type="checkbox" class="jobCheck" data-index="${idx}" />
      <div class="jobInfo">
        <div class="title">${escapeHtml(j.title||'–')}</div>
        <div class="meta">${escapeHtml(j.company||'')} ${j.quickApply? ' | Easy Apply' : ''} ${j.applicants? ' | '+j.applicants+' applicants' : ''}</div>
        <div class="link"><a href="${j.url}" target="_blank">Open</a></div>
      </div>
    `;
    // attach job object to element for later retrieval
    div.querySelector(".jobCheck").dataset.job = JSON.stringify(j);
    jobsContainer.appendChild(div);
  });
}

// Apply selected
id("applySelected").addEventListener("click", async () => {
  const checks = Array.from(document.querySelectorAll(".jobCheck")).filter(cb => cb.checked);
  if (checks.length === 0) { appendLog("No jobs selected"); return; }

  // gather jobs
  const jobs = checks.map(cb => JSON.parse(cb.dataset.job));
  // load profile
  chrome.storage.local.get("applymate_profile", async (data) => {
    const profile = data.applymate_profile || {};
    appendLog("Starting apply to " + jobs.length + " jobs");
    statusEl.innerText = "Applying…";

    // send to background
    chrome.runtime.sendMessage({ type: "START_APPLY", jobs, profile }, (resp) => {
      if (!resp) { appendLog("No response from background"); statusEl.innerText="Apply failed"; return; }
      const results = resp.results || [];
      for (const r of results) {
        appendLog((r.success ? "Applied: " : "Failed: ") + (r.job.title || r.job.url) + (r.error ? ' - ' + r.error : (r.needsManualUpload ? ' - manual upload required' : '')));
      }
      statusEl.innerText = "Apply finished";
    });
  });
});

// small utilities
function id(s){ return document.getElementById(s); }
function appendLog(msg) {
  const line = document.createElement("div");
  line.innerText = new Date().toLocaleTimeString() + " — " + msg;
  if (!logEl) return;
  logEl.prepend(line);
}
function escapeHtml(s){ return String(s||'').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
