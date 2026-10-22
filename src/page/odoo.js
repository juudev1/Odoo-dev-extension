/**
 * Read-only access to the Odoo web client. Nothing in this file patches or
 * modifies Odoo: every function reads what Odoo already exposes and returns
 * undefined when an older or newer version does not have it.
 */

export function getOdoo() {
    return typeof window.odoo === "object" && window.odoo !== null ? window.odoo : null;
}

/** Root component mounted by startWebClient (15+) or the public root (website). */
export function getRoot() {
    return getOdoo()?.__WOWL_DEBUG__?.root || null;
}

export function getEnv() {
    return getRoot()?.env || null;
}

export function getServices() {
    return getEnv()?.services || {};
}

/**
 * Odoo module by name, e.g. "@web/views/fields/field".
 * 17+ keep them in odoo.loader.modules, 15 and 16 in odoo.__DEBUG__.services.
 */
export function getModule(name) {
    const odoo = getOdoo();
    try {
        if (odoo?.loader?.modules?.get) {
            return odoo.loader.modules.get(name);
        }
        if (odoo?.__DEBUG__?.services) {
            return odoo.__DEBUG__.services[name];
        }
    } catch {
        // A module getter may throw on some builds; treat as missing.
    }
    return undefined;
}

/**
 * server_version_info is [19, 0, 0, "final", 0, ""] on stable versions and
 * ["saas~18", 4, 0, "final", 0, "e"] on SaaS ones: the major can be a string.
 */
export function parseVersion(info) {
    if (!Array.isArray(info) || !info.length) {
        return null;
    }
    let [major, minor] = info;
    let saas = false;
    if (typeof major === "string") {
        saas = major.startsWith("saas~");
        major = parseInt(major.replace(/^saas~/, ""), 10);
    }
    major = Number(major) || 0;
    minor = Number(minor) || 0;
    const enterprise = info[info.length - 1] === "e";
    return {
        major,
        minor,
        saas,
        enterprise,
        // Comparable number: 18.4 > 18.0, 17.2 > 17.0
        number: major + minor / 10,
        label: `${saas ? "saas~" : ""}${major}.${minor}`,
    };
}

export function getVersion() {
    const odoo = getOdoo();
    const info =
        odoo?.info?.server_version_info ||
        getModule("@web/session")?.session?.server_version_info ||
        odoo?.__session_info__?.server_version_info;
    return parseVersion(info);
}

/** Is the root an OWL 2 component (16+) or an OWL 1 one (15)? */
export function isOwl2(component) {
    return Boolean(component?.__owl__ && "bdom" in component.__owl__);
}

/**
 * The backend web client has the action service. The website, the portal,
 * the POS and the login page do not.
 */
export function isBackendWebClient() {
    const services = getServices();
    return Boolean(services.action && document.querySelector(".o_action_manager"));
}

/** Resolves once the web client is mounted, or with false after `timeout`. */
export function waitForWebClient(timeout = 20000) {
    return new Promise((resolve) => {
        const start = Date.now();
        const check = () => {
            const root = getRoot();
            if (root && isBackendWebClient()) {
                return resolve(true);
            }
            const elapsed = Date.now() - start;
            // A mounted root without the action service is the website, the
            // portal or the POS.
            if ((root && !getServices().action && elapsed > 3000) || elapsed > timeout) {
                return resolve(false);
            }
            setTimeout(check, 150);
        };
        check();
    });
}

/** User context as the ORM service would send it (lang, tz, uid, companies). */
export function getUserContext() {
    const services = getServices();
    const context =
        getModule("@web/core/user")?.user?.context ||
        services.user?.context ||
        getModule("@web/session")?.session?.user_context ||
        {};
    return { ...context };
}

export function getUserInfo() {
    const services = getServices();
    const user = getModule("@web/core/user")?.user;
    const session = getModule("@web/session")?.session || {};
    return {
        id: user?.userId ?? services.user?.userId ?? session.uid ?? null,
        name: user?.name ?? services.user?.name ?? session.name ?? "",
        login: user?.login ?? services.user?.userName ?? session.username ?? "",
        isAdmin: Boolean(user?.isAdmin ?? services.user?.isAdmin ?? session.is_admin),
        isSystem: Boolean(user?.isSystem ?? services.user?.isSystem ?? session.is_system),
    };
}

export function getDebugMode() {
    const odoo = getOdoo();
    return typeof odoo?.debug === "string" ? odoo.debug : odoo?.debug ? "1" : "";
}

export function getCookie(name) {
    const match = document.cookie.split("; ").find((part) => part.startsWith(`${name}=`));
    return match ? decodeURIComponent(match.slice(name.length + 1)) : "";
}
