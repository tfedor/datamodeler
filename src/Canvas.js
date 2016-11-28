var DBSDM = DBSDM || {};

/**
 * Canvas controller
 * Creates canvas which is used to manipulate other elements
 */
DBSDM.Canvas = (function() {
    var ns = DBSDM;

    function Canvas() {
        this.id = ns.Random.string(5);

        this._container = null;
        this.svg = null;

        this.snap = false;
        this._grid = null;

        this._offset = {x:0, y:0};
        this._zoom = 1;

        /**
         * Mouse controller
         */
        this.Mouse = null;

        this.Layout = new ns.Layout();

        this.menu = {};

        this._entities = [];
        this._relations = [];
    }

    Canvas.prototype.create = function() {
        this._container = document.createElement("div");
        this._container.className = "dbsdmCanvas";

        this.svg = this._container.appendChild(ns.Element.el("svg"));

        if (document.currentScript) {
            document.currentScript.parentNode.insertBefore(this._container, document.currentScript);
        } else {
            document.body.appendChild(this._container);
        }

        this.Mouse = new ns.Mouse(this);

        // create grid pattern for this canvas
        var defs = this.svg.appendChild(ns.Element.el("defs"));
        var gs = ns.Consts.CanvasGridSize;
        var pattern = ns.Element.el("pattern", {id: this._sharedElementName("grid"), x:0, y:0, width: gs, height: gs, _patternUnits: "userSpaceOnUse", _patternContentUnits: "userSpaceOnUse"});
        pattern.appendChild(ns.Element.el("line", {x1:0.5, y1:0.5, x2:gs+.5, y2:0.5, stroke: "#f2f2f2"}));
        pattern.appendChild(ns.Element.el("line", {x1:0.5, y1:0.5, x2:0.5, y2:gs+.5, stroke: "#f2f2f2"}));
        defs.appendChild(pattern);

        // set up callbacks
        var that = this;
        this.svg.addEventListener("mousedown", function(e) { that.Mouse.down(e, that); });
        this.svg.addEventListener("mousemove", function(e) { that.Mouse.move(e); });
        this.svg.addEventListener("mouseup",   function(e) { that.Mouse.up(e); });

        this.svg.addEventListener("contextmenu", function(e) {
            if (!ns.Menu.hasAttachedHandlers()) {
                ns.Menu.attach(that, "canvas");
            }
            ns.Menu.show(e);
        });

        this.svg.addEventListener("dragover", function(e) { e.preventDefault(); } );
        //this.svg.addEventListener("dragleave", function() { console.log("dragleave"); } );
        document.body.addEventListener("drop", function(e) { ns.File.upload(e, that); }, false);
    };

    // shared elements for all canvas

    // svg elements
    Canvas.prototype._sharedElementName = function(name) {
        return this.id + "." + name;
    };

    Canvas.prototype.hasSharedHTMLElement = function(name) {
        return document.getElementById(this._sharedElementName(name)) != null;
    };

    Canvas.prototype.createSharedHTMLElement = function(id, element) {
        element.id = this.id + "." + id;
        this._container.appendChild(element);
    };

    Canvas.prototype.getSharedHTMLElement = function(name) {
        if (!this.hasSharedHTMLElement(name)) { return null; }
        return document.getElementById(this._sharedElementName(name));
    };

    // canvas

    Canvas.prototype._switchSnap = function() {
        this.snap = !this.snap;
        if (this.snap) {
            this._grid = ns.Element.el("rect", {
                x: this._offset.x,
                y: this._offset.y,
                width: "100%",
                height: "100%",
                fill: "url(#"+this._sharedElementName("grid")+")"
            });
            this.svg.insertBefore(this._grid, this.svg.firstChild);
        } else {
            this.svg.removeChild(this._grid);
            this._grid = null;
        }
    };

    Canvas.prototype._updateViewbox = function() {
        var rect = this.svg.getBoundingClientRect();
        var width = rect.width;
        var height = rect.height;

        var x = this._offset.x;
        var y = this._offset.y;
        var w = width / this._zoom;
        var h = height / this._zoom;
        ns.Element.attr(this.svg, {_viewBox: x+" "+y+" "+w+" "+h});

        if (this._grid) {
            ns.Element.attr(this._grid, {x: x, y: y});
        }
    };

    Canvas.prototype._scroll = function(rx, ry) {
        this._offset.x -= rx;
        this._offset.y -= ry;
        this._updateViewbox();
    };
    Canvas.prototype.resetView = function() {
        this._offset.x = 0;
        this._offset.y = 0;
        this._updateViewbox();
    };

    Canvas.prototype.zoomIn = function() {
        this._zoom = Math.min(2, this._zoom + 0.1);
        this._updateViewbox();
    };
    Canvas.prototype.zoomOut = function() {
        this._zoom = Math.max(0.1, this._zoom - 0.1);
        this._updateViewbox();
    };
    Canvas.prototype.zoomReset = function() {
        this._zoom = 1;
        this._updateViewbox();
    };

    // fullscreen
    Canvas.prototype.fullscreenElement = function() {

    };

    Canvas.prototype.fullscreen = function() {
        if (!ns.Fullscreen.enabled()) { return; }
        ns.Fullscreen.switch(this._container);
    };

    // entities

    Canvas.prototype.addEntity = function(entity) {
        this._entities.push(entity);
    };
    Canvas.prototype.removeEntity =  function(entity) {
        for (var i=0; i<this._entities.length; i++) {
            if (this._entities[i] == entity) {
                this._entities.splice(i, 1);
                return;
            }
        }
    };

    Canvas.prototype.addRelation = function(relation) {
        this._relations.push(relation);
    };
    Canvas.prototype.removeRelation = function(relation) {
        for (var i=0; i<this._relations.length; i++) {
            if (this._relations[i] == relation) {
                this._relations.splice(i, 1);
                return;
            }
        }
    };

    Canvas.prototype.clear = function() {
        while (this._entities.length != 0) {
            this._entities[0].delete();
        }
    };

    Canvas.prototype.sort = function() {
        this.Layout.sort(this._entities, this._relations);
    };

    // save/load, export/import
    Canvas.prototype._sortEntityModels = function(a, b) {
        return a.getName().localeCompare(b.getName());
    };

    Canvas.prototype._sortRelationModels = function(a, b) {
        return a.toString().localeCompare(b.toString());
    };

    Canvas.prototype.export = function() {
        if (!ns.Diagram.allowFile) { return; }
        var entityModels = [];
        var relationModels = [];

        // get models for entities and relations
        var count = this._entities.length;
        for (var i=0; i<count; i++) {
            entityModels.push(this._entities[i].getModel());
        }
        count = this._relations.length;
        for (i=0; i<count; i++) {
            relationModels.push(this._relations[i].getModel());
        }

        // sort by names
        entityModels.sort(this._sortEntityModels);
        relationModels.sort(this._sortRelationModels);

        // get resulting object
        var result = {
            entities: [],
            relations: []
        };

        count = entityModels.length;
        for (i=0; i<count; i++) {
            result.entities.push(entityModels[i].getExportData());
        }

        count = relationModels.length;
        for (i=0; i<count; i++) {
            result.relations.push(relationModels[i].getExportData());
        }

        ns.File.download(JSON.stringify(result, null, 2), "model-data.json", "application/json");
    };

    Canvas.prototype.import = function(data) {
        // create models from data
        var entityModels = [];
        var relationModels = [];

        var i;
        var count = data.entities.length;
        for (i=0; i<count; i++) {
            entityModels.push(new ns.Model.Entity(data.entities[i]));
        }

        count = data.relations.length;
        for (i=0; i<count; i++) {
            relationModels.push(new ns.Model.Relation(null, null, data.relations[i]));
        }

        // create controls and view for data
        var entityControlsMap = {};

        count = entityModels.length;
        for (i=0; i<count; i++) {
            var name = entityModels[i].getName();
            var control = new ns.Control.Entity(this, entityModels[i]);
            entityControlsMap[name] = control.import();
        }

        // set ISA
        count = data.entities.length;
        for (i=0; i<count; i++) {
            var entity = data.entities[i].name;
            var parent = data.entities[i].parent;
            if (parent) {
                entityControlsMap[entity]._isa(entityControlsMap[parent]);
            }

            entityControlsMap[entity].fitToContents();
        }

        // place entites
        count = this._entities.length;
        var perRow = Math.ceil(Math.sqrt(count));
        var r=0,c=0;
        for (i=0; i<count; i++) {
            control = this._entities[i];
            control._model.setPosition(c*200, r*150);
            control._view.redraw();

            c++;
            if (c == perRow) {
                r++;
                c = 0;
            }
        }

        // set relations
        count = data.relations.length;
        for (i=0; i<count; i++) {
            var model = relationModels[i];
            var relation = data.relations[i];
            var sourceEntityControl = entityControlsMap[relation[0].entity];
            var targetEntityControl = entityControlsMap[relation[1].entity];

            control = new ns.Control.Relation(this, sourceEntityControl, targetEntityControl, null, null, model);
            control.import();
        }

        this.sort();
    };

    // event handlers

    Canvas.prototype.onMouseDown = function(e, mouse) {
        if (mouse.button != 0) { return; }
        if (ns.Diagram.allowEdit) {
            var ent = new ns.Control.Entity(this, new ns.Model.Entity("Entity_" + (this._entities.length + 1)));
            ent.create();

            this.Mouse.attachObject(ent);
        }
    };

    Canvas.prototype.onMouseMove = function(e, mouse) {
        if (mouse.button != 1) { return; }
        this._scroll(mouse.rx, mouse.ry);
    };

    Canvas.prototype.handleMenu = function(action) {
        switch(action) {
            case "snap": this._switchSnap(); break;
            case "export": this.export(); break;
            case "zoom-in": this.zoomIn(); break;
            case "zoom-reset": this.zoomReset(); break;
            case "zoom-out": this.zoomOut(); break;
            case "reset-view": this.resetView(); break;
            case "image": saveSvgAsPng(this.svg, "diagram.png"); break;
            case "fullscreen": this.fullscreen(); break;
        }
    };

    return Canvas;
})();
