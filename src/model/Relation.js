var DBSDM = DBSDM || {};
DBSDM.Model = DBSDM.Model ||{};

/**
 * Relation model class
 */
DBSDM.Model.Relation = (function(){

    function Relation(source, target) {
        this._source = source;
        this._target = target;
    }

    Relation.prototype.getSource = function() {
        return this._source;
    };

    Relation.prototype.getTarget = function() {
        return this._target
    };

    Relation.prototype.toString = function() {
        return this._source.toString() + " -> " + this._target.toString();
    };

    return Relation;
})();