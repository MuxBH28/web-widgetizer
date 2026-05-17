let lastSelectedLink = '';

document.addEventListener('DOMContentLoaded', () => {
    const versionNumber = chrome.runtime.getManifest().version;
    document.querySelectorAll('[version]').forEach(el => el.textContent = versionNumber);

    const year = new Date().getFullYear();
    const yearElement = document.getElementById("year");
    yearElement.textContent = `2024 - ${year}`;

    document.getElementById('saveButton').addEventListener('click', saveLink);
    document.getElementById('openPopUp').addEventListener('click', () => {
        chrome.storage.local.get(['lastSelectedLink'], ({ lastSelectedLink }) => {
            if (!lastSelectedLink) return alert('No link is selected.');
            openLinkInNewWindow(lastSelectedLink);
        });
    });
    document.getElementById('saveSizeButton').addEventListener('click', saveSize);
    document.getElementById('autostartButton')?.addEventListener('click', toggleAutostart);
    document.getElementById('exportButton').addEventListener('click', exportLinks);
    document.getElementById('importButton').addEventListener('click', () => document.getElementById('importFile').click());
    document.getElementById('importFile').addEventListener('change', importLinks);

    chrome.storage.local.get(['lastSelectedLink', 'popupWidth', 'popupHeight', 'autostart'], data => {
        lastSelectedLink = data.lastSelectedLink || '';
        if (data.popupWidth) document.getElementById('popupWidth').placeholder = data.popupWidth;
        if (data.popupHeight) document.getElementById('popupHeight').placeholder = data.popupHeight;
        const autostartBtn = document.getElementById('autostartButton');
        if (autostartBtn && data.autostart) autostartBtn.textContent = '✅';
    });

    loadLinks();
});

function saveLink() {
    const nameInput = document.getElementById('urlName');
    const urlInput = document.getElementById('urlInput');
    const tagInput = document.getElementById('urlTag');

    const name = nameInput.value.trim();
    const url = urlInput.value.trim();
    let tag = tagInput.value.trim().toLowerCase();

    if (!url || !isValidURL(url) || !name) {
        alert('Please enter a name and a valid URL.\nFor example:\nGoogle site | https://google.com/');
        return;
    }

    if (!tag) {
        try {
            const urlObj = new URL(url);
            tag = urlObj.hostname.replace('www.', '').split('.')[0];
        } catch (e) {
            tag = 'site';
        }
    }

    const newLink = { name, url, tag };
    chrome.runtime.sendMessage({ action: 'saveLink', link: newLink }, response => {
        if (response?.success) {
            loadLinks();
            nameInput.value = '';
            urlInput.value = '';
            tagInput.value = '';
        } else {
            alert('Failed to save link.');
        }
    });
}

function isValidURL(url) {
    return /^(ftp|http|https):\/\/[^ "]+$/.test(url);
}

function loadLinks() {
    chrome.runtime.sendMessage({ action: 'loadLinks' }, response => {
        if (response?.links) displayLinks(response.links);
        else alert('Failed to load links.');
    });
}

function displayLinks(links) {
    const container = document.getElementById('linksContainer');
    container.textContent = '';

    links.forEach((link, index) => {
        const linkElement = document.createElement('div');
        linkElement.className = 'options-link-card';

        const dataLine = document.createElement('div');
        dataLine.className = 'card-data';

        const metaLine = document.createElement('div');
        metaLine.className = 'meta-line';

        const titleEl = document.createElement('span');
        titleEl.className = 'title';
        titleEl.textContent = link.name;
        metaLine.appendChild(titleEl);

        if (link.tag) {
            const tagSpan = document.createElement('span');
            tagSpan.className = 'tag-badge';
            tagSpan.textContent = link.tag;
            metaLine.appendChild(tagSpan);
        }

        const urlEl = document.createElement('p');
        urlEl.className = 'url';
        urlEl.textContent = link.url;

        dataLine.append(metaLine, urlEl);

        const actionsLine = document.createElement('div');
        actionsLine.className = 'card-actions';

        const selectButton = document.createElement('button');
        selectButton.className = 'selectButton';
        selectButton.textContent = lastSelectedLink === link.url ? 'Selected' : 'Select';
        if (lastSelectedLink === link.url) selectButton.disabled = true;

        selectButton.dataset.link = link.url;
        selectButton.addEventListener('click', () => {
            if (lastSelectedLink) {
                const prevButton = document.querySelector(`.selectButton[data-link="${lastSelectedLink}"]`);
                if (prevButton) {
                    prevButton.textContent = 'Select';
                    prevButton.disabled = false;
                }
            }

            lastSelectedLink = link.url;
            selectButton.textContent = 'Selected';
            selectButton.disabled = true;

            openLinkInNewWindow(link.url);
        });

        const deleteButton = document.createElement('button');
        deleteButton.className = 'deleteButton';
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => deleteLink(index));

        actionsLine.append(selectButton, deleteButton);
        linkElement.append(dataLine, actionsLine);
        container.appendChild(linkElement);
    });
}

function deleteLink(index) {
    chrome.runtime.sendMessage({ action: 'deleteLink', index }, response => {
        if (response?.success) loadLinks();
        else alert('Failed to delete link.');
    });
}

function openLinkInNewWindow(url) {
    chrome.storage.local.set({ lastSelectedLink: url });
    chrome.storage.local.get(['popupWidth', 'popupHeight'], ({ popupWidth, popupHeight }) => {
        const width = popupWidth || 800;
        const height = popupHeight || 600;
        window.open(url, '_blank', `width=${width},height=${height},resizable=yes,scrollbars=yes`);
    });
}

function saveSize() {
    const width = parseInt(document.getElementById('popupWidth').value);
    const height = parseInt(document.getElementById('popupHeight').value);
    const button = document.getElementById('saveSizeButton');

    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
        alert("Width and height must be positive numbers");
        return;
    } else if (width > 3840 || height > 2160) {
        alert("Resolution over 4k is not supported. Use e.g., 1280x720");
        return;
    }

    chrome.storage.local.set({ popupWidth: width, popupHeight: height });
    button.textContent = 'Saved';
    setTimeout(() => button.textContent = 'Update Dimensions', 2000);
}

function toggleAutostart() {
    const btn = document.getElementById('autostartButton');
    chrome.storage.local.get('autostart', ({ autostart }) => {
        const newState = !autostart;
        chrome.storage.local.set({ autostart: newState });
        btn.textContent = newState ? '✅' : '❌';
    });
}

function exportLinks() {
    chrome.runtime.sendMessage({ action: 'loadLinks' }, response => {
        if (!response?.links) return alert('Failed to load links for export.');
        const blob = new Blob([JSON.stringify(response.links, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'links.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

function importLinks(event) {
    const file = event.target.files[0];
    if (!file || file.type !== 'application/json') return alert('Please select a valid JSON file.');

    const reader = new FileReader();
    reader.onload = e => {
        try {
            const links = JSON.parse(e.target.result);
            if (!Array.isArray(links)) return alert('Invalid file format.');

            chrome.runtime.sendMessage({ action: 'importLinks', links: links }, response => {
                if (response?.success) {
                    loadLinks();
                    alert('Links imported successfully.');
                } else alert('Failed to import links.');
            });
        } catch {
            alert('Error reading file.');
        }
    };
    reader.readAsText(file);
}