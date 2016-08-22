
var Mouse = (function(){

    function Mouse(canvasNode) {
        this._node = canvasNode; // dom element coordinates are related to

        this._attachedObject = null;
        this.action = null;

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

    Mouse.prototype.isDown = function() {
        return this._down;
    };

    Mouse.prototype.isDragged = function() {
        return this._down && this._move;
    };

    Mouse.prototype._update = function(e) {
        var offset = this._node.getBoundingClientRect();
        var doc = document.documentElement;
        this.x = e.clientX - offset.left;
        this.y = e.clientY - offset.top;
    };

    Mouse.prototype.down = function(e, object, action) {
        this._update(e);
        this._attachedObject = object;
        this.action = action || null;

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
        if (this._down) {
            this._update(e);

            this._move = true;
            this.dx = this.x - this.ox;
            this.dy = this.y - this.oy;

            if (this._attachedObject.onMouseMove) {
                this._attachedObject.onMouseMove(e, this);
            }
        }
        e.stopPropagation();
    };

    Mouse.prototype.up = function(e) {
        if (this._down) {
            this._update(e);

            if (this._attachedObject.onMouseUp) {
                this._attachedObject.onMouseUp(e, this);
            }

            this._attachedObject = null;
            this._down = false;
            this._move = false;
        }
        e.stopPropagation();
    };

    return Mouse;
})();