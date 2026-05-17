document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('optionsButton').addEventListener('click', openOptionsPage);
    document.getElementById('openButton').addEventListener('click', openLastSelectedLink);
    document.getElementById('saveSiteButton').addEventListener('click', saveCurrentSite);
    document.getElementById('searchInput').addEventListener('input', filterLinks);

    const shareLink = document.getElementById('shareLink');
    shareLink.addEventListener('click', copyShareLink);

    loadLinksList();
});

function openOptionsPage() {
    chrome.runtime.openOptionsPage();
}

function openLastSelectedLink() {
    chrome.storage.local.get(['lastSelectedLink', 'popupWidth', 'popupHeight'], ({ lastSelectedLink, popupWidth, popupHeight }) => {
        if (lastSelectedLink) {
            const width = popupWidth || 800;
            const height = popupHeight || 600;
            window.open(lastSelectedLink, '_blank', `width=${width},height=${height},resizable=yes,scrollbars=yes`);
        } else {
            showNotification('No link selected.', 'error');
        }
    });
}

function copyShareLink(event) {
    event.preventDefault();
    const urlToCopy = "https://addons.mozilla.org/en-US/firefox/addon/webwidgetizer/";

    navigator.clipboard.writeText(urlToCopy)
        .then(() => {
            const shareLink = document.getElementById('shareLink');
            shareLink.textContent = 'Copied!';
            setTimeout(() => { shareLink.textContent = 'Share'; }, 2000);
        })
        .catch(err => {
            console.error(err);
        });
}

function saveCurrentSite() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) return;
        const currentTab = tabs[0];

        let autoTag = 'site';
        try {
            const urlObj = new URL(currentTab.url);
            autoTag = urlObj.hostname.replace('www.', '').split('.')[0];
        } catch (e) {
            autoTag = 'site';
        }

        const newLink = {
            name: currentTab.title || currentTab.url,
            url: currentTab.url,
            tag: autoTag.toLowerCase()
        };

        chrome.runtime.sendMessage({ action: 'saveLink', link: newLink }, (response) => {
            if (response && response.success) {
                showNotification('Site saved successfully!');
                loadLinksList();
            } else {
                showNotification('Failed to save site.', 'error');
            }
        });
    });
}

function loadLinksList() {
    chrome.runtime.sendMessage({ action: 'loadLinks' }, (response) => {
        if (response && response.links) {
            window.allLinks = response.links;
            renderLinks(response.links);
        }
    });
}

function renderLinks(links) {
    const list = document.getElementById('linksList');
    list.innerHTML = '';

    if (links.length === 0) {
        list.innerHTML = `<li class="empty-state">No links found.</li>`;
        return;
    }

    links.forEach((link) => {
        const li = document.createElement('li');
        li.className = 'link-item';

        const linkWrapper = document.createElement('div');
        linkWrapper.className = 'link-wrapper';

        const a = document.createElement('a');
        a.href = "#";
        a.className = 'link-title';
        a.textContent = link.name || link.url;
        a.title = link.url;

        a.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.storage.local.get(['popupWidth', 'popupHeight'], ({ popupWidth, popupHeight }) => {
                const width = popupWidth || 800;
                const height = popupHeight || 600;

                window.open(link.url, '_blank', `width=${width},height=${height},resizable=yes,scrollbars=yes`);
                chrome.storage.local.set({ lastSelectedLink: link.url });
            });
        });

        linkWrapper.appendChild(a);

        if (link.tag) {
            const tagBadge = document.createElement('span');
            tagBadge.className = 'tag-badge';
            tagBadge.textContent = link.tag;
            linkWrapper.appendChild(tagBadge);
        }

        li.appendChild(linkWrapper);
        list.appendChild(li);
    });
}

function filterLinks() {
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    if (!window.allLinks) return;

    const filtered = window.allLinks.filter(link => {
        const nameMatch = (link.name || '').toLowerCase().includes(query);
        const urlMatch = (link.url || '').toLowerCase().includes(query);
        const tagMatch = (link.tag || '').toLowerCase().includes(query);
        return nameMatch || urlMatch || tagMatch;
    });

    renderLinks(filtered);
}

function showNotification(text, type = 'success') {
    const existing = document.querySelector('.popup-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `popup-toast ${type}`;
    toast.textContent = text;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}