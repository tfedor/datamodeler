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
        this._defs = null;

        /**
         * Mouse controller
         */
        this.Mouse = null;

        this.Layout = new ns.Layout();

        this.menu = {};

        this.importMap = {}; // map Entity model ID to entity control
        this._entities = [];
        this._relations = [];
    }

    Canvas.prototype.create = function() {
        this._container = document.createElement("div");
        this._container.className = "dbsdmCanvas";

        this.svg = this._container.appendChild(ns.Element.el("svg"));
        this._defs = this.svg.appendChild(ns.Element.el("defs"));

        if (document.currentScript) {
            document.currentScript.parentNode.insertBefore(this._container, document.currentScript);
        } else {
            document.body.appendChild(this._container);
        }

        this.Mouse = new DBSDM.Mouse(this.svg);

        // set up callbacks
        var that = this;
        this.svg.addEventListener("mousedown", function(e) { that.Mouse.down(e, that); });
        this.svg.addEventListener("mousemove", function(e) { that.Mouse.move(e); });
        this.svg.addEventListener("mouseup",   function(e) { that.Mouse.up(e); });

        this.svg.addEventListener("contextmenu", function(e) { DBSDM.Menu.show(e); });
    };

    // shared elements for all canvas

    // svg elements
    Canvas.prototype._sharedElementName = function(name) {
        return this.id + "." + name;
    };

    Canvas.prototype.hasSharedElement = function(name) {
        return document.getElementById(this._sharedElementName(name)) != null;
    };

    Canvas.prototype.createSharedElement = function(name, element) {
        ns.Element.attr(element, { id: this._sharedElementName(name) });
        this._defs.appendChild(element);
    };

    Canvas.prototype.getSharedElement = function(name, attrs) {
        if (!this.hasSharedElement(name)) { return null; }
        return ns.Element.use(this._sharedElementName(name), attrs);
    };

    Canvas.prototype.getSharedElementId = function(name) {
        if (!this.hasSharedElement(name)) { return null; }
        return "#" + this._sharedElementName(name);
    };

    // html elements
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
        /*
        for (var i=0; i<this._entities.length; i++) {
            var entity = this._entities[i];

            entity.encompassContent();
            entity.encompassContent(); // called twice to get correct size of text elements if they were previously hidden

            entity._model.setPosition(10, 10);

            entity._view.redraw();
        }
        */
        this.Layout.sort(this._entities, this._relations);
    };

    // save/load, export/import
    Canvas.prototype._sortEntityModels = function(a, b) {
        return a.getName().localeCompare(b.getName());
    };

    Canvas.prototype._sortRelationModels = function(a, b) {
        return a.toString().localeCompare(b.toString());
    };

    Canvas.prototype.save = function() {

    };

    Canvas.prototype.load = function() {

    };

    Canvas.prototype.export = function() {
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

    Canvas.prototype.import = function(entityModelList, relationModelList) {
        var i;
        for (i=0; i < entityModelList.length; i++) {
            (new ns.Control.Entity(this, entityModelList[i])).import();
        }

        for (i=0; i < relationModelList.length; i++) {
            var model = relationModelList[i];

            var sourceId = model.getSource().getEntity().getId();
            var targetId = model.getTarget().getEntity().getId();

            console.log(sourceId + " -> " + targetId);
            (new ns.Control.Relation(this, this.importMap[sourceId], this.importMap[targetId], null, null, model))
                .import();

            //var targetLegModel = model.getTarget();

            // from model to entity

            //sourceEntityControl,
            //targetEntityControl,
            //model
        }
    };

    // event handlers

    Canvas.prototype.onMouseDown = function() {
        var ent = new ns.Control.Entity(this, new ns.Model.Entity("Entity_" + (this._entities.length + 1)));
        ent.create();

        this.Mouse.attachObject(ent);
    };

    return Canvas;
})();
