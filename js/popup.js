document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('optionsButton').addEventListener('click', openOptionsPage);

    var shareLink = document.getElementById('shareLink');

    shareLink.addEventListener('click', function (event) {
        event.preventDefault();

        var urlToCopy = "https://sehic.rf.gd/";

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
    });

    document.getElementById('openButton').addEventListener('click', function () {
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
    });
});

function openOptionsPage() {
    chrome.runtime.openOptionsPage();
}
