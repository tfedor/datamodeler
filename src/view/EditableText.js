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
        //this._text.addEventListener("mousedown", function(e) { that._canvas.Mouse.down(e, that); });
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
        var rect = this._text.getBoundingClientRect();
        var x = Math.floor(rect.left + (document.documentElement.scrollLeft || document.body.scrollLeft));
        var y = Math.floor(rect.top + (document.documentElement.scrollTop || document.body.scrollTop));

        var offset = Math.ceil(rect.width * 0.2); // offset size as percentage of text width
        var w = Math.ceil(rect.width) + offset;

        // TODO
        var align = "left";
        if (this._properties.textAnchor && this._properties.textAnchor == "middle") {
            align = "center";
//            width += offset;
            x -= offset;
        }

        this._input.style.left   = x + "px";
        this._input.style.top    = y + "px";
        // TODO this._input.style.width  = width + "px";
        this._input.size = this._text.textContent.length * 1.2;
        this._input.style.textAlign = align;

        // set value
        this._input.value = ""; // hack to get caret to the end of the input
        this._input.focus();
        this._input.value = this._getValue();

        // set input handlers
        var that = this;
        this._input.onkeydown = function(e) { that._keyPressHandler(e); };
        this._input.onblur = function(e) { that._confirm(e) };
    };

    EditableText.prototype._hideInput = function() {
        this._input.style = "display:hidden";
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
