var DBSDM = DBSDM || {};
DBSDM.View = DBSDM.View ||{};

DBSDM.View.EditableContent = (function(){
    var ns = DBSDM;

    EditableContent.shown = false;

    /**
     * Create new editable content (text) in view
     * @param canvas     Canvas          Canvas in which editable text is created
     * @param properties object          Object of element's SVG attributes
     * @param getHandler function        Function used to get current content
     * @param setHandler function        Function used to set new content
     */
    function EditableContent(canvas, properties, getHandler, setHandler) {
        this._canvas = canvas;

        this._properties = Object.assign({
            dominantBaseline: "text-before-edge"
        }, (properties || {}));

        // handlers
        this._getHandler = getHandler;
        this._setHandler = setHandler;
        this._emptyHandler = null;

        this._text = null;
        this._input = null;

        var that = this;
        this._sizeHandler = function() {
            return that._text.getBoundingClientRect();
        };

        // dom
        this._createSharedElements(); // abstract
    }

    EditableContent.prototype._setInputHandlers = function() {
        var that = this;
        if (ns.Diagram.allowEdit) {
            this._text.classList.add("editable");

            this._text.addEventListener("mousedown", function(e) {
                if (!that._canvas.inCorrectionMode && !that._canvas.isInMode("isa")) {
                    that._canvas.Mouse.down(e, that);
                }
            });
        }
    };

    EditableContent.prototype.getTextDom = function() {
        return this._text;
    };

    EditableContent.prototype.setEmptyHandler = function(callback) {
        this._emptyHandler = callback;
    };

    /**
     * Handler for computing desired size should return object with width and height,
     * usually bounding client rectangle
     */
    EditableContent.prototype.setSizeHandler = function(callback) {
        this._sizeHandler = callback;
    };

    /** Value handling */

    EditableContent.prototype._getValue = function() {
        return this._getHandler() || "Editable Text";
    };
    EditableContent.prototype._setValue = function() {
        this._setHandler(this._input.value);
        this._text.innerHTML = this._getValue();
    };

    EditableContent.prototype.redraw = function() {
        this._text.innerHTML = "";
        this._text.innerHTML = this._getValue();
    };

    /** Input handling */

    EditableContent.prototype.getFontSize = function(considerZoom) {
        considerZoom = (typeof considerZoom == "boolean" ? considerZoom : true);

        var fontSize = window.getComputedStyle(this._text, null).getPropertyValue("font-size");
        if (fontSize) {
            var size = parseFloat(fontSize);
            if (considerZoom) { size *= this._canvas.getZoomLevel(); }
            return size+"px";
        }
        return null;
    };

    EditableContent.prototype._placeInput = function(x, y, align) {
        var cont = this._canvas._container.getBoundingClientRect();
        this._input.style.textAlign = align || "left";
        this._input.style.left   = (x - cont.left) + "px";
        this._input.style.top    = (y - cont.top) + "px";
    };

    EditableContent.prototype._hideInput = function() {
        this._input.style.display = "none";
        this._text.style.visibility = "visible";

        EditableContent.shown = false;
    };

    EditableContent.prototype.onMouseUp = function(e, mouse) {
        if (!this._canvas.inCorrectionMode) {
            this.showInput();
        }
    };

    /** Key press handling */

    EditableContent.prototype._confirm = function() {
        this._input.value = this._input.value.trim();
        if (this._input.value == "") {
            if (this._emptyHandler) {
                this._hideInput();
                this._emptyHandler();
            } else {
                this._cancel();
            }
        } else {
            this._setValue();
            this._hideInput();
        }
    };

    EditableContent.prototype._cancel = function() {
        this._input.onblur = null;
        this._input.value = this._getValue(); // set old value, so the blur event won't update it
        this._hideInput();
    };

    return EditableContent;
})();
