var DBSDM = DBSDM || {};
DBSDM.Control = DBSDM.Control ||{};

DBSDM.Control.Relation = (function() {
    var ns = DBSDM;

    function Relation(canvas, sourceEntityControl, sourceCardinality, targetCardinality) {
        this._canvas = canvas;

        this._view = new ns.View.Relation(this._canvas);
        this._new = true;

        this._source = {
            entityControl: sourceEntityControl,
            cardinality: sourceCardinality
        };
        this._target = {
            entityControl: null,
            cardinality: targetCardinality
        };

        this._drawCreationClue();
    }

    Relation.prototype._drawCreationClue = function() {
        if (!this._new) { return; }
        var init = this._source.entityControl.getVisualCenter();
        this._view.draw(init.x, init.y);
    };

    Relation.prototype._drawRelation = function() {
        /*
        TODO
          var g = this._canvas.Paper.g();
        g.addClass("relation");

        source.draw(g);
        target.draw(g);
        source.createMiddlePoint(g);
        */
    };

    Relation.prototype.onMouseMove = function(e, mouse) {
        if (!this._new) { return; }
        this._view.move(mouse.x, mouse.y);
    };

    Relation.prototype.onMouseUp = function(e, mouse) {
        if (!this._new) { return; }
        this._view.clear();
        this._new = false;

        if (mouse.getTarget() instanceof ns.Control.Entity) {
            this._target.entityControl = mouse.getTarget();
        } else {
            // TODO no valid place for creation of relation, do appropriate stuff
        }
    };

    return Relation;
})();
