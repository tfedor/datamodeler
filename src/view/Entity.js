var DBSDM = DBSDM || {};
DBSDM.View = DBSDM.View ||{};

DBSDM.View.Entity = (function(){
    var ns = DBSDM;

    var Super = ns.View.CanvasObject;

    function Entity(canvas, model, control) {
        Super.call(this, canvas, model, control);

        this._bg = null;
        this._name = null;
        this._attrContainer = null;

        this._xorNodes = [];
    }
    Entity.prototype = Object.create(Super.prototype);
    Entity.prototype.constructor = Entity;

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

        this._bg = this._dom.appendChild(ns.Diagram.getSharedElement("Entity.Bg"));
        this._canvas.svg.appendChild(this._dom);
    };

    /**
     * Finish creation of entity, create other elements and attach control
     */
    Entity.prototype.create = function(control) {
        var mouse = this._canvas.Mouse;

        var that = this;
        var nameInput = new ns.View.EditableText(this._canvas,
            "50%", ns.Consts.EntityStrokeWidth,
            { class: "entity-name", textAnchor: "middle" },
            function() { return that._model.getName(); },
            function(value) { that._control.setName(value); }
        );

        this._name = this._dom.appendChild(nameInput.getTextDom());
        this._attrContainer = this._dom.appendChild(
            ns.Element.el("svg", {
                x: 0, y: ns.Consts.EntityAttributesOffset
            })
        );

        this.defaultMark();

        this._comment = this._dom.appendChild(ns.Element.title());
        this.updateComment();

        this._dom.addEventListener("mousedown", function(e) { mouse.down(e, control); });
        this._dom.addEventListener("mouseenter", function(e) { mouse.enter(e, control); });
        this._dom.addEventListener("mouseleave", function(e) { mouse.leave(e); });
        this._dom.addEventListener("contextmenu", function(e) { DBSDM.Menu.attach(control, "entity"); });
    };

    // XOR

    Entity.prototype.clearXor = function(index) {
        this._xorNodes[index].remove();
        this._xorNodes.splice(index, 1);
    };

    Entity.prototype.drawXor = function(edges, index, edgeDistance) {
        if (this._xorNodes[index]) {
            this._xorNodes[index].remove();
            this._xorNodes[index] = null;
        }

        var arcNode = ns.View.Arc.build(edges, this._model.getXor(index), edgeDistance);
        this._dom.appendChild(arcNode);
        this._xorNodes[index] = arcNode;
    };

    //

    Entity.prototype.select = function() {
        ns.Element.attr(this._bg, {href: "#Entity.Bg.Selected"});
    };

    Entity.prototype.defaultMark = function() {
        if (this._model.incorrect) {
            ns.Element.attr(this._bg, {href: "#Entity.Bg.Incorrect"});
        } else {
            ns.Element.attr(this._bg, {href: "#Entity.Bg"});
        }
    };

    return Entity;
})();
