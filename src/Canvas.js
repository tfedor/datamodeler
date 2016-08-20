
var Canvas = (function($) {

    function Canvas(path) {
        this.paper = Snap(path);

        /** Offset of the canvas from the document */
        this._offset = $(path).get(0).getBoundingClientRect();

        this._drag = false; /* determines whether there was drag or just click */

        this._sharedElements = {};

        this._entities = [];

        // set up callbacks
        var that = this;
        this.paper.mouseup(function(e) { that.onMouseUp(e); });
        this.paper.drag(this.onDrag, this.onDragStart, null, this, this);

        this._createSharedElements();
    }

    Canvas.prototype._createSharedElements = function(){
        this._sharedElements.EntityBg =
            this.paper.rect(0, 0, "100%", "100%", 10, 10)
                .attr({
                    fill: "#A4E1FF",
                    stroke: "#5271FF",
                    strokeWidth: 2
                })
                .toDefs();
    };

    Canvas.prototype._getSharedElement = function(name) {
        return this._sharedElements[name];
    };

    Canvas.prototype.draw = function() {
        this._createSharedElements();
        for (var key in this._entities) {
            this._entities[key].draw(this);
        }
    };

    Canvas.prototype.clear = function() {
        this._sharedElements = {};
        this.paper.clear();
    };

    Canvas.prototype.onMouseUp = function() {
        if (this._drag) {
            if (this._entities[0]._size.width <= 30 || this._entities[0]._size.height <= 10) {
                this._entities.shift().undraw();
            }

            this._drag = false;
        } else {
            this._entities[0].draw();
        }
    };

    Canvas.prototype.onDragStart = function(x, y, e) {
        this._entities.unshift(
            new Entity(x - this._offset.left, y - this._offset.top)
        );
    };

    Canvas.prototype.onDrag = function(dx, dy, x, y, e) {
        var entity = this._entities[0];

        if (!this._drag) {
            this._drag = true;
            entity.draw(canvas);
        }

        if (dx < 0) {
            entity.translateTo(x - this._offset.left);
        }
        if (dy < 0) {
            entity.translateTo(null, y - this._offset.top);
        }

        entity.resize(Math.abs(dx), Math.abs(dy));
    };

    return Canvas;
})(jQuery);
