var DBSDM = DBSDM || {};
DBSDM.Control = DBSDM.Control ||{};

DBSDM.Control.Entity = (function(){
    Entity.activeEntity = null;

    function Entity(canvas) {
        this._canvas = canvas;

        this._model = null;
        this._view  = null;

        this._new = true;
    }

    /**
     * Create empty entity
     */
    Entity.prototype.create = function() {
        this._model = new DBSDM.Data.Entity();
        this._view = new DBSDM.View.Entity(this._model, this._canvas);

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
            case "w":
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
    Entity.prototype.attachMenu = function() {
        if (this._menuBlocked) { return; }
        this._menuAttached = true;
        canvas.menu.Entity.attachTo(this._dom.node, this._size.width/2, this);
    };

    Entity.prototype.detachMenu = function() {
        if (this._menuBlocked) { return; }
        canvas.menu.Entity.detach();
        this._menuAttached = false;
    };

    Entity.prototype.handleMenu = function(action) {
        if (action == "newAttribute") {
            this.createAttribute();
        } else if (action == "newRelation") {
            this.createRelation();
        } else if (action == "delete") {
            this._canvas.removeEntity(this._id);

            if (this._menuAttached) {
                this._canvas.menu.Entity.detach();
            }

            if (this._dom) {
                this._dom.remove();
            }
        }
    };

    Entity.prototype.createAttribute = function() {
        var atr = new Attribute(this, this._attributes.length);
        this._attributes.push(atr);
        this._dom.append(atr.draw(this._canvas));
    };

    Entity.prototype.deleteAttribute = function(order) {
        this._attributes.splice(order, 1);
        for (var i=order; i<this._attributes.length; i++) {
            this._attributes[i].reorder(i);
        }
    };

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
