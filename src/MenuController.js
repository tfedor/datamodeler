var DBSDM = DBSDM || {};

DBSDM.Menu = (function(){
    var ns = DBSDM;
    var self = {};

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
    var definition = {
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
        ],

        canvas: [
            ["Snap to grid", "snap", "th"],
            ["Zoom", [
                ["In", "zoom-in", "search-plus"],
                ["Reset", "zoom-reset", "search"],
                ["Out", "zoom-out", "search-minus"]
            ], "search"],
            ["Reset view", "reset-view", "arrows-alt"],
            ["Fullscreen", "fullscreen", "desktop"],
            ["Export", "export", "external-link-square"],
            ["Save as image", "image", "file-image-o"]
        ]
    };

    self._dom = {
        menu: null,
        sections: {}
    };
    self._handlers = {
        attached: {},
        active: {}
    };
    self._params = {};

    self.build = function() {
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

        for (var section in definition) {
            if (!definition.hasOwnProperty(section)) { continue; }
            var sectionDom = createMenu(definition[section]);
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
        if (!ns.Diagram.allowFile) {
            dom.querySelector("li[data-action=export]").classList.add("disabled");
            dom.querySelector("li[data-action=image]").classList.add("disabled");
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
