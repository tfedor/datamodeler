var DBSDM = DBSDM || {};
DBSDM.Data = DBSDM.Data ||{};

/**
 * Attribute data class
 */
DBSDM.Data.Attribute = (function(){

    function Attribute(name) {
        this._name = name || "Attribute";
        this._primary = false;
        this._unique = false;
        this._nullable = false;
    }

    Attribute.prototype.isPrimary = function(bool) {
        if (typeof bool == 'boolean') {
            this.primary = bool;
        } else {
            return this.primary;
        }
    };

    Attribute.prototype.isUnique = function(bool) {
        if (typeof bool == 'boolean') {
            this._index.unique = bool;
        } else {
            return this._index.unique;
        }
    };

    Attribute.prototype.isNullable = function(bool) {
        if (typeof bool == 'boolean') {
            this.nullable = bool;
        } else {
            return this.nullable;
        }
    };

    Attribute.prototype.toString = function() {
        var str = "";
        str += this._name;

        var atrs = [];
        if (this._primary) {
            atrs.push("PRIMARY KEY");
        } else if (this._unique) {
            atrs.push("UNIQUE")
        }

        if (this._nullable) {
            atrs.push("NULL");
        } else {
            atrs.push("NOT NULL")
        }

        if (atrs.length != 0) {
            str += ": "+atrs.join(" ");
        }
        return str;
    };

    return Attribute;
})();
