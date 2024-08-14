chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.action === 'modifyLinks') {
        const links = document.querySelectorAll('a');
        links.forEach(link => link.setAttribute('target', '_top'));
    }
});
