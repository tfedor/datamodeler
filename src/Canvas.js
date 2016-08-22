
var Canvas = (function($) {

    function Canvas(path) {
        this.Paper = Snap(path);
        this.Mouse = null;

        this._sharedElements = {};

        this._entities = [];
    }

    Canvas.prototype._createSharedElements = function(){
        this._sharedElements.EntityBg =
            this.Paper.rect(0, 0, "100%", "100%", 10, 10)
                .attr({
                    fill: "#A4E1FF",
                    stroke: "#5271FF",
                    strokeWidth: 3
                })
                .toDefs();

        this._sharedElements.ControlRectangle =
            this.Paper.rect(0, 0, "100%", "100%")
                .attr({
                    fill: "none",
                    strokeWidth: 1,
                    shapeRendering: "crispEdges",
                    pointerEvents: "none",
                    stroke: "black"
                })
                .toDefs();

        this._sharedElements.ControlPoint =
            this.Paper.rect(0, 0, 6, 6)
                .attr({
                    fill: "none",
                    strokeWidth: 1,
                    stroke: "black",
                    shapeRendering: "crispEdges",
                    transform: "translate(-3,-3)"
                })
                .toDefs();
    };

    Canvas.prototype.getSharedElement = function(name) {
        return this._sharedElements[name];
    };

    Canvas.prototype.draw = function() {
        this.Mouse = new Mouse(this.Paper.node);
        this._createSharedElements();
        for (var key in this._entities) {
            this._entities[key].draw(this);
        }

        // set up callbacks
        var that = this;
        this.Paper.mousedown(function(e) { that.Mouse.down(e, that); });
        this.Paper.mousemove(function(e) { that.Mouse.move(e); });
        this.Paper.mouseup(function(e) { that.Mouse.up(e); });
    };

    Canvas.prototype.clear = function() {
        this._sharedElements = {};
        this.Paper.clear();
    };

    Canvas.prototype.onMouseDown = function(e) {
        var entity = new Entity(this.Mouse.x, this.Mouse.y);
        this._entities.unshift(entity);
        entity.draw(this);
    };

    Canvas.prototype.onMouseMove = function(e) {
        var entity = this._entities[0];

        if (this.Mouse.dx < 0) {
            entity.translateTo(this.Mouse.x);
        }
        if (this.Mouse.dy < 0) {
            entity.translateTo(null, this.Mouse.y);
        }

        entity.resize(Math.abs(this.Mouse.dx), Math.abs(this.Mouse.dy));
    };

    Canvas.prototype.onMouseUp = function(e) {
        if (!this.Mouse.isDragged()) {
            this._entities[0].resize(100, 100);
        }
    };

    return Canvas;
})(jQuery);
