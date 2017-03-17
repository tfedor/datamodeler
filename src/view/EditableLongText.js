var DBSDM = DBSDM || {};
DBSDM.View = DBSDM.View ||{};

DBSDM.View.EditableLongText = (function(){
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
     */
    function EditableLongText(canvas, x, y, properties, getHandler, setHandler) {
        this._canvas = canvas;

        this._properties = Object.assign({
            dominantBaseline: "text-before-edge"
        }, (properties || {}));

        var that = this;

        // handlers
        this._getHandler = getHandler;
        this._setHandler = setHandler;
        this._emptyHandler = null;

        this._sizeHandler = function() {
            return that._text.getBoundingClientRect();
        };

        // dom
        this._createSharedElements();

        this._text = ns.Element.text(x, y, this._getValue(), this._properties);
        this._input = this._canvas.getSharedHTMLElement("EditableLongText.Textarea");
        this._hideInput();

        // set input handlers
        this._setInputHandlers.call(this);
    }
    EditableLongText.prototype = Object.create(Super.prototype);
    EditableLongText.prototype.constructor = EditableLongText;


    EditableLongText.prototype._createSharedElements = function() {
        if (this._canvas.hasSharedHTMLElement('EditableLongText.Textarea')) { return; }

        var input = document.createElement("textarea");
        input.className = "editableSvgText";
        this._canvas.createSharedHTMLElement("EditableLongText.Textarea", input);
    };

    /** Input handling */

    EditableLongText.prototype._setInputPosition = function() {

        var sizeRect = this._sizeHandler();
        this._input.style.width = sizeRect.width + "px";
        this._input.style.height = sizeRect.height +"px";

        var svgRect = this._text.getBoundingClientRect();
        var x = svgRect.left;
        var y = svgRect.top - 1;

        this._placeInput(x, y);
    };

    EditableLongText.prototype.showInput = function() {
        if (!ns.Diagram.allowEdit) { return; }
        ns.Menu.hide();

        var fontSize = this.getFontSize();
        if (fontSize) {
            this._input.style.fontSize = this.getFontSize();
        }

        this._input.value = this._getValue();

        this._setInputPosition();
        this._input.style.display = "block";
        this._input.focus();

        this._text.style.visibility = "hidden";

        Super.shown = true;

        //
        var that = this;
        this._input.onkeyup = function(e) { that._keyHandler(e); };
        this._input.onblur  = function(e) { that._confirm(e); };
    };

    /** Key press handling */

    EditableLongText.prototype._keyHandler = function(e) {
        if (e.keyCode == 27) { // esc
            this._confirm();
        }
    };

    return EditableLongText;
})();
