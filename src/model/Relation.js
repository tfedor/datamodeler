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
        this._source.setRelation(this);

        this._target = target;
        this._target.setRelation(this);

        this.middleMoved = false;
    }

    Relation.prototype.getSource = function() {
        return this._source;
    };

    Relation.prototype.getTarget = function() {
        return this._target
    };

    // points

    Relation.prototype.getMiddlePoint = function() {
        return this._source.getPoint(-1);
    };

    Relation.prototype.setMiddlePointPosition = function(x, y) {
        this._source.setPoint(-1, {x: x, y: y});
        this._target.setPoint(-1, {x: x, y: y});
    };

    Relation.prototype.resetMiddlePoint = function() {
        var lft = this._source.getPoint(-2);
        var rgt = this._target.getPoint(-2);
        this.setMiddlePointPosition((lft.x + rgt.x) / 2, (lft.y + rgt.y) / 2);
        this.middleMoved = false;
    };

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
            this._source.anchorMoved = false;

            this._target.setAnchor(target.pos[target.best].x, target.pos[target.best].y, (edges[target.best]+2)%4);
            this._target.anchorMoved = false;
        }
    };

    Relation.prototype.straighten = function(recompute, sourceEntity, targetEntity) {
        this._source.clearPoints();
        this._target.clearPoints();
        this.resetAnchors(recompute, sourceEntity, targetEntity);
        this.resetMiddlePoint();
    };

    //

    Relation.prototype.isManual = function() {
        return this._source.isManual() || this._target.isManual() || this.middleMoved;
    };

    //

    Relation.prototype.toString = function() {
        return this._source.toString() + " -> " + this._target.toString();
    };

    return Relation;
})();