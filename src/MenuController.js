var DBSDM = DBSDM || {};

DBSDM.Menu = (function(){
    var ns = DBSDM;
    var self = {};

    self._loadLocalStorage = function() {
        if (!ns.Diagram.allowRecent) {
            return "";
        }

        var prefix = ns.Consts.LocalStoragePrefix;

        var local = [];
        for (var i=0; i<localStorage.length; i++) {
            var key = localStorage.key(i);
            if ((new RegExp("^"+prefix)).test(key)) {
                local.push(localStorage.key(i));
            }
        }
        local.sort().reverse();

        var result = [];
        for (i=0; i<Math.min(local.length, 10); i++) {
            result.push([local[i].substring(prefix.length), "local#"+local[i], null, "allowRecent"])
        }

        result.push(["Clear local storage", "clear-local", "trash-o", "allowRecent"]);
        return result;
    };

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
     * [string] access:  Access right of Diagram needed to allow this operation, e.g. "allowFile" or "allowEdit".
     *                   Can be null or omitted if no special rights are required.
     *                   If parent menu have access right, it applies to all items in submenu
     */
    var definition = {
        attribute: [
            ["Primary", "primary", "key", "allowEdit"],
            ["Unique", "unique", ["check-square-o", "square-o"], "allowEdit"],
            ["Nullable", "nullable", ["check-square-o", "square-o"], "allowEdit"],
            ["Delete Attribute", "delete", "ban", "allowEdit"]
        ],

        entity: [
            ["Add Attribute", "attr", "list", "allowEdit"],
            [
                "Add Relation",
                [
                    ["N:M", "rel-nm"],
                    ["N:1", "rel-n1"],
                    ["1:N", "rel-1n"],
                    ["1:1", "rel-11"]
                ],
                "link", "allowEdit"
            ],
            ["Is a...", "isa", null, "allowEdit"],
            ["Fit to contents", "fit"],
            [
                "Order",
                [
                    ["Send to Front", "tofront", "level-up"],
                    ["Send to Back", "toback", "level-down"]
                ]
            ],
            ["Delete Entity", "delete", "ban", "allowEdit"]
        ],

        note: [
            ["Fit to contents", "fit"],
            [
                "Order",
                [
                    ["Send to Front", "tofront", "level-up"],
                        ["Send to Back", "toback", "level-down"]
                ]
            ],
            ["Delete Note", "delete", "ban", "allowEdit"]
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
                    ["One", "one", ["check-circle", "circle"]],
                    ["Many", "many", ["check-circle", "circle"]]
                ],
                null, "allowEdit"
            ],
            ["Identifying", "identifying", ["check-square-o", "square-o"], "allowEdit"],
            ["Required", "required", ["check-square-o", "square-o"], "allowEdit"],
            ["XOR with...", "xor", null, "allowEdit"],
            ["Remove from XOR", "remove-xor", null, "allowEdit"],
            ["Toggle Name", "name", ["check-square-o", "square-o"]]
        ],
        relation: [
            [
                "Swap",
                [
                    ["All", "swap"],
                    ["Cardinality", "swap-card"],
                    ["Identifying", "swap-ident"],
                    ["Required", "swap-req"]
                ],
                "exchange"
            ],
            ["Straighten", "straighten", "compress"],
            [
                "Order",
                [
                    ["Send to Front", "tofront", "level-up"],
                    ["Send to Back", "toback", "level-down"]
                ]
            ],
            ["Delete Relation", "delete", "ban", "allowEdit"]
        ],

        canvas: [
            ["New...", [
                ["Entity", "new-entity", "list-alt"],
                ["Note", "new-note", "sticky-note-o"]
            ], "plus", "allowEdit"],
            ["Show...", [
                ["Relation names", "toggle-rel-names", ["check-square-o", "square-o"]],
                ["Notes", "toggle-notes", ["check-square-o", "square-o"]]
            ], "eye"],
            ["Snap to grid", "snap", "th"],
            ["Zoom", [
                ["In", "zoom-in", "search-plus"],
                ["Reset", "zoom-reset", "search"],
                ["Out", "zoom-out", "search-minus"]
            ], "search"],
            ["Reset view", "reset-view", "arrows-alt"],
            ["Fullscreen", "fullscreen", "desktop"],
            ["Undo", "undo", "undo"],
            ["Redo", "redo", "repeat"],
            ["Save as...", [
                ["Model (JSON)", "save-model", "file-text-o", "allowFile"],
                ["Data (JSON)", "save-data", "file-code-o", "allowFile"],
                ["Image (PNG)", "save-image", "file-image-o", "allowFile"]
            ], "floppy-o", "allowFile"],
            ["Recent...", self._loadLocalStorage, "folder-open-o", "allowRecent"],
            ["Clear", "clear", "eraser", "allowEdit"]
        ]
    };

    self._dom = null;
    self._handlers = null;
    self._params = null;

    self.build = function() {
        // remove menu if already exists
        if (self._dom && self._dom.menu) {
            self._dom.menu.remove();
        }

        // reset state
        self._dom = {
            menu: null,
            sections: {}
        };
        self._handlers = {
            attached: {},
            active: {}
        };
        self._params = {};

        function createIconElement(icon) {
            var dom = document.createElement("i");

            if (typeof icon == "object") {
                dom.className = "fa fa-" + icon[0];
                dom.dataset.on = "fa-"+icon[0];
                dom.dataset.off = "fa-"+icon[1];
            } else {
                dom.className = "fa fa-" + icon;
            }
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

        function createMenu(menu, parentEnabled) {
            var dom = document.createElement("ul");
            for (var i in menu) {
                if (!menu.hasOwnProperty(i)) { continue; }

                var title = menu[i][0];
                var options = menu[i][1]; // options or action
                var icon = menu[i][2] || null;
                var enabled = (menu[i][3] ? self.checkPermission(menu[i][3]) : parentEnabled);

                if ((typeof options) == "function") {
                    options = options();
                }

                //
                var itemDom = document.createElement("li");
                if ((typeof options == "object")) {
                    itemDom.appendChild(createIconElement("caret-right"));
                    itemDom.appendChild(createMenu(options, enabled));
                } else {
                    itemDom.dataset.action = options;
                }
                if (!enabled) {
                    itemDom.classList.add("disabled");
                }
                itemDom.appendChild(createIcon(icon));
                itemDom.appendChild(document.createTextNode(title));

                dom.appendChild(itemDom);
            }
            return dom;
        }

        var dom = document.createElement("div");
        dom.id = "dbsdmContextMenu";

        for (var section in definition) {
            if (!definition.hasOwnProperty(section)) { continue; }
            var sectionDom = createMenu(definition[section], true);
            sectionDom.dataset.handler = section;
            dom.appendChild(sectionDom);

            this._dom.sections[section] = sectionDom;
        }

        document.body.appendChild(dom);
        this._dom.menu = dom;

        dom.onmousedown = function(e) { e.stopPropagation(); };
        dom.onclick = function(e) { DBSDM.Menu.onClick(e) };

        // turn off unavailable menu options
        if (!ns.Fullscreen.enabled()) {
            dom.querySelector("li[data-action=fullscreen]").classList.add("disabled");
        }
    };

    self.checkPermission = function(permission) {
        return ns.Diagram[permission];
    };

    self._updateMenuState = function(section) {
        var handler = this._handlers.active[section];

        if (handler.getMenuState) {
            var dom = this._dom.sections[section];
            var state = handler.getMenuState();

            for (var key in state) {
                if (!state.hasOwnProperty(key)) { return; }

                var li = dom.querySelector("li[data-action="+key+"]");
                if (li) {
                    var icon = li.querySelector("i.fa");
                    if (icon && icon.dataset.on && icon.dataset.off) {
                        icon.classList.remove(icon.dataset.off);
                        icon.classList.remove(icon.dataset.on);

                        if (state[key]) {
                            icon.classList.add(icon.dataset.on);
                        } else {
                            icon.classList.add(icon.dataset.off);
                        }
                    } else {
                        if (state[key]) {
                            li.classList.remove("disabled");
                        } else {
                            li.classList.add("disabled");
                        }
                    }
                }
            }
        }
    };

    /**
     * Attach object handler for part of menu, which will be also displayed
     * */
    self.attach = function(handler, section, params) {
        if (!this._dom.sections.hasOwnProperty(section) || this._handlers.attached.hasOwnProperty(section)) { return; }
        this._handlers.attached[section] = handler;
        this._dom.sections[section].style.display = "none";
        this._params[section] = params || null;
    };

    self.hasAttachedHandlers = function() {
        return Object.keys(this._handlers.attached).length != 0;
    };

    self.show = function(e) {
        if (!this.hasAttachedHandlers()) { // check, whether new handlers were attached since last show
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

                this._updateMenuState(section);
            } else {
                this._dom.sections[section].style.display = "none";
            }
        }
        if (!show) {
            this.hide();
            return;
        }

        var doc = document.documentElement;
        var left = e.clientX;
        var top =  e.clientY;

        if (!ns.Fullscreen.inFullscreen()) {
            left += (window.pageXOffset || doc.scrollLeft) - (doc.clientLeft || 0);
            top += (window.pageYOffset || doc.scrollTop)  - (doc.clientTop || 0);
        }

        this._dom.menu.style.left = left+"px";
        this._dom.menu.style.top = top+"px";
        this._dom.menu.style.display = "block";

        e.preventDefault();

        // attach to container of current canvas, for fullscreen
        var parent = e.target.parentNode;
        while(parent && !parent.classList.contains("dbsdmCanvas")) {
            parent = parent.parentNode;
        }
        if (parent.classList.contains("fullscreen")) {
            parent.appendChild(this._dom.menu);
        }
    };

    self.hide = function() {
        this._dom.menu.style.display = "none";
        if (this._dom.menu.parentNode != document.body) {
            document.body.appendChild(this._dom.menu);
        }
    };

    /** Event Handlers */
    self.onClick = function(e) {
        var node = e.target;

        var action;
        while (node && node.dataset && !(action = node.dataset.action)) {
            node = node.parentNode;
        }
        if (!action || node.classList.contains("disabled")) { return; }

        var handler;
        while (node && node.dataset && !(handler = node.dataset.handler)) {
            node = node.parentNode;
        }
        if (handler && this._handlers.active[handler] && this._handlers.active[handler].handleMenu) {
            this._handlers.active[handler].handleMenu(action, this._params[handler]);
            this.hide();
        }
    };

    return self;
}());
