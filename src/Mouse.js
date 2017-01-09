var DBSDM = DBSDM || {};

/**
 * Mouse controller
 * Attached to given canvas, handles current mouse position and fires event to attached objects
 * Object is attached either on mouse down event, or programatically.
 */
DBSDM.Mouse = (function(){
    var ns = DBSDM;

    // double click handling
    var timer = 0;
    var first = {x: 0, y: 0};

    function Mouse(canvas) {
        this._canvas = canvas;
        this._node = canvas.svg; // dom element coordinates are related to

        this._targetObject = null; // object at which the event was fired
        this._attachedObject = null;
        this._params = {};

        this._down = false;
        this._move = false;

        this.button = null;

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

    Mouse.prototype.attachObject = function(object, params) {
        this._attachedObject = object;
        this._params = params || {};
    };

    Mouse.prototype.detachObject = function() {
        this._attachedObject = null;
        this._params = {};
    };

    Mouse.prototype.getParams = function() {
        return this._params;
    };

    Mouse.prototype.setParam = function(name, value) {
        this._params[name] = value;
    };

    Mouse.prototype.getTarget = function() {
        return this._targetObject;
    };

    /**
     * Set current coordinates from mouse event
     */
    Mouse.prototype.update = function(e) {
        var offset = this._node.getBoundingClientRect();
        this.x = (e.clientX - offset.left) / this._canvas._zoom;
        this.y = (e.clientY - offset.top) / this._canvas._zoom;

        if (this.button != 1) {
            this.x += this._canvas._offset.x;
            this.y += this._canvas._offset.y;

            if (this._canvas.snap) {
                var gs = ns.Consts.CanvasGridSize;
                this.x = Math.ceil(this.x/gs)*gs;
                this.y = Math.ceil(this.y/gs)*gs;
            }
        }
    };

    Mouse.prototype.isDown = function() {
        return this._down;
    };

    Mouse.prototype.didMove = function() {
        return this._move;
    };

    Mouse.prototype.down = function(e, object, params) {
        ns.Diagram.lastCanvas = this._canvas;

        this._targetObject = object;

        if (this._canvas.ui.shown() && !this._canvas.ui.inTutorial) {
            this._canvas.ui.hideMessage();
        }

        e.stopPropagation();
        if (this._attachedObject) { return; }
        if (e.button == 1) {
            object = this._canvas;
            params = null;
            e.preventDefault();
        } else if (e.button != 0) {
            return;
        }
        this.button = e.button;

        DBSDM.Menu.hide(); // hide menu

        this.attachObject(object, params);
        if (!this._attachedObject) {
            return;
        }
        this._down = true;
        this.update(e);

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
        if (!this._attachedObject) { return; }
        var x = this.x;
        var y = this.y;

        this.update(e);

        this._move = this._move || this.rx != 0 || this.ry != 0;
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
        if (!this._attachedObject) { return; }

        this.update(e);

        if (this._attachedObject.onMouseUp) {
            this._attachedObject.onMouseUp(e, this);
        }

        if (this._attachedObject.onMouseDblClick) {
            if (this.button == 0) {
                if (first.x == this.x && first.y == this.y && Date.now() - timer < ns.Consts.DoubleClickInterval) {
                    timer = 0;
                    this._attachedObject.onMouseDblClick(e, this);
                } else {
                    timer = Date.now();
                    first.x = this.x;
                    first.y = this.y;
                }
            } else {
                timer = 0;
            }
        }

        this.detachObject();

        this._down = false;
        this._move = false;

        this.button = null;
    };


    Mouse.prototype.enter = function(e, object) {
        this._targetObject = object;

        e.stopPropagation();
        if (e.button != 0 || this._attachedObject) { return; }

        if (this._attachedObject && this._attachedObject.onMouseEnter) {
            this._attachedObject.onMouseEnter(e, this);
        }
    };

    Mouse.prototype.leave = function(e) {
        this._targetObject = null;

        e.stopPropagation();
        if (e.button != 0 || this._attachedObject) { return; }

        if (this._attachedObject && this._attachedObject.onMouseLeave) {
            this._attachedObject.onMouseLeave(e, this);
        }
    };

    return Mouse;
})();