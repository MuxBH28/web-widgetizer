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
                if (chrome.runtime.lastError) {
                    console.error('Error saving link:', chrome.runtime.lastError);
                    sendResponse({ success: false });
                } else {
                    sendResponse({ success: true });
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
                    if (chrome.runtime.lastError) {
                        console.error('Error deleting link:', chrome.runtime.lastError);
                        sendResponse({ success: false });
                    } else {
                        sendResponse({ success: true });
                    }
                });
            } else {
                sendResponse({ success: false, error: 'Invalid index' });
            }
        });

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
                        width: width,
                        height: height,
                        focused: true,
                        url: lastSelectedLink
                    });
                });
            } else {
                alert('No link is selected.');
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
                                alert('The browser blocked opening a new window. Please allow popups for this site.');
                            }
                        });
                    });
                } else {
                    alert('No link is selected.');
                }
            });
        }
    });
});
