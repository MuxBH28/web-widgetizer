chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.action === 'modifyLinks' || message.action === 'openTab') {
        const links = document.querySelectorAll('a');
        links.forEach(link => link.setAttribute('target', '_top'));
    }

    if (message.action === 'saveLink') {
        var newLink = message.link;

        chrome.storage.local.get({ 'favoriteLinks': [] }, function (data) {
            var favoriteLinks = data.favoriteLinks;
            favoriteLinks.push(newLink);

            chrome.storage.local.set({ favoriteLinks: favoriteLinks }, function () {
                if (!chrome.runtime.lastError) {
                    updateBadge();
                    sendResponse({ success: true });
                } else {
                    console.error('Error saving link:', chrome.runtime.lastError);
                    sendResponse({ success: false });
                }
            });
        });

        return true;
    } else if (message.action === 'loadLinks') {
        chrome.storage.local.get({ 'favoriteLinks': [] }, function (data) {
            var favoriteLinks = data.favoriteLinks;
            sendResponse({ links: favoriteLinks });
        });

        return true;
    } else if (message.action === 'deleteLink') {
        var index = message.index;

        chrome.storage.local.get({ 'favoriteLinks': [] }, function (data) {
            var favoriteLinks = data.favoriteLinks;

            if (index >= 0 && index < favoriteLinks.length) {
                favoriteLinks.splice(index, 1);

                chrome.storage.local.set({ favoriteLinks: favoriteLinks }, function () {
                    if (!chrome.runtime.lastError) {
                        updateBadge();
                        sendResponse({ success: true });
                    } else {
                        console.error('Error deleting link:', chrome.runtime.lastError);
                        sendResponse({ success: false });
                    }
                });
            } else {
                sendResponse({ success: false, error: 'Invalid index' });
            }
        });

        return true;
    } else if (message.action === 'exportLinks') {
        chrome.storage.local.get({ 'favoriteLinks': [] }, function (data) {
            var favoriteLinks = data.favoriteLinks;
            var blob = new Blob([JSON.stringify(favoriteLinks, null, 2)], { type: 'application/json' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'favoriteLinks.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            sendResponse({ success: true });
        });

        return true;
    } else if (message.action === 'importLinks') {
        var file = message.file;

        var reader = new FileReader();
        reader.onload = function (event) {
            try {
                var importedLinks = JSON.parse(event.target.result);
                chrome.storage.local.get({ 'favoriteLinks': [] }, function (data) {
                    var favoriteLinks = data.favoriteLinks;
                    favoriteLinks.push(...importedLinks);

                    chrome.storage.local.set({ favoriteLinks: favoriteLinks }, function () {
                        if (!chrome.runtime.lastError) {
                            updateBadge();
                            sendResponse({ success: true });
                        } else {
                            console.error('Error importing links:', chrome.runtime.lastError);
                            sendResponse({ success: false });
                        }
                    });
                });
            } catch (e) {
                console.error('Error parsing imported links:', e);
                sendResponse({ success: false });
            }
        };
        reader.readAsText(file);

        return true;
    }
});

chrome.commands.onCommand.addListener(function (command) {
    if (command === 'open_link_in_new_window') {
        chrome.storage.local.get(['lastSelectedLink'], function (data) {
            let lastSelectedLink = data.lastSelectedLink;

            if (lastSelectedLink) {
                chrome.storage.local.get(['popupWidth', 'popupHeight'], function (data) {
                    let width = data.popupWidth || 800;
                    let height = data.popupHeight || 600;

                    chrome.windows.create({
                        url: lastSelectedLink,
                        width: width,
                        height: height,
                        focused: true
                    });
                });
            } else {
                console.error('No link is selected.');
            }
        });
    }
});

chrome.runtime.onInstalled.addListener(function () {
    chrome.storage.local.get({ 'autostart': false }, function (data) {
        let autostart = data.autostart;

        if (autostart) {
            chrome.storage.local.get(['lastSelectedLink'], function (data) {
                let lastSelectedLink = data.lastSelectedLink;

                if (lastSelectedLink) {
                    chrome.storage.local.get(['popupWidth', 'popupHeight'], function (data) {
                        let width = data.popupWidth || 800;
                        let height = data.popupHeight || 600;

                        chrome.windows.create({
                            url: lastSelectedLink,
                            width: width,
                            height: height,
                            focused: true
                        }, function (window) {
                            if (!window) {
                                console.error('The browser blocked opening a new window. Please allow popups for this site.');
                            }
                        });
                    });
                } else {
                    console.error('No link is selected.');
                }
            });
        }
    });
});

chrome.contextMenus.create({
    id: "add-to-web-widgetizer",
    title: "Add to Web Widgetizer",
    contexts: ["page", "selection", "link"]
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "add-to-web-widgetizer") {
        chrome.tabs.sendMessage(tab.id, {
            action: "addToWidgetizer",
            url: info.pageUrl
        });
    }
});

function updateBadge() {
    chrome.storage.local.get(['favoriteLinks'], function (result) {
        const count = (result.favoriteLinks || []).length.toString();
        chrome.action.setBadgeText({ text: count });
        chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
    });
}

chrome.runtime.onStartup.addListener(updateBadge);
chrome.runtime.onInstalled.addListener(updateBadge);
chrome.storage.onChanged.addListener(function (changes, area) {
    if (area === 'local' && changes.favoriteLinks) updateBadge();
});