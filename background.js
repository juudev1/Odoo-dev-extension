chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete') {
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: [
                // 'injected/tailwind.js',
                'injected/odoo.js'
            ],
            world: chrome.scripting.ExecutionWorld.MAIN,
        }).then(function () {
            console.log('Injected odoo.js');
        }).catch(function (err) {
            console.error('Failed to inject odoo.js', err);
        });


    }
});

