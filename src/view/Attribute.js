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

        this._nameInput = null;
    }

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
        this._svg = ns.Element.el("svg", {
            class: "attr",
            x: 0, y: this._getY(),
            width: "100%", height: height
        });

        if (ns.Diagram.allowEdit) {
            this._svg.classList.add("draggable");
            this._svg.classList.add("editable");
        }

        // add background
        this._svg.appendChild(
            ns.Diagram.getSharedElement("Attr.Bg", { class: "attr-bg" })
        );

        // create text elements
        this._text = this._svg.appendChild( ns.Element.text(5, "50%") );

        this._index    = this._text.appendChild( ns.Element.el("tspan", { class: "attr-index" }) );
        this._index.textContent = this._getIndex();

        this._nullable = this._text.appendChild( ns.Element.el("tspan", { class: "attr-nullable", dx: "2", dy: "0"}) );
        this._nullable.textContent = this._getNullable();

        var model = this._model;
        this._nameInput = new ns.View.EditableText(this._canvas,
            null, null,
            { dominantBaseline: "central", dx: "4" },
            function() { return model.getName(); },
            function(value) { model.setName(value); },
            "tspan"
        );
        var that = this;
        this._nameInput.setNextHandler(function(prev){
            var dir = (prev ? -1 : 1);
            that._control.selectAt(that._control.getPosition() + dir, true);
        });
        this._nameInput.setEmptyHandler(function() {
            var position = that._control.getPosition();
            that._control.delete();
            that._control.selectAt(position, false);
            that.destroy();
        });

        this._text.appendChild(this._nameInput.getTextDom());

        this._svg.appendChild(this._text);
        parentDom.appendChild(this._svg);

        var mouse = this._canvas.Mouse;
        this._svg.addEventListener("mousedown", function(e) { mouse.down(e, control); });
        this._svg.addEventListener("contextmenu", function(e) { ns.Menu.attach(control, "attribute"); });
    };

    Attribute.prototype.showInput = function() {
        this._nameInput.showInput();
    };

    Attribute.prototype.redrawIndex = function() {
        this._index.textContent = this._getIndex();
    };

    Attribute.prototype.redrawNullable = function() {
        this._nullable.textContent = this._getNullable();
    };

    Attribute.prototype.reposition = function() {
        ns.Element.attr(this._svg, {y: this._getY() });
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
