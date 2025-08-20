document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('optionsButton').addEventListener('click', openOptionsPage);
    document.getElementById('openButton').addEventListener('click', openLastSelectedLink);
    document.getElementById('saveSiteButton').addEventListener('click', saveCurrentSite);

    const shareLink = document.getElementById('shareLink');
    shareLink.addEventListener('click', copyShareLink);

    loadLastSelectedLink();
    loadLinksList();
});

function openOptionsPage() {
    chrome.runtime.openOptionsPage();
}

function openLastSelectedLink() {
    chrome.storage.local.get(['lastSelectedLink'], ({ lastSelectedLink }) => {
        if (lastSelectedLink) {
            chrome.storage.local.get(['popupWidth', 'popupHeight'], ({ popupWidth, popupHeight }) => {
                const width = popupWidth || 800;
                const height = popupHeight || 600;
                const newWindow = window.open(lastSelectedLink, '_blank', `width=${width},height=${height},resizable=yes,scrollbars=yes`);

                if (!newWindow) {
                    alert('The browser blocked opening a new window. Please allow popups for this extension.');
                }
            });
        } else {
            alert('No link is selected.');
        }
    });
}

function copyShareLink(event) {
    event.preventDefault();
    const urlToCopy = "https://addons.mozilla.org/en-US/firefox/addon/webwidgetizer/";

    navigator.clipboard.writeText(urlToCopy)
        .then(() => {
            const shareLink = document.getElementById('shareLink');
            shareLink.textContent = 'Copied';
            setTimeout(() => { shareLink.textContent = 'Share'; }, 2000);
        })
        .catch(err => {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy link. Please try manually.');
        });
}

function saveCurrentSite() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        const newLink = { name: currentTab.title, url: currentTab.url };

        chrome.runtime.sendMessage({ action: 'saveLink', link: newLink }, (response) => {
            if (response && response.success) {
                alert('Link saved successfully!');
                loadLinksList();
            } else {
                alert('Failed to save link.');
            }
        });
    });
}

function loadLastSelectedLink() {
    chrome.storage.local.get(['lastSelectedLink'], ({ lastSelectedLink }) => {
        if (lastSelectedLink) {
            window.lastSelectedLink = lastSelectedLink;
        }
    });
}

function loadLinksList() {
    chrome.runtime.sendMessage({ action: 'loadLinks' }, (response) => {
        if (response && response.links) {
            const list = document.getElementById('linksList');
            list.innerHTML = '';

            response.links.forEach((link) => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = "#";
                a.textContent = link.name || link.url;

                a.addEventListener('click', () => {
                    chrome.storage.local.get(['popupWidth', 'popupHeight'], ({ popupWidth, popupHeight }) => {
                        const width = popupWidth || 800;
                        const height = popupHeight || 600;

                        const newWindow = window.open(link.url, '_blank', `width=${width},height=${height},resizable=yes,scrollbars=yes`);
                        if (!newWindow) alert('The browser blocked opening a new window. Please allow popups for this site.');

                        chrome.storage.local.set({ lastSelectedLink: link.url });
                    });
                });

                li.appendChild(a);
                list.appendChild(li);
            });
        }
    });
}