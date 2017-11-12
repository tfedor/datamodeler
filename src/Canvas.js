var DBSDM = DBSDM || {};

/**
 * Canvas controller
 * Creates and handles canvas which is used to manipulate other elements
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

        this._namesShown = false;
        this._notesShown = true;

        /**
         * Check when exiting the site, to compare current with imported data
         * and prompt user about leaving
         */
        this._dataRef = '';

        /**
         * Mouse controller
         */
        this.Mouse = null;
        this.Layout = new ns.Layout();
        this.History = new ns.History();

        this.menu = {};

        this._entities = [];
        this._notes = [];
        this._relations = [];

        /**
         * Modes
         */
        this.inCorrectionMode = false;
        this.inCorrectionCommentMode = false;
    }

    /**
     * Create canvas. If parent is specified, canvas will be created as a child of parent
     * @param   parent    Node    Optional parent of the new canvas
     */
    Canvas.prototype.create = function(parent) {
        ns.Diagram.registerCanvas(this);

        this._container = document.createElement("div");
        this._container.className = "dbsdmCanvas";

        this.ui = new ns.UI(this._container, this);
        this.svg = this._container.appendChild(ns.Element.el("svg"));

        if (parent && parent instanceof Node) {
            parent.appendChild(this._container);
        } else if (document.currentScript) {
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
            if (that.inCorrectionMode) {
                e.preventDefault();
                return;
            }

            that.ui.acceptTutorialAction("Menu");

            if (!ns.Menu.hasAttachedHandlers()) {
                ns.Menu.attach(that, "canvas");
            }
            ns.Menu.show(e);
            that.Mouse.update(e);
        });

        this.svg.addEventListener("dragover", function(e) { e.preventDefault(); } );
        this.svg.addEventListener("drop", function(e) { ns.File.upload(e, that); }, false);

        // tutorial
        this.ui.advanceTutorial();
    };

    Canvas.prototype.attachFileUploadInput = function(selector){
        var node = document.querySelector(selector);
        if (!node) { return; }
        var that = this;
        node.addEventListener("change", function(e){
            ns.File.upload(e, that);
        });
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

    // mode

    /**
     * Sets mode of the canvas
     * "Mode" is automatically added to the class name, e.g. mode "isa" will set canvas' class to "isaMode"
     * @param mode  string  name of the mode, e.g. "isa" or "correction"
     */
    Canvas.prototype.setMode = function(mode) {
        this.svg.classList.add(mode + "Mode");
    };

    /**
     * Unsets mode of the canvas
     * @param mode  string  name of the mode, e.g. "isa" or "correction"
     */
    Canvas.prototype.unsetMode = function(mode) {
        this.svg.classList.remove(mode + "Mode");
    };

    /**
     * Checks whether canvas is in set mode
     * @param mode  string  name of the mode, e.g. "isa" or "correction"
     */
    Canvas.prototype.isInMode = function(mode) {
        return this.svg.classList.contains(mode + "Mode");
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

    Canvas.prototype.updateViewbox = function() {
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
        this.updateViewbox();

        this.ui.acceptTutorialAction("Scroll");
    };
    Canvas.prototype.resetView = function() {
        this._offset.x = 0;
        this._offset.y = 0;
        this.updateViewbox();
    };

    Canvas.prototype.getZoomLevel = function(){
        return this._zoom;
    };
    Canvas.prototype.zoomIn = function() {
        this._zoom = Math.min(2, this._zoom + 0.1);
        this.updateViewbox();
        this.ui.updateZoomLevels(this._zoom);
    };
    Canvas.prototype.zoomOut = function() {
        this._zoom = Math.max(0.1, this._zoom - 0.1);
        this.updateViewbox();
        this.ui.updateZoomLevels(this._zoom);
    };
    Canvas.prototype.zoomReset = function() {
        this._zoom = 1;
        this.updateViewbox();
        this.ui.updateZoomLevels(this._zoom);
    };

    // fullscreen
    Canvas.prototype.fullscreen = function() {
        if (!ns.Fullscreen.enabled()) { return; }
        ns.Fullscreen.toggle(this._container, this);
    };

    // notes

    Canvas.prototype._createNote = function() {
        if (this.inCorrectionMode || !ns.Diagram.allowEdit) { return null; }

        var note = new ns.Control.Note(this, new ns.Model.Note());
        note.create();
    };
    Canvas.prototype.addNote = function(note) {
        if (!this._notesShown) {
            this._toggleNotes();
        }
        this._notes.push(note);
    };
    Canvas.prototype.removeNote =  function(note) {
        for (var i=0; i<this._notes.length; i++) {
            if (this._notes[i] == note) {
                this._notes.splice(i, 1);
                return;
            }
        }
    };
    Canvas.prototype._toggleNotes = function() {
        for (var i=0; i<this._notes.length; i++) {
            if (!this._notesShown) {
                this._notes[i].show();
            } else {
                this._notes[i].hide();
            }
        }
        this._notesShown = !this._notesShown;
    };

    // entities

    /** Initiate creation of entity */
    Canvas.prototype._createEntity = function() {
        if (this.inCorrectionMode || !ns.Diagram.allowEdit) { return null; }
        var ent = new ns.Control.Entity(this, new ns.Model.Entity("Entity_" + (this._entities.length + 1)));
        ent.create();
        return ent;
    };

    /** Create entity of default size */
    Canvas.prototype._createDefaultEntity = function() {
        var entity = this._createEntity();
        if (entity) {
            entity.place({x: this.Mouse.x, y: this.Mouse.y, dx: ns.Consts.EntityDefaultWidth, dy: ns.Consts.EntityDefaultHeight});
            entity.finish();
        }
    };

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
        if (this._relations.indexOf(relation) !== -1) { return; }
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
    Canvas.prototype._toggleRelationNames = function() {
        for (var i=0; i<this._relations.length; i++) {
            if (!this._namesShown) {
                this._relations[i].showNames();
            } else {
                this._relations[i].hideNames();
            }
        }
        this._namesShown = !this._namesShown;
    };

    Canvas.prototype.clear = function() {
        while (this._entities.length != 0) {
            this._entities[0].delete();
        }
        while (this._notes.length != 0) {
            this._notes[0].delete();
        }
    };

    Canvas.prototype.sort = function() {
        this.Layout.sort([].concat(this._entities, this._notes), this._relations);
    };

    // save/load, export/import
    Canvas.prototype._sortAttributes = function(a, b) {
        var cmp = b.primary - a.primary;
        if (cmp != 0) { return cmp; }

        cmp = b.unique - a.unique;
        if (cmp != 0) { return cmp; }

        cmp = a.nullable - b.nullable;
        if (cmp != 0) { return cmp; }

        cmp = a.name.localeCompare(b.name);
        return cmp;
    };
    Canvas.prototype._sortEntities = function(a, b) {
        return a.name.localeCompare(b.name);
    };
    Canvas.prototype._sortRelationLegs = function(a, b) {
        return JSON.stringify(a).localeCompare(JSON.stringify(b).entity);
    };
    Canvas.prototype._sortRelations = function(a, b) {
        return JSON.stringify(a).localeCompare(JSON.stringify(b));
    };

    Canvas.prototype._sortData = function(data, sortAttributes) {
        var count, i;

        // entities
        if (sortAttributes) {
            count = data.entities.length;
            for (i = 0; i < count; i++) {
                data.entities[i].attr.sort(this._sortAttributes);
            }
        }
        data.entities.sort(this._sortEntities);

        // relations
        count = data.relations.length;
        for (i=0; i<count; i++) {
            data.relations[i].sort(this._sortRelationLegs);
        }
        data.relations.sort(this._sortRelations);
    };

    /**
     * promptDownload   boolean    Indicates whether we want to show download option to user
     * prettify         boolean    When true, prettify resulting data
     * saveRef          boolean    When true, save the data reference for future check of changes
     *                             Default depends on confirmLeave setting of Diagram
     * properties       object     Additional properties for export
     */
    Canvas.prototype.export = function(promptDownload, prettify, saveRef, properties, filename) {
        properties = {
            saveNotes:         properties && typeof(properties.saveNotes)         == "boolean" ? properties.saveNotes         : false,
            saveRelationNames: properties && typeof(properties.saveRelationNames) == "boolean" ? properties.saveRelationNames : false,
            saveTransform:     properties && typeof(properties.saveTransform)     == "boolean" ? properties.saveTransform     : false,
            sortAttributes:    properties && typeof(properties.sortAttributes)    == "boolean" ? properties.sortAttributes    : true
        };

        function getExportData(list, flatten) {
            var count = list.length;
            var a = [];
            for (var i=0; i<count; i++) {
                var data = list[i].getModel().getExportData(properties);
                if (flatten) {
                    a = a.concat(data);
                } else {
                    a.push(data);
                }
            }
            return a;
        }
        var result = {};
        result.entities =  getExportData(this._entities, true);
        result.relations = getExportData(this._relations);
        if (properties.saveNotes) {
            result.notes = getExportData(this._notes);
        }

        this._sortData(result, properties.sortAttributes);

        var jsonData;
        if (prettify) {
            jsonData = JSON.stringify(result, null, 2);
        } else {
            jsonData = JSON.stringify(result);
        }

        if (saveRef !== false && (saveRef || ns.Diagram.confirmLeave)) {
            this._dataRef = this._generateRef();
        }

        if (ns.Diagram.allowFile && promptDownload) {
            ns.File.download(jsonData, (filename || "model.json"), "application/json");
        }
        return jsonData;
    };

    Canvas.prototype.updateDataReference = function() {
        if (ns.Diagram.confirmLeave) {
            this._dataRef = this._generateRef();
        }
    };

    Canvas.prototype.import = function(data, forceSort) {
        this.History.begin();
        this.clear();

        this.History.pause();

        if (forceSort) {
            this._sortData(data);
        }

        var i,control,model;

        // create entities
        var entityControlsMap = {};
        for (i=0; i<data.entities.length; i++) {
            model = new ns.Model.Entity(data.entities[i]);
            entityControlsMap[model.getName()] = (new ns.Control.Entity(this, model)).import();
        }

        // set ISA
        var sort = false;
        for (i=0; i<data.entities.length; i++) {
            var entity = data.entities[i].name;
            var parent = data.entities[i].parent;
            if (parent) {
                entityControlsMap[entity].importIsa(entityControlsMap[parent]);
            }

            if (forceSort || !data.entities[i].transform) {
                entityControlsMap[entity].fitToContents();
                sort = true;
            }
        }

        // create notes
        if (data.notes) {
            for (i=0; i<data.notes.length; i++) {
                model = new ns.Model.Note();
                model.import(data.notes[i]);
                (new ns.Control.Note(this, model)).import();
            }
        }

        // set initial placements of objects for sort
        if (forceSort || sort) {
            var list = [].concat(this._entities, this._notes);
            var perRow = Math.ceil(Math.sqrt(list.count));
            var r=0,c=0;
            list.forEach(function(control){
                control._model.setPosition(c*200, r*150);
                control._view.redraw();

                if (++c == perRow) {
                    r++;c = 0;
                }
            });
        }

        // set relations
        var xorMap = {};
        function makeXor(xorId, legControl, entityControl) {
            if (!xorId) { return; }
            if (!xorMap[xorId]) {
                xorMap[xorId] = legControl;
            } else {
                entityControl.xorWith(xorMap[xorId], legControl);
            }
        }

        for (i=0; i<data.relations.length; i++) {
            if (!this._namesShown && (data.relations[i][0].name || data.relations[i][1].name)) {
                this._namesShown = true;
            }
            model = new ns.Model.Relation(
                (new ns.Model.RelationLeg()).import(data.relations[i][0]),
                (new ns.Model.RelationLeg()).import(data.relations[i][1])
            );

            var relation = data.relations[i];
            var sourceEntityControl = entityControlsMap[relation[0].entity];
            var targetEntityControl = entityControlsMap[relation[1].entity];

            control = new ns.Control.Relation(this, sourceEntityControl, targetEntityControl, null, null, model);
            control.import((forceSort || !relation[0].transform || !relation[1].transform));

            makeXor(relation[0].xor, control._legs.source, sourceEntityControl);
            makeXor(relation[1].xor, control._legs.target, targetEntityControl);
        }

        if (forceSort || sort) {
            this.sort();
        }

        if (ns.Diagram.confirmLeave && !ns.Diagram.importIsChange) {
            this._dataRef = this._generateRef();
        }

        this.History.resume();

        this.History.record(this, "import", null, [data, forceSort]);
        this.History.commit();
    };

    Canvas.prototype.compare = function(reference, nameComparator){
        var refCopy = JSON.parse(JSON.stringify(reference));

        var markedCnt = 0;
        if (!nameComparator || typeof nameComparator !== "function") {
            nameComparator = function(nameA, nameB) {
                return nameA === nameB;
            };
        }

        this._entities.forEach(function(entity){ markedCnt += entity.checkAgainst(refCopy.entities, nameComparator); });
        this._relations.forEach(function(relation){ markedCnt += relation.checkAgainst(refCopy.relations, nameComparator); });
        return markedCnt;
    };

    Canvas.prototype._generateRef = function(){
        return JSON.stringify(this.export(false, false, false, {saveNotes: true, saveRelationNames: true}));
    };

    Canvas.prototype.didDataChange = function() {
        return this._generateRef() !== this._dataRef;
    };

    Canvas.prototype.saveAsImage = function() {
        var cloneDefs = ns.Diagram._defs.cloneNode(true);
        this.svg.insertBefore(cloneDefs, this.svg.firstChild);
        saveSvgAsPng(this.svg, "diagram.png", {
            left: this._offset.x,
            top: this._offset.y,
            selectorRemap: function(selector) {
                selector = selector.replace(/^div\.dbsdmCanvas > svg(\W|$)/, "svg");
                selector = selector.replace(/^div\.dbsdmCanvas\s/, "");
                return selector;
            }
        });
        cloneDefs.remove();
    };

    Canvas.prototype._loadLocal = function(key) {
        if (!ns.Diagram.allowRecent) { return; }

        this.import(JSON.parse(localStorage.getItem(key)));
    };

    Canvas.prototype.saveLocal = function(suffix) {
        if (!ns.Diagram.allowRecent) { return; }

        var name = ns.Consts.LocalStoragePrefix + (new Date()).toISOString();
        if (suffix) {
            name += " - "+suffix;
        }
        localStorage.setItem(name, this.export(false, false, false, {
            saveNotes: true,
            saveRelationNames: true,
            saveTransform: true,
            sortAttributes: false
        }));

        // rebuild menu with new options
        ns.Menu.build();
    };

    // event handlers

    Canvas.prototype.onMouseDown = function(e, mouse) {
        if (mouse.button != 0) { return; }

        var entity = this._createEntity();
        if (entity) {
            this.Mouse.attachObject(entity);
        }
    };

    Canvas.prototype.onMouseMove = function(e, mouse) {
        if (mouse.button != 1) { return; }
        this._scroll(mouse.rx, mouse.ry);
    };

    Canvas.prototype.handleMenu = function(action) {
        switch(action) {
            case "new-entity": this._createDefaultEntity(); break;
            case "new-note": this._createNote(); break;
            case "toggle-rel-names": this._toggleRelationNames(); break;
            case "toggle-notes": this._toggleNotes(); break;
            case "snap": this._switchSnap(); break;
            case "zoom-in": this.zoomIn(); break;
            case "zoom-reset": this.zoomReset(); break;
            case "zoom-out":   this.zoomOut(); break;
            case "reset-view": this.resetView(); break;
            case "save-model": this.export(true, true, null, {
                    saveNotes: true,
                    saveRelationNames: true,
                    saveTransform: true,
                    sortAttributes: false
                }, "model.json");
                break;
            case "save-data": this.export(true, true, null, {
                    saveNotes: true
                }, "data.json");
                break;
            case "save-image": this.saveAsImage(); break;
            case "fullscreen": this.fullscreen(); break;
            case "clear":
                if ((this._entities.length != 0 || this._notes.length != 0)
                    && ns.Diagram.allowEdit && window.confirm("Are you sure you want to clear the model?")) {
                    this.saveLocal();
                    this.clear();
                }
                break;
            case "clear-local":
                if (ns.Diagram.allowRecent) {
                    ns.Diagram.clearLocal()
                }
                break;
            case "undo": this.History.undo(); break;
            case "redo": this.History.redo(); break;
        }

        if (/^local#(.+)/.test(action)) {
            this._loadLocal(action.split("#")[1]);
        }
    };

    Canvas.prototype.getMenuState = function() {
        return {
            "toggle-rel-names": this._namesShown,
            "toggle-notes": this._notesShown,
            "undo": this.History.hasUndo(),
            "redo": this.History.hasRedo()
        }
    };

    // History

    Canvas.prototype.playback = function(action, from, to) {
        switch (action) {
            case "import":
                if (to) {
                    this.import(to[0], to[1]);
                } else {
                    this.clear();
                }
                break;
        }
    };

    return Canvas;
})();
