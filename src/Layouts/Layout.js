import './Layout.css';

const Layout = ({ children }) => {
    const handleToggleDrawer = () => {
        const drawer = document.getElementById('drawer-example');
        const isVisible = drawer.getAttribute('data-drawer-show') === 'drawer-example';

        if (isVisible) {
            drawer.setAttribute('data-drawer-show', '');
            drawer.style.transform = 'translateX(100%)';
        } else {
            drawer.setAttribute('data-drawer-show', 'drawer-example');
            drawer.style.transform = 'translateX(0)';
        }
    }

    return (
        <div>
            <button onClick={handleToggleDrawer} id="odoo-dev-btn" type="button" data-drawer-target="drawer-example" data-drawer-show="drawer-example" aria-controls="drawer-example">
                Odoo Dev
            </button>

            <div id="drawer-example" class="fixed top-0 right-0 z-40 h-screen p-4 overflow-y-auto transition-transform translate-x-full bg-white w-80 dark:bg-gray-800" tabindex="-1" aria-labelledby="drawer-label">
                <h5 id="drawer-label" class="inline-flex items-center mb-4 text-base font-semibold text-gray-500 dark:text-gray-400"><svg class="w-4 h-4 me-2.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z" />
                </svg>Odoo Development Extension</h5>
                <button onClick={handleToggleDrawer} type="button" data-drawer-hide="drawer-example" aria-controls="drawer-example" class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 absolute top-2.5 end-2.5 flex items-center justify-center dark:hover:bg-gray-600 dark:hover:text-white" >
                    <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                    </svg>
                    <span class="sr-only">Close menu</span>
                </button>

                <p class="mb-6 text-sm text-gray-500 dark:text-gray-400">
                    Odoo Development Extension is a tool that helps you to develop Odoo modules faster and easier. It provides a set of tools to help you in your development process. It is a must-have tool for Odoo developers.
                </p>


                {children}

            </div>
        </div>
    );
}

export default Layout;