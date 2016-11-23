var DBSDM = DBSDM || {};
DBSDM.Model = DBSDM.Model ||{};

/**
 * Attribute model class
 */
DBSDM.Model.Attribute = (function(){

    function Attribute(name) {
        this._name = name || "Attribute";
        this._primary = false;
        this._unique = false;
        this._nullable = false;
    }

    Attribute.prototype.getName = function() {
        return this._name;
    };

    Attribute.prototype.setName = function(name) {
        this._name = name;
    };

    //
    Attribute.prototype.isPrimary = function() {
        return this._primary;
    };

    Attribute.prototype.setPrimary = function(bool) {
        if (typeof bool == 'boolean') {
            this._primary = bool;
            if (bool) {
                this._unique = false;
            }
        }
    };

    //
    Attribute.prototype.isUnique = function(bool) {
        return this._unique;
    };

    Attribute.prototype.setUnique = function(bool) {
        if (typeof bool == 'boolean') {
            this._unique = bool;
            if (bool) {
                this._primary = false;
            }
        }
    };

    //
    Attribute.prototype.isNullable = function() {
        return this._nullable;
    };

    Attribute.prototype.setNullable = function(bool) {
        if (typeof bool == 'boolean') {
            this._nullable = bool;
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

    Attribute.prototype.getData = function() {
        return {
            name: this._name,
            primary: this._primary,
            unique: this._unique,
            nullable: this._nullable
        }
    };

    return Attribute;
})();
