console.log("ApplyMate background loaded");

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log("Message received:", msg);

    if (msg.action === "start_scrape") {
        scrapeActiveTab();
    }

    if (msg.jobs) {
        chrome.runtime.sendMessage({ type: "JOBS_FOUND", jobs: msg.jobs });
    }
});


function scrapeActiveTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {

        if (!tabs.length) {
            console.error("No active tab");
            return;
        }

        const tabId = tabs[0].id;

        console.log("Sending message to tab:", tabId);

        chrome.tabs.sendMessage(tabId, { action: "scrape_jobs" }, (resp) => {
            if (chrome.runtime.lastError) {
                console.error("Messaging error:", chrome.runtime.lastError.message);
            } else {
                console.log("Response:", resp);
            }
        });
    });
}
