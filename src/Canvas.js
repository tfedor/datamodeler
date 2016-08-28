
var Canvas = (function($) {

    function Canvas(path) {
        this.Paper = Snap(path);
        this.Mouse = null;

        this._sharedElements = {};
        this.menu = {};

        this._newEntity = null;
        this._entities = {};
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

    Canvas.prototype._createContextMenus = function(){
        this.menu.Entity = new Menu('top');
        this.menu.Entity
            .addOption("New Attribute", "newAttribute")
            .addOption("New Relation", "newRelation")
            .addOption("Delete", "delete")
            .draw(this);
    };

    Canvas.prototype.removeEntity =  function(id) {
        if (this._entities.hasOwnProperty(id)) {
            delete this._entities[id];
        }
    };

    Canvas.prototype.draw = function() {
        this.Mouse = new Mouse(this.Paper.node);
        this._createSharedElements();
        this._createContextMenus();
        for (var key in this._entities) {
            if (this._entities.hasOwnProperty(key)) {
                this._entities[key].draw(this);
            }
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
        this._newEntity = new Entity(this.Mouse.x, this.Mouse.y);
        this._newEntity.draw(this);
    };

    Canvas.prototype.onMouseMove = function(e) {
        if (!this._newEntity) { return; }

        if (this.Mouse.dx < 0) {
            this._newEntity.translateTo(this.Mouse.x);
        }
        if (this.Mouse.dy < 0) {
            this._newEntity.translateTo(null, this.Mouse.y);
        }

        this._newEntity.resize(Math.abs(this.Mouse.dx), Math.abs(this.Mouse.dy));
    };

    Canvas.prototype.onMouseUp = function(e) {
        if (!this._newEntity) { return; }
        if (!this.Mouse.isDragged()) {
            this._newEntity.resize(100, 100);
        }
        var id = this._newEntity.getId();
        this._entities[id] = this._newEntity;
        this._newEntity = null;
    };

    return Canvas;
})(jQuery);
