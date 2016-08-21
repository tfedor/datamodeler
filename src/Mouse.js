
var Mouse = (function(){

    function Mouse(canvasNode) {
        this._node = canvasNode; // dom element coordinates are related to

        this.target = null;
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
        this.x = e.clientX + (window.pageXOffset || doc.scrollLeft) - offset.left;
        this.y = e.clientY + (window.pageYOffset || doc.scrollTop) - offset.top;
    };

    Mouse.prototype.down = function(e) {
        this._update(e);
        this.target = e.target;

        this._down = true;
        this.ox = this.x;
        this.oy = this.y;
        this.dx = 0;
        this.dy = 0;
    };

    Mouse.prototype.move = function(e) {
        if (this._down) {
            this._update(e);

            this._move = true;
            this.dx = this.x - this.ox;
            this.dy = this.y - this.oy;
        }
    };

    Mouse.prototype.up = function(e) {
        if (this._down) {
            this._update(e);

            this.target = null;
            this._down = false;
            this._move = false;
        }
    };

    return Mouse;
})();