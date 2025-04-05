odoo.define('odoo_dev.version_utils', [], function (require) {
    'use strict';

    const versionInfo = odoo.info && odoo.info.server_version_info;
    const majorVersion = (versionInfo && versionInfo.length > 0) ? versionInfo[0] : 0; // Default a 0 si no se encuentra

    const odooVersion = {
        major: majorVersion,
        isV16: majorVersion === 16,
        isV17: majorVersion === 17,
        isV18: majorVersion === 18,
        isV17Plus: majorVersion >= 17, // Útil para lógica >= 17
        isV18Plus: majorVersion >= 18, // Útil para lógica >= 18
    };

    // Congelar el objeto para evitar modificaciones accidentales
    Object.freeze(odooVersion);

    return odooVersion;
});