var DBSDM = DBSDM || {};
DBSDM.Model = DBSDM.Model ||{};

/**
 * Entity model class
 */
DBSDM.Model.Entity = (function(){
    var ns = DBSDM;

    function Entity(name) {
        this._name = name || "Entity";
        this._attributes = new ns.Model.AttributeList();
        this._relationLegs = [];
        this._transform = {
            x: 0,
            y: 0,
            width: 0,
            height: 0
        }
    }

    Entity.prototype.getName = function() {
        return this._name;
    };

    Entity.prototype.setName = function(name) {
        this._name = name;
    };

    Entity.prototype.getAttributeList = function() {
        return this._attributes;
    };

    Entity.prototype.addRelation = function(relationLeg) {
        this._relationLegs.push(relationLeg);
        relationLeg.setEntity(this);
    };

    Entity.prototype.removeRelation = function(relationLeg) {
        var index = null;
        for (var i in this._relationLegs) {
            if (this._relationLegs[i] == relationLeg) {
                index = i;
                break;
            }
        }
        if (index != null) {
            this._relationLegs.splice(index, 1);
            relationLeg.setEntity(null);
        }
    };

    Entity.prototype.setPosition = function(x, y) {
        this._transform.x = (x != null ? x : this._transform.x);
        this._transform.y = (y != null ? y : this._transform.y);
    };

    Entity.prototype.translate = function(dx, dy) {
        this._transform.x += (dx != null ? dx : 0);
        this._transform.y += (dy != null ? dy : 0);
    };

    Entity.prototype.setSize = function(w, h) {
        this._transform.width = (w != null ? w : this._transform.width);
        this._transform.height = (h != null ? h : this._transform.height);
    };

    Entity.prototype.resize = function(dw, dh) {
        this._transform.width += (dw != null ? dw : 0);
        this._transform.height += (dh != null ? dh : 0);
    };

    Entity.prototype.getTransform = function() {
        return this._transform;
    };

    Entity.prototype.getBoundingBox = function() {
        return {
            left: this._transform.x,
            top: this._transform.y,
            right: this._transform.x + this._transform.width,
            bottom: this._transform.y + this._transform.height
        };
    };

    Entity.prototype.toString = function() {
        var str = "";
        str += "Entity " + this._name + "\n";
        str += "----------------------\n";
        str += this._attributes.toString();
        str += "\n";

        str += "----------------------\n";
        for (var i in this._relationLegs) {
            str += this._relationLegs[i].getRelation().toString() + "\n";
        }

        str += "\n";
        return str;
    };

    return Entity;
})();
