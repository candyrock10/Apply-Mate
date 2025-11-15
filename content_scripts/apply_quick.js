// apply_quick.js
console.log("ApplyMate: apply_quick injected");

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
function setValue(el, value) {
  try {
    el.focus();
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles:true }));
    el.dispatchEvent(new Event('change', { bubbles:true }));
  } catch(e){ console.warn("setValue failed", e); }
}

// Heuristic fill function
async function runApply(profile, job) {
  try {
    console.log("ApplyMate: runApply", job.url, profile);

    // Wait a bit for forms to appear
    await sleep(700);

    const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
    let filled = 0;
    for (const input of inputs) {
      const combined = ((input.name||'') + ' ' + (input.placeholder||'') + ' ' + (input.getAttribute('aria-label')||'') + ' ' + (input.labels && input.labels[0] ? input.labels[0].innerText : '')).toLowerCase();
      if (/first.?name/.test(combined) && profile.firstName) { setValue(input, profile.firstName); filled++; await sleep(120); continue; }
      if (/last.?name/.test(combined) && profile.lastName) { setValue(input, profile.lastName); filled++; await sleep(120); continue; }
      if (/(full.?name|your name)/.test(combined) && profile.firstName && profile.lastName) { setValue(input, profile.firstName + ' ' + profile.lastName); filled++; await sleep(120); continue; }
      if (/email/.test(combined) && profile.email) { setValue(input, profile.email); filled++; await sleep(120); continue; }
      if (/phone|mobile|contact/.test(combined) && profile.phone) { setValue(input, profile.phone); filled++; await sleep(120); continue; }
      if (/linkedin|profile url/.test(combined) && profile.linkedin) { setValue(input, profile.linkedin); filled++; await sleep(120); continue; }
      if (/city|location/.test(combined) && profile.city) { setValue(input, profile.city); filled++; await sleep(120); continue; }
      if (/resume|cv/.test(combined) || input.type === 'file') {
        // file inputs cannot be set by script for security reasons
        console.warn("Resume upload required - cannot set programmatically");
        return { success: false, needsManualUpload: true, message: "Please upload resume manually on this page." };
      }
    }

    // try to click "Next" or "Submit" or "Review" type buttons
    const buttonSelectors = [
      "button[aria-label*='Submit application']",
      "button[aria-label*='Submit']",
      "button[aria-label*='Apply']",
      "button[aria-label*='Next']",
      "button.jobs-apply-button",
      "button[role='button']"
    ];
    let clicked = false;
    for (const sel of buttonSelectors) {
      const btn = document.querySelector(sel);
      if (btn && btn.offsetParent !== null) {
        btn.focus();
        btn.scrollIntoView({behavior:'smooth', block:'center'});
        await sleep(200 + Math.floor(Math.random()*400));
        btn.click();
        clicked = true;
        break;
      }
    }

    // If not found, try visible buttons with matching text
    if (!clicked) {
      const visibleButtons = Array.from(document.querySelectorAll('button')).filter(b => b.offsetParent !== null);
      for (const b of visibleButtons) {
        const txt = (b.innerText || '').toLowerCase();
        if (/submit|apply|next|review|finish|send application/.test(txt)) {
          b.focus(); b.click(); clicked = true; break;
        }
      }
    }

    await sleep(600);
    return { success: clicked, filled, message: clicked ? "Applied (heuristic)" : "Filled fields, no submit detected" };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Listen for apply commands
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "RUN_APPLY") {
    (async () => {
      const profile = msg.profile || {};
      const job = msg.job || {};
      const res = await runApply(profile, job);
      sendResponse(res);
    })();
    return true;
  }
});
