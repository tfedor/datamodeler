var DBSDM = DBSDM || {};
DBSDM.Model = DBSDM.Model ||{};

/**
 * Relation model class
 */
DBSDM.Model.Relation = (function(){

    function Relation(source, target) {
        this._source = source;
        this._source.setRelation(this);

        this._target = target;
        this._target.setRelation(this);
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
    };

    Relation.prototype.straighten = function() {
        this._source.clearPoints();
        this._target.clearPoints();
        this.resetMiddlePoint();
    };

    //

    Relation.prototype.toString = function() {
        return this._source.toString() + " -> " + this._target.toString();
    };

    return Relation;
})();