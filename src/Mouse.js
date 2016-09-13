
var Mouse = (function(){

    function Mouse(canvasNode) {
        this._node = canvasNode; // dom element coordinates are related to

        this._attachedObject = null; // object at which the event was fired
        this._params = null;

        this._down = false;
        this._move = false;

        // current coordinates
        this.x = 0;
        this.y = 0;

        // point of Mouse down (origin)
        this.ox = 0;
        this.oy = 0;

        // offset from origin
        this.dx = 0;
        this.dy = 0;
    }

    Mouse.prototype.isDragged = function() {
        return this._down && this._move;
    };

    Mouse.prototype.attachObject = function(object, params) {
        this._attachedObject = object;
        this._params = params;
    };

    Mouse.prototype.detachObject = function() {
        this._attachedObject = null;
        this._params = null;
    };

    Mouse.prototype.getParams = function() {
        return this._params;
    };

    Mouse.prototype._update = function(e) {
        var offset = this._node.getBoundingClientRect();
        this.x = e.clientX - offset.left;
        this.y = e.clientY - offset.top;
    };

    Mouse.prototype.down = function(e, object, params) {
        this.attachObject(object, params);
        if (!this._attachedObject) { return; }
        this._update(e);

        this._down = true;
        this.ox = this.x;
        this.oy = this.y;
        this.dx = 0;
        this.dy = 0;

        if (this._attachedObject.onMouseDown) {
            this._attachedObject.onMouseDown(e, this);
        }
        e.stopPropagation();
    };

    Mouse.prototype.move = function(e) {
        if (!this._attachedObject) { return; }

        this._update(e);

        this._move = true;
        this.dx = this.x - this.ox;
        this.dy = this.y - this.oy;

        if (this._attachedObject.onMouseMove) {
            this._attachedObject.onMouseMove(e, this);
        }
        e.stopPropagation();
    };

    Mouse.prototype.up = function(e) {
        if (!this._attachedObject) { return; }

        if (this._down) {
            this._update(e);

            var obj = this._attachedObject;
            this._attachedObject = null;

            if (obj.onMouseUp) {
                obj.onMouseUp(e, this);
            }

            this._down = false;
            this._move = false;
        }
        e.stopPropagation();
    };

    return Mouse;
})();