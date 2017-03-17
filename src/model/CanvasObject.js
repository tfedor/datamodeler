var DBSDM = DBSDM || {};
DBSDM.Model = DBSDM.Model ||{};

/**
 * Canvas Object base class
 * ! Should be treated as abstract
 */
DBSDM.Model.CanvasObject = (function(){
    var ns = DBSDM;

    function CanvasObject() {
        this._transform = {
            x: 0,
            y: 0,
            width: 1,
            height: 1
        };

        this.incorrect = false;
    }

    CanvasObject.prototype.setPosition = function(x, y) {
        this._transform.x = (x != null ? x : this._transform.x);
        this._transform.y = (y != null ? y : this._transform.y);
    };

    CanvasObject.prototype.translate = function(dx, dy) {
        this._transform.x += (dx != null ? dx : 0);
        this._transform.y += (dy != null ? dy : 0);
    };

    CanvasObject.prototype.setSize = function(w, h) {
        this._transform.width = (w != null ? w : this._transform.width);
        this._transform.height = (h != null ? h : this._transform.height);
    };

    CanvasObject.prototype.resize = function(dw, dh) {
        this._transform.width += (dw != null ? dw : 0);
        this._transform.height += (dh != null ? dh : 0);
    };

    CanvasObject.prototype.getTransform = function() {
        return this._transform;
    };

    /** in canvas coordinates */
    CanvasObject.prototype.getEdges = function() {
        var transform = Object.assign({}, this._transform);
        return {
            top: transform.y,
            right: transform.x + transform.width,
            bottom: transform.y + transform.height,
            left: transform.x
        };
    };

    CanvasObject.prototype.getExportData = function(properties) {
        var data = {};
        if (properties['saveTransform']) {
            data.transform = this._transform;
        }
        if (this.incorrect) {
            data.incorrect = true;
        }
        return data;
    };

    CanvasObject.prototype.import = function(data) {
        if (data.transform) {
            this.setPosition(data.transform.x, data.transform.y);
            this.setSize(data.transform.width, data.transform.height);
        }
        if (typeof data.incorrect == "boolean") {
            this.incorrect = data.incorrect;
        }
    };

    return CanvasObject;
})();
