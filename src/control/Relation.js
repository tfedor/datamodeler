var DBSDM = DBSDM || {};
DBSDM.Control = DBSDM.Control ||{};

DBSDM.Control.Relation = (function() {
    var ns = DBSDM;
    var Enum = ns.Enums;

    var RecursiveEntityOffset = 20; // visual offset from anchor for the first control point

    function Relation(canvas, sourceEntityControl, targetEntityControl, sourceCardinality, targetCardinality, model) {
        this._canvas = canvas;

        this._sourceEntity = sourceEntityControl;
        this._targetEntity = targetEntityControl || null;

        this._new = true;

        // model
        var source, target;
        if (!model) {
            source = new ns.Model.RelationLeg(false, true, sourceCardinality);
            target = new ns.Model.RelationLeg(true, false, targetCardinality);
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

        this._canvas.History.record(this, "create", false, true);
    }

    /**
     * Finish creation of relation by connecting with entities and saving relation
     */
    Relation.prototype._setupEntities = function() {
        this._new = false;

        this._sourceEntity.addRelationLeg(this._legs.source);
        this._legs.source.setEntityControl(this._sourceEntity);

        this._targetEntity.addRelationLeg(this._legs.target);
        this._legs.target.setEntityControl(this._targetEntity);

        this._canvas.addRelation(this);
        this._model.middleManual = (this._sourceEntity == this._targetEntity);
    };

    Relation.prototype.import = function(manageRelations) {
        this._setupEntities();
        if (manageRelations) {
            this._moveToEntity();
        }
        this.redraw();
    };

    Relation.prototype.cancel = function() {
        if (!this._new) { return; }
        this._new = false;
        this._view.clear();
        this._canvas.Mouse.detachObject();
    };

    //

    Relation.prototype.getCanvas = function() {
        return this._canvas;
    };

    Relation.prototype.getModel = function() {
        return this._model;
    };

    Relation.prototype.redraw = function() {
        this._legs.source.redraw();
        this._legs.target.redraw();
        this._view.redraw();
    };

    Relation.prototype.redrawType = function() {
        this._legs.source.redrawType();
        this._legs.target.redrawType();
    };

    Relation.prototype.clear = function() {
        this._sourceEntity.removeRelationLeg(this._legs.source);
        this._targetEntity.removeRelationLeg(this._legs.target);
        this._view.clear();
        this._canvas.removeRelation(this);

        this._canvas.History.record(this, "clear", true, false);
    };
    Relation.prototype.undoClear = function() {
        this._legs.source.draw();
        this._legs.target.draw();

        this._view.draw(
            this._legs.source.getDom(),
            this._legs.target.getDom()
        );

        this._setupEntities();
        this.redraw();
        this.redrawType();
    };

    Relation.prototype.straighten = function() {
        this._model.straighten();
    };

    Relation.prototype.translate = function(dx, dy) {
        this._legs.source.translate(dx, dy);
        this._legs.target.translate(dx, dy);
        this._model.translateMiddlePoint(dx, dy);
        this.redraw();
    };

    Relation.prototype.isRecursive = function() {
        return this._sourceEntity == this._targetEntity;
    };

    // middle point

    Relation.prototype._moveMiddle = function(pos) {
        var s = this._legs.source._model.getPoint(-2);
        var t = this._legs.target._model.getPoint(-2);

        var x = ns.Geometry.snap(pos.x, s.x, t.x, ns.Consts.SnappingLimit);
        var y = ns.Geometry.snap(pos.y, s.y, t.y, ns.Consts.SnappingLimit);

        var initial = Object.assign({manual: this._model.middleManual}, this._model.getMiddlePoint());

        this._model.setMiddlePointPosition(x, y);
        this._model.middleManual = true;

        this._canvas.History.record(this, "middle", initial, {x: x, y: y, manual: true});
    };

    Relation.prototype.centerMiddlePoint = function() {
        if (!this._model.middleManual) {
            this._model.resetMiddlePoint();
        }
        this.redraw();
    };

    // creation

    Relation.prototype._moveToCursor = function(x, y) {
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
        // rotate and position anchor
        var sourceModel = this._model.getSource();
        var posSource = this._sourceEntity.getEdgePosition(Enum.Edge.TOP);
        var sourcePoint = { x: posSource.x, y: posSource.y - RecursiveEntityOffset };
        sourceModel.setAnchor(posSource.x, posSource.y, Enum.Edge.TOP);
        if (sourceModel.getPointsCount() == 2) {
            sourceModel.addPoint(1, sourcePoint);
        } else {
            sourceModel.setPoint(1, sourcePoint.x, sourcePoint.y);
        }

        var targetModel = this._model.getTarget();
        var posTarget = this._targetEntity.getEdgePosition(Enum.Edge.LEFT);

        var targetPoint = { x: posTarget.x - RecursiveEntityOffset, y: posTarget.y };
        targetModel.setAnchor(posTarget.x, posTarget.y, Enum.Edge.LEFT);
        if (targetModel.getPointsCount() == 2) {
            targetModel.addPoint(1, targetPoint);
        } else {
            targetModel.setPoint(1, targetPoint.x, targetPoint.y);
        }

        this._model.setMiddlePointPosition(posTarget.x - RecursiveEntityOffset, posSource.y - RecursiveEntityOffset);

        // update view
        this.redraw();
    };

    Relation.prototype._moveToDifferentEntity = function() {
        this._model.straighten(true, this._sourceEntity._model, this._targetEntity._model);
        this.redraw();
    };

    Relation.prototype._moveToEntity = function() {
        if (this._targetEntity == this._sourceEntity) {
            this._moveToSameEntity();
        } else {
            this._moveToDifferentEntity();
        }
    };

    // sort

    Relation.prototype.getVector = function() {
        var vector = new ns.Geometry.Vector(0,0);
        if (this._sourceEntity != this._targetEntity) {
            vector.fromPoints(
                this._model.getSource().getAnchor(),
                this._model.getTarget().getAnchor()
            );
        }
        return vector;
    };

    Relation.prototype.addForceToEntities = function(force) {
        this._sourceEntity.addForce(force);
        this._targetEntity.addForce(force.getOpposite());
    };

    // swap

    Relation.prototype._swap = function() {
        this._canvas.History.begin();
        this._swapCardinality();
        this._swapIdentifying();
        this._swapRequired();
        this._canvas.History.commit();
    };
    Relation.prototype._swapCardinality = function() {
        var s = this._legs.source.getModel().getCardinality();
        var t = this._legs.target.getModel().getCardinality();

        this._canvas.History.begin();
        this._legs.source.setCardinality(t);
        this._legs.target.setCardinality(s);
        this._canvas.History.commit();
    };
    Relation.prototype._swapIdentifying = function() {
        var s = this._legs.source.getModel().isIdentifying();
        var t = this._legs.target.getModel().isIdentifying();

        this._canvas.History.begin();
        this._legs.source.toggleIdentifying(t);
        this._legs.target.toggleIdentifying(s);
        this._canvas.History.commit();
    };
    Relation.prototype._swapRequired = function() {
        var s = this._legs.source.getModel().isOptional();
        var t = this._legs.target.getModel().isOptional();

        this._canvas.History.begin();
        this._legs.source.toggleOptional(t);
        this._legs.target.toggleOptional(s);
        this._canvas.History.commit();
    };

    // names
    Relation.prototype.showNames = function() {
        this._legs.source.showName();
        this._legs.target.showName();
    };
    Relation.prototype.hideNames = function() {
        this._legs.source.hideName();
        this._legs.target.hideName();
    };

    // Events

    // handles non-recursive relations
    Relation.prototype.onEntityDrag = function(dx, dy) {
        if (!this._model.hasManualPoints()) {
            this._model.resetAnchors();
        }
        if (!this.isRecursive()) {
            this.centerMiddlePoint();
        }

        if (this._legs.source.getModel().inXor) {
            this._sourceEntity.redrawXor(null, this._legs.source);
        }
        if (this._legs.target.getModel().inXor) {
            this._targetEntity.redrawXor(null, this._legs.target);
        }
    };

    Relation.prototype.onXorUpdate = function() {
        if (!this._model.hasManualPoints()) {
            this._model.resetMiddlePoint();
        }
        this.redraw();
    };

    Relation.prototype.onEntityResize = function() {
        if (!this._model.middleManual) {
            this._model.resetMiddlePoint();
        }
        this.redraw();
    };

    Relation.prototype.onAnchorMove = function() {
        if (!this._model.middleManual) {
            this._model.resetMiddlePoint();
        }
        this.redraw();
    };

    Relation.prototype.onMouseMove = function(e, mouse) {
        if (this._canvas.inCorrectionMode) { return; }
        if (this._new) {
            var target = mouse.getTarget();
            if (target instanceof ns.Control.Entity) {
                this._targetEntity = target;
                this._moveToEntity();
            } else {
                this._targetEntity = null;
                this._moveToCursor(mouse.x, mouse.y);
            }
        } else {
            this._moveMiddle(mouse);
            this.redraw();
        }
    };

    Relation.prototype.onMouseUp = function(e, mouse) {
        if (!this._new) { return; }
        this._new = false;

        if (this._targetEntity == null) {
            this._view.clear();
        } else {
            this._setupEntities();
        }
    };

    // Menu

    Relation.prototype.handleMenu = function(action, params) {
        if (ns.Diagram.allowEdit) {
            switch(action) {
                case "swap":       this._swap();            this.redrawType(); return;
                case "swap-card":  this._swapCardinality(); this.redrawType(); return;
                case "swap-ident": this._swapIdentifying(); this.redrawType(); return;
                case "swap-req":   this._swapRequired();    this.redrawType(); return;
                case "delete":     this.clear();                               return;
            }
        }

        switch(action) {
            case "reset":      this._model.resetMiddlePoint(); break;
            case "straighten": this.straighten(); break;
            case "toback":     this._view.toBack(); break;
            case "tofront":    this._view.toFront(); break;
        }
        this.redraw();

    };

    // History

    Relation.prototype.playback = function(action, from, to) {
        switch(action) {
            case "create":
            case "clear":
                if (to) {
                    this.undoClear()
                } else {
                    this.clear();
                }
                break;
            case "middle":
                this._moveMiddle(to);
                this._model.middleManual = to.manual;
                this.redraw();
                break;
        }
    };

    // Automatic correction check

    Relation.prototype.checkAgainst = function(referenceRelations, nameComparator) {
        var s = this._legs.source;
        var t = this._legs.target;

        var sName = s.getEntityName();
        var tName = t.getEntityName();

        var markedCnt = 0;

        var i = referenceRelations.length;
        while (--i >= 0) {
            if (nameComparator(referenceRelations[i][0].entity, sName) && nameComparator(referenceRelations[i][1].entity, tName)) {
                markedCnt += s.checkAgainst(referenceRelations[i][0]);
                markedCnt += t.checkAgainst(referenceRelations[i][1]);

                referenceRelations.splice(i, 1);
                return markedCnt;
            } else if (nameComparator(referenceRelations[i][0].entity, tName) && nameComparator(referenceRelations[i][1].entity, sName)) {
                markedCnt += t.checkAgainst(referenceRelations[i][0]);
                markedCnt += s.checkAgainst(referenceRelations[i][1]);

                referenceRelations.splice(i, 1);
                return markedCnt;
            }
        }

        //this.markIncorrect();
        s.markIncorrect();
        t.markIncorrect();
        return markedCnt + 2;
    };

    return Relation;
})();
