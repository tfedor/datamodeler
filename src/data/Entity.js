var DBSDM = DBSDM || {};
DBSDM.Data = DBSDM.Data ||{};

/**
 * Entity data class
 */
DBSDM.Data.Entity = (function(){

    function Entity(name) {
        this._name = name || "Entity";
        this._attributes = [];
        this._relations = [];
        this._transform = {
            x: 0,
            y: 0,
            w: 0,
            h: 0
        }
    }

    Entity.prototype.getName = function() {
        return this._name;
    };

    Entity.prototype.setName = function(name) {
        this._name = name;
    };

    Entity.prototype.addAttribute = function(attribute) {
        this._attributes.push(attribute);
    };

    Entity.prototype.addRelation = function(relation) {
        this._relations.push(relation);
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
        this._transform.w = (w != null ? w : this._transform.w);
        this._transform.h = (h != null ? h : this._transform.h);
    };

    Entity.prototype.resize = function(dw, dh) {
        this._transform.w += (dw != null ? dw : 0);
        this._transform.h += (dh != null ? dh : 0);
    };

    Entity.prototype.getTransform = function() {
        return this._transform;
    };

    Entity.prototype.getBoundingBox = function() {
        return {
            left: this._transform.x,
            top: this._transform.y,
            right: this._transform.x + this._transform.w,
            bottom: this._transform.y + this._transform.h
        };
    };

    Entity.prototype.toString = function() {
        var str = "";
        str += "Entity " + this._name + "\n";
        str += "----------------------\n";
        for (var i in this._attributes) {
            str += " " + this._attributes[i].toString() + "\n";
        }

        str += "----------------------\n";
        for (i in this._relations) {
            str += this._relations[i].toString() + "\n";
        }

        str += "\n";
        return str;
    };

    return Entity;
})();
