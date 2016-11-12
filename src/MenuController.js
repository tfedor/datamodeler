var DBSDM = DBSDM || {};

DBSDM.Menu = {

    /**
     * Menu is defined in sections, each section can be independently hidden or shown, based on when user invokes menu
     * Each section has a name, which also servers for attaching menu handlers.
     *
     * Menu definition itself is a array of arrays, where each menu item is array of 2 or 3 elements:
     * [string] title:   What user sees
     * [string|submenu]: Either string, which is attribute to attach menu handler and tells what item was clicked
     *                   or submenu definition, which is array of arrays exactly like section itself
     *                   (basically section without name)
     * [string] icon:    Name of icon used from FontAwesome set, without fa- prefix. Can be null or omitted if no icon
     */
    definition: {
        attribute: [
            ["Primary", "primary", "key"],
            ["Unique", "unique"],
            ["Nullable", "nullable"],
            ["Delete Attribute", "delete", "ban"]
        ],

        entity: [
            ["Add Attribute", "attr", "list"],
            [
                "Add Relation",
                [
                    ["N:M", "rel-nm"],
                    ["N:1", "rel-n1"],
                    ["1:N", "rel-1n"],
                    ["1:1", "rel-11"]
                ],
                "link"
            ],
            ["Is a...", "isa"],
            ["Fit to contents", "fit"],
            ["Delete Entity", "delete", "ban"]
        ],

        relationMiddle: [
            ["Reset point", "reset", "refresh"]
        ],
        relationCP: [
            ["Remove point", "cp-delete"]
        ],
        relationLeg: [
            [
                "Cardinality",
                [
                    ["One", "one"],
                    ["Many", "many"]
                ]
            ],
            ["Identifying", "identifying", "square-o"], // TODO icon
            ["Required", "required", "check-square-o"], // TODO icon
            ["Toggle Name", "name"]
        ],
        relation: [
            ["Straighten", "straighten", "compress"],
            ["Send to Back", "toback", "level-down"],
            ["Delete Relation", "delete"]
        ]
    },

    _dom: {
        menu: null,
        sections: {}
    },
    _handlers: {
        attached: {},
        active: {}
    },
    _params: {},

    build: function() {
        function createIconElement(icon) {
            var dom = document.createElement("i");
            dom.className = "fa fa-" + icon;
            return dom;
        }

        function createIcon(icon) {
            var dom = document.createElement("div");
            dom.className = "icon";

            if (icon) {
                dom.appendChild(createIconElement(icon));
            } else {
                dom.innerHTML = "&nbsp;";
            }
            return dom;
        }

        function createMenu(menu) {
            var dom = document.createElement("ul");
            for (var i in menu) {
                if (!menu.hasOwnProperty(i)) { continue; }

                var title = menu[i][0];
                var options = menu[i][1]; // options or action
                var icon = menu[i][2] || null;

                //
                var itemDom = document.createElement("li");
                if ((typeof options == "object")) {
                    itemDom.appendChild(createIconElement("caret-right"));
                    itemDom.appendChild(createMenu(options));
                } else {
                    itemDom.dataset.action = options;
                }
                itemDom.appendChild(createIcon(icon));
                itemDom.appendChild(document.createTextNode(title));

                dom.appendChild(itemDom);
            }
            return dom;
        }

        var dom = document.createElement("div");
        dom.id = "dbsdmContextMenu";

        for (var section in this.definition) {
            if (!this.definition.hasOwnProperty(section)) { continue; }
            var sectionDom = createMenu(this.definition[section]);
            sectionDom.dataset.handler = section;
            dom.appendChild(sectionDom);

            this._dom.sections[section] = sectionDom;
        }

        document.body.appendChild(dom);
        this._dom.menu = dom;

        dom.onclick = function(e) { DBSDM.Menu.onClick(e) };
    },

    /**
     * Attach object handler for part of menu, which will be also displayed
     * */
    attach: function(handler, section, params) {
        if (!this._dom.sections.hasOwnProperty(section)) { return; }
        this._handlers.attached[section] = handler;
        this._dom.sections[section].style.display = "none";
        this._params[section] = params || null;
    },

    show: function(e) {
        if (this._handlers.attached.length == 0) { // check, whether new handlers were attached since last show
            this.hide();
            return;
        }
        this._handlers.active = {};
        Object.assign(this._handlers.active, this._handlers.attached);
        this._handlers.attached = {};

        var show = false;
        for (var section in this._dom.sections) {
            if (this._dom.sections.hasOwnProperty(section) && this._handlers.active.hasOwnProperty(section)) {
                this._dom.sections[section].style.display = "block";
                show = true;
            } else {
                this._dom.sections[section].style.display = "none";
            }
        }
        if (!show) {
            this.hide();
            return;
        }

        var doc = document.documentElement;
        var left = e.clientX + (window.pageXOffset || doc.scrollLeft) - (doc.clientLeft || 0);
        var top =  e.clientY + (window.pageYOffset || doc.scrollTop)  - (doc.clientTop || 0);

        this._dom.menu.style.left = left+"px";
        this._dom.menu.style.top = top+"px";
        this._dom.menu.style.display = "block";

        e.preventDefault();
    },

    hide: function() {
        this._dom.menu.style.display = "none";
    },

    /** Event Handlers */
    onClick: function(e) {
        var node = e.target;

        var action;
        while (node && node.dataset && !(action = node.dataset.action)) {
            node = node.parentNode;
        }
        if (!action) { return; }

        var handler;
        while (node && node.dataset && !(handler = node.dataset.handler)) {
            node = node.parentNode;
        }
        if (handler && this._handlers.active[handler] && this._handlers.active[handler].handleMenu) {
            this._handlers.active[handler].handleMenu(action, this._params[handler]);
            this.hide();
        }
    }
};
