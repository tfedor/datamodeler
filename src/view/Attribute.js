var DBSDM = DBSDM || {};
DBSDM.View = DBSDM.View ||{};

DBSDM.View.Attribute = (function(){
    var ns = DBSDM;

    var height = 18;

    function Attribute(model, control, canvas) {
        this._model = model;
        this._control = control;
        this._canvas = canvas;

        this._svg = null;
        this._text = null;
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
        return (this._model.isNullable() ? "o" : "*");
    };

    Attribute.prototype._getY = function() {
        return height * this._control.getPosition();
    };

    Attribute.prototype.getMinimalSize = function() {
        return {
            width: this._text.getBoundingClientRect().width,
            height: this._svg.getBoundingClientRect().height
        };
    };

    /**
     * Finish creation of entity, create other elements and attach control
     * */
    Attribute.prototype.create = function(control, parentDom) {
        this._createSharedElements();

        this._svg = ns.Element.el("svg", {
            class: "attr",
            x: 0, y: this._getY(),
            width: "100%", height: height
        });

        // add background
        this._svg.appendChild(
            this._canvas.getSharedElement("Attr.Bg", { class: "attr-bg" })
        );

        // create text elements
        this._text = this._svg.appendChild( ns.Element.text(5, "50%") );

        this._index    = this._text.appendChild( ns.Element.el("tspan", { class: "attr-index" }) );
        this._index.textContent = this._getIndex();

        this._nullable = this._text.appendChild( ns.Element.el("tspan", { class: "attr-nullable", dx: "2", dy: "0"}) );
        this._nullable.textContent = this._getNullable();

        var model = this._model;
        var nameInput = new DBSDM.View.EditableText(this._canvas,
            null, null,
            { dominantBaseline: "central", dx: "4" },
            function() { return model.getName(); },
            function(value) { model.setName(value); },
            "tspan"
        );
        this._text.appendChild(nameInput.getTextDom());

        this._svg.appendChild(this._text);
        parentDom.appendChild(this._svg);

        var mouse = this._canvas.Mouse;
        this._svg.addEventListener("mousedown", function(e) { mouse.down(e, control); });
        this._svg.addEventListener("contextmenu", function(e) { ns.Menu.attach(control, "attribute"); });
    };

    Attribute.prototype.redrawIndex = function() {
        this._index.textContent = this._getIndex();
    };

    Attribute.prototype.redrawNullable = function() {
        this._nullable.textContent = this._getNullable();
    };

    Attribute.prototype.reposition = function() {
        ns.Element.attr(this._svg, {y: this._getY() });

        console.log(this.getMinimalSize());
    };

    Attribute.prototype.destroy = function() {
        this._svg.remove();
    };

    Attribute.prototype.getEdges = function() {
        return this._svg.getBoundingClientRect();
    };

    Attribute.prototype.dragStarted = function() {
        this._svg.classList.add("dragged");
    };

    Attribute.prototype.dragEnded = function() {
        this._svg.classList.remove("dragged");
    };

    return Attribute;
})();
