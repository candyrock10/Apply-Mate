// scrape_jobs.js
console.log("ApplyMate: scrape_jobs loaded on page");

function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

async function waitForAny(selectorList, timeout=8000) {
  const start = Date.now();
  while (Date.now()-start < timeout) {
    for (const sel of selectorList) {
      const nodes = document.querySelectorAll(sel);
      if (nodes && nodes.length > 0) return nodes;
    }
    await sleep(300);
  }
  // final try
  let combined = [];
  for (const sel of selectorList) combined = combined.concat(Array.from(document.querySelectorAll(sel)));
  return combined;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "scrape" || msg.action === "scan") {
    (async () => {
      console.log("ApplyMate: scrape request received", msg.filters || {});
      // selectors commonly used across LinkedIn job listing variants
      const nodes = await waitForAny([
        "li.jobs-search-results__list-item",
        ".job-card-container",
        ".jobs-search-results__list-item",
        ".job-card"
      ], 9000);

      console.log("ApplyMate: found nodes:", nodes.length);
      const jobs = Array.from(nodes).map(node => {
        const title = node.querySelector("h3")?.innerText?.trim() ||
                      node.querySelector(".job-card-list__title")?.innerText?.trim() || "";
        const company = node.querySelector("h4")?.innerText?.trim() ||
                        node.querySelector(".job-card-container__company-name")?.innerText?.trim() || "";
        const linkEl = node.querySelector("a[href*='/jobs/']") || node.querySelector("a");
        const url = linkEl ? (linkEl.href || linkEl.getAttribute('href')) : "";
        const text = (node.innerText || "").toLowerCase();
        const quick = text.includes("easy apply") || text.includes("easy-apply") || !!node.querySelector("button.jobs-apply-button, button[data-control-name*='apply']");
        const applicantsMatch = text.match(/(\\d+)\\+?\\s+applicant/);
        const applicants = applicantsMatch ? parseInt(applicantsMatch[1],10) : null;
        const postedText = node.querySelector("time")?.innerText?.toLowerCase() || (node.innerText || "").slice(0,60).toLowerCase();
        return { title, company, url, quickApply: !!quick, applicants, postedText };
      }).filter(j => j.url || j.title);

      console.log("ApplyMate: scraped jobs count", jobs.length);
      // send to background (background will forward to popup)
      chrome.runtime.sendMessage({ type: "JOBS_SCRAPED", jobs });
      sendResponse({ ok: true, count: jobs.length });
    })();
    return true;
  }
});
