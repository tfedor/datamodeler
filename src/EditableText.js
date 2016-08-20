
var EditableText = (function(){

    function EditableText(canvas, text, transform) {
        this._canvas = canvas;
        this.text = text || "Editable Text";
        this.transform = transform || new Transform(0, 0, null);

        this._dom = null;
    }

    EditableText.prototype.draw = function(group) {
        var position = this.transform.getPosition();
        this._dom = this._canvas.paper.text(position.x, position.y, this.text);

        if (group) {
            group.add(this._dom);
        }


        /*
        var fobjectSVG = '<foreignObject><input type="text"></foreignObject>';
        var p = Snap.parse( fobjectSVG );
        p = Snap.fragment("<foreignObject width='143' height='23' x='10' y='10'><input type='text'></foreignObject>");
        this._canvas.paper.append(p);
        */
    };

    return EditableText;
})();
