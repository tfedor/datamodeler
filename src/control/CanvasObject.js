var DBSDM = DBSDM || {};
DBSDM.Control = DBSDM.Control ||{};

DBSDM.Control.CanvasObject = (function(){
    var ns = DBSDM;

    CanvasObject.active = null;

    function CanvasObject(canvas, model) {
        this._canvas = canvas;
        this._model = model;
        this._view = null; // specify in subclass

        this._neededSize = {width:0,height:0}; // size needed to encompass all content with it's current size
        this._force = new ns.Geometry.Vector();

        if (CanvasObject.active) {
            CanvasObject.active.deactivate();
        }
    }

    CanvasObject.prototype.getDom = function() {
        return this._view.getDom();
    };

    CanvasObject.prototype.getEdges = function() {
        return this._model.getEdges();
    };

    CanvasObject.prototype.drag = function(mouse) {
        var delta = {
            x: mouse.rx,
            y: mouse.ry
        };
        if (this._canvas.snap && (delta.x != 0 || delta.y != 0)) {
            var tr = this._model.getTransform();
            if (delta.x != 0) { delta.x -= tr.x % ns.Consts.CanvasGridSize; }
            if (delta.y != 0) { delta.y -= tr.y % ns.Consts.CanvasGridSize; }
        }

        this._model.translate(delta.x, delta.y);
        return delta;
    };

    CanvasObject.prototype.dragControlPoint = function(mouse, cp) {
        var transform = this._model.getTransform();
        var x=null, y=null;
        var width=null, height=null;

        var cursor = {
            x: mouse.x,
            y: mouse.y
        };

        // set desired state

        if (/n/.test(cp)) {
            y = cursor.y;
            height = (transform.y - y) + transform.height;
        } else if (/s/.test(cp)) {
            height = cursor.y - transform.y;
        }

        if (/w/.test(cp)) {
            x = cursor.x;
            width = (transform.x - x) + transform.width;
        } else if (/e/.test(cp)) {
            width = cursor.x - transform.x;
        }

        // constrain width/height

        this._setConstrainedTransform(x, y, width, height);
    };

    CanvasObject.prototype.notifyDrag = function(x, y) {
        // intentionally empty
    };

    /**
     * Update position and size of element with regards to constraints
     */
    CanvasObject.prototype._setConstrainedTransform = function(x, y, width, height) {
        var transform = this._model.getTransform();

        if (width != null && width < this._neededSize.width) {
            width = this._neededSize.width;
            if (x != null) {
                x = transform.x + transform.width - this._neededSize.width;
            }
        }
        if (height != null && height < this._neededSize.height) {
            height = this._neededSize.height;
            if (y != null) {
                y = transform.y + transform.height - this._neededSize.height;
            }
        }

        this._model.setPosition(x, y);
        this._model.setSize(width, height);
    };

    CanvasObject.prototype.computeNeededSize = function() {
        var size = this._view.getMinimalSize();
        this._neededSize.width = size.width;
        this._neededSize.height = size.height;
    };

    /**
     * Resize object to its minimal size, in case its dimensions are smaller than minimal required
     * @returns boolean     Indication whether redraw happened
     */
    CanvasObject.prototype.encompassContent = function() {
        this.computeNeededSize();
        var transform = this._model.getTransform();

        var width = (transform.width < this._neededSize.width ? this._neededSize.width : null);
        var height = (transform.height < this._neededSize.height ? this._neededSize.height : null);

        if (width != null || height != null) {
            this._model.setSize(width, height);
            this._view.redraw();
            return true;
        }
        return false;
    };


    /**
     * Layout forces
     */

    CanvasObject.prototype.getCenter = function() {
        var transform = this._model.getTransform();
        return {
            x: transform.x + transform.width * 0.5,
            y: transform.y + transform.height * 0.5
        }
    };

    CanvasObject.prototype.resetForce = function() {
        this._force.reset();
    };

    CanvasObject.prototype.addForce = function(force) {
        this._force.add(force);
    };

    CanvasObject.prototype.applyForce = function(modifier) {
        if (modifier && modifier != 1) {
            this._force.multiply(modifier);
        }

        this._model.translate(this._force.x, this._force.y);
        this.notifyDrag(this._force.x, this._force.y);
        this._view.redraw();
        this.resetForce();
    };

    /**
     * Activation/Deactivation
     */

    CanvasObject.prototype.activate = function() {
        if (CanvasObject.active) {
           CanvasObject.active.deactivate();
        }
        CanvasObject.active = this;
        this._view.showControls();
    };

    CanvasObject.prototype.deactivate = function() {
        if (CanvasObject.active == this) {
            CanvasObject.active = null;
            this._view.hideControls();
        }
    };

    /** Handlers */

    CanvasObject.prototype.onMouseDown = function(e, mouse) {
        if (this._canvas.inCorrectionMode) { return; }

        var matches = e.target.className.baseVal.match(/e-cp-(\w+)/);
        if (matches) {
            mouse.setParam("action", "cp");
            mouse.setParam("cp", matches[1]);
        }
    };

    return CanvasObject;
})();
