var DBSDM = DBSDM || {};
DBSDM.Model = DBSDM.Model ||{};

/**
 * Entity model class
 */
DBSDM.Model.Entity = (function(){
    var ns = DBSDM;
    var Enum = ns.Enums;

    var EdgeOffset = ns.Consts.EntityEdgePadding;

    var Super = ns.Model.CanvasObject;

    /**
     * @param name       string|object   Name of new entity or object to create entity from
     */
    function Entity(name) {
        Super.call(this);

        this._name = (name && typeof name == "string") ? name : "Entity";
        this._attributes = new ns.Model.AttributeList();
        this._parent = null;
        this._children = [];

        this._relationLegs = []; // does not export from here
        this._xorList = []; // Array of Arrays of relation leg models. Each array represent one XOR relation

        if (name && typeof name == "object") {
            this.import(name);
        }
    }
    Entity.prototype = Object.create(Super.prototype);
    Entity.prototype.constructor = Entity;


    Entity.prototype.getName = function() {
        return this._name;
    };

    Entity.prototype.setName = function(name) {
        name = name.trim();
        this._name = name[0].toLocaleUpperCase() + name.substr(1).toLocaleLowerCase();
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

    // XOR
    Entity.prototype.createXor = function(legA, legB) {
        this._xorList.push([legA, legB]);
        legA.inXor = true;
        legB.inXor = true;
    };

    Entity.prototype.addToXor = function(index, leg) {
        this._xorList[index].push(leg);
        leg.inXor = true;
    };

    Entity.prototype.removeXor = function(index) {
        for (var i=0; i<this._xorList[index].length; i++) {
            this._xorList[index][i].inXor = false;
        }
        this._xorList.splice(index, 1);
    };

    Entity.prototype.removeXorLeg = function(xorIndex, legIndex) {
        this._xorList[xorIndex][legIndex].inXor = false;
        this._xorList[xorIndex].splice(legIndex, 1);
    };

    Entity.prototype.getXor = function(index) {
        return this._xorList[index];
    };

    Entity.prototype.getXorHash = function(leg) {
        for (var i=0; i<this._xorList.length; i++) {
            if (this._xorList[i].indexOf(leg) != -1) {
                return this._xorList[i].map(function(leg){
                    return leg.getRelation().getHash();
                }).sort().join("");
            }
        }
        return null;
    };

    /** @override */
    Entity.prototype.getEdges = function() {
        var edges = Super.prototype.getEdges.call(this);

        var parent = this._parent;
        while (parent != null) {
            var parentTransform = parent.getTransform();
            edges.right  += parentTransform.x;
            edges.left   += parentTransform.x;
            edges.top    += parentTransform.y;
            edges.bottom += parentTransform.y;
            parent = parent._parent;
        }

        return edges;
    };

    Entity.prototype._pointsOnEdgeCmp = function(a, b) {
        return a-b;
    };
    Entity.prototype.getEdgePosition = function(edge) { // , leg, recompute
        //recompute = recompute || false;

        /**
         * Add points of currently existing anchors
         */
        var points = [];
        for (var i=0; i<this._relationLegs.length; i++) {
            var anchor = this._relationLegs[i].getAnchor();
            if (anchor.edge == edge) {
                /*if (this._relationLegs[i] == leg) {
                    if (!recompute) {
                        return anchor;
                    } else {
                        continue;
                    }
                }*/
                points.push( ((edge & 1) == 0 ? anchor.x : anchor.y) );
            }
        }
        points.sort(this._pointsOnEdgeCmp);

        var edges = this.getEdges();
        var edgeStart, edgeEnd;
        if ((edge & 1) == 0) {  // top, bottom
            edgeStart = edges.left + EdgeOffset;
            edgeEnd = edges.right - EdgeOffset;
        } else {
            edgeStart = edges.top + EdgeOffset;
            edgeEnd = edges.bottom - EdgeOffset;
        }

        points.unshift(edgeStart);
        var ptsLen = points.push(edgeEnd);

        /**
         * Add point at each interval intersection
         */
        var bestPoint = null;
        var maxDiff = -1;
        for (i=1; i<ptsLen; i++) {
            var diff = (points[i] - points[i-1]) * 0.5;
            if (diff > maxDiff) {
                bestPoint = points[i] - diff;
                maxDiff = diff;
            }
        }

        /**
         * If new anchor position is too close to other anchor, try edge points
         */
        if (ptsLen > 2 && maxDiff < ns.Consts.MinAnchorAnchorDistance) {
            diff = points[1] - edgeStart; // first real point to edge distance
            if (diff > maxDiff) {
                bestPoint = edgeStart;
                maxDiff = diff;
            }

            diff = edgeEnd - points[points.length-2]; // last real point to edge distance
            if (diff > maxDiff) {
                bestPoint = edgeEnd;
                maxDiff = diff;
            }
        }

        var dist = maxDiff-ns.Consts.MinAnchorAnchorDistance;
        switch (edge) {
            case Enum.Edge.TOP:    return {x: bestPoint,   y: edges.top,    edge: edge, dist: dist}; break;
            case Enum.Edge.RIGHT:  return {x: edges.right, y: bestPoint,    edge: edge, dist: dist}; break;
            case Enum.Edge.BOTTOM: return {x: bestPoint,   y: edges.bottom, edge: edge, dist: dist}; break;
            case Enum.Edge.LEFT:   return {x: edges.left,  y: bestPoint,    edge: edge, dist: dist}; break;
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

    /** @override */
    Entity.prototype.getExportData = function(properties) {
        this.setName(this._name); // force normalization

        var data = [{
            name: this._name,
            parent: (this._parent == null ? null : this._parent.getName()), // only name of the parent, not the parent object!
            attr: this._attributes.getExportData()
        }];
        for (var i=0; i<this._children.length; i++) {
            data = data.concat(this._children[i].getExportData(properties));
        }

        Object.assign(data[0], Super.prototype.getExportData.call(this, properties));

        return data;
    };

    Entity.prototype.import = function(data) {
        if (data.name) { this._name = data.name; }
        if (data.attr) { this._attributes.import(data.attr); }

        Super.prototype.import.call(this, data);
    };

    return Entity;
})();
