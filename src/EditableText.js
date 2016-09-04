
var EditableText = (function(){

    function EditableText(x, y, text, properties) {
        this._position = {
            x: x || 0,
            y: y || 0
        };

        this._text = text || "Editable Text";
        this._properties = properties || {};

        this._input = null;
        this._dom = null;
    }

    EditableText.prototype.edit = function(text) {
        if (text == "") { return; }
        this._text = text;
        if (this._dom) {
            this._dom.node.innerHTML = text;
        }
    };

    EditableText.prototype.draw = function(canvas) {
        this._canvas = canvas;
        this._dom = canvas.Paper.text(this._position.x, this._position.y, this._text)
            .attr(this._properties);

        this._input = this._canvas.getSharedElement("EditableTextInput");

        var that = this;
        this._dom.mousedown(function(e) { canvas.Mouse.down(e, that, "edit"); });

        return this._dom;
    };

    EditableText.prototype.getWidth = function() {
        return this._dom.node.getBBox().width;
    };

    EditableText.prototype.onMouseUp = function(e, mouse) {
        var offsetLeft = 0;
        var offsetRight = 20;
        var align = "left";
        if (this._properties.textAnchor && this._properties.textAnchor == "middle") {
            offsetLeft = offsetRight;
            align = "center;"
        }

        var pos = this._dom.node.getBoundingClientRect();
        var x = Math.floor(pos.left + (document.documentElement.scrollLeft || document.body.scrollLeft)) - offsetLeft;
        var y = Math.floor(pos.top + (document.documentElement.scrollTop || document.body.scrollTop));

        var bbox = this._dom.node.getBBox();
        var w = Math.ceil(bbox.width) + offsetLeft + offsetRight;
        var h = Math.ceil(bbox.height);

        this._input.style = "left:" + x + "px;top:" + y + "px;width:" + w + "px;height:" + h + "px;text-align:"+align;

        // set value
        this._input.value = ""; // hack to get caret to the end of the input
        this._input.focus();
        this._input.value = this._text;

        // add events
        var that = this;
        this._input.onkeydown = function(e) { that.onKeyDown(e); };
        this._input.onblur =  function(e) { that.onBlur(e); };
    };

    EditableText.prototype.onKeyDown = function(e) {
        if (e.keyCode == 13) { // enter
            this.edit(this._input.value);
            this._input.style = "display:hidden";
        }
    };

    EditableText.prototype.onBlur = function() {
        this.edit(this._input.value);
        this._input.style = "display:hidden";
    };

    return EditableText;
})();
