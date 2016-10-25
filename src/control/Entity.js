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
    };

    Entity.prototype.dragControlPoint = function(mouse, cp) {
        switch(cp) {
            case "nw":
                this._model.translate(mouse.rx, mouse.ry);
                this._model.resize(-mouse.rx, -mouse.ry);
                break;
            case "n":
                this._model.translate(null, mouse.ry);
                this._model.resize(null, -mouse.ry);
                break;
            case "ne":
                this._model.translate(null, mouse.ry);
                this._model.resize(mouse.rx, -mouse.ry);
                break;
            case "e":
                this._model.resize(mouse.rx);
                break;
            case "se":
                this._model.resize(mouse.rx, mouse.ry);
                break;
            case "s":
                this._model.resize(null, mouse.ry);
                break;
            case "sw":
                this._model.translate(mouse.rx);
                this._model.resize(-mouse.rx, mouse.ry);
                break;
            case "width":
                this._model.translate(mouse.rx);
                this._model.resize(-mouse.rx);
                break;
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
        // TODO this._model
    };

    Entity.prototype.getVisualCenter = function() {
        var transform = this._model.getTransform();
        return {
            x: transform.x + transform.width*0.5,
            y: transform.y + transform.height*0.5
        };
    };

    // Relation creation
    Entity.prototype._createRelation = function(sourceCardinality, targetCardinality) {
        var control = new ns.Control.Relation(canvas, this, sourceCardinality, targetCardinality);
        this._canvas.Mouse.attachObject(control);
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
    Entity.prototype.createRelation = function() {
        var control = new RelationControl(canvas, this);
        control.draw(this._position.x + this._size.width / 2, this._position.y + this._size.height / 2);
        this._canvas.Mouse.attachObject(control);
    };

    Entity.prototype.getEdgePosition = function(edge) {
        var offset = 10;
        var binWidth = 15;
        var edgeLength;
        var edgeStart;

        if (edge == "top" || edge == "bottom") {
            edgeLength = this._size.width;
            edgeStart = this._position.x + offset;
        } else {
            edgeLength = this._size.height;
            edgeStart = this._position.y + offset;
        }

        var binCount = Math.round((edgeLength - 2*offset) / binWidth);
        var bins = new Array(binCount);
        bins.fill(0);

        var anchorPos;
        var bin;
        for(var key in this._relations) {
            var relation = this._relations[key];

            var anchor = relation.getAnchorPosition();
            if (anchor.edge != edge) { continue }
            if (edge == "top" || edge == "bottom") {
                anchorPos = anchor.x;
            } else {
                anchorPos = anchor.y;
            }

            bin = Math.floor((anchorPos - edgeStart) / binWidth);
            bins[bin]++;
        }

        var centerBin = Math.round(binCount/2);
        var minBin = 0;
        for (var i=centerBin; i<centerBin + binCount; i++) {
            bin = i % binCount;
            if (bins[bin] == 0) {
                minBin = bin;
                break;
            }
            if (bins[bin] < bins[minBin]) {
                minBin = bin;
            }
        }

        return edgeStart + offset + minBin * binWidth;
    };

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
