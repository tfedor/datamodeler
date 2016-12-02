var DBSDM = DBSDM || {};

/**
 * Canvas controller
 * Creates canvas which is used to manipulate other elements
 */
DBSDM.Diagram = (function() {
    var ns = DBSDM;
    var self = {};

    /** Should only be read */
    self.allowEdit = true;
    self.allowFile = true;
    self.showTutorial = true;

    self.init = function(options){
        options = options || {};
        if (typeof options.allowEdit == "boolean") { self.allowEdit = options.allowEdit; }
        if (typeof options.allowFile == "boolean") { self.allowFile = options.allowFile; }
        if (typeof options.showTutorial == "boolean") { self.showTutorial = options.showTutorial; }
        var confirmLeave = false;
        if (typeof options.confirmLeave == "boolean") { confirmLeave = options.confirmLeave; }

        ns.Menu.build();

        // create shared hidden svg for defs
        var svg = document.body.appendChild(ns.Element.el("svg", {id: "dbsdmShared"}));
        this._defs = svg.appendChild(ns.Element.el("defs"));

        this._createEntityElements();
        this._createAttributeElements();
        this._createRelationElements();
        this._createRelationLegElements();

        // global events
        if (confirmLeave) {
            window.onbeforeunload = function(e) {
                var dialog = "Are you sure you want to leave? Your model may not have been saved.";
                e.returnValue = dialog;
                return dialog;
            };
        }

        window.addEventListener('keypress',function(e){
            if (ns.Control.Entity.activeEntity) {
                ns.Control.Entity.activeEntity.onKeyPress(e);
            }
        });
        window.addEventListener("mousedown", function(e) {
            ns.Menu.hide();
            if (ns.Control.Entity.activeEntity) {
                ns.Control.Entity.activeEntity.deactivate();
            }
        });
        ns.Fullscreen.setEvents(function(e) {
            var el = ns.Fullscreen.fullscreenElement();
            if (el) {
                el.classList.add("fullscreen");
            } else {
                document.querySelector(".fullscreen").classList.remove("fullscreen");
            }
            if (ns.Fullscreen.lastCanvas) {
                ns.Fullscreen.lastCanvas.updateViewbox();
            }
        });
    };


    // svg elements
    self._sharedElementName = function(name) {
        return name;
    };

    self.hasSharedElement = function(name) {
        return document.getElementById(this._sharedElementName(name)) != null;
    };

    self.createSharedElement = function(name, element) {
        ns.Element.attr(element, { id: this._sharedElementName(name) });
        this._defs.appendChild(element);
    };

    self.getSharedElement = function(name, attrs) {
        if (!this.hasSharedElement(name)) { return null; }
        return ns.Element.use(this._sharedElementName(name), attrs);
    };

    self.getSharedElementId = function(name) {
        if (!this.hasSharedElement(name)) { return null; }
        return "#" + this._sharedElementName(name);
    };

    // create shared svg elements
    self._createEntityElements = function() {
        self.createSharedElement("Entity.Bg",
            ns.Element.rect(0, 0, "100%", "100%", {
                rx: 10, ry: 10,
                fill: "#A4E1FF",
                stroke: "#0000FF", // #5271FF
                strokeWidth: ns.Consts.EntityStrokeWidth
            })
        );

        self.createSharedElement("Entity.Bg.Selected",
            ns.Element.rect(0, 0, "100%", "100%", {
                rx: 10, ry: 10,
                fill: "#EFFFA4",
                stroke: "#ffa800",
                strokeWidth: ns.Consts.EntityStrokeWidth
            })
        );

        self.createSharedElement("Entity.ControlRectangle",
            ns.Element.rect(0, 0, "100%", "100%", {
                fill: "none",
                strokeWidth: 1,
                shapeRendering: "crispEdges",
                pointerEvents: "none",
                stroke: "black"
            })
        );

        self.createSharedElement("Entity.ControlPoint",
            ns.Element.rect(0, 0, 8, 8, {
                fill: "none",
                strokeWidth: 1,
                stroke: "black",
                shapeRendering: "crispEdges",
                transform: "translate(-4,-4)",
                pointerEvents: "all"
            })
        );
    };

    self._createRelationElements = function() {
        self.createSharedElement("Relation.MiddlePoint",
            ns.Element.rect(0, 0, 6, 6, {
                fill: "black",
                strokeWidth: 1,
                stroke: "black",
                shapeRendering: "crispEdges",
                transform: "translate(-3,-3)",
                pointerEvents: "visible"
            })
        );
    };

    self._createRelationLegElements = function() {
        ns.Diagram.createSharedElement("Relation.AnchorControl",
            ns.Element.rect(-9.5,-14.5, 18,15, {
                fill: "none",
                stroke: "none"
            })
        );

        ns.Diagram.createSharedElement("Relation.AnchorBase",
            ns.Element.el("polyline", {
                points: "0.5,-1.5, 0.5,-11.5",
                fill: 'none',
                stroke:'black',
                strokeWidth: 1
            })
        );

        ns.Diagram.createSharedElement("Relation.AnchorMany",
            ns.Element.el("polyline", {
                points: "-7.5,-1.5, 0.5,-11.5, 7.5,-1.5",
                fill: 'none',
                stroke:'black',
                strokeWidth: 1
            })
        );

        ns.Diagram.createSharedElement("Relation.AnchorIdentifying",
            ns.Element.el("polyline", {
                points: "-7.5,-11.5, 7.5,-11.5",
                fill: 'none',
                stroke:'black',
                strokeWidth: 1
            })
        );

        ns.Diagram.createSharedElement("Relation.CP",
            ns.Element.rect(0, 0, 6, 6, {
                fill: "none",
                strokeWidth: 1,
                stroke: "black",
                shapeRendering: "crispEdges",
                transform: "translate(-3,-3)"
            })
        );
    };

    self._createAttributeElements = function() {
        var gradient = ns.Element.el("linearGradient", { x1: 0, y1: 0, x2: 0, y2: 1 });
        gradient.appendChild(
            ns.Element.el("stop", {
                "stop-color": "#ffffff",
                "offset": "0%"
            })
        );
        gradient.appendChild(
            ns.Element.el("stop", {
                "stop-color": "#eaeaea",
                "offset": "100%"
            })
        );
        ns.Diagram.createSharedElement("Attr.BgGradient", gradient );

        ns.Diagram.createSharedElement("Attr.Bg",
            ns.Element.rect(0, 0, "100%", "100%", {
                stroke: "#5271FF",
                strokeWidth: 1,
                fill: "#eaeaea"
            })
        );
    };

    return self;
})();
