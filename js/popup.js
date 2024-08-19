document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('optionsButton').addEventListener('click', openOptionsPage);
    document.getElementById('openButton').addEventListener('click', openLastSelectedLink);
    document.getElementById('saveSiteButton').addEventListener('click', saveCurrentSite);

    var shareLink = document.getElementById('shareLink');
    shareLink.addEventListener('click', copyShareLink);

    loadLastSelectedLink();
});

function openOptionsPage() {
    chrome.runtime.openOptionsPage();
}

function openLastSelectedLink() {
    chrome.storage.local.get(['lastSelectedLink'], function (data) {
        let lastSelectedLink = data.lastSelectedLink;
        if (lastSelectedLink) {
            chrome.storage.local.get(['popupWidth', 'popupHeight'], function (data) {
                let width = data.popupWidth || 800;
                let height = data.popupHeight || 600;

                let newWindow = window.open(lastSelectedLink, '_blank', 'width=' + width + ',height=' + height + ',resizable=yes,scrollbars=yes');

                if (!newWindow) {
                    alert('The browser blocked opening a new window. Please allow popups for this site.');
                }
            });
        } else {
            alert('No link is selected.');
        }
    });
}

function copyShareLink(event) {
    event.preventDefault();

    var urlToCopy = "https://sehic.rf.gd/?project=WebWidgetizer";

    var tempTextarea = document.createElement('textarea');
    tempTextarea.value = urlToCopy;
    document.body.appendChild(tempTextarea);

    tempTextarea.select();
    tempTextarea.setSelectionRange(0, 99999);

    document.execCommand('copy');

    document.body.removeChild(tempTextarea);

    shareLink.textContent = 'Copied';

    setTimeout(function () {
        shareLink.textContent = 'Share';
    }, 2000);
}

function saveCurrentSite() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        let currentTab = tabs[0];
        let currentUrl = currentTab.url;
        let currentTitle = currentTab.title;

        let newLink = { name: currentTitle, url: currentUrl };

        chrome.runtime.sendMessage({ action: 'saveLink', link: newLink }, function (response) {
            if (response && response.success) {
                alert('Link saved successfully!');
            } else {
                alert('Failed to save link.');
            }
        });
    });
}

function loadLastSelectedLink() {
    chrome.storage.local.get(['lastSelectedLink'], function (data) {
        let storedLastSelectedLink = data.lastSelectedLink;
        if (storedLastSelectedLink) {
            lastSelectedLink = storedLastSelectedLink;
        }
    });
}
