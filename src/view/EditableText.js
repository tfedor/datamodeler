var DBSDM = DBSDM || {};
DBSDM.View = DBSDM.View ||{};

DBSDM.View.EditableText = (function(){
    var ns = DBSDM;

    function EditableText(canvas, x, y, properties, getHandler, setHandler, el) {
        this._canvas = canvas;

        this._properties = Object.assign({
            dominantBaseline: "text-before-edge"
        }, (properties || {}));

        this._leftOffset = 0;

        // handlers
        this._getHandler = getHandler;
        this._setHandler = setHandler;
        this._nextHandler = null;
        this._emptyHandler = null;

        // dom
        this._createSharedElements();

        if (el == "tspan") {
            this._text = ns.Element.el("tspan", this._properties);
            this._text.innerHTML = this._getValue();
        } else {
            this._text = ns.Element.text(x, y, this._getValue(), this._properties);
        }

        this._input = this._canvas.getSharedHTMLElement("EditableText.Input");
        this._span = this._canvas.getSharedHTMLElement("EditableText.Span");
        this._hideInput();

        // set input handlers
        var that = this;
        if (ns.Diagram.allowEdit) {
            this._text.classList.add("editable");

            this._text.addEventListener("mousedown", function(e) { e.stopPropagation(); }); // won't work in Chrome for Relation names otherwise
            this._text.addEventListener("click", function(e) { that.showInput(); e.stopPropagation(); });
        }
    }

    EditableText.prototype._createSharedElements = function() {
        if (this._canvas.hasSharedHTMLElement('EditableText.Input')) { return; }

        var input = document.createElement("input");
        input.className = "editableSvgText";
        input.type = "text";
        this._canvas.createSharedHTMLElement("EditableText.Input", input);

        var span = document.createElement("span");
        span.style.position = "absolute";
        span.style.left = "-2000px";
        this._canvas.createSharedHTMLElement("EditableText.Span", span);
    };

    EditableText.prototype.getTextDom = function() {
        return this._text;
    };

    EditableText.prototype.setNextHandler = function(callback) {
        this._nextHandler = callback;
    };

    EditableText.prototype.setEmptyHandler = function(callback) {
        this._emptyHandler = callback;
    };

    /** Value handling */

    EditableText.prototype._getValue = function() {
        return this._getHandler() || "Editable Text";
    };
    EditableText.prototype._setValue = function() {
        var value = this._input.value;
        if (value == "") { return; }

        this._text.innerHTML = value;
        this._setHandler(value);
    };

    /** Input handling */

    EditableText.prototype._setInputPosition = function() {
        this._span.innerHTML = this._input.value;
        var textWidth = this._span.getBoundingClientRect().width;
        this._input.style.width = textWidth + "px";

        var svgRect = this._text.getBoundingClientRect();

        var align = "left";
        var x = svgRect.left + this._leftOffset;
        var y = svgRect.top - 1;
        if (this._properties.textAnchor && this._properties.textAnchor == "middle") {
            align = "center";
            x = Math.floor((svgRect.left + svgRect.right - textWidth)/2 + 3);
        }

        var cont = this._canvas._container.getBoundingClientRect();
        this._input.style.textAlign = align;
        this._input.style.left   = (x - cont.left) + "px";
        this._input.style.top    = (y - cont.top) + "px";
    };

    EditableText.prototype.showInput = function() {
        if (!ns.Diagram.allowEdit) { return; }
        ns.Menu.hide();

        var fontSize = window.getComputedStyle(this._text, null).getPropertyValue("font-size");
        if (fontSize) {
            this._input.style.fontSize = fontSize;
            this._span.style.fontSize = fontSize;
        }

        var value = this._getValue();
        this._input.value = value;

        this._leftOffset = this._text.getBoundingClientRect().width - this._text.getComputedTextLength(); // fix for Chrome not handling boundClientRect of tspans correctly

        this._setInputPosition();
        this._input.style.display = "block";

        // select all contents
        this._input.focus();
        this._input.setSelectionRange(0, value.length);

        this._text.style.visibility = "hidden";

        //
        var that = this;
        this._input.onkeydown = function(e) { that._keyDownHandler(e); };
        this._input.onkeyup = function(e) { that._keyHandler(e); };
        this._input.onblur  = function(e) { that._confirm(e); };
    };

    EditableText.prototype._hideInput = function() {
        this._input.style.display = "none";
        this._text.style.visibility = "visible";
    };

    EditableText.prototype.onMouseUp = function(e, mouse) {
        this.showInput();
    };

    /** Key press handling */

    EditableText.prototype._confirm = function() {
        this._setValue();
        this._hideInput();
    };

    EditableText.prototype._cancel = function() {
        this._input.value = this._getValue(); // set old value, so the blur event won't update it
        this._hideInput();
    };

    EditableText.prototype._next = function(e) {
        if (!this._nextHandler) { return; }
        this._confirm();
        this._nextHandler(e.shiftKey);
        e.preventDefault();
    };

    EditableText.prototype._keyDownHandler = function(e) {
        if (e.keyCode == 9) {
            this._next(e);
        }
    };

    EditableText.prototype._keyHandler = function(e) {
        if (e.keyCode == 13) { // enter
            this._confirm();
        } else if (e.keyCode == 27) { // esc
            this._cancel();
        } else if (e.keyCode == 9) {
            // handled on key down
        } else {
            this._setInputPosition();
        }
    };

    return EditableText;
})();
