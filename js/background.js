chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
        case 'modifyLinks':
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]?.id) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'modifyLinks' }, response => {
                        sendResponse(response);
                    });
                } else {
                    sendResponse({ success: false, error: 'No active tab' });
                }
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

        case 'importLinks':
            importLinks(message.links, sendResponse);
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
            updateBadge();
            sendResponse({ success: true });
        });
    });
}

function deleteLink(index, sendResponse) {
    chrome.storage.local.get({ favoriteLinks: [] }, data => {
        const favoriteLinks = data.favoriteLinks;
        if (index >= 0 && index < favoriteLinks.length) {
            favoriteLinks.splice(index, 1);
            chrome.storage.local.set({ favoriteLinks }, () => {
                updateBadge();
                sendResponse({ success: true });
            });
        } else {
            sendResponse({ success: false, error: 'Invalid index' });
        }
    });
}

function importLinks(importedLinks, sendResponse) {
    if (!Array.isArray(importedLinks)) {
        sendResponse({ success: false, error: 'Invalid format' });
        return;
    }
    chrome.storage.local.get({ favoriteLinks: [] }, data => {
        const favoriteLinks = data.favoriteLinks;
        favoriteLinks.push(...importedLinks);
        chrome.storage.local.set({ favoriteLinks }, () => {
            updateBadge();
            sendResponse({ success: true });
        });
    });
}

chrome.commands.onCommand.addListener(command => {
    if (command === 'open_link_in_new_window') {
        chrome.storage.local.get(['lastSelectedLink', 'popupWidth', 'popupHeight'], data => {
            const { lastSelectedLink, popupWidth = 800, popupHeight = 600 } = data;
            if (lastSelectedLink) {
                chrome.windows.create({
                    url: lastSelectedLink,
                    width: parseInt(popupWidth),
                    height: parseInt(popupHeight),
                    type: 'popup',
                    focused: true
                });
            } else {
                console.error('No link is selected.');
            }
        });
    }
});

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'add-to-web-widgetizer',
        title: 'Add to Web Widgetizer',
        contexts: ['page', 'selection', 'link']
    });
    updateBadge();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'add-to-web-widgetizer' && tab?.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'addToWidgetizer', url: info.pageUrl || info.linkUrl });
    }
});

function updateBadge() {
    chrome.storage.local.get({ favoriteLinks: [] }, data => {
        const count = data.favoriteLinks.length.toString();
        chrome.action.setBadgeText({ text: count === '0' ? '' : count });
        chrome.action.setBadgeBackgroundColor({ color: '#0095c0' });
    });
}

chrome.runtime.onStartup.addListener(updateBadge);
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.favoriteLinks) updateBadge();
});