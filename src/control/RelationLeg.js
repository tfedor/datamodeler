var DBSDM = DBSDM || {};
DBSDM.Control = DBSDM.Control ||{};

DBSDM.Control.RelationLeg = (function() {
    var ns = DBSDM;

    function RelationLeg(canvas, model) {
        this._model = model;
        this._view = new ns.View.RelationLeg(canvas, this._model)
        this._view.draw();
    }

    RelationLeg.prototype.redraw = function() {
        this._view.updateAnchorPosition();
        this._view.updatePoints();
    };

    RelationLeg.prototype.clear = function() {
        this._view.clear();
    };

    RelationLeg.prototype.getDomFragment = function() {
        return this._view.getDomFragment();
    };

    RelationLeg.prototype.getModel = function() {
        return this._model;
    };

    RelationLeg.prototype.getAnchorPosition = function() {
        return this._model.getAnchor();
    };

    return RelationLeg;
})();
