var DBSDM = DBSDM || {};
DBSDM.Control = DBSDM.Control ||{};

DBSDM.Control.Relation = (function() {
    var ns = DBSDM;
    var Enum = ns.Enums;

    function Relation(canvas, sourceEntityControl, targetEntityControl, sourceCardinality, targetCardinality, model) {
        this._canvas = canvas;

        this._sourceEntity = sourceEntityControl;
        this._targetEntity = targetEntityControl || null;

        this._new = true;

        // model
        var source, target;
        if (!model) {
            source = new ns.Model.RelationLeg(false, false, sourceCardinality);
            target = new ns.Model.RelationLeg(true, true, targetCardinality);
            this._model = new ns.Model.Relation(source, target);
        } else {
            this._model = model;
            source = this._model.getSource();
            target = this._model.getTarget();
        }

        // legs control
        this._legs = {
            source: new ns.Control.RelationLeg(this, canvas, source),
            target: new ns.Control.RelationLeg(this, canvas, target)
        };

        // view
        this._view = new ns.View.Relation(this._canvas, this._model, this);
        this._view.draw(
            this._legs.source.getDom(),
            this._legs.target.getDom()
        );
    }

    Relation.prototype.redraw = function() {
        this._legs.source.redraw();
        this._legs.target.redraw();
        this._view.redraw();
    };

    Relation.prototype.clear = function() {
        this._sourceEntity.removeRelationLeg(this._legs.source);
        this._targetEntity.removeRelationLeg(this._legs.target);
        this._view.clear();

        this._canvas.removeRelation(this);
    };

    Relation.prototype.straighten = function() {
        this._model.straighten();
        this._legs.source.clearControlPoints();
        this._legs.target.clearControlPoints();
    };

    Relation.prototype.import = function() {
        this._new = false;

        this._sourceEntity.addRelationLeg(this._legs.source);
        this._legs.source.setEntityControl(this._sourceEntity);

        this._targetEntity.addRelationLeg(this._legs.target);
        this._legs.target.setEntityControl(this._targetEntity);

        this._canvas.addRelation(this);
        this.redraw();
    };

    // middle point

    Relation.prototype._moveMiddle = function(mouse) {
        var s = this._legs.source._model.getPoint(-2);
        var t = this._legs.target._model.getPoint(-2);

        var x = ns.Geometry.snap(mouse.x, s.x, t.x, 5); // TODO snap limit
        var y = ns.Geometry.snap(mouse.y, s.y, t.y, 5); // TODO snap limit

        this._model.setMiddlePointPosition(x, y);
        this._model.middleMoved = true;

        this.redraw();
    };

    // creation

    Relation.prototype.moveToCursor = function(x, y) {
        var cursor = {x: x, y: y};

        // get possible edges
        var edges = this._sourceEntity.getEdges();
        var center = {
            x: (edges.left + edges.right)*0.5,
            y: (edges.top + edges.bottom)*0.5
        };

        var edgeLR, posLR, lenLR;
        if (x < edges.left || x > edges.right) {
            edgeLR = (x < center.x ? Enum.Edge.LEFT : Enum.Edge.RIGHT);
            posLR = this._sourceEntity.getEdgePosition(edgeLR);
            lenLR = ns.Geometry.pointToPointDistance(cursor, posLR);
        }

        var edgeTB, posTB, lenTB;
        if (y < edges.top || y > edges.bottom) {
            edgeTB = (y < center.y ? Enum.Edge.TOP : Enum.Edge.BOTTOM);
            posTB = this._sourceEntity.getEdgePosition(edgeTB);
            lenTB = ns.Geometry.pointToPointDistance(cursor, posTB);
        }

        // choose shorter of the two possible edges
        var pos, edge;
        if (!lenTB || lenLR <= lenTB) {
            pos = posLR;
            edge = edgeLR;
        } else {
            pos = posTB;
            edge = edgeTB;
        }

        if (!pos) {
            console.log("Can't find appropriate position");
            console.log(pos);
            return;
        }

        // rotate and position anchor
        this._model.getSource().setAnchor(pos.x, pos.y, edge);
        this._model.getTarget().setAnchor(x, y, (edge+2)%4);

        this._model.straighten();

        // update view
        this.redraw();
    };

    Relation.prototype._moveToSameEntity = function() {
        var entityOffset = 20; // TODO

        // rotate and position anchor
        var sourceModel = this._model.getSource();
        var posSource = this._sourceEntity.getEdgePosition(Enum.Edge.BOTTOM);
        var sourcePoint = { x: posSource.x, y: posSource.y + entityOffset };
        sourceModel.setAnchor(posSource.x, posSource.y, Enum.Edge.BOTTOM);
        if (sourceModel.getPointsCount() == 2) {
            sourceModel.addPoint(1, sourcePoint);
        } else {
            sourceModel.setPoint(1, sourcePoint);
        }

        var targetModel = this._model.getTarget();
        var posTarget = this._targetEntity.getEdgePosition(Enum.Edge.LEFT);

        var targetPoint = { x: posTarget.x - entityOffset, y: posTarget.y };
        targetModel.setAnchor(posTarget.x, posTarget.y, Enum.Edge.LEFT);
        if (targetModel.getPointsCount() == 2) {
            targetModel.addPoint(1, targetPoint);
        } else {
            targetModel.setPoint(1, targetPoint);
        }

        this._model.setMiddlePointPosition(posTarget.x - entityOffset, posSource.y + entityOffset);

        // update view
        this.redraw();
    };

    Relation.prototype._moveToDifferentEntity = function() {
        this._model.straighten(true, this._sourceEntity._model, this._targetEntity._model);
        this.redraw();
    };

    Relation.prototype.moveToEntity = function() {
        if (this._targetEntity == this._sourceEntity) {
            this._moveToSameEntity();
        } else {
            this._moveToDifferentEntity();
        }
    };

    // sort

    Relation.prototype.getVector = function() {
        if (this._sourceEntity == this._targetEntity) {
            return new ns.Geometry.Vector(0,0);
        }
        var s = this._model.getSource().getAnchor();
        var t = this._model.getTarget().getAnchor();
        return (new ns.Geometry.Vector()).fromPoints(s, t);
    };

    Relation.prototype.addForceToEntities = function(force) {
        this._sourceEntity.addForce(force);
        this._targetEntity.addForce(force.getOpposite());
    };

    // events

    Relation.prototype.onEntityDrag = function() {
        if (this._model.isManual()) { return; }

        this._model.resetAnchors();
        this._model.resetMiddlePoint();
        this.redraw();
    };

    Relation.prototype.onEntityResize = function() {
        if (this._model.isManual()) { return; }
        this._model.resetMiddlePoint();
        this.redraw();
    };

    Relation.prototype.onMouseMove = function(e, mouse) {
        if (this._new) {
            var target = mouse.getTarget();
            if (target instanceof ns.Control.Entity) {
                this._targetEntity = target;
                this.moveToEntity();
            } else {
                this._targetEntity = null;
                this.moveToCursor(mouse.x, mouse.y);
            }
        } else {
            this._moveMiddle(mouse);
        }
    };

    Relation.prototype.onMouseUp = function(e, mouse) {
        if (!this._new) { return; }
        this._new = false;

        if (this._targetEntity == null) {
            this._view.clear();
        } else {
            this._sourceEntity.addRelationLeg(this._legs.source);
            this._legs.source.setEntityControl(this._sourceEntity);

            this._targetEntity.addRelationLeg(this._legs.target);
            this._legs.target.setEntityControl(this._targetEntity);

            this._canvas.addRelation(this);
        }
    };

    Relation.prototype.handleMenu = function(action, params) {
        switch(action) {
            case "reset":      this._model.resetMiddlePoint(); break;
            case "straighten": this.straighten(); break;
            case "toback":     this._view.toBack(); break;
            case "delete":     this.clear(); return;
        }
        this.redraw();
    };

    return Relation;
})();
