chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {

        case 'modifyLinks':
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'modifyLinks' }, response => {
                    sendResponse(response);
                });
            });
            return true;

        case 'saveLink':
            saveLink(message.link, sendResponse);
            return true;

        case 'loadLinks':
            chrome.storage.local.get({ favoriteLinks: [] }, data => {
                sendResponse({ links: data.favoriteLinks });
            });
            return true;

        case 'deleteLink':
            deleteLink(message.index, sendResponse);
            return true;

        case 'exportLinks':
            exportLinks(sendResponse);
            return true;

        case 'importLinks':
            importLinks(message.file, sendResponse);
            return true;

        default:
            break;
    }
});

function saveLink(newLink, sendResponse) {
    chrome.storage.local.get({ favoriteLinks: [] }, data => {
        const favoriteLinks = data.favoriteLinks;
        favoriteLinks.push(newLink);
        chrome.storage.local.set({ favoriteLinks }, () => {
            if (!chrome.runtime.lastError) {
                updateBadge();
                sendResponse({ success: true });
            } else {
                console.error('Error saving link:', chrome.runtime.lastError);
                sendResponse({ success: false, error: 'Error saving link' });
            }
        });
    });
}

function deleteLink(index, sendResponse) {
    chrome.storage.local.get({ favoriteLinks: [] }, data => {
        const favoriteLinks = data.favoriteLinks;
        if (index >= 0 && index < favoriteLinks.length) {
            favoriteLinks.splice(index, 1);
            chrome.storage.local.set({ favoriteLinks }, () => {
                if (!chrome.runtime.lastError) {
                    updateBadge();
                    sendResponse({ success: true });
                } else {
                    console.error('Error deleting link:', chrome.runtime.lastError);
                    sendResponse({ success: false, error: 'Error deleting link' });
                }
            });
        } else {
            sendResponse({ success: false, error: 'Invalid index' });
        }
    });
}

function exportLinks(sendResponse) {
    chrome.storage.local.get({ favoriteLinks: [] }, data => {
        const blob = new Blob([JSON.stringify(data.favoriteLinks, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'favoriteLinks.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        sendResponse({ success: true });
    });
}

function importLinks(file, sendResponse) {
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const importedLinks = JSON.parse(e.target.result);
            if (!Array.isArray(importedLinks)) throw new Error('Invalid format');
            chrome.storage.local.get({ favoriteLinks: [] }, data => {
                const favoriteLinks = data.favoriteLinks;
                favoriteLinks.push(...importedLinks);
                chrome.storage.local.set({ favoriteLinks }, () => {
                    if (!chrome.runtime.lastError) {
                        updateBadge();
                        sendResponse({ success: true });
                    } else {
                        console.error('Error importing links:', chrome.runtime.lastError);
                        sendResponse({ success: false, error: 'Error importing links' });
                    }
                });
            });
        } catch (err) {
            console.error('Error parsing imported links:', err);
            sendResponse({ success: false, error: 'Error parsing imported links' });
        }
    };
    reader.readAsText(file);
}

chrome.commands.onCommand.addListener(command => {
    if (command === 'open_link_in_new_window') {
        chrome.storage.local.get(['lastSelectedLink', 'popupWidth', 'popupHeight'], data => {
            const { lastSelectedLink, popupWidth = 800, popupHeight = 600 } = data;
            if (lastSelectedLink) {
                chrome.windows.create({
                    url: lastSelectedLink,
                    width: popupWidth,
                    height: popupHeight,
                    focused: true
                });
            } else console.error('No link is selected.');
        });
    }
});

chrome.contextMenus.create({
    id: 'add-to-web-widgetizer',
    title: 'Add to Web Widgetizer',
    contexts: ['page', 'selection', 'link']
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'add-to-web-widgetizer') {
        chrome.tabs.sendMessage(tab.id, { action: 'addToWidgetizer', url: info.pageUrl });
    }
});

function updateBadge() {
    chrome.storage.local.get(['favoriteLinks'], data => {
        const count = (data.favoriteLinks || []).length.toString();
        chrome.browserAction.setBadgeText({ text: count });
        chrome.browserAction.setBadgeBackgroundColor({ color: '#FF0000' });
    });
}

function openLastSelectedLink() {
    chrome.storage.local.get(['lastSelectedLink', 'popupWidth', 'popupHeight'], data => {
        const { lastSelectedLink, popupWidth = 800, popupHeight = 600 } = data;
        if (lastSelectedLink) {
            chrome.windows.create({
                url: lastSelectedLink,
                width: popupWidth,
                height: popupHeight,
                focused: true
            });
        }
    });
}

chrome.runtime.onStartup.addListener(updateBadge);
chrome.runtime.onInstalled.addListener(updateBadge);
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.favoriteLinks) updateBadge();
});