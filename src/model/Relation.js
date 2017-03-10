var DBSDM = DBSDM || {};
DBSDM.Model = DBSDM.Model ||{};

/**
 * Relation model class
 */
DBSDM.Model.Relation = (function(){
    var ns = DBSDM;
    var Enum = ns.Enums;

    function Relation(source, target) {
        this._source = source;
        this._target = target;

        this._source.setRelation(this);
        this._target.setRelation(this);

        this.middleManual = false;
    }

    Relation.prototype.getSource = function() {
        return this._source;
    };

    Relation.prototype.getTarget = function() {
        return this._target
    };

    Relation.prototype.hasManualPoints = function() {
        return this._source.pointsManual || this._target.pointsManual;
    };

    // middle point

    Relation.prototype.getMiddlePoint = function() {
        return this._source.getPoint(-1);
    };

    Relation.prototype.setMiddlePointPosition = function(x, y) {
        this._source.setPoint(-1, x, y);
        this._target.setPoint(-1, x, y);
    };

    Relation.prototype.translateMiddlePoint = function(dx, dy) {
        var middle = this.getMiddlePoint();
        var x = middle.x + dx;
        var y = middle.y + dy;
        this._source.setPoint(-1, x, y);
        this._target.setPoint(-1, x, y);
    };

    Relation.prototype.resetMiddlePoint = function() {
        var lft = this._source.getPoint(-2);
        var rgt = this._target.getPoint(-2);
        this.setMiddlePointPosition((lft.x + rgt.x) / 2, (lft.y + rgt.y) / 2);
        this.middleManual = false;
    };

    // anchors

    /**
     * Set anchors on entities edges, so the relation is as short as possible
     * If recompute is false, entity won't change position on the same edge that it is already at
     */


    Relation.prototype._addPoints = function(leg, entity, edge, recompute) {
        var anchor = leg.getAnchor();
        if (!recompute && anchor.edge == edge) {
            return anchor;
        } else {
            return entity.getEdgePosition(edge);
        }
    };

    Relation.prototype.resetAnchors = function(recompute, sourceEntity, targetEntity) {
        sourceEntity = sourceEntity || this._source.getEntity();
        targetEntity = targetEntity || this._target.getEntity();
        if (sourceEntity == targetEntity) { return; }
        recompute = recompute || false;

        /**
         * Get possible anchor points
         */
        var source = [];
        var target = [];
        var sourceEdges = sourceEntity.getEdges();
        var targetEdges = targetEntity.getEdges();
        if (sourceEdges.right < targetEdges.left) {
            source.push(this._addPoints(this._source, sourceEntity, Enum.Edge.RIGHT, recompute));
            target.push(this._addPoints(this._target, targetEntity, Enum.Edge.LEFT,  recompute));
        } else if (sourceEdges.left > targetEdges.right) {
            source.push(this._addPoints(this._source, sourceEntity, Enum.Edge.LEFT,  recompute));
            target.push(this._addPoints(this._target, targetEntity, Enum.Edge.RIGHT, recompute));
        }
        if (sourceEdges.bottom < targetEdges.top) {
            source.push(this._addPoints(this._source, sourceEntity, Enum.Edge.BOTTOM, recompute));
            target.push(this._addPoints(this._target, targetEntity, Enum.Edge.TOP,    recompute));
        } else if (sourceEdges.top > targetEdges.bottom) {
            source.push(this._addPoints(this._source, sourceEntity, Enum.Edge.TOP,    recompute));
            target.push(this._addPoints(this._target, targetEntity, Enum.Edge.BOTTOM, recompute));
        }

        if (source.length == 0) { // ISA or something weird
            for (var i=0;i<4; i++) {
                source.push(this._addPoints(this._source, sourceEntity, i, recompute));
                target.push(this._addPoints(this._target, targetEntity, i, recompute));
            }
        }

        /**
         * Pick combination of anchor points, that creates shortest relation
         */
        var minLen = null;
        var bestSource = null;
        var bestTarget = null;
        for (var s=0; s<source.length; s++) {
            for (var t=0; t<target.length; t++) {
                var len = ns.Geometry.pointToPointSquareDistance(source[s], target[t]);
                if (minLen == null || len < minLen) {
                    minLen = len;
                    bestSource = source[s];
                    bestTarget = target[t];
                }
            }
        }

        /**
         * Rotate and position anchors
         */
        this._source.setAnchor(bestSource.x, bestSource.y, bestSource.edge);
        this._target.setAnchor(bestTarget.x, bestTarget.y, bestTarget.edge);
    };

    Relation.prototype.straighten = function(recompute, sourceEntity, targetEntity) {
        this._source.clearPoints();
        this._target.clearPoints();
        this.resetAnchors(recompute, sourceEntity, targetEntity);
        this.resetMiddlePoint();
    };

    //

    Relation.prototype.toString = function() {
        var src = this._source.toString();
        var tgt = this._target.toString();
        if (src.localeCompare(tgt) > 0) {
            return tgt + " -> " + src;
        }
        return src + " -> " + tgt;
    };

    Relation.prototype.getExportData = function(properties) {
        var src = this._source.toString();
        var tgt = this._target.toString();

        if (src.localeCompare(tgt) > 0) {
            return [
                this._target.getExportData(properties),
                this._source.getExportData(properties)
            ];
        }
        return [
            this._source.getExportData(properties),
            this._target.getExportData(properties)
        ];
    };

    Relation.prototype.getHash = function() {
        return [this._source.getHash(), this._target.getHash()].sort().join("");
    };

    return Relation;
})();