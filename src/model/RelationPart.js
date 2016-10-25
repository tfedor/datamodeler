var DBSDM = DBSDM || {};
DBSDM.Model = DBSDM.Model ||{};


/**
 * Model class modelling one part of relation (source or target)
 */
DBSDM.Model.RelationPart = (function(){
    var Enum = DBSDM.Enums;

    function RelationPart(entity, identifying, optional, cardinality) {
        this._entity = entity;
        this._identifying = identifying;
        this._optional = optional;
        this._cardinality = cardinality;
    }

    RelationPart.prototype.setEntity = function(entity) {
        this._entity = entity;
    };
    RelationPart.prototype.getEntity = function() {
        return this._entity;
    };

    RelationPart.prototype.isIdentifying = function() {
        return this._identifying
    };
    RelationPart.prototype.setIdentifying = function(bool) {
        if (typeof bool == 'boolean') {
            this._identifying = bool;
        }
    };

    RelationPart.prototype.isOptional = function() {
        return this._optional
    };
    RelationPart.prototype.setOptional = function(bool) {
        if (typeof bool == 'boolean') {
            this._optional = bool;
        }
    };

    RelationPart.prototype.getCardinality = function() {
        return this._cardinality;
    };
    RelationPart.prototype.setCardinality = function(cardinality) {
        if (cardinality != Enum.Cardinality.ONE && cardinality != Enum.Cardinality.MANY) {
            return;
        }
        this._cardinality = cardinality;
    };

    RelationPart.prototype.toString = function() {
        var str = "";
        str += this._entity.getName();
        str += " ";

        if (this._identifying) { str += "I"; }
        if (this._optional)    { str += "O"; }
        str += " ";

        str += "Cardinality ";
        str += (this._cardinality == Enum.Cardinality.ONE ? "1" : "N");
        return str;
    };

    return RelationPart;
})();