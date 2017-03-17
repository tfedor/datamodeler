var DBSDM = DBSDM || {};
DBSDM.View = DBSDM.View ||{};

DBSDM.View.EditableText = (function(){
    var ns = DBSDM;

    var Super = ns.View.EditableContent;

    /**
     * Create new editable text in view
     * @param canvas     Canvas          Canvas in which editable text is created
     * @param x          number|string   x coordinate of text, may be either number of pixels
     *                                   or percent string (and possibly all other CSS options).
     *                                   Has no effect when creating `tspan` element (leave null)
     * @param y          number|string   y coordinate of text, see @x
     * @param properties object          Object of element's SVG attributes
     * @param getHandler function        Function used to get current content
     * @param setHandler function        Function used to set new content
     * @param el         string          Name of the SVG element to be created. Currently only "tspan" is supported,
     *                                   all other values generate `text` element
     */
    function EditableText(canvas, x, y, properties, getHandler, setHandler, el) {
        Super.call(this, canvas, properties, getHandler, setHandler);

        this._leftOffset = 0;

        // handlers
        this._nextHandler = null;

        var that = this;
        this._sizeHandler = function(){
            that._span.innerHTML = that._input.value;
            return {width: that._span.getBoundingClientRect().width};
        };

        // dom
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
        this._setInputHandlers.call(this);
    }
    EditableText.prototype = Object.create(Super.prototype);
    EditableText.prototype.constructor = EditableText;


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

    EditableText.prototype.setNextHandler = function(callback) {
        this._nextHandler = callback;
    };

    /** Input handling */

    EditableText.prototype._setInputPosition = function() {
        var sizeRect = this._sizeHandler();
        this._input.style.width = sizeRect.width + "px";

        var svgRect = this._text.getBoundingClientRect();

        var align = "left";
        var x = svgRect.left + this._leftOffset;
        var y = svgRect.top - 1;
        if (this._properties.textAnchor && this._properties.textAnchor == "middle") {
            align = "center";
            x = Math.floor((svgRect.left + svgRect.right - sizeRect.width)/2 + 3);
        }

        this._placeInput(x, y, align);
    };

    EditableText.prototype.showInput = function() {
        if (!ns.Diagram.allowEdit) { return; }
        ns.Menu.hide();

        var fontSize = this.getFontSize();
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

        Super.shown = true;

        //
        var that = this;
        this._input.onkeydown = function(e) { that._keyDownHandler(e); };
        this._input.onkeyup = function(e) { that._keyHandler(e); };
        this._input.onblur  = function(e) { that._confirm(e); };
    };

    /** Key press handling */

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
