var DBSDM = DBSDM || {};
DBSDM.Model = DBSDM.Model ||{};

/**
 * Relation model class
 */
DBSDM.Model.Relation = (function(){

    function Relation(sourceEntity, targetEntity) {
        this._source = {
            entity: sourceEntity,
            identifying: false,
            optional: false,
            cardinality: 1
        };
        this._target = {
            entity: targetEntity,
            identifying: false,
            optional: false,
            cardinality: 1
        }
    }

    Relation.prototype._setup = function(part, identifying, optional, cardinality) {
        part.identifying = identifying;

        if (typeof identifying == "boolean") {
            part.identifying = identifying;
        }
        if (typeof optional == "boolean") {
            part.optional = optional;
        }
        part.cardinality = (cardinality == 1 ? 1 : 0);
    };

    Relation.prototype.setSource = function(identifying, optional, cardinality) {
        this._setup(this._source, identifying, optional, cardinality);
    };

    Relation.prototype.setTarget = function(entity, identifying, optional, cardinality) {
        this._setup(this._target, identifying, optional, cardinality);
    };

    Relation.prototype.toString = function() {
        var str = "";
        str += this._source.entity.getName();
        str += " ";

        if (this._source.identifying) { str += "I"; }
        if (this._source.optional)    { str += "O"; }
        str += " ";

        str += (this._source.cardinality == 1 ? "1" : "N");
        str += ":";
        str += (this._target.cardinality == 1 ? "1" : "M");

        str += " ";
        if (this._target.identifying) { str += "I"; }
        if (this._target.optional)    { str += "O"; }

        str += " ";
        str += this._target.entity.getName();

        return str;
    };

    return Relation;
})();