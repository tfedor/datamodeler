var DBSDM = DBSDM || {};
DBSDM.View = DBSDM.View ||{};

DBSDM.View.EditableText = (function(){
    var ns = DBSDM;

    function EditableText(canvas, x, y, properties, getHandler, setHandler, el) {
        this._canvas = canvas;

        this._properties = Object.assign({
            dominantBaseline: "text-before-edge"
        }, (properties || {}));

        // handlers
        this._getHandler = getHandler;
        this._setHandler = setHandler;

        // dom
        this._createSharedElements();

        if (el == "tspan") {
            this._text = ns.Element.el("tspan", this._properties);
            this._text.innerHTML = this._getValue();
        } else {
            this._text = ns.Element.text(x, y, this._getValue(), this._properties);
        }

        this._input = this._canvas.getSharedHTMLElement("EditableText.Input");
        this._hideInput();

        var that = this;
        this._text.addEventListener("click", function(e) { that._showInput(); });
    }

    EditableText.prototype._createSharedElements = function() {
        if (this._canvas.hasSharedHTMLElement('EditableText.Input')) { return; }

        var input = document.createElement("input");
        input.className = "editableSvgText";
        input.type = "text";

        this._canvas.createSharedHTMLElement("EditableText.Input", input);
    };

    EditableText.prototype.getTextDom = function() {
        return this._text;
    };

    /** Value handling */

    EditableText.prototype._getValue = function() {
        return this._getHandler() || "Editable Text";
    };
    EditableText.prototype._setValue = function() {
        var value = this._input.value;
        if (value == "") { return; }

        this._setHandler(value);
        this._text.innerHTML = value;
    };

    /** Input handling */

    EditableText.prototype._showInput = function() {
        this._input.style.display = "block";
        
        var fontSize = window.getComputedStyle(this._text, null).getPropertyValue("font-size");
        if (fontSize) {
            this._input.style.fontSize = fontSize;
        }

        // position
        var scrollX = (document.documentElement.scrollLeft || document.body.scrollLeft);
        var scrollY = (document.documentElement.scrollTop || document.body.scrollTop);
        var svgRect = this._text.getBoundingClientRect();
        var textLen = this._text.getComputedTextLength();

        this._input.style.width = (textLen*1.4) + "px";

        var align = "left";
        var x = svgRect.left + (svgRect.width - textLen); // width - length = fix for chrome not getting rect of tspan but whole text
        var y = svgRect.top - 1;
        if (this._properties.textAnchor && this._properties.textAnchor == "middle") {
            align = "center";

            var inputRect = this._input.getBoundingClientRect();
            x = Math.floor((svgRect.left + svgRect.right)/2 - (inputRect.right - inputRect.left)/2 + 3);
        }

        this._input.style.textAlign = align;
        this._input.style.left   = (x + scrollX) + "px";
        this._input.style.top    = (y + scrollY) + "px";

        // set value
        this._input.value = ""; // hack to get caret to the end of the input
        this._input.focus();
        this._input.value = this._getValue();

        // set input handlers
        var that = this;
        this._input.onkeydown = function(e) { that._keyPressHandler(e); };
        this._input.onblur    = function(e) { that._confirm(e); };
    };

    EditableText.prototype._hideInput = function() {
        this._input.style.display = "none";
    };

    EditableText.prototype.onMouseUp = function(e, mouse) {
        this._showInput();
    };

    /** Key press handling */

    EditableText.prototype._confirm = function() {
        this._setValue();
        this._hideInput();
    };

    EditableText.prototype._cancel = function() {
        this.value = this._getValue(); // set old value, so the blur event won't update it
        this._hideInput();
    };

    EditableText.prototype._keyPressHandler = function(e) {
        if (e.keyCode == 13) { // enter
            this._confirm();
        } else if (e.keyCode == 27) { // esc
            this._cancel();
        }
        // TODO dynamically resize input on key press
    };

    return EditableText;
})();
