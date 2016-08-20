
var Canvas = (function($) {

    function Canvas(path) {
        this.paper = Snap(path);

        this._offset = $(path).get(0).getBoundingClientRect();

        this._drag = false; /* determines whether there was drag or just click */
        this._entities = [];

        var that = this;
        this.paper.mouseup(function(e) { that.onMouseUp(e); });
        this.paper.drag(this.onDrag, this.onDragStart, null, this, this);
    }

    Canvas.prototype.onMouseUp = function() {
        if (this._drag) {
            if (this._entities[0].size.width <= 30 || this._entities[0].size.height <= 10) {
                this._entities.shift().undraw();
            }

            this._drag = false;
        } else {
            this._entities[0].draw();
        }
    };

    Canvas.prototype.onDragStart = function(x, y, e) {
        entity = new Entity(this, x - this._offset.left, y - this._offset.top);
        this._entities.unshift(entity);
    };

    Canvas.prototype.onDrag = function(dx, dy, x, y, e) {
        var entity = this._entities[0];

        if (!this._drag) {
            this._drag = true;
            entity.draw();
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
