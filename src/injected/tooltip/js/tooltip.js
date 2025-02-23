odoo.define('odoo_dev.services.tooltip', ['@web/core/registry'], function (require) {
    const { useService } = require("@web/core/utils/hooks");
    const { useEffect, useRef } = require("@odoo/owl");

    function useDevinfo(refName, params) {
        const devinfo = useService("devinfo");
        const ref = useRef(refName);
        useEffect(
            (el) => devinfo.add(el, params),
            () => [ref.el]
        );
    }

    return {
        useDevinfo: useDevinfo
    };
});