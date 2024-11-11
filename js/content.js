chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.action === 'modifyLinks') {
        const links = document.querySelectorAll('a');
        links.forEach(link => link.setAttribute('target', '_top'));
    }
});

chrome.runtime.onMessage.addListener(function (message) {
    if (message.action === "addToWidgetizer") {
        addPageToWidgetizer(message.url);
    }
});

function addPageToWidgetizer(url) {
    chrome.storage.local.get({ favoriteLinks: [] }, function (data) {
        const favoriteLinks = data.favoriteLinks;
        if (!favoriteLinks.includes(url)) {
            favoriteLinks.push(url);
            chrome.storage.local.set({ favoriteLinks }, function () {
                if (!chrome.runtime.lastError) {
                    console.log("Link dodan u Web Widgetizer:", url);
                } else {
                    console.error("Greška pri dodavanju linka:", chrome.runtime.lastError);
                }
            });
        } else {
            console.log("Link je već dodat.");
        }
    });
}
