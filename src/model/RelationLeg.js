var DBSDM = DBSDM || {};
DBSDM.Model = DBSDM.Model ||{};

/**
 * Model class modelling one part of relation (source or target)
 */
DBSDM.Model.RelationLeg = (function(){
    var Enum = DBSDM.Enums;

    function RelationLeg(identifying, optional, cardinality) {
        this._relation = null;

        this._entity = null;
        this._identifying = false;
        this._optional = false;
        this._cardinality = false;

        this.setIdentifying(identifying)
            .setOptional(optional)
            .setCardinality(cardinality);

        this._name = null;

        // it would be enough to store just one coordinate and edge,
        // and compute rest from entity, but this simplifies things
        this._anchor = {
            x: 0, y: 0,
            edge: null
        };

        // all description points of the line, two points are minimum
        this._anchorOffset = 0;
        this._points = [
            {x: 0, y: 0}, // 0th point, associated to anchor
            {x: 0, y: 0}  // middle point
        ];
        this.pointsManual = false;
    }

    RelationLeg.prototype.setRelation = function(relation) {
        this._relation = relation;
    };

    RelationLeg.prototype.getRelation = function() {
        return this._relation;
    };

    RelationLeg.prototype.setEntity = function(entity) {
        this._entity = entity;
    };
    RelationLeg.prototype.getEntity = function() {
        return this._entity;
    };

    RelationLeg.prototype.getName = function() {
        return this._name;
    };

    RelationLeg.prototype.setName = function(name) {
        this._name = name.trim().toLocaleLowerCase() || null;
    };

    RelationLeg.prototype.isIdentifying = function() {
        return this._identifying
    };
    RelationLeg.prototype.setIdentifying = function(bool) {
        if (typeof bool == 'boolean') {
            this._identifying = bool;
        }
        return this;
    };

    RelationLeg.prototype.isOptional = function() {
        return this._optional
    };
    RelationLeg.prototype.setOptional = function(bool) {
        if (typeof bool == 'boolean') {
            this._optional = bool;
        }
        return this;
    };

    RelationLeg.prototype.getCardinality = function() {
        return this._cardinality;
    };
    RelationLeg.prototype.setCardinality = function(cardinality) {
        if (cardinality == Enum.Cardinality.ONE || cardinality == Enum.Cardinality.MANY) {
            this._cardinality = cardinality;
        }
        return this;
    };

    // anchor
    RelationLeg.prototype.getAnchor = function() {
        return this._anchor;
    };

    RelationLeg.prototype.setAnchor = function(x, y, edge) {
        this._anchor.x = x;
        this._anchor.y = y;
        this._anchor.edge = edge;

        var offsetX = 0;
        var offsetY = 0;
        if ((edge & 1) != 0) { // left/right
            offsetX = (edge-2) * this._anchorOffset;
        } else { // top/bottom
            offsetY = (edge-1) * this._anchorOffset;
        }
        this._points[0].x = x - offsetX;
        this._points[0].y = y + offsetY;
    };

    RelationLeg.prototype.setAnchorOffset = function(offset) {
        this._anchorOffset = offset;
    };

    // points

    RelationLeg.prototype.getPointsCount = function() {
        return this._points.length;
    };

    RelationLeg.prototype.addPoint = function(index, point) {
        this._points.splice(index, 0, point);
    };

    RelationLeg.prototype.setPoint = function(index, x, y) {
        var key = index % this._points.length;
        if (key < 0) {
            key += this._points.length;
        }
        this._points[key].x = x;
        this._points[key].y = y;
    };

    RelationLeg.prototype.getPoint = function(index) {
        var key = index % this._points.length;
        if (key < 0) {
            key += this._points.length;
        }
        return this._points[key];
    };
    RelationLeg.prototype.getPointIndex = function(x, y) {
        for (var i=0; i<this._points.length; i++) {
            var p = this._points[i];
            if (p.x == x && p.y == y) {
                return i;
            }
        }
    };

    RelationLeg.prototype.removePoint = function(index) {
        this._points.splice(index, 1);
    };

    RelationLeg.prototype.clearPoints = function() {
        this._points.splice(1, this._points.length - 2);
        this.pointsManual = false;
    };

    RelationLeg.prototype.getPoints = function() {
        return this._points;
    };

    RelationLeg.prototype.translatePoints = function(dx, dy) {
        for (var i=1; i<this._points.length-1; i++) {
            this._points[i].x += dx;
            this._points[i].y += dy;
        }
    };

    RelationLeg.prototype.toString = function() {
        var str = this._entity.getName();
        str += " [";
        str += (this._identifying ? "I" : "i");
        str += (this._optional    ? "O" : "o");
        str += "] ";
        str += (this._cardinality == Enum.Cardinality.ONE ? "1" : "N");
        return str;
    };

    RelationLeg.prototype.getExportData = function() {
        return {
            entity: this._entity.getName(), // TODO maybe setName first, to force normalization, just to be sure? Shouldnt be needed, since entities are exported first, but who knows...
            identifying: this._identifying,
            optional: this._optional,
            cardinality: this._cardinality
        };
    };

    return RelationLeg;
})();