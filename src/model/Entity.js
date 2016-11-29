var DBSDM = DBSDM || {};
DBSDM.Model = DBSDM.Model ||{};

/**
 * Entity model class
 */
DBSDM.Model.Entity = (function(){
    var ns = DBSDM;
    var Enum = ns.Enums;

    var EdgeOffset = 10; // TODO

    /**
     * @param name       string|object   Name of new entity or object to create entity from
     */
    function Entity(name) {
        this._name = (name && typeof name == "string") ? name : "Entity";
        this._attributes = new ns.Model.AttributeList();
        this._transform = {
            x: 0,
            y: 0,
            width: 1,
            height: 1
        };
        this._parent = null;
        this._children = [];

        this._relationLegs = []; // does not export from here

        if (name && typeof name == "object") {
            this.import(name);
        }
    }

    Entity.prototype.getName = function() {
        return this._name;
    };

    Entity.prototype.setName = function(name) {
        this._name = name;
    };

    Entity.prototype.setParent = function(parent) {
        this._parent = parent;
    };

    Entity.prototype.hasParent = function() {
        return this._parent != null;
    };

    Entity.prototype.addChild = function(child) {
        this._children.push(child);
    };

    Entity.prototype.removeChild = function(child) {
        for (var i=0; i<this._children.length; i++) {
            if (child == this._children[i]) {
                this._children.splice(i, 1);
                return;
            }
        }
    };

    Entity.prototype.getChildren = function() {
        return this._children;
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

    /** in Canvas coordinates! */
    Entity.prototype.getEdges = function() {
        var transform = Object.assign({}, this._transform);
        var parent = this._parent;
        while (parent != null) {
            var parentTransform = parent.getTransform();
            transform.x += parentTransform.x;
            transform.y += parentTransform.y;
            parent = parent._parent;
        }

        return {
            top: transform.y,
            right: transform.x + transform.width,
            bottom: transform.y + transform.height,
            left: transform.x
        };
    };

    Entity.prototype._getMaxEdgeInterval = function(edge) {
        var edgeStart, edgeEnd;

        var edges = this.getEdges();

        if ((edge & 1) == 0) {  // top, bottom
            edgeStart = edges.left + EdgeOffset;
            edgeEnd = edges.right - EdgeOffset;
        } else {
            edgeStart = edges.top + EdgeOffset;
            edgeEnd = edges.bottom - EdgeOffset;
        }

        // add positions of current relation anchors
        var positions = [edgeStart]; // minimal position of the edge

        for (var i=0; i<this._relationLegs.length; i++) {
            var anchor = this._relationLegs[i].getAnchor();
            if (anchor.edge == edge) {
                positions.push( ((edge & 1) == 0 ? anchor.x : anchor.y) );
            }
        }

        positions.push(edgeEnd); // maximal position of the edge
        positions.sort(function(a, b) {
            return a-b;
        });

        // pick position - find max interval and split it in half = new anchor position
        var index = 1;
        var maxLength = 0;
        for (i=index; i<positions.length; i++) {
            var len = positions[i] - positions[i-1];
            if (len >= maxLength) {
                index = i;
                maxLength = len;
            }
        }

        return [positions[index-1], positions[index], maxLength];
    };

    Entity.prototype.getEdgePosition = function(edge) {
        var edges = this.getEdges();
        var interval = this._getMaxEdgeInterval(edge);
        var newPosition = Math.round((interval[0] + interval[1]) / 2);

        switch (edge) {
            case Enum.Edge.TOP:    return {x: newPosition, y: edges.top}; break;
            case Enum.Edge.RIGHT:  return {x: edges.right, y: newPosition}; break;
            case Enum.Edge.BOTTOM: return {x: newPosition, y: edges.bottom}; break;
            case Enum.Edge.LEFT:   return {x: edges.left, y: newPosition}; break;
        }
    };

    // Data representation

    Entity.prototype.toString = function() {
        var str = "";
        str += "Entity " + this._name + "\n";
        str += "----------------------\n";
        str += this._attributes.toString();
        str += "----------------------\n";
        for (var i in this._relationLegs) {
            str += this._relationLegs[i].getRelation().toString() + "\n";
        }

        str += "\n";
        return str;
    };

    Entity.prototype.getExportData = function() {
        var data = [{
            name: this._name,
            parent: (this._parent == null ? null : this._parent.getName()), // only name of the parent, not the parent object!
            attr: this._attributes.getExportData()
        }];
        for (var i=0; i<this._children.length; i++) {
            data = data.concat(this._children[i].getExportData());
        }
        return data;
    };

    Entity.prototype.import = function(data) {
        if (data.name) { this._name = data.name; }
        if (data.attr) { this._attributes.import(data.attr); }
    };

    return Entity;
})();
