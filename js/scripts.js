let lastSelectedLink = '';

document.addEventListener('DOMContentLoaded', () => {
    const versionNumber = chrome.runtime.getManifest().version;
    document.querySelectorAll('[version]').forEach(el => el.textContent = versionNumber);

    const year = new Date().getFullYear();
    const yearElement = document.getElementById("year");
    yearElement.textContent = (year === 2024) ? year : `2024 - ${year}`;

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
        if (autostartBtn) autostartBtn.textContent = '✅';
    });

    loadLinks();
});

function saveLink() {
    const nameInput = document.getElementById('urlName');
    const urlInput = document.getElementById('urlInput');

    const name = nameInput.value.trim();
    const url = urlInput.value.trim();

    if (!url || !isValidURL(url) || !name) {
        alert('Please enter a name and a valid URL.\nFor example:\nGoogle site | https://google.com/');
        return;
    }

    const newLink = { name, url };
    chrome.runtime.sendMessage({ action: 'saveLink', link: newLink }, response => {
        if (response?.success) {
            loadLinks();
            nameInput.value = '';
            urlInput.value = '';
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

        const nameEl = document.createElement('p');
        nameEl.textContent = 'Name: ' + link.name;

        const urlEl = document.createElement('p');
        urlEl.textContent = 'URL: ' + link.url;

        const deleteButton = document.createElement('button');
        deleteButton.className = 'deleteButton';
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => deleteLink(index));

        const selectButton = document.createElement('button');
        selectButton.className = 'selectButton';
        selectButton.textContent = 'Select';
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

        linkElement.append(nameEl, deleteButton, selectButton, urlEl);
        container.appendChild(linkElement);
    });

    if (links.length === 1) container.querySelector('.selectButton')?.click();
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

        const newWindow = window.open(url, '_blank', `width=${width},height=${height},resizable=yes,scrollbars=yes`);
        if (newWindow) newWindow.focus();
        else alert('The browser blocked opening a new window. Please allow popups for this site.');
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

    chrome.storage.local.set({ popupWidth: width, popupHeight: height }, () => console.log('Popup size saved.'));
    button.textContent = 'Saved';
    setTimeout(() => button.textContent = '🗔 Save size', 2000);
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

            chrome.runtime.sendMessage({ action: 'importLinks', links }, response => {
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
