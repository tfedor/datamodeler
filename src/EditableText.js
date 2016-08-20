
var EditableText = (function(){

    function EditableText(x, y, text, properties) {
        this._position = {
            x: x || 0,
            y: y || 0
        };

        this._text = text || "Editable Text";
        this._properties = properties || {};

        this._dom = null;
    }

    EditableText.prototype.draw = function(canvas) {
        this._dom = canvas.paper.text(this._position.x, this._position.y, this._text)
            .attr(this._properties);

        return this._dom;

        /*
        var fobjectSVG = '<foreignObject><input type="text"></foreignObject>';
        var p = Snap.parse( fobjectSVG );
        p = Snap.fragment("<foreignObject width='143' height='23' x='10' y='10'><input type='text'></foreignObject>");
        this._canvas.paper.append(p);
        */
    };

    return EditableText;
})();
