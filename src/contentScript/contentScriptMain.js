window.onload = (event) => {
    console.log('page is fully loaded');

};

//receive info from content script   
window.addEventListener("message", (event) => {
    const { data } = event;
    if (data.type && data.type === 'FROM_PAGE') {
        if (data.state && data.state != "SOME STATE") {
            console.log(data.state);
            const script = document.body.appendChild(document.createElement('script'));
            script.src = data.state;
            script.onload = () => {
                console.log('injected odoo.js');
            };
        }
    }

}, false);

//post something back to content script
window.postMessage(
    {
        type: 'FROM_PAGE',
        state: 'some state'
    },
    "*"
);