var DBSDM = DBSDM || {};
DBSDM.Model = DBSDM.Model ||{};

/**
 * Relation model class
 */
DBSDM.Model.Relation = (function(){
    var ns = DBSDM;
    var Enum = ns.Enums;

    function Relation(source, target, data) {
        if (typeof data == "object") {
            this._source = new ns.Model.RelationLeg(data[0].identifying, data[0].optional, data[0].cardinality);
            this._target = new ns.Model.RelationLeg(data[1].identifying, data[1].optional, data[1].cardinality);
        } else {
            this._source = source;
            this._target = target;
        }

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
        return !(this._source.pointsManual || this._target.pointsManual);
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
    Relation.prototype.resetAnchors = function(recompute, sourceEntity, targetEntity) {
        recompute = recompute || false;

        sourceEntity = sourceEntity || this._source.getEntity();
        targetEntity = targetEntity || this._target.getEntity();
        if (sourceEntity == targetEntity) { return; }

        var edges = [];
        var source = { pos: [], best: 0 };
        var target = { pos: [], best: 0 };

        // get possible edges
        var sourceEdges = sourceEntity.getEdges();
        var targetEdges = targetEntity.getEdges();

        if (sourceEdges.right < targetEdges.left) {
            edges.push(Enum.Edge.RIGHT);
        } else if (sourceEdges.left > targetEdges.right) {
            edges.push(Enum.Edge.LEFT);
        }

        if (sourceEdges.bottom < targetEdges.top) {
            edges.push(Enum.Edge.BOTTOM);
        } else if (sourceEdges.top > targetEdges.bottom) {
            edges.push(Enum.Edge.TOP);
        }

        if (edges.length == 0) { // ISA or something weird
            edges.push(Enum.Edge.TOP);
            edges.push(Enum.Edge.RIGHT);
            edges.push(Enum.Edge.BOTTOM);
            edges.push(Enum.Edge.LEFT);
        }

        if (edges.length > 0) {
            // compute positions
            var i,j;
            var anchor;
            for (i=0; i<edges.length; i++) {
                anchor = this._source.getAnchor();
                if (!recompute && anchor.edge == edges[i]) {
                    source.pos.push({x: anchor.x, y: anchor.y});
                } else {
                    source.pos.push(sourceEntity.getEdgePosition(edges[i]));
                }

                anchor = this._target.getAnchor();
                if (!recompute && anchor.edge == (edges[i] + 2) % 4) {
                    target.pos.push({x: anchor.x, y: anchor.y});
                } else {
                    target.pos.push(targetEntity.getEdgePosition((edges[i] + 2) % 4));
                }
            }

            // check edges combinations and pick the best (shortest) one
            var minLen;
            for (i=0; i<edges.length; i++) {
                for (j=0; j<edges.length; j++) {
                    var len = ns.Geometry.pointToPointDistance(source.pos[i], target.pos[j]);
                    if (!minLen || len < minLen) {
                        minLen = len;
                        source.best = i;
                        target.best = j;
                    }
                }
            }

            // rotate and position anchor
            this._source.setAnchor(source.pos[source.best].x, source.pos[source.best].y, edges[source.best]);
            this._target.setAnchor(target.pos[target.best].x, target.pos[target.best].y, (edges[target.best]+2)%4);
        }
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

    Relation.prototype.getExportData = function() {
        var src = this._source.toString();
        var tgt = this._target.toString();

        if (src.localeCompare(tgt) > 0) {
            return [
                this._target.getExportData(),
                this._source.getExportData()
            ];
        }
        return [
            this._source.getExportData(),
            this._target.getExportData()
        ];
    };

    return Relation;
})();