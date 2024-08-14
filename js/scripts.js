let lastSelectedLink = '';

document.addEventListener('DOMContentLoaded', function () {
    {
        let versionNumber = chrome.runtime.getManifest().version;
        let versionElements = document.querySelectorAll('[version]');
        versionElements.forEach(function (element) {
            element.textContent = versionNumber;
        });
    }
    {
        const d = new Date();
        let year = d.getFullYear();
        let yearElement = document.getElementById("year");
        if (year === 2024) {
            yearElement.textContent = year;
        } else {
            yearElement.textContent = "2024 - " + year;
        }
    }
    {
        document.getElementById('saveButton').addEventListener('click', saveLink);
        loadLinks();
    }
    {
        document.getElementById('openPopUp').addEventListener('click', function () {
            console.log('Open PopUp button clicked');
            chrome.storage.local.get(['lastSelectedLink'], function (data) {
                let lastSelectedLink = data.lastSelectedLink;
                console.log('Last selected link:', lastSelectedLink);

                if (!lastSelectedLink) {
                    alert('No link is selected.');
                    return;
                }

                openLinkInNewWindow(lastSelectedLink);
            });
        });
    }
    {
        document.getElementById('saveSizeButton').addEventListener('click', saveSize);
        chrome.storage.local.get(['popupWidth', 'popupHeight'], function (data) {
            if (data.popupWidth !== undefined && data.popupHeight !== undefined) {
                document.getElementById('popupWidth').placeholder = data.popupWidth;
                document.getElementById('popupHeight').placeholder = data.popupHeight;
            }
        });
    }
    {
        let autostartButton = document.getElementById('autostartButton');

        if (autostartButton) {
            autostartButton.addEventListener('click', function () {
                chrome.storage.local.get('autostart', function (data) {
                    let autostart = data.autostart || false;

                    if (!autostart) {
                        autostartButton.textContent = '✅';
                        chrome.storage.local.set({ autostart: true });
                    } else {
                        autostartButton.textContent = '❌';
                        chrome.storage.local.set({ autostart: false });
                    }
                });
            });
        } else {
            console.error('Element with ID "autostartButton" not found.');
        }

        chrome.storage.local.get('autostart', function (data) {
            let autostart = data.autostart || false;

            if (autostart) {
                autostartButton.textContent = '✅';
            }
        });
    }
    {
        chrome.storage.local.get(['lastSelectedLink'], function (data) {
            let storedLastSelectedLink = data.lastSelectedLink;

            if (storedLastSelectedLink) {
                lastSelectedLink = storedLastSelectedLink;

                let selectedButton = document.querySelector('.selectButton[data-link="' + lastSelectedLink + '"]');
                if (selectedButton) {
                    selectedButton.textContent = 'Selected';
                    selectedButton.disabled = true;
                }
            }
        });
    }
});

function saveLink() {
    let nameInput = document.getElementById('urlName');
    let urlInput = document.getElementById('urlInput');

    let name = nameInput.value.trim();
    let url = urlInput.value.trim();

    if (!url || !isValidURL(url) || !name) {
        alert('Please enter a name and a valid URL.\nFor example:\nGoogle site | https://google.com/');
        return;
    }

    let newLink = { name: name, url: url };

    chrome.runtime.sendMessage({ action: 'saveLink', link: newLink }, function (response) {
        if (response && response.success) {
            loadLinks();
            nameInput.value = '';
            urlInput.value = '';
        } else {
            alert('Failed to save link.');
        }
    });
}

function isValidURL(url) {
    let urlPattern = /^(ftp|http|https):\/\/[^ "]+$/;
    return urlPattern.test(url);
}

function loadLinks() {
    chrome.runtime.sendMessage({ action: 'loadLinks' }, function (response) {
        if (response && response.links) {
            displayLinks(response.links);
        } else {
            alert('Failed to load links.');
        }
    });
}

function displayLinks(links) {
    let linksContainer = document.getElementById('linksContainer');
    linksContainer.textContent = '';

    links.forEach(function (link, index) {
        let linkElement = document.createElement('div');

        let nameElement = document.createElement('p');
        nameElement.textContent = 'Name: ' + link.name;

        let urlElement = document.createElement('p');
        urlElement.textContent = 'URL: ' + link.url;

        let deleteButton = document.createElement('button');
        deleteButton.className = 'deleteButton';
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', function () {
            deleteLink(index);
        });

        let selectButton = document.createElement('button');
        selectButton.className = 'selectButton';
        selectButton.textContent = 'Select';
        selectButton.setAttribute('data-link', link.url);
        selectButton.addEventListener('click', function () {
            if (lastSelectedLink !== '') {
                let previouslySelectedButton = document.querySelector('.selectButton[data-link="' + lastSelectedLink + '"]');
                if (previouslySelectedButton) {
                    previouslySelectedButton.textContent = 'Select';
                    previouslySelectedButton.disabled = false;
                }
            }

            lastSelectedLink = link.url;

            selectButton.textContent = 'Selected';
            selectButton.disabled = true;

            openLinkInNewWindow(link.url);
        });

        linkElement.appendChild(nameElement);
        linkElement.appendChild(deleteButton);
        linkElement.appendChild(selectButton);
        linkElement.appendChild(urlElement);

        linksContainer.appendChild(linkElement);
    });

    if (links.length === 1) {
        let selectButton = linksContainer.querySelector('.selectButton');
        selectButton.click();
    }
}

function deleteLink(index) {
    chrome.runtime.sendMessage({ action: 'deleteLink', index: index }, function (response) {
        if (response && response.success) {
            loadLinks();
        } else {
            alert('Failed to delete link.');
        }
    });
}

function openLinkInNewWindow(url) {
    chrome.storage.local.set({ lastSelectedLink: url });

    chrome.storage.local.get(['popupWidth', 'popupHeight'], function (data) {
        let width = data.popupWidth || 800;
        let height = data.popupHeight || 600;

        let newWindow = window.open(url, '_blank', 'width=' + width + ',height=' + height + ',resizable=yes,scrollbars=yes');

        if (newWindow) {
            newWindow.focus();
        } else {
            alert('The browser blocked opening a new window. Please allow popups for this site.');
        }
    });
}

function saveSize() {
    let width = parseInt(document.getElementById('popupWidth').value);
    let height = parseInt(document.getElementById('popupHeight').value);
    let button = document.getElementById('saveSizeButton');

    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
        alert("Width and height must be positive numbers");
    } else if (width > 3840 || height > 2160) {
        alert("That is over 4k resolution, please choose a normal resolution, e.g., 1280x720px");
    } else {
        chrome.storage.local.set({ popupWidth: width, popupHeight: height }, function () {
            console.log('Popup size saved successfully.');
        });
        button.textContent = 'Saved';
        setTimeout(function () {
            button.textContent = '🗔 Save size';
        }, 2000);
    }
}

function selectLink(link) {
    let previouslySelectedButton = document.querySelector('.selectButton[data-link="' + lastSelectedLink + '"]');
    if (previouslySelectedButton) {
        previouslySelectedButton.textContent = 'Select';
        previouslySelectedButton.disabled = false;
    }

    lastSelectedLink = link;

    let selectedButton = document.querySelector('.selectButton[data-link="' + lastSelectedLink + '"]');
    if (selectedButton) {
        selectedButton.textContent = 'Selected';
        selectedButton.disabled = true;
    }

    chrome.storage.local.set({ lastSelectedLink: lastSelectedLink });
}
