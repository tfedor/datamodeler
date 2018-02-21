var DBSDM = DBSDM || {};
DBSDM.Control = DBSDM.Control ||{};

DBSDM.Control.Entity = (function(){
    var ns = DBSDM;
    var Enum = ns.Enums;

    var Super = ns.Control.CanvasObject;

    function Entity(canvas, model) {
        Super.call(this, canvas, model);

        this._attributeList = new ns.Control.AttributeList(this._model.getAttributeList(), this._canvas, this);
        this._relationLegList = [];
        this._xorLegList = [];

        this._view = new ns.View.Entity(this._canvas, this._model, this);
        this._parent = null;
        this._children = [];

        this._new = true;
        this._ignoredInput = {x:0,y:0};
    }
    Entity.prototype = Object.create(Super.prototype);
    Entity.prototype.constructor = Entity;

    Entity.prototype.getAttrContainer = function() {
        return this._view.getAttrContainer();
    };

    Entity.prototype.getModel = function() {
        return this._model;
    };

    /**
     * Create empty entity at mouse coordinates
     * Creation is finished by method finish()
     */
    Entity.prototype.create = function() {
        var x = this._canvas.Mouse.x;
        var y = this._canvas.Mouse.y;
        this._model.setPosition(x, y);

        this._view.createEmpty();
    };

    /**
     * Finish creation of entity
     */
    Entity.prototype.finish = function() {
        this._view.create(this);
        this._canvas.addEntity(this);
        this._new = false;

        this._canvas.ui.acceptTutorialAction("Entity");

        this.computeNeededSize();

        this._canvas.History.record(this, "create", false, true, false);
    };

    /**
     * Create entity from current model data (after import)
     */
    Entity.prototype.import = function() {
        this._view.createEmpty();
        this.finish();

        this._attributeList.draw();

        this.computeNeededSize();
        return this;
    };

    /**
     * Update position and size of an entity during its creation
     * @param obj  Object containing position and size of the entity.
     *             'x','y' properties defines position,
     *             'dx','dy' properties define size
     */
    Entity.prototype.place = function(obj) {
        if (obj.dx < 0) {
            this._model.setPosition(obj.x);
        }
        if (obj.dy < 0) {
            this._model.setPosition(null, obj.y);
        }
        this._model.setSize(Math.abs(obj.dx), Math.abs(obj.dy));
        this._view.redraw();
    };

    Entity.prototype.setName = function(name) {
        this._model.setName(name);
        this.encompassContent();
    };

    /**
     * Set position with respect to parent entity
     */
    Entity.prototype._setPosition = function(newX, newY) {
        var x,y;
        var transform = this._model.getTransform();
        if (this._parent != null) {
            var padding = ns.Consts.EntityPadding;

            var parentTransform = this._parent._model.getTransform();
            x = Math.min(
                Math.max(
                    newX - this._ignoredInput.x,
                    padding
                ),
                parentTransform.width - transform.width - padding
            );
            this._ignoredInput.x += x - newX;

            y = Math.min(
                Math.max(
                    newY - this._ignoredInput.y,
                    padding
                ),
                parentTransform.height - transform.height - padding
            );
            this._ignoredInput.y += y - newY;
        } else {
            x = newX;
            y = newY;
        }

        var delta = {
            x: x - transform.x,
            y: y - transform.y
        };

        this._model.setPosition(x, y);
        return delta;
    };

    /**
     * Drag entity
     * @override
     */
    Entity.prototype.drag = function(mouse) {
        var delta;
        if (this._parent != null) {
            var transform = this._model.getTransform();
            var initial = [transform.x, transform.y];

            delta = this._setPosition(
                transform.x + mouse.rx,
                transform.y + mouse.ry
            );

            var final = [transform.x, transform.y];
            this._canvas.History.record(this, "drag", initial, final);
        } else {
            delta = Super.prototype.drag.call(this, mouse);
        }
        this.notifyDrag(delta.x, delta.y);
    };

    Entity.prototype.notifyDrag = function(x, y) {
        var relCount = this._relationLegList.length;

        // first, translate all anchors appropriatelly
        for (var i=0; i<relCount; i++) {
            this._relationLegList[i].onEntityDrag(x, y);
        }

        // when all relation legs are translated, manage whole relation:
        // try to find better anchor positions, straigthen and redraw
        for (i=0; i<relCount; i++) {
            this._relationLegList[i].getRelation().onEntityDrag(x, y);
        }

        for (var c=0; c<this._children.length; c++) {
            this._children[c].notifyDrag(x, y);
        }
    };

    /** @override */
    Entity.prototype.dragControlPoint = function(mouse, cp) {
        var transform = this._model.getTransform();
        var x=null, y=null;
        var width=null, height=null;

        var cursor = {
            x: mouse.x,
            y: mouse.y
        };
        var parent = null;
        if (this._parent != null) { // change coordinate scheme to parent local
            parent = this._parent.getEdges(); // TODO do only once on drag start
            cursor.x -= parent.left;
            cursor.y -= parent.top;
        }

        // set desired state

        if (/n/.test(cp)) {
            y = (parent == null ? cursor.y : Math.max(cursor.y, ns.Consts.EntityEdgePadding));
            height = (transform.y - y) + transform.height;
        } else if (/s/.test(cp)) {
            height = cursor.y - transform.y;
        }

        if (/w/.test(cp)) {
            x = (parent == null ? cursor.x : Math.max(cursor.x, ns.Consts.EntityEdgePadding));
            width = (transform.x - x) + transform.width;
        } else if (/e/.test(cp)) {
            width = cursor.x - transform.x;
        }

        // constrain width/height

        this._setConstrainedTransform(x, y, width, height);
        this._notifyResize();
    };

    Entity.prototype.resetPosition = function() {
        var t = this._model.getTransform();
        var delta = this._setPosition(t.x, t.y);
        this.notifyDrag(delta.x, delta.y);
        this._view.redraw();
    };

    Entity.prototype.encompassContent = function() {
        if (Super.prototype.encompassContent.call(this)) {
            this._notifyResize();
        }
    };

    Entity.prototype._notifyResize = function() {
        var i;

        // children
        for (i=0; i<this._children.length; i++) {
            this._children[i].resetPosition();
        }

        // parent
        if (this._parent != null) {
            this._parent.encompassContent();
        }

        // relations
        var edges = this._model.getEdges();
        for (i=0; i<this._relationLegList.length; i++) {
            this._relationLegList[i].onEntityResize(edges);
        }
    };

    /**
     * @override
     */
    Entity.prototype.activate = function() {
        Super.prototype.activate.call(this);
        this._canvas.ui.acceptTutorialAction("Select");
    };


    Entity.prototype.delete = function() {
        if (!ns.Diagram.allowEdit) { return; }
        this._canvas.History.begin();

        if (this._parent) {
            this._isa(null);
        }
        
        this._canvas.removeEntity(this);

        for (var i=0; i<this._children.length; i++) {
            this._children[i].delete();
        }

        this._view.remove();
        while(this._relationLegList.length > 0) {
            this._relationLegList[0].getRelation().clear();
        }

        this._canvas.History.record(this, "delete", true, false, false);
        this._canvas.History.commit();
    };
    Entity.prototype.undoDelete = function() {
        if (!ns.Diagram.allowEdit) { return; }
        this._canvas.addEntity(this);

        this._view.createEmpty();
        this._view.create(this);

        this._attributeList.redraw();
    };

    Entity.prototype.getEdgePosition = function(edge) {
        return this._model.getEdgePosition(edge);
    };

    Entity.prototype.getMinimalSize = function() {
        var size = this._view.getMinimalSize();

        // attributes
        var attributes = this._attributeList.getMinimalSize();
        size.width += attributes.width;
        size.height += attributes.height;

        // children entities
        var count = this._children.length;
        if (count != 0) {
            var childrenWidth = (2+count-1) * ns.Consts.EntityPadding;
            var childrenHeight = 0;
            for (var i=0; i<count; i++) {
                var ent = this._children[i].getMinimalSize();
                childrenWidth += ent.width;
                childrenHeight = Math.max(childrenHeight, ent.height);
            }

            size.width = Math.max(size.width, childrenWidth);
            size.height += childrenHeight;
        }
        return size;
    };

    /**
     * @override
     */
    Entity.prototype.computeNeededSize = function() {
        var size = this._view.getMinimalSize();

        // attributes
        var attributes = this._attributeList.getMinimalSize();
        size.width = Math.max(size.width, attributes.width);
        size.height += attributes.height;

        // children entities
        var count = this._children.length;
        if (count != 0) {
            for (var i=0; i<count; i++) {
                var child = this._children[i]._model.getTransform();
                size.width = Math.max(size.width, child.x + child.width + ns.Consts.EntityPadding);
                size.height = Math.max(size.height, child.y + child.height + ns.Consts.EntityPadding);
            }
        }

        this._neededSize.width = size.width;
        this._neededSize.height = size.height;
    };

    //
    Entity.prototype._createAttribute = function() {
        this._canvas.History.begin();
        var tr = this._model.getTransform();
        var initial = {width: tr.width, height:tr.height};

        this._attributeList.createAttribute();

        var final = {width: tr.width, height:tr.height};
        this._canvas.History.record(this, "resize", initial, final, false);
        this._canvas.History.commit();
    };

    // Relations
    Entity.prototype._createRelation = function(sourceCardinality, targetCardinality) {
        if (!ns.Diagram.allowEdit) { return; }
        var control = new ns.Control.Relation(this._canvas, this, null, sourceCardinality, targetCardinality);
        this._canvas.Mouse.attachObject(control);
        ns.Diagram.cancelAction = function() { control.cancel(); };
    };

    Entity.prototype.addRelationLeg = function(relationLegControl) {
        if (this._relationLegList.indexOf(relationLegControl) !== -1) { return; }
        this._relationLegList.push(relationLegControl);
        this._model.addRelation(relationLegControl.getModel());
    };

    Entity.prototype.removeRelationLeg = function(relationLegControl) {
        var index = null;
        for (var i in this._relationLegList) {
            if (this._relationLegList[i] == relationLegControl) {
                index = i;
                break;
            }
        }
        if (index != null) {
            this._relationLegList.splice(index, 1);
            this._model.removeRelation(relationLegControl.getModel());
        }
    };

    Entity.prototype.getEdgeCursorPosition = function(x, y) {
        var edges = this._model.getEdges();
        var center = {
            x: (edges.left + edges.right)*0.5,
            y: (edges.top + edges.bottom)*0.5
        };

        var EdgeOffset = ns.Consts.EntityEdgePadding;

        if (edges.left+EdgeOffset < x && x < edges.right-EdgeOffset) {
            if (y > center.y) {
                return { x: x, y: edges.bottom, edge: Enum.Edge.BOTTOM };
            } else {
                return { x: x, y: edges.top, edge: Enum.Edge.TOP };
            }
        }

        if (edges.top+EdgeOffset < y && y < edges.bottom-EdgeOffset) {
            if (x < center.x) {
                return { x: edges.left, y: y, edge: Enum.Edge.LEFT };
            } else {
                return { x: edges.right, y: y, edge: Enum.Edge.RIGHT };
            }
        }

        return null;
    };

    // ISA

    Entity.prototype.importIsa = function(parentControl) {
        this._parent = parentControl;

        this._model.setParent(parentControl.getModel());
        this._view.setParent(parentControl.getDom());
        this._canvas.removeEntity(this);

        parentControl.addChild(this);
        this._view.redraw();
    };

    Entity.prototype._isChildInIsaHierarchy = function(entity) {
        for(var i=0; i<this._children.length; i++) {
            if (this._children[i] === entity || this._children[i]._isChildInIsaHierarchy(entity)) {
                return true;
            }
        }
        return false;
    };

    Entity.prototype._isa = function(parent, pos) {
        if (!ns.Diagram.allowEdit) { return; }

        this._canvas.unsetMode("isa");
        this._view.defaultMark();

        if (this._isChildInIsaHierarchy(parent)) { return; }

        pos = pos || this._canvas.Mouse;

        var tr = this._model.getTransform();

        this._canvas.History.begin();
        this._canvas.History.record(this, "isa",
            {parent: this._parent, x: tr.x, y: tr.y},
            {parent: parent, x: pos.x, y: pos.y},
            false
        );

        if (this._parent == parent) { return; }

        var oldEdges = this._model.getEdges();
        var newEdges;

        if (this._parent != null) {
            this._parent.removeChild(this);
            this._model.setParent(null);
        }

        this._parent = parent;
        if (parent == null) {
            this._view.setParent(this._canvas.svg);
            this._canvas.addEntity(this);

            this._setPosition(pos.x, pos.y);

            newEdges = this._model.getEdges();
            this.notifyDrag(newEdges.left - oldEdges.left, newEdges.top - oldEdges.top);
        } else {
            var parentTransform = parent._model.getTransform();
            this._setPosition(pos.x - parentTransform.x, pos.y - parentTransform.y);

            this._model.setParent(parent._model);
            this._view.setParent(parent.getDom());
            this._canvas.removeEntity(this);

            newEdges = this._model.getEdges();
            this.notifyDrag(newEdges.left - oldEdges.left, newEdges.top - oldEdges.top);

            parent.addChild(this);
        }

        this._view.redraw();

        // redraw relations
        for (var i=0; i<this._relationLegList.length; i++) {
            this._relationLegList[i].getRelation().straighten();
            this._relationLegList[i].getRelation().redraw();
        }

        this._canvas.History.commit();
    };

    Entity.prototype._initIsa = function() {
        if (ns.Diagram.allowEdit) {
            this._canvas.Mouse.attachObject(this);
            this._view.select();
            this._canvas.svg.classList.add("isaMode");

            var that = this;
            ns.Diagram.cancelAction = function() { that.cancelIsa(); };
        }
    };

    Entity.prototype.cancelIsa = function() {
        this._canvas.unsetMode("isa");
        this._view.defaultMark();
        this._canvas.Mouse.detachObject();
    };

    Entity.prototype.removeChild = function(child) {
        this._model.removeChild(child._model);

        for (var i=0; i<this._children.length; i++) {
            if (child == this._children[i]) {
                this._children.splice(i, 1);
                break;
            }
        }
        this.computeNeededSize();
    };

    Entity.prototype.addChild = function(child) {
        this._model.addChild(child._model);
        this._children.push(child);

        var childTransform = child._model.getTransform();
        var transform = this._model.getTransform();

        var initial = {width: transform.width, height:transform.height};

        var neededWidth  = childTransform.width + 2*ns.Consts.EntityPadding;
        var neededHeight = childTransform.height + 2*ns.Consts.EntityPadding;

        this._model.setSize(
            (transform.width  < neededWidth  ? neededWidth  : null),
            (transform.height < neededHeight ? neededHeight : null)
        );

        var final = {width: transform.width, height:transform.height};
        this._canvas.History.record(this, "resize", initial, final, false);

        this._notifyResize();
        this._view.redraw();
        this.computeNeededSize();
    };

    Entity.prototype.fitToContents = function() {
        var tr = this._model.getTransform();
        var initial = {width: tr.width, height: tr.height};

        var size = this.getMinimalSize();
        this._model.setSize(size.width, size.height);

        this._canvas.History.record(this, "fit", initial, {width: size.width, height:size.height});

        //
        if (this._children.length != 0) {
            var offsetTop = this._view.getMinimalSize().height + this._attributeList.getMinimalSize().height;
            var offsetLeft = ns.Consts.EntityPadding;

            for (var i=0; i<this._children.length; i++) {
                var child = this._children[i].getMinimalSize();

                this._children[i].fitToContents();
                var delta = this._children[i]._setPosition(offsetLeft, offsetTop);
                this.notifyDrag(delta.x, delta.y);
                this._children[i]._view.redraw();

                offsetLeft += ns.Consts.EntityPadding + child.width;
            }
        }

        //
        this._view.redraw();
        this._notifyResize();
        return this;
    };

    // XOR

    /**
     * Find index of XOR relation, which contains given leg
     */
    Entity.prototype._findXor = function(leg) {
        var count = this._xorLegList.length;
        for (var i=0; i<count; i++) {
            if (this._xorLegList[i].indexOf(leg) != -1) {
                return i;
            }
        }
        return -1;
    };

    /**
     * Create XOR with two Relation legs.
     * If legB is already in XOR, add legA. Otherwise create new XOR
     */
    Entity.prototype.xorWith = function(legA, legB) {
        var index = this._findXor(legB);
        if (index != -1) {
            this._xorLegList[index].push(legA);
            this._model.addToXor(index, legA.getModel());
        } else {
            index = this._xorLegList.length;
            this._xorLegList.push([legA, legB]);
            this._model.createXor(legA.getModel(), legB.getModel());
        }
        this.redrawXor(index);

        this._canvas.History.record(this, "xor", null, [legA, legB], false);
    };

    Entity.prototype.removeXorLeg = function(leg) {
        var xorIndex = this._findXor(leg);
        if (xorIndex == -1) { return; }

        var other = this._xorLegList[xorIndex][0];
        if (other == leg) { other = this._xorLegList[xorIndex][0]; }
        this._canvas.History.record(this, "xor", [leg, other], null, false);

        if (this._xorLegList[xorIndex].length == 2) {
            this._xorLegList[xorIndex][0].getModel().setAnchorOffset(ns.Consts.DefaultAnchorOffset);
            this._xorLegList[xorIndex][0].getRelation().onXorUpdate();

            this._xorLegList[xorIndex][1].getModel().setAnchorOffset(ns.Consts.DefaultAnchorOffset);
            this._xorLegList[xorIndex][1].getRelation().onXorUpdate();

            this._xorLegList.splice(xorIndex, 1);
            this._model.removeXor(xorIndex);
            this._view.clearXor(xorIndex);

            // update offset of all "higher" xors
            for (var i=xorIndex; i<this._xorLegList.length; i++) {
                this.redrawXor(i);
            }
        } else {
            var index = this._xorLegList[xorIndex].indexOf(leg);
            this._xorLegList[xorIndex][index].getModel().setAnchorOffset(ns.Consts.DefaultAnchorOffset);
            leg.getRelation().onXorUpdate();

            this._xorLegList[xorIndex].splice(index, 1);
            this._model.removeXorLeg(xorIndex, index);
            this.redrawXor(xorIndex);
        }
    };

    /**
     * Visually mark relation legs suitable for creating XOR relation
     * If leg, which initiated XOR is already in XOR, target relation can't be in XOR
     */
    Entity.prototype.markRelations = function(leg, inXor) {
        for (var i=0; i<this._relationLegList.length; i++) {
            var otherLeg = this._relationLegList[i];
            if (otherLeg != leg ) {
                if (inXor && otherLeg.getModel().inXor) {
                    otherLeg.mark();
                } else {
                    otherLeg.allow();
                }
            }
        }
    };
    Entity.prototype.unmarkRelations = function() {
        for (var i=0; i<this._relationLegList.length; i++) {
            this._relationLegList[i].clearMarks();
        }
    };

    /**
     * Redraw XOR relation specified by either index or leg.
     * If leg is supplied, index is computed from leg, otherwise index is used
     */
    Entity.prototype.redrawXor = function(index, leg) {
        if (leg) {
            index = this._findXor(leg);
        }
        if (typeof index == "undefined" || index == null || index < 0) { return; }

        var edges = this._model.getEdges();

        var edgeDistance = ns.View.Arc.getEdgeDistance(index);
        this._view.drawXor(edges, index, edgeDistance);

        for (var i=0; i<this._xorLegList[index].length; i++) {
            var legControl = this._xorLegList[index][i];
            var legModel = legControl.getModel();
            if (legModel.getAnchorOffset() != edgeDistance) {
                legModel.setAnchorOffset(edgeDistance);
                legControl.getRelation().onXorUpdate();
            }
        }
    };

    //

    Entity.prototype.hasParent = function() {
        return this._model.hasParent();
    };

    // Menu Handlers
    Entity.prototype.handleMenu = function(action) {
        switch(action) {
            case "attr": this._createAttribute(); break;
            case "rel-nm": this._createRelation(Enum.Cardinality.MANY, Enum.Cardinality.MANY); break;
            case "rel-n1": this._createRelation(Enum.Cardinality.MANY, Enum.Cardinality.ONE);  break;
            case "rel-1n": this._createRelation(Enum.Cardinality.ONE,  Enum.Cardinality.MANY); break;
            case "rel-11": this._createRelation(Enum.Cardinality.ONE,  Enum.Cardinality.ONE);  break;
            case "isa": this._initIsa(); break;
            default: Super.prototype.handleMenu.call(this, action);
        }
    };

    // Event Handlers

    Entity.prototype.onMouseMove = function(e, mouse) {
        if (this._canvas.inCorrectionMode) { return; }

        if (this._new) {
            this.place(mouse);
        } else if (mouse.isDown()) {
            var params = mouse.getParams();
            if (params.action == "cp") {
                this.dragControlPoint(mouse, params.cp);
            } else {
                this.drag(mouse);
            }
            this._view.redraw();
        }
    };

    Entity.prototype.onMouseUp = function(e, mouse) {
        if (Super.prototype.onMouseUp.call(this, e, mouse)) {
            return;
        }

        if (this._new) {
            // view create other elements
            if (mouse.dx == 0 || mouse.dy == 0) {
                this._view.remove();

                if (Super.active) {
                    Super.active.deactivate();
                }
            } else {
                this.finish();
                this.encompassContent();
            }
        } else if (!mouse.didMove()) {
            this.activate();
        } else if (this._canvas.svg.classList.contains("isaMode")) {
            var parent = mouse.getTarget();
            if (parent instanceof ns.Control.Entity && parent != this) {
                this._isa(parent);
            } else {
                this._isa(null);
            }
        }

        this._ignoredInput = {x:0, y:0};
    };

    Entity.prototype.onMouseDblClick = function(e, mouse) {
        if (this.inCorrectionMode) { return; }
        if (this._new) {
            var w = ns.Consts.EntityDefaultWidth;
            var h = ns.Consts.EntityDefaultHeight;

            this.create();
            this._model.setPosition(mouse.x - w*0.5, mouse.y - h * 0.5);
            this._model.setSize(w, h);
            this._view.redraw();
            this.finish();
        } else {
            this._createAttribute();
        }
    };

    Entity.prototype.onKeyPress = function(e) {
        if (this._canvas.inCorrectionMode) { return; }
        if (ns.View.EditableContent.shown) { return; }
        switch(e.key.toLowerCase()) {
            case "a": this._createAttribute(); break; // "a"
            case "r": this._createRelation(Enum.Cardinality.ONE,  Enum.Cardinality.MANY); break; // "r"
            case "i": this._initIsa(); break; // "i"
        }
        Super.prototype.onKeyPress.call(this, e);
    };

    // History

    Entity.prototype.playback = function(action, from, to) {
        switch(action) {
            case "delete":
            case "create":
                if (to) {
                    this.undoDelete();
                } else {
                    this.delete();
                }
                break;
            case "xor":
                if (!to) {
                    this.removeXorLeg(from[0]);
                } else {
                    this.xorWith(to[0], to[1]);
                }
                break;
            case "fit":
            case "resize":
                this._model.setSize(to.width, to.height);
                this._view.redraw();
                this._notifyResize();
                break;
            case "isa":
                this._isa(to.parent, to);
                if (to.width) {
                    this._model.setSize(to.width, to.height);
                    this._view.redraw();
                    this._notifyResize();
                }
                break;
            default:
                Super.prototype.playback.call(this, action, from, to);
        }
    };

    // Automatic correction check

    Entity.prototype.checkAgainst = function(referenceEntities, nameComparator) {
        var name = this._model.getName();

        var markedCnt = 0;

        var i = referenceEntities.length;
        while (--i >= 0) {
            if (nameComparator(name, referenceEntities[i].name)) {
                var ref = referenceEntities[i];

                // check attributes
                markedCnt += this._attributeList.checkAgainst(ref.attr, nameComparator);

                // check parent
                var parent = (this._model._parent ? this._model._parent.getName() : null);
                if (ref.parent != parent) {
                    this.markIncorrect();
                    markedCnt++;
                }

                referenceEntities.splice(i, 1);

                // check children
                if (this._children) {
                    this._children.forEach(function(child){
                        markedCnt += child.checkAgainst(referenceEntities, nameComparator);
                    });
                }
                return markedCnt;
            }
        }

        this.markIncorrect();
        return markedCnt + 1;
    };

    return Entity;
})();
