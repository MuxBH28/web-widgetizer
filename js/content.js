chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "modifyLinks") {
        document.querySelectorAll("a").forEach(link => link.setAttribute("target", "_top"));
        sendResponse({ success: true });

    } else if (message.action === "addToWidgetizer" && message.url) {
        addPageToWidgetizer(message.url, sendResponse);
        return true;
    }
});

function addPageToWidgetizer(url, sendResponse) {
    chrome.storage.local.get({ favoriteLinks: [] }, (data) => {
        const favoriteLinks = data.favoriteLinks;

        if (!favoriteLinks.some(link => link.url === url)) {
            favoriteLinks.push({ name: url, url });
            chrome.storage.local.set({ favoriteLinks }, () => {
                if (!chrome.runtime.lastError) {
                    console.log("✅ Link added to Web Widgetizer:", url);
                    sendResponse({ success: true });
                } else {
                    console.error("❌ Error adding link:", chrome.runtime.lastError);
                    sendResponse({ success: false, error: "Error adding link" });
                }
            });
        } else {
            console.log("⚠️ Link already exists:", url);
            sendResponse({ success: false, error: "Link already exists" });
        }
    });
}
