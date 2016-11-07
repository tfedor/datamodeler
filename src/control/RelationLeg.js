var DBSDM = DBSDM || {};
DBSDM.Control = DBSDM.Control ||{};

DBSDM.Control.RelationLeg = (function() {
    var ns = DBSDM;
    var Enum = ns.Enums;

    function RelationLeg(relationControl, canvas, model) {
        this._relation = relationControl;
        this._entity = null;
        this._model = model;
        this._view = new ns.View.RelationLeg(canvas, this._model, this);
        this._view.draw();
    }

    RelationLeg.prototype.setEntityControl = function(entityControl) {
        this._entity = entityControl;
    };

    RelationLeg.prototype.getParentRelation = function() {
        return this._relation;
    };

    RelationLeg.prototype.redraw = function() {
        this._view.updateAnchorPosition();
        this._view.updatePoints();
    };

    RelationLeg.prototype.clear = function() {
        this._view.clear();
    };

    RelationLeg.prototype.getDom = function() {
        return this._view.getDom();
    };

    RelationLeg.prototype.getModel = function() {
        return this._model;
    };

    RelationLeg.prototype.getAnchorPosition = function() {
        return this._model.getAnchor();
    };

    RelationLeg.prototype.translate = function(x, y) {
        var anchor = this._model.getAnchor();
        this._model.setAnchor(anchor.x + x, anchor.y + y, anchor.edge);

        this._model.translatePoints(x, y);
    };

    RelationLeg.prototype.createControlPoint = function(P) {
        var offset = 10; // TODO
        var points = this._model.getPoints();

        var index = 1;
        var minDist = -1;
        for (var i=1; i<points.length; i++) {
            var A = points[i-1];
            var B = points[i];

            if (ns.Geometry.pointIsInBox(P, A, B, offset)) {
                var dist = ns.Geometry.pointToLineDistance(P, A, B);
                if (minDist == -1 || dist < minDist) {
                    minDist = dist;
                    index = i;
                }
            }
        }

        this._model.addPoint(index, P);
        this._view.buildControlPoint(index, P);
        return index;
    };

    RelationLeg.prototype.onMouseDown = function(e, mouse) {
        var params = mouse.getParams();
        if (params.action && params.action == "line") {
            params.action = "cp";
            params.index = this.createControlPoint({x: mouse.x, y: mouse.y});
        }
    };

    RelationLeg.prototype.onMouseMove = function(e, mouse) {
        var params = mouse.getParams();
        if (!params.action) { return; }

        if (params.action == "anchor") {
            var pos = this._entity.getEdgeCursorPosition(mouse.x, mouse.y);
            if (pos != null) {
                this._model.setAnchor(pos.x, pos.y, pos.edge);
            }

            this._view.updateAnchorPosition();
            this._view.updatePoints();
        } else if (params.action == "cp") {
            var p = this._model.getPoint(params.index);
            p.x += mouse.rx;
            p.y += mouse.ry;

            this._view.updatePoints();
        }
    };

    RelationLeg.prototype.handleMenu = function(action, params) {
        switch(action) {
            case "cp-delete":
                if (params.index) {
                    this._model.removePoint(params.index);
                    this._view.removeControlPoint(params.index - 1);
                    this._view.updatePoints();
                    return;
                }
                break;

            case "one":         this._model.setCardinality( Enum.Cardinality.ONE );         break;
            case "many":        this._model.setCardinality( Enum.Cardinality.MANY );        break;
            case "identifying": this._model.setIdentifying( !this._model.isIdentifying() ); break;
            case "required":    this._model.setOptional   ( !this._model.isOptional()    ); break;
            case "name":
                // TODO
                break;
        }

        this._view.updateType();
        this._view.updateAnchorType();
    };

    return RelationLeg;
})();
