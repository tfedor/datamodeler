var RelationControl = (function(){

    function RelationControl(canvas, source) {
        this._canvas = canvas;
        this._source = source;
        this._dom = null;
    }

    // control for user feedback, when new relation is being created

    RelationControl.prototype.draw = function() {
        var box = this._source.boundingBox();
        var x = (box.left + box.right) / 2;
        var y = (box.top + box.bottom) / 2;
        this._dom = this._canvas.Paper.line(x, y, x, y).attr({
            stroke: 'black',
            strokeWidth: 1,
            pointerEvents: 'none'
        });
    };
    RelationControl.prototype._move = function(x, y) {
        if (!this._dom) { return; }
        this._dom.attr({
            x2: x,
            y2: y
        });
    };
    RelationControl.prototype._clear = function() {
        if (!this._dom) { return; }
        this._dom.remove();
        this._dom = null;
    };

    // handlers

    RelationControl.prototype.onMouseMove = function(e, mouse) {
        this._move(mouse.x, mouse.y);
    };

    RelationControl.prototype.onMouseUp = function(e, mouse) {
        var clickedObject = mouse.getTarget();
        if (clickedObject instanceof Entity) {

            var source = new RelationLeg(this._canvas, this._source);
            source.identifying = 1;

            var target = new RelationLeg(this._canvas, clickedObject);
            target.optional = 1;
            target.cardinality = 0;

            source.connectWith(target);

            var g = this._canvas.Paper.g();
            g.addClass("relation");

            source.draw(g);
            target.draw(g);
            source.createMiddlePoint(g);
        }
        this._clear();
    };

    return RelationControl;
})();