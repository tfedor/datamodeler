
var Mouse = (function(){

    function Mouse(canvasNode) {
        this._node = canvasNode; // dom element coordinates are related to

        this._targetObject = null; // object at which the event was fired
        this._attachedObject = null;
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

        // offset from last update
        this.rx = 0;
        this.ry = 0;
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

    Mouse.prototype.getTarget = function() {
        return this._targetObject;
    };

    Mouse.prototype._update = function(e) {
        var offset = this._node.getBoundingClientRect();
        this.x = e.clientX - offset.left;
        this.y = e.clientY - offset.top;
    };

    Mouse.prototype.down = function(e, object, params) {
        this._targetObject = object;

        e.stopPropagation();
        if (e.button != 0 || this._attachedObject) { return; }

        this.attachObject(object, params);
        if (!this._attachedObject) {
            return;
        }
        this._update(e);

        this._down = true;
        this.ox = this.x;
        this.oy = this.y;
        this.dx = 0;
        this.dy = 0;
        this.rx = 0;
        this.ry = 0;

        if (this._attachedObject.onMouseDown) {
            this._attachedObject.onMouseDown(e, this);
        }
    };

    Mouse.prototype.move = function(e) {
        e.stopPropagation();
        if (e.button != 0) { return; }
        if (!this._attachedObject) { return; }

        var x = this.x;
        var y = this.y;

        this._update(e);

        this._move = true;
        this.dx = this.x - this.ox;
        this.dy = this.y - this.oy;

        this.rx = this.x - x;
        this.ry = this.y - y;

        if (this._attachedObject.onMouseMove) {
            this._attachedObject.onMouseMove(e, this);
        }
    };

    Mouse.prototype.up = function(e) {
        e.stopPropagation();
        if (e.button != 0 || !this._attachedObject) { return; }

        this._update(e);

        if (this._attachedObject.onMouseUp) {
            this._attachedObject.onMouseUp(e, this);
        }
        this._attachedObject = null;

        this._down = false;
        this._move = false;
    };

    return Mouse;
})();