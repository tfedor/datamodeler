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
        this._view.onEntityAttached();
    };

    RelationLeg.prototype.getParentRelation = function() {
        return this._relation;
    };

    RelationLeg.prototype.redraw = function() {
        this._view.updateAnchorPosition();
        this._view.updatePoints();
    };

    RelationLeg.prototype.getDom = function() {
        return this._view.getDom();
    };

    RelationLeg.prototype.getModel = function() {
        return this._model;
    };

    RelationLeg.prototype.translate = function(x, y) {
        var anchor = this._model.getAnchor();
        this._model.setAnchor(anchor.x + x, anchor.y + y, anchor.edge);
    };

    RelationLeg.prototype._moveAnchor = function(mouse) {
        var pos = this._entity.getEdgeCursorPosition(mouse.x, mouse.y);
        if (pos != null) {
            if ((pos.edge & 1) != 0) { // right/left
                pos.y = ns.Geometry.snap(pos.y, this._model.getPoint(1).y, null, 5); // TODO snapping limit
            } else {
                pos.x = ns.Geometry.snap(pos.x, this._model.getPoint(1).x, null, 5); // TODO snapping limit
            }
            this._model.setAnchor(pos.x, pos.y, pos.edge);
        }

        this._model.anchorMoved = true;

        this._view.updateAnchorPosition();
        this._view.updatePoints();
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

    RelationLeg.prototype._moveControlPoint = function(index, mouse) {
        var snappingLimit = 5; // TODO

        var p = this._model.getPoint(index);
        var prev = this._model.getPoint(index - 1);
        var next = this._model.getPoint(index + 1);

        p.x = ns.Geometry.snap(mouse.x, prev.x, next.x, snappingLimit);
        p.y = ns.Geometry.snap(mouse.y, prev.y, next.y, snappingLimit);

        this._view.updatePoints();
    };

    RelationLeg.prototype.clearControlPoints = function() {
        this._view.clearControlPoints();
    };

    RelationLeg.prototype.onEntityResize = function(edges) {
        var edgeOffset = 10; // TODO;

        // first, snap to edge if needed
        var a = this._model.getAnchor();
        switch(a.edge) {
            case Enum.Edge.LEFT:   a.x = edges.left; break;
            case Enum.Edge.RIGHT:  a.x = edges.right; break;
            case Enum.Edge.TOP:    a.y = edges.top; break;
            case Enum.Edge.BOTTOM: a.y = edges.bottom; break;
        }

        if ((a.edge & 1) != 0) {
            a.y = Math.max(a.y, edges.top    + edgeOffset);
            a.y = Math.min(a.y, edges.bottom - edgeOffset);
        } else {
            a.x = Math.max(a.x, edges.left   + edgeOffset);
            a.x = Math.min(a.x, edges.right  - edgeOffset);
        }
        this._model.setAnchor(a.x, a.y, a.edge);
        this._relation.onEntityResize();

        this._view.updateAnchorPosition();
        this._view.updatePoints();
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
            this._moveAnchor(mouse);
        } else if (params.action == "cp") {
            this._moveControlPoint(params.index, mouse);
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
