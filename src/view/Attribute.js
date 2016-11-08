var DBSDM = DBSDM || {};
DBSDM.View = DBSDM.View ||{};

DBSDM.View.Attribute = (function(){
    var ns = DBSDM;

    var offset = 20;
    var height = 18;

    function Attribute(model, control, canvas) {
        this._model = model;
        this._control = control;
        this._canvas = canvas;

        this._dom = null;
        this._index = null;
        this._nullable = null;
    }

    Attribute.prototype._createSharedElements = function() {
        if (this._canvas.hasSharedElement('Attr.Bg')) { return; }

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
        this._canvas.createSharedElement("Attr.BgGradient", gradient );

        this._canvas.createSharedElement("Attr.Bg",
            ns.Element.rect(0, 0, "100%", "100%", {
                stroke: "#5271FF",
                strokeWidth: 1,
                fill: "url(" + this._canvas.getSharedElementId("Attr.BgGradient") + ")"
            })
        );
    };

    /***/

    Attribute.prototype._getIndex = function() {
        if (this._model.isPrimary()) {
            return "#";
        } else if (this._model.isUnique()) {
            return "U";
        }
        return " "; // !! UNBREAKABLE SPACE
    };

    Attribute.prototype._getNullable = function() {
        return (this._model.isNullable() ? "°" : "*");
    };

    Attribute.prototype._getY = function() {
        return offset + height * this._control.getPosition();
    };

    /**
     * Finish creation of entity, create other elements and attach control
     * */
    Attribute.prototype.create = function(control, parentDom) {
        this._createSharedElements();

        this._dom = ns.Element.el("svg", {
            class: "attr",
            x: 0, y: this._getY(),
            width: "100%", height: height
        });

        // add background
        this._dom.appendChild(
            this._canvas.getSharedElement("Attr.Bg", { class: "attr-bg" })
        );

        // create text elements
        var text = this._dom.appendChild( ns.Element.text(5, "50%") );

        this._index    = text.appendChild( ns.Element.el("tspan", { class: "attr-index" }) );
        this._index.textContent = this._getIndex();

        this._nullable = text.appendChild( ns.Element.el("tspan", { class: "attr-nullable", dx: "2", dy: "0"}) );
        this._nullable.textContent = this._getNullable();

        var model = this._model;
        var nameInput = new DBSDM.View.EditableText(this._canvas,
            null, null,
            { dominantBaseline: "central", dx: "4" },
            function() { return model.getName(); },
            function(value) { model.setName(value); },
            "tspan"
        );
        text.appendChild(nameInput.getTextDom());

        this._dom.appendChild(text);
        parentDom.appendChild(this._dom);

        var mouse = this._canvas.Mouse;
        this._dom.addEventListener("mousedown", function(e) { mouse.down(e, control); });
        this._dom.addEventListener("contextmenu", function(e) { ns.Menu.attach(control, "attribute"); });
    };

    Attribute.prototype.redrawIndex = function() {
        this._index.textContent = this._getIndex();
    };

    Attribute.prototype.redrawNullable = function() {
        this._nullable.textContent = this._getNullable();
    };

    Attribute.prototype.reposition = function() {
        ns.Element.attr(this._dom, {y: this._getY() });
    };

    Attribute.prototype.destroy = function() {
        this._dom.remove();
    };

    Attribute.prototype.getEdges = function() {
        return this._dom.getBoundingClientRect();
    };

    Attribute.prototype.dragStarted = function() {
        this._dom.classList.add("dragged");
    };

    Attribute.prototype.dragEnded = function() {
        this._dom.classList.remove("dragged");
    };

    return Attribute;
})();
