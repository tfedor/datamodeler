var DBSDM = DBSDM || {};
DBSDM.View = DBSDM.View ||{};

DBSDM.View.Entity = (function(){
    var ns = DBSDM;

    function Entity(canvas, model, control) {
        this._canvas = canvas;
        this._model = model;
        this._control = control;

        this._dom = null;
        this._name = null;
        this._attrContainer = null;

        this._controls = null;
    }

    Entity.prototype.getDom = function() {
        return this._dom;
    };

    Entity.prototype.getAttrContainer = function() {
        return this._attrContainer;
    };

    Entity.prototype.getMinimalSize = function() {
        var rect = this._name.getBoundingClientRect();
        return {
            width: rect.width + ns.Consts.EntityPadding,
            height: rect.height + ns.Consts.EntityPadding + ns.Consts.EntityExtraHeight
        };
    };

    Entity.prototype.setParent = function(parentDom) {
        parentDom.appendChild(this._dom);
    };

    /**
     * Create empty entity (background only), when creating new Entity from canvas
     */
    Entity.prototype.createEmpty = function() {
        var transform = this._model.getTransform();
        this._dom = ns.Element.el("svg", transform);
        this._dom.style.overflow = "visible";

        this._dom.appendChild(ns.Diagram.getSharedElement("Entity.Bg"));
        this._canvas.svg.appendChild(this._dom);
    };

    /**
     * Finish creation of entity, create other elements and attach control
     * */
    Entity.prototype.create = function(control) {
        var mouse = this._canvas.Mouse;

        var that = this;
        var nameInput = new ns.View.EditableText(this._canvas,
            "50%", ns.Consts.EntityStrokeWidth,
            { class: "entity-name", textAnchor: "middle" },
            function() { return that._model.getName(); },
            function(value) { that._control.setName(value); } // TODO set name in control?
        );
        this._name = this._dom.appendChild(nameInput.getTextDom());
        this._attrContainer = this._dom.appendChild(
            ns.Element.el("svg", {
                x: 0, y: 20 // TODO offset
            })
        );

        this._dom.addEventListener("mousedown", function(e) { mouse.down(e, control); });
        this._dom.addEventListener("mouseenter", function(e) { mouse.enter(e, control); });
        this._dom.addEventListener("mouseleave", function(e) { mouse.leave(e); });
        this._dom.addEventListener("contextmenu", function(e) { DBSDM.Menu.attach(control, "entity"); });
    };

    Entity.prototype.redraw = function() {
        var transform = this._model.getTransform();
        ns.Element.attr(this._dom, transform);
    };

    Entity.prototype.remove = function() {
        this._dom.remove();
    };

    Entity.prototype.showControls = function() {
        this._controls = ns.Element.g(
            ns.Diagram.getSharedElement("Entity.ControlRectangle"),
            ns.Element.attr(ns.Diagram.getSharedElement("Entity.ControlPoint"), { class: "e-cp-nw", x:      0, y:      0 }),
            ns.Element.attr(ns.Diagram.getSharedElement("Entity.ControlPoint"), { class: "e-cp-n",  x:  "50%", y:      0 }),
            ns.Element.attr(ns.Diagram.getSharedElement("Entity.ControlPoint"), { class: "e-cp-ne", x: "100%", y:      0 }),
            ns.Element.attr(ns.Diagram.getSharedElement("Entity.ControlPoint"), { class: "e-cp-e",  x: "100%", y:  "50%" }),
            ns.Element.attr(ns.Diagram.getSharedElement("Entity.ControlPoint"), { class: "e-cp-se", x: "100%", y: "100%" }),
            ns.Element.attr(ns.Diagram.getSharedElement("Entity.ControlPoint"), { class: "e-cp-s",  x:  "50%", y: "100%" }),
            ns.Element.attr(ns.Diagram.getSharedElement("Entity.ControlPoint"), { class: "e-cp-sw", x:      0, y: "100%" }),
            ns.Element.attr(ns.Diagram.getSharedElement("Entity.ControlPoint"), { class: "e-cp-w",  x:      0, y:  "50%" })
        );
        ns.Element.attr(this._controls, { class: "e-control" });
        this._dom.appendChild(this._controls);
    };

    Entity.prototype.hideControls = function() {
        this._controls.remove();
    };

    return Entity;
})();
