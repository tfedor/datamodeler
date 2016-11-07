var DBSDM = DBSDM || {};
DBSDM.Control = DBSDM.Control ||{};

DBSDM.Control.Entity = (function(){
    var ns = DBSDM;
    var Enum = ns.Enums;

    Entity.activeEntity = null;

    function Entity(canvas) {
        this._canvas = canvas;

        this._model = new ns.Model.Entity();
        this._attributeList = new ns.Control.AttributeList(this._model.getAttributeList(), this._canvas, this);
        this._relationLegList = [];
        this._view = new ns.View.Entity(this._model, this._canvas);

        this._new = true;
    }

    Entity.prototype.getDom = function() {
        return this._view.getDom();
    };

    /**
     * Create empty entity
     */
    Entity.prototype.create = function() {
        var x = this._canvas.Mouse.x;
        var y = this._canvas.Mouse.y;
        this._model.setPosition(x, y);

        this._view.createEmpty();
    };

    /**
     * Place entity during creation
     * Set up initial position during canvas drag'n'drop creation
     */
    Entity.prototype.place = function(mouse) {
        if (mouse.dx < 0) {
            this._model.setPosition(mouse.x);
        }
        if (mouse.dy < 0) {
            this._model.setPosition(null, mouse.y);
        }
        this._model.setSize(Math.abs(mouse.dx), Math.abs(mouse.dy));
    };

    /**
     * Drag entity
     */
    Entity.prototype.drag = function(mouse) {
        this._model.translate(mouse.rx, mouse.ry);

        for (var i=0; i<this._relationLegList.length; i++) {
            this._relationLegList[i].translate(mouse.rx, mouse.ry);
            this._relationLegList[i].redraw();
            this._relationLegList[i].getParentRelation().onEntityDrag();
        }
    };

    Entity.prototype.dragControlPoint = function(mouse, cp) {
        var translate = {x: 0, y: 0};
        var resize    = {x: 0, y: 0};

        if (/n/.test(cp)) {
            translate.y = mouse.ry;
            resize.y = -mouse.ry;
        } else if (/s/.test(cp)) {
            resize.y = mouse.ry;
        }

        if (/w/.test(cp)) {
            translate.x = mouse.rx;
            resize.x = -mouse.rx;
        } else if (/e/.test(cp)) {
            resize.x = mouse.rx;
        }

        this._model.translate(translate.x, translate.y);
        this._model.resize(resize.x, resize.y);

        var edges = this._model.getEdges();
        for (var i=0; i<this._relationLegList.length; i++) {
            this._relationLegList[i].onEntityResize(edges);
        }
    };

    /**
     * Activate entity
     * Shows control points, menu and allows other actions
     */
    Entity.prototype.activate = function() {
        if (Entity.activeEntity) {
            Entity.activeEntity.deactivate();
        }
        Entity.activeEntity = this;

        this._view.showControls();
    };

    Entity.prototype.deactivate = function() {
        if (Entity.activeEntity == this) {
            Entity.activeEntity = null;
            this._view.hideControls();
        }
    };

    Entity.prototype._delete = function() {
        this._view.remove();

        for(var i=0; i<this._relationLegList.length; i++) {
            this._relationLegList[i].getParentRelation().clear();
        }
    };

    Entity.prototype.getVisualCenter = function() {
        var transform = this._model.getTransform();
        return {
            x: transform.x + transform.width*0.5,
            y: transform.y + transform.height*0.5
        };
    };

    Entity.prototype.getEdges = function() {
        return this._model.getEdges();
    };

    Entity.prototype.getEdgePosition = function(edge) {
        return this._model.getEdgePosition(edge);
    };

    // Relations
    Entity.prototype._createRelation = function(sourceCardinality, targetCardinality) {
        var control = new ns.Control.Relation(canvas, this, sourceCardinality, targetCardinality);
        this._canvas.Mouse.attachObject(control);
    };

    Entity.prototype.addRelationLeg = function(relationLegControl) {
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
        var center = this.getVisualCenter();

        var EdgeOffset = 10; // TODO;

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

    // Menu Handlers
    Entity.prototype.handleMenu = function(action) {
        switch(action) {
            case "delete":
                this._delete();
                break;
            case "attr":
                this._attributeList.createAttribute();
                break;
            case "rel-nm": this._createRelation(Enum.Cardinality.MANY, Enum.Cardinality.MANY); break;
            case "rel-n1": this._createRelation(Enum.Cardinality.MANY, Enum.Cardinality.ONE);  break;
            case "rel-1n": this._createRelation(Enum.Cardinality.ONE,  Enum.Cardinality.MANY); break;
            case "rel-11": this._createRelation(Enum.Cardinality.ONE,  Enum.Cardinality.ONE);  break;
        }
    };

    // Event Handlers

    Entity.prototype.onMouseDown = function(e, mouse) {
        var matches = e.target.className.baseVal.match(/e-cp-(\w+)/);
        if (matches) {
            mouse.setParam("action", "cp");
            mouse.setParam("cp", matches[1]);
        }
    };

    Entity.prototype.onMouseMove = function(e, mouse) {

        if (this._new) {
            this.place(mouse);
        } else if (mouse.isDown()) {
            var params = mouse.getParams();
            if (params.action == "cp") {
                this.dragControlPoint(mouse, params.cp);
            } else {
                this.drag(mouse);
            }
        }

        this._view.redraw();
    };

    Entity.prototype.onMouseUp = function(e, mouse) {
        if (this._new) {
            this._new = false;

            // view create other elements
            if (mouse.dx == 0 || mouse.dy == 0) {
                this._view.remove();

                if (Entity.activeEntity) {
                    Entity.activeEntity.deactivate();
                }
            } else {
                this._view.create(this);
            }
        } else if (!mouse.didMove()) {
            this.activate();
        }
    };









    /*

    // handlers

    Entity.prototype.onMouseDown = function(e, mouse) {
        var params = mouse.getParams();
        if (params.action == 'newRelation') {
            if (this._menuAttached) {
                this._canvas.menu.Entity.detach();
            }
            this._menuBlocked = true;
        }
    };

    Entity.prototype.onMouseMove = function(e, mouse){
        var key;
        var action = mouse.getParams().action;
        if (action == "drag") {
            this.translateBy(mouse.rx, mouse.ry);

            for(key in this._relations) {
                this._relations[key].translateAnchorBy(mouse.rx, mouse.ry);
            }
        } else {
            if (action == "rsz-tl") {
                this.translateBy(mouse.rx, mouse.ry);
                this.resizeBy(-mouse.rx, -mouse.ry);
            } else if (action == "rsz-br") {
                this.resizeBy(mouse.rx, mouse.ry);
            } else if (action == "rsz-bl") {
                this.translateBy(mouse.rx);
                this.resizeBy(-mouse.rx, mouse.ry);
            } else if (action == "rsz-tr") {
                this.translateBy(null, mouse.ry);
                this.resizeBy(mouse.rx, -mouse.ry);
            }

            for(key in this._relations) {
                if (this._relations.hasOwnProperty(key)) {
                    this._relations[key].updateAnchorAfterResize();
                }
            }
        }
    };

    Entity.prototype.onMouseUp = function(e, mouse){
         this.translateTo(
            parseInt(this._dom.attr('x')),
            parseInt(this._dom.attr('y'))
        );
        this.resize(
            parseInt(this._dom.attr('width')),
            parseInt(this._dom.attr('height'))
        );

        this._menuBlocked = false;
        if (this._menuAttached) {
            this.attachMenu();
        }
        return true;
    };
    */

    return Entity;
})();
