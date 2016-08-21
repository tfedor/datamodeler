
var Canvas = (function($) {

    function Canvas(path) {
        this.Paper = Snap(path);
        this.Mouse = null;

        this._drag = false; /* determines whether there was drag or just click */

        this._sharedElements = {};

        this._entities = [];

        // set up callbacks
        var that = this;
        this.Paper.mousedown(function(e) { that.onMouseDown(e); });
        this.Paper.mousemove(function(e) { that.onMouseMove(e); });
        this.Paper.mouseup(function(e) { that.onMouseUp(e); });

        this._createSharedElements();
    }

    Canvas.prototype._createSharedElements = function(){
        this._sharedElements.EntityBg =
            this.Paper.rect(0, 0, "100%", "100%", 10, 10)
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
        this.Mouse = new Mouse(this.Paper.node);
        this._createSharedElements();
        for (var key in this._entities) {
            this._entities[key].draw(this);
        }
    };

    Canvas.prototype.clear = function() {
        this._sharedElements = {};
        this.Paper.clear();
    };

    Canvas.prototype.onMouseDown = function(e) {
        this.Mouse.down(e);
        this._entities.unshift(
            new Entity(this.Mouse.x, this.Mouse.y)
        );
    };

    Canvas.prototype.onMouseMove = function(e) {
        if (!this.Mouse.isDown()) { return; }

        var entity = this._entities[0];
        if (!this.Mouse.isDragged()) {
            entity.draw(canvas);
        }
        this.Mouse.move(e);

        if (this.Mouse.dx < 0) {
            entity.translateTo(this.Mouse.x);
        }
        if (this.Mouse.dy < 0) {
            entity.translateTo(null, this.Mouse.y);
        }

        entity.resize(Math.abs(this.Mouse.dx), Math.abs(this.Mouse.dy));
    };

    Canvas.prototype.onMouseUp = function(e) {
        if (this.Mouse.isDragged()) {
            if (this._entities[0]._size.width <= 30 || this._entities[0]._size.height <= 10) {
                this._entities.shift().undraw();
            }
        } else {
            this._entities[0].draw(canvas);
        }
        this.Mouse.up(e);
    };

    return Canvas;
})(jQuery);
