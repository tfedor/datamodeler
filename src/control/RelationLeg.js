var DBSDM = DBSDM || {};
DBSDM.Control = DBSDM.Control ||{};

DBSDM.Control.RelationLeg = (function() {
    var ns = DBSDM;
    var Enum = ns.Enums;

    var EdgeOffset = 10;
    var ControlCreationOffset = 10; // to not require exact clicks on the relation leg

    function RelationLeg(relationControl, canvas, model) {
        this._relation = relationControl;
        this._canvas = relationControl.getCanvas();
        this._entity = null;
        this._model = model;
        this._view = new ns.View.RelationLeg(canvas, this._model, this);
        this._view.draw();

        var name = model.getName();
        if (name) {
            this._view.toggleName();
        }

        this._inXorCreation = false;
    }

    /**
     * Attach relation leg to the given entity Control
     */
    RelationLeg.prototype.setEntityControl = function(entityControl) {
        this._entity = entityControl;
        this._view.onEntityAttached();
    };

    RelationLeg.prototype.getRelation = function() {
        return this._relation;
    };

    RelationLeg.prototype.redraw = function() {
        this._view.updateAnchorPosition();
        this._view.updatePoints();
    };

    RelationLeg.prototype.redrawType = function() {
        this._view.updateType();
        this._view.updateAnchorType();
    };

    RelationLeg.prototype.getDom = function() {
        return this._view.getDom();
    };

    RelationLeg.prototype.getModel = function() {
        return this._model;
    };

    RelationLeg.prototype.translateAnchor = function(x, y) {
        var anchor = this._model.getAnchor();
        this._model.setAnchor(anchor.x + x, anchor.y + y, anchor.edge);

        if (this._model.inXor) {
            this._entity.redrawXor(null, this);
        }
    };

    RelationLeg.prototype.translate = function(dx, dy) {
        this.translateAnchor(dx, dy);
        this._model.translatePoints(dx, dy);
    };

    RelationLeg.prototype._moveAnchor = function(mouse) {
        var pos = this._entity.getEdgeCursorPosition(mouse.x, mouse.y);
        if (pos != null) {
            if ((pos.edge & 1) != 0) { // right/left
                pos.y = ns.Geometry.snap(pos.y, this._model.getPoint(1).y, null, ns.Consts.SnappingLimit);
            } else {
                pos.x = ns.Geometry.snap(pos.x, this._model.getPoint(1).x, null, ns.Consts.SnappingLimit);
            }
            this._model.setAnchor(pos.x, pos.y, pos.edge);
        }

        this._relation.onAnchorMove();

        if (this._model.inXor) {
            this._entity.redrawXor(null, this);
        }
    };

    RelationLeg.prototype.createControlPoint = function(P) {
        var points = this._model.getPoints();

        var index = 1;
        var minDist = -1;
        for (var i=1; i<points.length; i++) {
            var A = points[i-1];
            var B = points[i];

            if (ns.Geometry.pointIsInBox(P, A, B, ControlCreationOffset)) {
                var dist = ns.Geometry.pointToLineDistance(P, A, B);
                if (minDist == -1 || dist < minDist) {
                    minDist = dist;
                    index = i;
                }
            }
        }

        this._model.addPoint(index, P);
        this._view.buildControlPoint(index, P);
        this._view.updatePoints();

        this._model.pointsManual = true;

        return index;
    };

    RelationLeg.prototype._moveControlPoint = function(index, mouse) {
        var p = this._model.getPoint(index);
        var prev = this._model.getPoint(index - 1);
        var next = this._model.getPoint(index + 1);

        p.x = ns.Geometry.snap(mouse.x, prev.x, next.x, ns.Consts.SnappingLimit);
        p.y = ns.Geometry.snap(mouse.y, prev.y, next.y, ns.Consts.SnappingLimit);

        this._relation.centerMiddlePoint();
    };

    // XOR

    RelationLeg.prototype._initXor = function() {
        if (ns.Diagram.allowEdit) {
            this._relation.getCanvas().Mouse.attachObject(this);
            this._view.select();
            this._entity.markRelations(this, this._model.inXor);
            this._inXorCreation = true;

            var that = this;
            ns.Diagram.cancelAction = function() { that.xor(null); };
        }
    };

    RelationLeg.prototype.xor = function(leg) {
        if (!this._inXorCreation) { return; }
        this._inXorCreation = false;
        this._entity.unmarkRelations();

        ns.Diagram.cancelAction = null;
        if (!leg) {return;}

        if (this == leg) {
            this._relation.getCanvas().ui.error("Same leg selected", ns.Consts.UIDefaultErrorDuration);
            console.log("Same leg selected");
            return;
        }

        if (this._model.inXor && leg._model.inXor) {
            this._relation.getCanvas().ui.error("Both relations are already in XOR", ns.Consts.UIDefaultErrorDuration);
            console.log("Both relations are already in XOR");
            return;
        }
        if (this._entity != leg._entity) {
            this._relation.getCanvas().ui.error("Relations have different parent", ns.Consts.UIDefaultErrorDuration);
            console.log("Legs have different parent");
            return;
        }

        if (this._model.inXor) {
            this._entity.xorWith(leg, this);
        } else {
            this._entity.xorWith(this, leg);
        }
    };

    RelationLeg.prototype._removeXor = function() {
        this._entity.removeXorLeg(this);
    };

    // Marks

    RelationLeg.prototype.mark = function() {
        this._view.mark();
    };

    RelationLeg.prototype.allow = function() {
        this._view.allow();
    };

    RelationLeg.prototype.clearMarks = function() {
        this._view.clearSelectionClasses();
    };

    RelationLeg.prototype._toggleIncorrect = function() {
        this._model.incorrect = !this._model.incorrect;
        if (this._model.incorrect) {
            this._view.markIncorrect();
        } else {
            this._view.markCorrect();
        }
    };

    // Events

    RelationLeg.prototype.onEntityDrag = function(dx, dy) {
        if (this._relation.isRecursive()) {
            this._relation.translate(dx*0.5, dy*0.5);
        } else {
            this.translateAnchor(dx, dy);
        }
    };

    RelationLeg.prototype.onEntityResize = function(edges) {

        // first, snap to edge if needed
        var a = this._model.getAnchor();
        switch(a.edge) {
            case Enum.Edge.LEFT:   a.x = edges.left; break;
            case Enum.Edge.RIGHT:  a.x = edges.right; break;
            case Enum.Edge.TOP:    a.y = edges.top; break;
            case Enum.Edge.BOTTOM: a.y = edges.bottom; break;
        }

        if ((a.edge & 1) != 0) {
            a.y = Math.max(a.y, edges.top    + EdgeOffset);
            a.y = Math.min(a.y, edges.bottom - EdgeOffset);
        } else {
            a.x = Math.max(a.x, edges.left   + EdgeOffset);
            a.x = Math.min(a.x, edges.right  - EdgeOffset);
        }
        this._model.setAnchor(a.x, a.y, a.edge);

        if (this._model.inXor) {
            this._entity.redrawXor(null, this);
        }
        this._relation.onEntityResize();
    };

    RelationLeg.prototype.onMouseDown = function(e, mouse) {
        if (this._canvas.inCorrectionMode) { return; }

        var params = mouse.getParams();
        if (params.action && params.action == "line") {
            params.action = "cp";
            params.index = this.createControlPoint({x: mouse.x, y: mouse.y});

        }
    };

    RelationLeg.prototype.onMouseMove = function(e, mouse) {
        if (this._canvas.inCorrectionMode) { return; }

        var params = mouse.getParams();
        if (!params.action) { return; }

        if (params.action == "anchor") {
            this._moveAnchor(mouse);
        } else if (params.action == "cp") {
            this._moveControlPoint(params.index, mouse);
        }
    };

    RelationLeg.prototype.onMouseUp = function(e, mouse) {
        if (this._canvas.inCorrectionMode) {
            this._toggleIncorrect();
            return;
        }

        // TODO check for fast mouse movement bug, as in Entity
        var leg = mouse.getTarget();
        if (leg instanceof ns.Control.RelationLeg) {
            this.xor(leg);
        } else {
            this.xor(null);
        }
    };

    // Menu

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
            case "name":
                this._view.toggleName();
                break;
        }

        if (!ns.Diagram.allowEdit) { return; }
        switch(action) {
            case "one":         this._model.setCardinality( Enum.Cardinality.ONE );         break;
            case "many":        this._model.setCardinality( Enum.Cardinality.MANY );        break;
            case "identifying": this._model.setIdentifying( !this._model.isIdentifying() ); break;
            case "required":    this._model.setOptional   ( !this._model.isOptional()    ); break;
            case "xor":         this._initXor(); break;
            case "remove-xor":  this._removeXor(); break;
        }

        this.redrawType();
    };

    RelationLeg.prototype.getMenuState = function() {
        return {
            one: this._model.getCardinality() == Enum.Cardinality.ONE,
            many: this._model.getCardinality() == Enum.Cardinality.MANY,
            identifying: this._model.isIdentifying(),
            required: !this._model.isOptional(),
            name: (this._view._name != null),
            "remove-xor": this._model.inXor
        }
    };

    return RelationLeg;
})();
