/** src/Canvas.js */
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
/** src/Consts.js */

DBSDM.Consts = {
    DoubleClickInterval: 500, // interval in milliseconds during which double clicks are accepted

    SnappingLimit: 5,
    CanvasGridSize: 15,

    EntityDefaultWidth: 90,
    EntityDefaultHeight: 70,
    EntityAttributesOffset: 20,
    EntityStrokeWidth: 1,
    EntityPadding: 10,
    EntityEdgePadding: 10, // how close to the corner can the relation be placed
    EntityExtraHeight: 5,

    NoteDefaultWidth: 150,
    NoteDefaultHeight: 100,
    NoteStrokeWidth: 1,
    NotePadding: 5,

    DefaultAnchorOffset: 11, // how for from edge to start drawing relation leg
    MinAnchorAnchorDistance: 10, // should be half the anchor width

    ArcSize: 12,
    ArcEndPointOffset: 10, // how far from the start/end point draw arc
    ArcEdgeDistance: 17, // distance of the arc from the entity edge
    ArcArcDistance: 10, // distance from another arc of the same entity

    UIMessageTransition: 0.4,
    UIDefaultSuccessDuration: 2,
    UIDefaultErrorDuration: 2,

    LocalStoragePrefix: "DBSDM_"
};
/** src/Diagram.js */

/**
 * Diagram, manager class for all canvases created at one page
 */
DBSDM.Diagram = (function() {
    var ns = DBSDM;
    var self = {};

    /** Should only be read */
    self.allowEdit = true;
    self.allowFile = true;
    self.allowCorrectMode = false;
    self.allowRecent = true;
    self.showTutorial = true;
    self.confirmLeave = false;
    self.importIsChange = false;

    self._canvasList = [];
    self.lastCanvas = null;
    self.cancelAction = null;

    /**
     * Initialize diagram. Takes one argument, an object with settings.
     * @param options   Object      Settings object, possible options are:
     *                              allowEdit           Allow changes to the data of the diagram
     *                              allowFile           Allow import and export actions from the interface
     *                              allowCorrectMode    Allow switching to marking mode
     *                              allowRecent         Allow saving and loading recent models from local storage
     *                              showTutorial        Determines whether the tutorial will be shown or not
     *                              confirmLeave        Ask user to confirm leaving the page if there is a diagram with unsaved changes
     *                              importIsChange      Determines whether import will be treated as a change (makes sense when used with confirmLeave on)
     */
    self.init = function(options){
        options = options || {};
        if (typeof options.allowEdit == "boolean") { self.allowEdit = options.allowEdit; }
        if (typeof options.allowFile == "boolean") { self.allowFile = options.allowFile; }
        if (typeof options.allowCorrectMode == "boolean") { self.allowCorrectMode = options.allowCorrectMode; }
        if (typeof options.allowRecent == "boolean") { self.allowRecent = options.allowRecent; }
        if (typeof options.showTutorial == "boolean") { self.showTutorial = options.showTutorial; }
        if (typeof options.confirmLeave == "boolean") { self.confirmLeave = options.confirmLeave; }
        if (typeof options.importIsChange == "boolean") { self.importIsChange = options.importIsChange; }

        ns.Menu.build();

        // create shared hidden svg for defs
        var svg = document.body.appendChild(ns.Element.el("svg", {id: "dbsdmShared"}));
        this._defs = svg.appendChild(ns.Element.el("defs"));

        this._createEntityElements();
        this._createAttributeElements();
        this._createRelationElements();
        this._createRelationLegElements();

        // global events

        window.onbeforeunload = function(e) {
            if (self.allowRecent) {
                self.saveLocal();
            }

            if (self.confirmLeave) {
                if (self.didAnyCanvasChange()) {
                    var dialog = "Are you sure you want to leave? Your model may not have been saved.";
                    e.returnValue = dialog;
                    return dialog;
                }
            }
        };

        window.addEventListener('keydown', function(e) {
            if (self.lastCanvas) {
                switch (e.keyCode) {
                    case 112:  // F1
                        self.lastCanvas.ui.toggleHelp();
                        e.preventDefault();
                        return;
                    case 90: // z
                        if (e.ctrlKey) {
                            if (e.shiftKey) {
                                self.lastCanvas.History.redo();
                            } else {
                                self.lastCanvas.History.undo();
                            }
                        }
                        return;
                }
            }
            if (e.keyCode == 27 && self.cancelAction) { // ESC
                self.cancelAction();
                self.cancelAction = null;
            } else if (ns.Control.CanvasObject.active) {
                ns.Control.CanvasObject.active.onKeyPress(e);
            }
        });
        window.addEventListener('keypress',function(e){
            if (self.lastCanvas) {
                switch(e.key) {
                    case "+": self.lastCanvas.zoomIn(); return;
                    case "-": self.lastCanvas.zoomOut(); return;
                    case "*": self.lastCanvas.zoomReset(); return;
                }
            }
        });
        window.addEventListener("mousedown", function(e) {
            ns.Menu.hide();
            if (ns.Control.CanvasObject.active) {
                ns.Control.CanvasObject.active.deactivate();
            }
        });
        ns.Fullscreen.setEvents(function(e) {
            var el = ns.Fullscreen.fullscreenElement();
            if (el) {
                el.classList.add("fullscreen");
            } else {
                document.querySelector(".fullscreen").classList.remove("fullscreen");
            }
            if (ns.Fullscreen.lastCanvas) {
                ns.Fullscreen.lastCanvas.updateViewbox();
            }
        });
    };

    self.registerCanvas = function(canvas) {
        self._canvasList.push(canvas);
    };

    self.didAnyCanvasChange = function() {
        var changed = false;
        var count = self._canvasList.length;
        for (var i=0; i<count; i++) {
            if (self._canvasList[i].didDataChange()) {
                self._canvasList[i].ui.error("Changes in this model have not been saved");
                changed = true;
            }
        }
        return changed;
    };

    // localStorage
    self.saveLocal = function() {
        var count = self._canvasList.length;
        for (var i=0; i<count; i++) {
            if (self._canvasList[i].didDataChange()) {
                var suffix = (count > 1 ? "Canvas "+(i+1) : null);
                self._canvasList[i].saveLocal(suffix);
            }
        }
    };

    self.clearLocal = function() {
        var prefix = ns.Consts.LocalStoragePrefix;

        for (var i=0; i<localStorage.length; i++) {
            var key = localStorage.key(i);
            if ((new RegExp("^"+prefix)).test(key)) {
                localStorage.removeItem(key);
            }
        }

        ns.Menu.build();
    };

    // svg elements
    self._sharedElementName = function(name) {
        return name;
    };

    self.hasSharedElement = function(name) {
        return document.getElementById(this._sharedElementName(name)) != null;
    };

    self.createSharedElement = function(name, element) {
        ns.Element.attr(element, { id: this._sharedElementName(name) });
        this._defs.appendChild(element);
    };

    self.getSharedElement = function(name, attrs) {
        if (!this.hasSharedElement(name)) { return null; }
        return ns.Element.use(this._sharedElementName(name), attrs);
    };

    self.getSharedElementId = function(name) {
        if (!this.hasSharedElement(name)) { return null; }
        return "#" + this._sharedElementName(name);
    };

    // create shared svg elements
    self._createEntityElements = function() {
        // Entity
        self.createSharedElement("Entity.Bg",
            ns.Element.rect(0, 0, "100%", "100%", {
                rx: 10, ry: 10,
                fill: "#A4E1FF",
                stroke: "#0000FF", // #5271FF
                strokeWidth: ns.Consts.EntityStrokeWidth
            })
        );

        self.createSharedElement("Entity.Bg.Selected",
            ns.Element.rect(0, 0, "100%", "100%", {
                rx: 10, ry: 10,
                fill: "#EFFFA4",
                stroke: "#ffa800",
                strokeWidth: ns.Consts.EntityStrokeWidth
            })
        );

        self.createSharedElement("Entity.Bg.Incorrect",
            ns.Element.rect(0, 0, "100%", "100%", {
                rx: 10, ry: 10,
                fill: "#ffaaaa",
                stroke: "#b62727",
                strokeWidth: ns.Consts.EntityStrokeWidth
            })
        );

        // Note
        self.createSharedElement("Note.Bg",
            ns.Element.rect(0, 0, "100%", "100%", {
                fill: "#fffbb4",
                stroke: "#f9de4f",
                strokeWidth: ns.Consts.NoteStrokeWidth
            })
        );
        self.createSharedElement("Note.Bg.Incorrect",
            ns.Element.rect(0, 0, "100%", "100%", {
                fill: "#ffaaaa",
                stroke: "#b62727",
                strokeWidth: ns.Consts.NoteStrokeWidth
            })
        );

        // Controls
        self.createSharedElement("Entity.ControlRectangle",
            ns.Element.rect(0, 0, "100%", "100%", {
                fill: "none",
                strokeWidth: 1,
                shapeRendering: "crispEdges",
                pointerEvents: "none",
                stroke: "black"
            })
        );

        self.createSharedElement("Entity.ControlPoint",
            ns.Element.rect(0, 0, 8, 8, {
                fill: "none",
                strokeWidth: 1,
                stroke: "black",
                shapeRendering: "crispEdges",
                transform: "translate(-4,-4)",
                pointerEvents: "all"
            })
        );
    };

    self._createRelationElements = function() {
        self.createSharedElement("Relation.MiddlePoint",
            ns.Element.rect(0, 0, 6, 6, {
                fill: "black",
                strokeWidth: 1,
                stroke: "black",
                shapeRendering: "crispEdges",
                transform: "translate(-3,-3)",
                pointerEvents: "visible"
            })
        );
    };

    self._createRelationLegElements = function() {
        ns.Diagram.createSharedElement("Relation.AnchorControl",
            ns.Element.rect(-9.5,-14.5, 18,15, {
                fill: "none",
                stroke: "none"
            })
        );

        ns.Diagram.createSharedElement("Relation.AnchorMany",
            ns.Element.el("polyline", {
                points: "-4.5,-0.5, -0.5,-10.5, 0.5,-10.5, 4.5,-0.5",
                fill: 'none',
                stroke:'black',
                strokeWidth: 1
            })
        );

        ns.Diagram.createSharedElement("Relation.AnchorIdentifying",
            ns.Element.el("polyline", {
                points: "-5.5,-10.5, 5.5,-10.5",
                fill: 'none',
                stroke:'black',
                strokeWidth: 1
            })
        );

        ns.Diagram.createSharedElement("Relation.CP",
            ns.Element.rect(0, 0, 6, 6, {
                fill: "none",
                strokeWidth: 1,
                stroke: "black",
                shapeRendering: "crispEdges",
                transform: "translate(-3,-3)"
            })
        );
    };

    self._createAttributeElements = function() {
        var gradient = ns.Element.el("linearGradient", { x1: 0, y1: 0, x2: 0, y2: 1 });
        gradient.appendChild(
            ns.Element.el("stop", {
                "stop-color": "#ffffff",
                "offset": "0%"
            })
        );
        gradient.appendChild(
            ns.Element.el("stop", {
                "stop-color": "#eaeaea",
                "offset": "100%"
            })
        );
        ns.Diagram.createSharedElement("Attr.BgGradient", gradient );

        ns.Diagram.createSharedElement("Attr.Bg",
            ns.Element.rect(0, 0, "100%", "100%", {
                stroke: "#5271FF",
                strokeWidth: 1,
                fill: "#eaeaea"
            })
        );
    };

    return self;
})();
/** src/Element.js */

/**
 * Support class for generating SVG elements and their manipulation
 */
DBSDM.Element = (function() {
    var svgNS = 'http://www.w3.org/2000/svg';
    var xlinkNS = 'http://www.w3.org/1999/xlink';

    var self = {};

    var create = function(element) {
        return document.createElementNS(svgNS, element);
    };

    /**
     * Create SVG element
     * @param element   string  Name of the element
     * @param attr      object  Optional attributes of the element, see `attr` method for more information
     */
    self.el = function(element, attr) {
        return self.attr(create(element), attr);
    };

    /**
     * Set attributes for given SVG element. Attributes are automatically converted from camelCase to lisp-case.
     * If the value of the property is null, attribute is removed from the element
     * @param node          SVGelement
     * @param attributes    object  Object of name-value pairs of element's attributes.
     */
    self.attr = function(node, attributes) {
        for (var name in attributes) {
            if (!attributes.hasOwnProperty(name)) { continue; }
            var value = attributes[name];

            // convert attributeName ("object style") to attribute-name ("dom style")
            if (name[0] == "_") {
                name = name.substr(1);
            } else {
                name = name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
            }

            var ns = null;
            if (name == "href") {
                ns = xlinkNS;
            }

            if (value == null) {
                node.removeAttributeNS(ns, name);
            } else {
                node.setAttributeNS(ns, name, value)
            }
        }
        return node;
    };

    self.addClass = function(node, className) {
        node.classList.add(className);
    };

    self.transform = function(node, translate, rotate, scale) {
        var tran = [];
        if (translate) {
            tran.push("translate(" + translate.join(" ") + ")");
        }
        if (rotate) {
            tran.push("rotate(" + rotate.join(" ") + ")");
        }
        if (scale) {
            tran.push("scale(" + scale.join(" ") + ")");
        }

        self.attr(node, {transform: tran.join(" ")});
    };

    /**
     * Element creation helpers for common elements
     */

    self.use = function(id, attrs) {
        attrs = attrs || {};
        return self.attr(
            create("use"),
            Object.assign(attrs, { href: "#" + id })
        );
    };

    self.rect = function(x, y, width, height, params) {
        var attrs = {
            x: x || 0,
            y: y || 0,
            width: width || "100%",
            height: height || "100%"
        };
        Object.assign(attrs, params);
        return self.attr(create("rect"), attrs);
    };

    self.g = function() {
        var node = create("g");
        for (var i=0; i<arguments.length; i++) {
            node.appendChild(arguments[i]);
        }
        return node;
    };

    self.text = function(x, y, text, attrs) {
        var params = {
            x: x || 0,
            y: y || 0
        };

        Object.assign(params, attrs);
        var node = self.attr(
            create("text"),
            params
        );

        if (text) {
            node.innerHTML = text;
        }

        return node;
    };

    self.title = function(text) {
        let node = create("title");
        node.innerHTML = text;
        return node;
    };

    /**
     * Path builder
     */
    self.Path = (function(){
        function Path() {
            this._str = "";
        }
        Path.prototype.isEmpty = function() {
            return this._str == "";
        };

        /**
         * Generate path element
         * @param attr  object  Object of SVG element attributes, see `attr` method
         */
        Path.prototype.path = function(attr) {
            attr = attr || {};
            var prop = Object.assign(attr, {d: this._str});
            return DBSDM.Element.el("path", prop);
        };

        Path.prototype.M = function(x,y) { this._str += "M"+x+" "+y; return this; };
        Path.prototype.m = function(x,y) { this._str += "m"+x+" "+y; return this; };

        Path.prototype.H = function(x) { this._str += "H"+x; return this; };
        Path.prototype.h = function(x) { this._str += "h"+x; return this; };

        Path.prototype.V = function(x) { this._str += "V"+x; return this; };
        Path.prototype.v = function(x) { this._str += "v"+x; return this; };

        Path.prototype.L = function(x,y) { this._str += "L"+x+" "+y; return this; };
        Path.prototype.l = function(x,y) { this._str += "l"+x+" "+y; return this; };

        Path.prototype.C = function(x1,y1, x2,y2, x,y) { this._str += "C"+x1+" "+y1+","+x2+" "+y2+","+x+" "+y; return this; };
        Path.prototype.c = function(x1,y1, x2,y2, x,y) { this._str += "c"+x1+" "+y1+","+x2+" "+y2+","+x+" "+y; return this; };

        return Path;
    })();

    return self;
}());
/** src/Enums.js */

DBSDM.Enums = {
    Cardinality: {
        MANY: 0,
        ONE: 1
    },

    Edge: {
        TOP: 0,
        RIGHT: 1,
        BOTTOM: 2,
        LEFT: 3
    }
};
/** src/File.js */

DBSDM.File = (function() {
    var ns = DBSDM;

    var self = {};

    /**
     * See http://stackoverflow.com/a/30832210/4705537
     */
    self.download = function(data, filename, type) {
        if (!ns.Diagram.allowFile) { return; }

        var a = document.createElement("a"),
            file = new Blob([data], {type: type});
        if (window.navigator.msSaveOrOpenBlob) // IE10+
            window.navigator.msSaveOrOpenBlob(file, filename);
        else { // Others
            var url = URL.createObjectURL(file);
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(function() {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 0);
        }
    };

    self.upload = function(e, canvas) {
        e.stopPropagation();
        e.preventDefault();

        if (!ns.Diagram.allowFile) {
            canvas.ui.error("File upload is turned off");
            return;
        }

        // fetch FileList object
        var files = e.target.files || e.dataTransfer.files;

        // process all File objects
        if (files.length > 0) {
            var file = files[0];
            if (file.type == "application/x-zip-compressed" || file.type == "application/zip") {
                self._processZip(canvas, file);
            } else if (file.type == "application/json" || /\.json$/.test(file.name)) {
                self._processJson(canvas, file);
            } else {
                canvas.ui.error("File couldn't be imported: unsupported file type. Import either json with exported data or SQLDeveloper zip");
                console.log(e);
            }
        }
    };

    /**
     * Programmatic upload of files/blobs to specific canvas
     * canvas   Canvas      Canvas to which to import blob
     * blob     Blob        Blob or File to be imported, e.g. loaded via xmlHttpRequest
     */
    self.loadBlob = function(canvas, blob) {
        return new Promise((resolve, reject) => {
            if (blob.type == "application/x-zip-compressed" || blob.type == "application/zip") {
                self._processZip(canvas, blob, resolve, reject);
            } else if (blob.type == "application/json") {
                self._processJson(canvas, blob, resolve, reject);
            } else {
                console.log("File couldn't be imported: unsupported file type. Import either json with exported data or SQLDeveloper zip");
                console.log(e);
            }
        });
    };

    self._processJson = function(canvas, jsonfile, resolve, reject) {
        var reader = new FileReader();
        reader.onload = function(e) {
            var result = e.target.result;
            try {
                var data = JSON.parse(result);
                canvas.import(data);
                canvas.ui.success("File was imported", ns.Consts.UIDefaultSuccessDuration);
                console.log("done");

                if (resolve) { resolve(); }
            } catch(e) {
                canvas.ui.error("File couldn't be parsed properly - make sure it is valid JSON file");
                console.log(e);

                if (reject) { reject(e); }
            }
        };
        reader.onerror = function(e) {
            canvas.ui.error("File couldn't be uploaded, please try again");
            console.log(e);

            if (reject) { reject(e); }
        };
        reader.readAsText(jsonfile);
    };

    self._processZip = function(canvas, zipfile, resolve, reject) {

        function toArray(obj) {
            return Object.keys(obj).map(function (key) { return obj[key]; })
        }

        function parseAttributes(nodeList) {
            var attributeMap = {};
            if (nodeList) {
                for (var i=0; i<nodeList.length; i++) {
                    var node = nodeList[i];

                    if (node.querySelector("referedAttribute")) { continue; } // skip referred attributes in ISA hierarchy

                    var id = node.getAttribute("id");
                    var name = node.getAttribute("name");
                    if (!id || !name) { continue; }

                    var nullableNode = node.querySelector("nullsAllowed");
                    attributeMap[id] = {
                        name: name,
                        primary: false,
                        unique: false,
                        nullable: (nullableNode && nullableNode.innerHTML == "true") || false
                    };
                }
            }
            return attributeMap;
        }

        function parseKeys(nodeList, attributeMap) {
            if (!nodeList) { return; }
            for (var i=0; i<nodeList.length; i++) {
                var node = nodeList[i];

                // attribute ids
                var attributes = null;
                var atrIdsNode = node.querySelector("newElementsIDs");
                if (atrIdsNode) {
                    attributes = atrIdsNode.innerHTML.split(",");
                } else {
                    var refNodes = node.querySelectorAll("usedAttributes attributeRef");
                    if (refNodes) {
                        attributes = [];
                        for (var k=0; k<refNodes.length; k++) {
                            attributes.push(refNodes[k].innerHTML);
                        }
                    }
                }
                if (!attributes) { continue; }

                // key type
                var primary = false;
                var unique = false;
                var pkNode = node.querySelector("pk");
                if (pkNode && pkNode.innerHTML == "true") {
                    primary = true;
                } else {
                    unique = true;
                }

                for (var j=0; j<attributes.length; j++) {
                    var id = attributes[j];
                    if (!attributeMap[id]) { continue; } // ignore keys that came from different entity
                    attributeMap[id].primary = primary;
                    attributeMap[id].unique = unique;
                }
            }
        }

        function parseEntity(node, entityMap, parentMap) {
            var id = node.getAttribute("id");
            var name = node.getAttribute("name");
            if (!id || !name) { return; }

            entityMap[id] = {
                name: name,
                parent: null,
                attr: null
            };

            // isa
            var parentNode = node.querySelector("hierarchicalParent");
            if (parentNode) {
                parentMap.push([id, parentNode.innerHTML]);
            }

            // attributes
            var attributeMap = parseAttributes(node.querySelectorAll("attributes > Attribute"));
            parseKeys(node.querySelectorAll("identifiers > identifier"), attributeMap);

            entityMap[id].attr = toArray(attributeMap); // map to array
        }

        function parseRelation(node, relationsMap, relationsRef) {
            var sourceEntityIdNode = node.querySelector("sourceEntity");
            var optionalSourceNode = node.querySelector("optionalSource");
            var sourceCardinalityNode = node.querySelector("sourceCardinality");
            var nameOnSource = node.querySelector("nameOnSource");

            var targetEntityIdNode = node.querySelector("targetEntity");
            var optionalTargetNode = node.querySelector("optionalTarget");
            var targetCardinalityNode = node.querySelector("targetCardinalityString");
            var nameOnTarget = node.querySelector("nameOnTarget");

            var sourceIdentifyingNode = false;
            var targetIdentifyingNode = false;

            if (node.querySelector("identifying").innerHTML == "true") {

                // export does not says which end of the relation is identifying, so we'll try to determine it:

                // identyfing relation cannot have a * cardinality
                if (sourceCardinalityNode && sourceCardinalityNode.innerHTML == "*") {
                    sourceIdentifyingNode = true;
                } else if (targetCardinalityNode && targetCardinalityNode.innerHTML == "*") {
                    targetIdentifyingNode = true;
                } else {

                    // both cardinalities are not *, determine based on optionality
                    if (optionalSourceNode) {
                        targetIdentifyingNode = true;
                    } else {
                        sourceIdentifyingNode = true;
                    }
                }
                // CAUTON: If the export is in invalid state (ie. "cardinalities are * at the both ends"
                // or "cardinalities are both not * while also both ends being optional") this code returns undefined behaviour!
            }

            if (!sourceEntityIdNode || !targetEntityIdNode) { return; }

            relationsMap.push([
                {
                    entity: sourceEntityIdNode.innerHTML,
                    identifying: sourceIdentifyingNode,
                    optional: (optionalSourceNode ? optionalSourceNode.innerHTML == "true" : false),
                    cardinality: (sourceCardinalityNode && sourceCardinalityNode.innerHTML == "*" ? 0 : 1),
                    xor: null,
                    name: nameOnSource && nameOnSource.innerHTML != "" ? nameOnSource.innerHTML : null
                }, {
                    entity: targetEntityIdNode.innerHTML,
                    identifying: targetIdentifyingNode,
                    optional: (optionalTargetNode ? optionalTargetNode.innerHTML == "true" : false),
                    cardinality: (targetCardinalityNode && targetCardinalityNode.innerHTML == "*" ? 0 : 1),
                    xor: null,
                    name: nameOnTarget && nameOnTarget.innerHTML != "" ? nameOnTarget.innerHTML : null
                }
            ]);
            relationsRef[node.getAttribute("id")] = relationsMap.length-1;
        }

        function parseArc(node, arcMap) {
            var arcID = node.getAttribute("id");
            var entityID = node.querySelector("entity").innerHTML;
            var relations = node.querySelectorAll("relationID");

            arcMap[arcID] = [];
            for (var i=0; i<relations.length; i++) {
                var relationID = relations[i].innerHTML;
                arcMap[arcID].push([entityID, relationID]);
            }
        }

        function parseNote(text, transform) {
            text = text.replace(/<br\s*\/?>/i, "\n");

            // split on new lines
            var div = document.createElement("div");
            div.classList.add("note-content-helper");
            div.style.width = (transform.width - 2*ns.Consts.NotePadding)+"px";

            document.body.appendChild(div);

            div.textContent = "&nbsp;"; // to get default height
            var defaultHeight = div.getBoundingClientRect().height;

            var resultText = "";
            div.textContent = "";

            var skipSpace = false;
            text.trim().split(/\n/).forEach(function(line){

                var prevHeight = defaultHeight;

                line.split(/\s+/).forEach(function(word){
                    div.textContent += " "+word;

                    var currentHeight = div.getBoundingClientRect().height;
                    if (currentHeight > prevHeight) {
                        resultText += "\n";
                    } else if (!skipSpace) {
                        resultText += " ";
                    }
                    resultText += word;

                    prevHeight = currentHeight;
                    skipSpace = false;
                });

                // add original new lines
                div.textContent += "\n";
                resultText += "\n";
                skipSpace = true;
                prevHeight = div.getBoundingClientRect().height;
            });

            document.body.removeChild(div);

            return {
                text: resultText.trim(),
                transform: transform
            };
        }

        function parseTransforms(node, map) {
            if (/DPVLogicalSubView$/.test(node.getAttribute("class"))) { return; }

            map.entities = map.entities || {};
            map.relations = map.relations || {};
            map.notes = map.notes || {};

            var vid = {};

            // entities and notes
            var objects = node.querySelectorAll("OView");
            for (var i=0; i<objects.length; i++) {
                var id = objects[i].getAttribute("oid");
                var bounds = objects[i].querySelector("bounds");

                var type = objects[i].getAttribute("otype");
                if (type === "Entity") {
                    map.entities[id] = {
                        x: parseInt(bounds.getAttribute("x")),
                        y: parseInt(bounds.getAttribute("y")),
                        width: parseInt(bounds.getAttribute("width")),
                        height: parseInt(bounds.getAttribute("height"))
                    };

                    vid[objects[i].getAttribute("vid")] = id;
                } else if (type === "Note") {
                    map.notes[id] = {
                        x: parseInt(bounds.getAttribute("x")),
                        y: parseInt(bounds.getAttribute("y")),
                        width: parseInt(bounds.getAttribute("width")),
                        height: parseInt(bounds.getAttribute("height"))
                    };
                }
            }

            // relations
            var connectors = node.querySelectorAll("Connector");
            for (i=0; i<connectors.length; i++) {
                var pointNodes = connectors[i].querySelectorAll("point");
                if (pointNodes.length == 0) { continue; }
                id = connectors[i].getAttribute("oid");

                // read points
                var points = [];
                for (var j=0; j<pointNodes.length; j++) {
                    var point = pointNodes[j];
                    points.push({
                        x: parseInt(point.getAttribute("x")),
                        y: parseInt(point.getAttribute("y"))
                    });
                }

                // add middle point if relation is specified only by anchors
                if (points.length == 2) {
                    points.splice(1, 0, {
                        x: (points[0].x+points[1].x)*0.5,
                        y: (points[0].y+points[1].y)*0.5
                    });
                }

                // set up transform
                var transform = [{}, {}];

                // set source points
                transform[0] = {
                    anchor: {
                        x: points[0].x,
                        y: points[0].y,
                        edge: null
                    },
                    points: [],
                    manual: true
                };
                for (var p=1; p<points.length-1; p++) {
                    transform[0].points.push({
                        x: points[p].x,
                        y: points[p].y
                    });
                }

                // set target points
                var last = points.length - 1;
                transform[1] = {
                    anchor: {
                        x: points[last].x,
                        y: points[last].y,
                        edge: null
                    },
                    points: [{
                        x: points[last-1].x,
                        y: points[last-1].y
                    }],
                    manual: true
                };

                // set anchor edges
                function computeEdge(anchor, entity) {
                    if (anchor.x < entity.x+1) {
                        return ns.Enums.Edge.LEFT;
                    } else if (anchor.x > entity.x + entity.width-1) {
                        return ns.Enums.Edge.RIGHT;
                    } else if (anchor.y < entity.y+1) {
                        return ns.Enums.Edge.TOP;
                    } else {
                        return ns.Enums.Edge.BOTTOM;
                    }
                }

                var vidSource = connectors[i].getAttribute("vid_source");
                transform[0].anchor.edge = computeEdge(transform[0].anchor, map.entities[vid[vidSource]]);

                var vidTarget = connectors[i].getAttribute("vid_target");
                transform[1].anchor.edge = computeEdge(transform[1].anchor, map.entities[vid[vidTarget]]);

                //
                map.relations[id] = transform;
            }
        }

        var zip = new JSZip();
        zip.loadAsync(zipfile)
            .then(function(contents) {
                var toPromise = [];
                var files = zip.file(/(\W|^)logical\/((entity|relation|arc|note)\/seg_0|subviews)\/.*?\.xml$/);
                for (var i=0; i<files.length; i++) {
                    toPromise.push(files[i].async("string"));
                }

                if (files.length === 0) {
                    files = zip.file(/(\W|^)logical\/.*?.model.local$/);
                    if (files.length !== 0) {
                        for (let i=0; i<files.length; i++) {
                            toPromise.push(files[i].async("string"));
                        }
                    }
                }

                Promise.all(toPromise).then(function(result){
                    var entityMap = {};
                    var parentMap = [];
                    var relationsMap = [];
                    var relationsRef = {}; // map of {relation ID} => {relationsMap index}
                    var arcMap = {};
                    var transformsMap = {};
                    var notesMap = {};
                    var notes = [];

                    let parsers = {
                        "Entity":   function(node) { parseEntity(node, entityMap, parentMap) },
                        "Relation": function(node) { parseRelation(node, relationsMap, relationsRef); },
                        "Arc":      function(node) { parseArc(node, arcMap); },
                        "Note":     function(node) {
                            let text = node.querySelector("comment").textContent;
                            let id = node.id;
                            notesMap[id] = text;
                        },
                        "Diagram":  function(node) {
                            let commentNodes = node.querySelectorAll("comment");
                            if (commentNodes.length !== 0) {
                                for (let i=0; i<commentNodes.length; ++i) {
                                    let commentNode = commentNodes[i];
                                    notesMap[commentNode.parentNode.getAttribute("oid")] = commentNode.textContent;
                                }
                            }
                            parseTransforms(node, transformsMap);
                        }
                    };

                    var parser = new DOMParser();
                    for (var i=0; i<result.length; i++) {
                        var xml = parser.parseFromString(result[i], "application/xml");

                        switch (xml.documentElement.nodeName) {
                            case "LogicalDesign": // single file format

                                let selectors = {
                                    "Entities > Entity":            "Entity",
                                    "Relationships > Relationship": "Relation",
                                    "Arcs > Arc":                   "Arc",
                                    "NoteObjects > NoteObject":     "Note",
                                    "mainView":                     "Diagram"
                                };

                                Object.entries(selectors).forEach(function(entry) {
                                    let selector = entry[0];
                                    let parser = parsers[entry[1]];

                                    let nodes = xml.querySelectorAll(selector);
                                    for (let i=0; i<nodes.length; i++) { parser(nodes[i]); }
                                });
                                break;

                            default:
                                if (parsers.hasOwnProperty(xml.documentElement.nodeName)) {
                                    parsers[xml.documentElement.nodeName](xml.documentElement);
                                }
                        }

                    }

                    // set parents
                    for(i=0; i<parentMap.length; i++) {
                        var entity = parentMap[i][0];
                        var parent = parentMap[i][1];

                        if (entityMap[entity] && entityMap[parent]) {
                            entityMap[entity].parent = entityMap[parent].name;
                        }
                    }

                    // add arc data
                    for (var arcID in arcMap) {
                        if (!arcMap.hasOwnProperty(arcID)) { continue; }
                        for (i=0; i<arcMap[arcID].length; i++) {
                            var entityID = arcMap[arcID][i][0];
                            var relationID = arcMap[arcID][i][1];
                            var relIndex = relationsRef[relationID];
                            var rel = relationsMap[relIndex];
                            if (rel[0].entity == entityID) {
                                rel[0].xor = arcID;
                            } else if (rel[1].entity == entityID) {
                                rel[1].xor = arcID;
                            }
                        }
                    }

                    // add transforms
                    for (var entID in transformsMap.entities) {
                        if (!transformsMap.entities.hasOwnProperty(entID)) { continue; }
                        if (!entityMap.hasOwnProperty(entID)) { continue; }
                        entityMap[entID].transform = transformsMap.entities[entID];
                    }

                    for (var relID in transformsMap.relations) {
                        if (!transformsMap.relations.hasOwnProperty(relID)) { continue; }
                        if (!relationsRef.hasOwnProperty(relID)) { continue; }
                        var ref = relationsRef[relID];
                        relationsMap[ref][0].transform = transformsMap.relations[relID][0];
                        relationsMap[ref][1].transform = transformsMap.relations[relID][1];
                    }

                    for (var noteID in transformsMap.notes) {
                        if (!transformsMap.notes.hasOwnProperty(noteID)) { continue; }
                        if (!notesMap.hasOwnProperty(noteID)) { continue; }
                        var note = parseNote(notesMap[noteID], transformsMap.notes[noteID]);
                        if (note.transform.height !== 1) {
                            notes.push(note);
                        }
                    }

                    // convert relations' entity ids to names
                    for(i=0; i<relationsMap.length; i++) {
                        var source = relationsMap[i][0].entity;
                        var target = relationsMap[i][1].entity;

                        relationsMap[i][0].entity = entityMap[source].name;
                        relationsMap[i][1].entity = entityMap[target].name;
                    }

                    //

                    var data = {
                        entities: toArray(entityMap),
                        relations: relationsMap,
                        notes: notes
                    };

                    try {
                        canvas.import(data);
                        canvas.ui.success("File was imported", ns.Consts.UIDefaultSuccessDuration);

                        if (resolve) { resolve(); }
                    } catch(e) {
                        canvas.ui.error("File couldn't be imported: check you are importing zip with exported SQL Developer model");
                        console.log(e);

                        if (reject) { reject(e); }
                    }
                });
            });
    };

    return self;
}());
/** src/Fullscreen.js */

DBSDM.Fullscreen = (function() {
    var self = {};

    self.lastCanvas = null;

    self.inFullscreen = function() {
        return (self.fullscreenElement() != null);
    };

    self.enabled = function() {
        if ("fullscreenEnabled" in document) { return document.fullscreeEnabled; }
        if ("webkitFullscreenEnabled" in document) { return document.webkitFullscreenEnabled; }
        if ("mozFullScreenEnabled" in document) { return document.mozFullScreenEnabled; }
        if ("msFullscreenEnabled" in document) { return document.msFullscreenEnabled; }
        return false;
    };

    self.fullscreenElement = function() {
        if ("fullscreenElement" in document) { return document.fullscreenElement; }
        if ("webkitFullscreenElement" in document) { return document.webkitFullscreenElement; }
        if ("mozFullScreenElement" in document) { return document.mozFullScreenElement; }
        if ("msFullscreenElement" in document) { return document.msFullscreenElement; }
        return null;
    };

    self.request = function(element) {
        if ("requestFullscreen" in element) { element.requestFullscreen(); }
        if ("webkitRequestFullscreen" in element) { element.webkitRequestFullscreen(); }
        if ("mozRequestFullScreen" in element) { element.mozRequestFullScreen(); }
        if ("msRequestFullscreen" in element) { element.msRequestFullscreen(); }
    };

    self.exit = function() {
        if ("exitFullscreen" in document) { document.exitFullscreen(); }
        if ("webkitExitFullscreen" in document) { document.webkitExitFullscreen(); }
        if ("mozCancelFullScreen" in document) { document.mozCancelFullScreen(); }
        if ("msExitFullscreen" in document) { document.msExitFullscreen(); }
    };

    self.toggle = function(element, canvas) {
        self.lastCanvas = canvas;
        if (self.fullscreenElement() != element) {
            self.request(element);
        } else {
            self.exit();
        }
    };

    self.setEvents = function(onchange, onerror) {
        if ("onfullscreenchange" in document) {
            if (onchange) { document.onfullscreenchange = onchange; }
            if (onerror)  { document.onfullscreenerror  = onerror; }
        }
        if ("onwebkitfullscreenchange" in document) {
            if (onchange) { document.onwebkitfullscreenchange = onchange; }
            if (onerror)  { document.onwebkitfullscreenerror  = onerror; }
        }
        if ("onmozfullscreenchange" in document) {
            if (onchange) { document.onmozfullscreenchange = onchange; }
            if (onerror)  { document.onmozfullscreenerror  = onerror; }
        }
        if ("onmsfullscreenchange" in document) {
            if (onchange) { document.onmsfullscreenchange = onchange; }
            if (onerror)  { document.onmsfullscreenerror  = onerror; }
        }
    };

    return self;
}());
/** src/Geometry.js */

DBSDM.Geometry = (function() {
    var self = {};

    self.pointToPointDistance = function(A, B) {
        var x = B.x - A.x;
        var y = B.y - A.y;
        return Math.sqrt(x*x + y*y);
    };
    self.pointToPointSquareDistance = function(A, B) {
        var x = B.x - A.x;
        var y = B.y - A.y;
        return x*x + y*y;
    };

    self.pointToLineDistance = function(p, P1, P2) {
        var a = (P2.y - P1.y);
        var b = (P2.x - P1.x);
        var c = P2.x*P1.y - P2.y*P1.x;

        var y = P2.y - P1.y;
        var x = P2.x - P1.x;

        return Math.abs(a*p.x - b*p.y + c) / Math.sqrt(y*y + x*x);
    };

    self.isBetween = function(x, a, b, offset) {
        if (b < a) {
            return b-offset <= x && x <= a+offset;
        } else {
            return a-offset <= x && x <= b+offset;
        }
    };

    self.pointIsInBox = function(P, A, B, offset) {
        return self.isBetween(P.x, A.x, B.x, offset) &&
            self.isBetween(P.y, A.y, B.y, offset);
    };

    /**
     * Snap @coor to @snapA or @snapB, if inside @limit
     */
    self.snap = function(coor, snapA, snapB, limit) {
        snapB = snapB || snapA;
        var dA = Math.abs(coor - snapA);
        var dB = Math.abs(coor - snapB);

        if (dA < dB) {
            if (dA < limit) {
                return snapA;
            }
        } else {
            if (dB < limit) {
                return snapB;
            }
        }
        return coor;
    };

    self.triangleSides = function(A, B, C) {
        return [
            self.pointToPointDistance(B, C),
            self.pointToPointDistance(A, C),
            self.pointToPointDistance(A, B)
        ].sort(function(a, b) {
            return a - b;
        });
    };

    self.triangleIsRight = function(A, B, C) {
        var t = self.triangleSides(A, B, C);
        var a = t[0], b = t[1], c = t[2];
        return a*a + b*b == c*c;
    };

    self.triangleIsAcute = function(A, B, C) {
        var t = self.triangleSides(A, B, C);
        var a = t[0], b = t[1], c = t[2];
        return a*a + b*b > c*c;
    };

    self.triangleIsObtuse = function(A, B, C) {
        var t = self.triangleSides(A, B, C);
        var a = t[0], b = t[1], c = t[2];
        return a*a + b*b < c*c;
    };

    return self;
}());
/** src/Hash.js */

/**
 * Algorithm source http://stackoverflow.com/a/7616484/4705537
 */
DBSDM.Hash = (function(){
    var self = {};

    self.string = function(str) {
        var hash = 0, i, chr, len;
        if (str.length === 0) return hash;
        for (i = 0, len = str.length; i < len; i++) {
            chr   = str.charCodeAt(i);
            hash  = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash >>> 0; // unsigned
    };

    self.object = function(obj) {
        return self.string(JSON.stringify(obj));
    };

    return self;
})();/** src/History.js */

/**
 * Canvas controller
 * Creates and handles canvas which is used to manipulate other elements
 */
DBSDM.History = (function() {
    var ns = DBSDM;

    function History() {
        this._undolog = [];
        this._redolog = [];
        this._last = null;
        this._transaction = [];
        this._level = 0;

        this._canRecord = true;
        this._paused = false;
    }

    History.prototype.clear = function () {
        this._undolog = [];
        this._redolog = [];
        this._last = null;
        this._transaction = [];
        this._level = 0;
    };

    // recording control

    History.prototype.pause = function() {
        this._paused = true;
    };

    History.prototype.resume = function() {
        this._paused = false;
    };

    // transaction control

    History.prototype.begin = function() {
        if (!this._canRecord || this._paused) { return; }

        if (this._level++ == 0) {
            this._transaction = [];
        }
    };
    History.prototype.commit = function() {
        if (!this._canRecord || this._paused) { return; }
        if (--this._level == 0) {
            this._undolog.push([null, this._transaction]);
            this._redolog = [];
            this._transaction = [];
        }
    };

    // recording

    History.prototype.record = function(context, name, from, to, stackable) {
        if (!this._canRecord || this._paused) { return; }
        stackable = (typeof stackable === "undefined" || stackable);

        if (stackable && this._last && this._last[0] === context && this._last[1] === name) {
            this._last[3] = to; // stack changes
        } else {
            this._last = [context, name, from, to];
            if (this._level > 0) {
                this._transaction.push(this._last);
            } else {
                this._undolog.push(this._last);
                this._redolog = [];
            }
        }
    };

    History.prototype.redo = function() {
        var entry = this._redolog.pop();
        if (!entry) { return; }

        this._undolog.push(entry);
        this._last = entry;

        this._canRecord = false;
        if (!entry[0]) {
            entry[1].forEach(function(part) {
                part[0].playback(part[1], part[2], part[3]);
            });
        } else {
            entry[0].playback(entry[1], entry[2], entry[3]);
        }
        this._canRecord = true;
    };

    History.prototype.undo = function() {
        var entry = this._undolog.pop();
        if (!entry) { return; }
        this._redolog.push(entry);
        this._last = (this._undolog.length != 0 ? this._undolog[this._undolog.length - 1] : null);

        this._canRecord = false;
        if (!entry[0]) {
            for (var i=entry[1].length-1; i>=0; i--) {
                var part = entry[1][i];
                part[0].playback(part[1], part[3], part[2]);
            }
        } else {
            entry[0].playback(entry[1], entry[3], entry[2]);
        }
        this._canRecord = true;
    };

    // state

    History.prototype.hasUndo = function () {
        return this._undolog.length !== 0;
    };

    History.prototype.hasRedo = function () {
        return this._redolog.length !== 0;
    };

    return History;
})();/** src/Layout.js */

/**
 * Diagram layout (sort) handler
 */
DBSDM.Layout = (function() {
    var ns = DBSDM;

    var iterations = 100;
    var optimal = 100;
    var attractionScale = 0.25;
    var straightenScale = 0.1;
    var repulsionScale = 25;
    var repulsionDistanceScale = 2; // of optimal length
    var applyScale = 1;
    var origin = {
        x: 10,
        y: 10
    };

    function Layout() {
        this._objects = null;
        this._relations = null;
    }

    Layout.prototype.sort = function(canvasObjects, relations) {
        this._objects = canvasObjects;
        this._relations = relations;

        applyScale = 1;

        this._fit();
        for (var i=0; i<iterations; i++) {
            this._computeRelationsStrenghts();
            this._computeObjectsRepulsions();
            this._applyForces();

            /*
            // annealing?
            if (i > iterations/2) {
                applyScale -= (1 - 0.1) / (iterations/2);
            }
            */
        }
        this._moveToOrigin();
    };

    Layout.prototype._fit = function() {
        var count = this._objects.length;
        for (var i=0; i<count; i++) {
            this._objects[i].fitToContents();
        }
    };

    Layout.prototype._computeRelationsStrenghts = function() {
        var relations = this._relations;
        var count = relations.length;
        for (var i=0; i<count; i++) {
            var force = relations[i].getVector();
            var rot = (Math.abs(force.x) < Math.abs(force.y) ? new ns.Geometry.Vector(force.x, 0) : new ns.Geometry.Vector(0, force.y));

            var length = force.getManhattan();
            if (length == 0) { continue; }

            // attraction
            force.multiply(0.5 * attractionScale*(length - optimal) / length); // only count half of vector, since it's applied to both sides
            relations[i].addForceToEntities(force);

            // straighten
            rot.multiply(-0.5 * straightenScale*(rot.getManhattan()-optimal) / length); // scale also by length, should prefer shorter leg for straightening
            relations[i].addForceToEntities(rot);
        }
    };

    Layout.prototype._computeObjectsRepulsions = function() {
        var objects = this._objects;
        var count = objects.length;
        for (var i=0; i<count; i++) {
            if (objects[i].hasParent && objects[i].hasParent()) { continue; }
            var centerA = objects[i].getCenter();

            for (var j=i+1; j<count; j++) {
                if (objects[j].hasParent && objects[j].hasParent()) { continue; }

                var centerB = objects[j].getCenter();
                var length = ns.Geometry.pointToPointDistance(centerA, centerB);
                if (length > optimal*repulsionDistanceScale) { continue; }

                var force = (new ns.Geometry.Vector()).fromPoints(centerA, centerB) // create new vector
                    .multiply(repulsionScale*optimal / (length*length));

                // add repulsive forces to entities
                objects[i].addForce(force.getOpposite());
                objects[j].addForce(force);
            }
        }
    };

    Layout.prototype._applyForces = function() {
        for (var i=0; i<this._objects.length; i++) {
            this._objects[i].applyForce(applyScale);
        }
    };

    Layout.prototype._moveToOrigin = function() {
        var objects = this._objects;
        var edges = objects[0].getEdges();
        var local = {
            x: edges.left,
            y: edges.top
        };
        var count = objects.length;
        for (var i=1; i<count; i++) {
            edges = objects[i].getEdges();
            if (edges.left < local.x) { local.x = edges.left; }
            if (edges.top  < local.y) { local.y = edges.top;  }
        }

        var vector = (new ns.Geometry.Vector()).fromPoints(local, origin);
        for (i=0; i<count; i++) {
            objects[i].addForce(vector);
            objects[i].applyForce(1);
        }
    };

    return Layout;
})();
/** src/MenuController.js */

DBSDM.Menu = (function(){
    var ns = DBSDM;
    var self = {};

    self._loadLocalStorage = function() {
        if (!ns.Diagram.allowRecent) {
            return "";
        }

        var prefix = ns.Consts.LocalStoragePrefix;

        var local = [];
        for (var i=0; i<localStorage.length; i++) {
            var key = localStorage.key(i);
            if ((new RegExp("^"+prefix)).test(key)) {
                local.push(localStorage.key(i));
            }
        }
        local.sort().reverse();

        var result = [];
        for (i=0; i<Math.min(local.length, 10); i++) {
            result.push([local[i].substring(prefix.length), "local#"+local[i], null, "allowRecent"])
        }

        result.push(["Clear local storage", "clear-local", "trash-o", "allowRecent"]);
        return result;
    };

    /**
     * Menu is defined in sections, each section can be independently hidden or shown, based on when user invokes menu
     * Each section has a name, which also servers for attaching menu handlers.
     *
     * Menu definition itself is a array of arrays, where each menu item is array of 2 or 3 elements:
     * [string] title:   What user sees
     * [string|submenu]: Either string, which is attribute to attach menu handler and tells what item was clicked
     *                   or submenu definition, which is array of arrays exactly like section itself
     *                   (basically section without name)
     * [string] icon:    Name of icon used from FontAwesome set, without fa- prefix. Can be null or omitted if no icon
     * [string] access:  Access right of Diagram needed to allow this operation, e.g. "allowFile" or "allowEdit".
     *                   Can be null or omitted if no special rights are required.
     *                   If parent menu have access right, it applies to all items in submenu
     */
    var definition = {
        attribute: [
            ["Primary", "primary", "key", "allowEdit"],
            ["Unique", "unique", ["check-square-o", "square-o"], "allowEdit"],
            ["Nullable", "nullable", ["check-square-o", "square-o"], "allowEdit"],
            ["Delete Attribute", "delete", "ban", "allowEdit"]
        ],

        entity: [
            ["Add Attribute", "attr", "list", "allowEdit"],
            [
                "Add Relation",
                [
                    ["N:M", "rel-nm"],
                    ["N:1", "rel-n1"],
                    ["1:N", "rel-1n"],
                    ["1:1", "rel-11"]
                ],
                "link", "allowEdit"
            ],
            ["Is a...", "isa", null, "allowEdit"],
            ["Fit to contents", "fit"],
            [
                "Order",
                [
                    ["Send to Front", "tofront", "level-up"],
                    ["Send to Back", "toback", "level-down"]
                ]
            ],
            ["Delete Entity", "delete", "ban", "allowEdit"]
        ],

        note: [
            ["Fit to contents", "fit"],
            [
                "Order",
                [
                    ["Send to Front", "tofront", "level-up"],
                        ["Send to Back", "toback", "level-down"]
                ]
            ],
            ["Delete Note", "delete", "ban", "allowEdit"]
        ],

        relationMiddle: [
            ["Reset point", "reset", "refresh"]
        ],
        relationCP: [
            ["Remove point", "cp-delete"]
        ],
        relationLeg: [
            [
                "Cardinality",
                [
                    ["One", "one", ["check-circle", "circle"]],
                    ["Many", "many", ["check-circle", "circle"]]
                ],
                null, "allowEdit"
            ],
            ["Identifying", "identifying", ["check-square-o", "square-o"], "allowEdit"],
            ["Required", "required", ["check-square-o", "square-o"], "allowEdit"],
            ["XOR with...", "xor", null, "allowEdit"],
            ["Remove from XOR", "remove-xor", null, "allowEdit"],
            ["Toggle Name", "name", ["check-square-o", "square-o"]]
        ],
        relation: [
            [
                "Swap",
                [
                    ["All", "swap"],
                    ["Cardinality", "swap-card"],
                    ["Identifying", "swap-ident"],
                    ["Required", "swap-req"]
                ],
                "exchange"
            ],
            ["Straighten", "straighten", "compress"],
            [
                "Order",
                [
                    ["Send to Front", "tofront", "level-up"],
                    ["Send to Back", "toback", "level-down"]
                ]
            ],
            ["Delete Relation", "delete", "ban", "allowEdit"]
        ],

        canvas: [
            ["New...", [
                ["Entity", "new-entity", "list-alt"],
                ["Note", "new-note", "sticky-note-o"]
            ], "plus", "allowEdit"],
            ["Show...", [
                ["Relation names", "toggle-rel-names", ["check-square-o", "square-o"]],
                ["Notes", "toggle-notes", ["check-square-o", "square-o"]]
            ], "eye"],
            ["Snap to grid", "snap", "th"],
            ["Zoom", [
                ["In", "zoom-in", "search-plus"],
                ["Reset", "zoom-reset", "search"],
                ["Out", "zoom-out", "search-minus"]
            ], "search"],
            ["Reset view", "reset-view", "arrows-alt"],
            ["Fullscreen", "fullscreen", "desktop"],
            ["Undo", "undo", "undo"],
            ["Redo", "redo", "repeat"],
            ["Save as...", [
                ["Model (JSON)", "save-model", "file-text-o", "allowFile"],
                ["Data (JSON)", "save-data", "file-code-o", "allowFile"],
                ["Image (PNG)", "save-image", "file-image-o", "allowFile"]
            ], "floppy-o", "allowFile"],
            ["Recent...", self._loadLocalStorage, "folder-open-o", "allowRecent"],
            ["Clear", "clear", "eraser", "allowEdit"]
        ]
    };

    self._dom = null;
    self._handlers = null;
    self._params = null;

    self.build = function() {
        // remove menu if already exists
        if (self._dom && self._dom.menu) {
            self._dom.menu.remove();
        }

        // reset state
        self._dom = {
            menu: null,
            sections: {}
        };
        self._handlers = {
            attached: {},
            active: {}
        };
        self._params = {};

        function createIconElement(icon) {
            var dom = document.createElement("i");

            if (typeof icon == "object") {
                dom.className = "fa fa-" + icon[0];
                dom.dataset.on = "fa-"+icon[0];
                dom.dataset.off = "fa-"+icon[1];
            } else {
                dom.className = "fa fa-" + icon;
            }
            return dom;
        }

        function createIcon(icon) {
            var dom = document.createElement("div");
            dom.className = "icon";

            if (icon) {
                dom.appendChild(createIconElement(icon));
            } else {
                dom.innerHTML = "&nbsp;";
            }
            return dom;
        }

        function createMenu(menu, parentEnabled) {
            var dom = document.createElement("ul");
            for (var i in menu) {
                if (!menu.hasOwnProperty(i)) { continue; }

                var title = menu[i][0];
                var options = menu[i][1]; // options or action
                var icon = menu[i][2] || null;
                var enabled = (menu[i][3] ? self.checkPermission(menu[i][3]) : parentEnabled);

                if ((typeof options) == "function") {
                    options = options();
                }

                //
                var itemDom = document.createElement("li");
                if ((typeof options == "object")) {
                    itemDom.appendChild(createIconElement("caret-right"));
                    itemDom.appendChild(createMenu(options, enabled));
                } else {
                    itemDom.dataset.action = options;
                }
                if (!enabled) {
                    itemDom.classList.add("disabled");
                }
                itemDom.appendChild(createIcon(icon));
                itemDom.appendChild(document.createTextNode(title));

                dom.appendChild(itemDom);
            }
            return dom;
        }

        var dom = document.createElement("div");
        dom.id = "dbsdmContextMenu";

        for (var section in definition) {
            if (!definition.hasOwnProperty(section)) { continue; }
            var sectionDom = createMenu(definition[section], true);
            sectionDom.dataset.handler = section;
            dom.appendChild(sectionDom);

            this._dom.sections[section] = sectionDom;
        }

        document.body.appendChild(dom);
        this._dom.menu = dom;

        dom.onmousedown = function(e) { e.stopPropagation(); };
        dom.onclick = function(e) { DBSDM.Menu.onClick(e) };

        // turn off unavailable menu options
        if (!ns.Fullscreen.enabled()) {
            dom.querySelector("li[data-action=fullscreen]").classList.add("disabled");
        }
    };

    self.checkPermission = function(permission) {
        return ns.Diagram[permission];
    };

    self._updateMenuState = function(section) {
        var handler = this._handlers.active[section];

        if (handler.getMenuState) {
            var dom = this._dom.sections[section];
            var state = handler.getMenuState();

            for (var key in state) {
                if (!state.hasOwnProperty(key)) { return; }

                var li = dom.querySelector("li[data-action="+key+"]");
                if (li) {
                    var icon = li.querySelector("i.fa");
                    if (icon && icon.dataset.on && icon.dataset.off) {
                        icon.classList.remove(icon.dataset.off);
                        icon.classList.remove(icon.dataset.on);

                        if (state[key]) {
                            icon.classList.add(icon.dataset.on);
                        } else {
                            icon.classList.add(icon.dataset.off);
                        }
                    } else {
                        if (state[key]) {
                            li.classList.remove("disabled");
                        } else {
                            li.classList.add("disabled");
                        }
                    }
                }
            }
        }
    };

    /**
     * Attach object handler for part of menu, which will be also displayed
     * */
    self.attach = function(handler, section, params) {
        if (!this._dom.sections.hasOwnProperty(section) || this._handlers.attached.hasOwnProperty(section)) { return; }
        this._handlers.attached[section] = handler;
        this._dom.sections[section].style.display = "none";
        this._params[section] = params || null;
    };

    self.hasAttachedHandlers = function() {
        return Object.keys(this._handlers.attached).length != 0;
    };

    self.show = function(e) {
        if (!this.hasAttachedHandlers()) { // check, whether new handlers were attached since last show
            this.hide();
            return;
        }
        this._handlers.active = {};
        Object.assign(this._handlers.active, this._handlers.attached);
        this._handlers.attached = {};

        var show = false;
        for (var section in this._dom.sections) {
            if (this._dom.sections.hasOwnProperty(section) && this._handlers.active.hasOwnProperty(section)) {
                this._dom.sections[section].style.display = "block";
                show = true;

                this._updateMenuState(section);
            } else {
                this._dom.sections[section].style.display = "none";
            }
        }
        if (!show) {
            this.hide();
            return;
        }

        var doc = document.documentElement;
        var left = e.clientX;
        var top =  e.clientY;

        if (!ns.Fullscreen.inFullscreen()) {
            left += (window.pageXOffset || doc.scrollLeft) - (doc.clientLeft || 0);
            top += (window.pageYOffset || doc.scrollTop)  - (doc.clientTop || 0);
        }

        this._dom.menu.style.left = left+"px";
        this._dom.menu.style.top = top+"px";
        this._dom.menu.style.display = "block";

        e.preventDefault();

        // attach to container of current canvas, for fullscreen
        var parent = e.target.parentNode;
        while(parent && !parent.classList.contains("dbsdmCanvas")) {
            parent = parent.parentNode;
        }
        if (parent.classList.contains("fullscreen")) {
            parent.appendChild(this._dom.menu);
        }
    };

    self.hide = function() {
        this._dom.menu.style.display = "none";
        if (this._dom.menu.parentNode != document.body) {
            document.body.appendChild(this._dom.menu);
        }
    };

    /** Event Handlers */
    self.onClick = function(e) {
        var node = e.target;

        var action;
        while (node && node.dataset && !(action = node.dataset.action)) {
            node = node.parentNode;
        }
        if (!action || node.classList.contains("disabled")) { return; }

        var handler;
        while (node && node.dataset && !(handler = node.dataset.handler)) {
            node = node.parentNode;
        }
        if (handler && this._handlers.active[handler] && this._handlers.active[handler].handleMenu) {
            this._handlers.active[handler].handleMenu(action, this._params[handler]);
            this.hide();
        }
    };

    return self;
}());
/** src/Mouse.js */

/**
 * Mouse controller
 * Attached to given canvas, handles current mouse position and fires event to attached objects
 * Object is attached either on mouse down event, or programatically.
 */
DBSDM.Mouse = (function(){
    var ns = DBSDM;

    // double click handling
    var timer = 0;
    var first = {x: 0, y: 0};

    function Mouse(canvas) {
        this._canvas = canvas;
        this._node = canvas.svg; // dom element coordinates are related to

        this._targetObject = null; // object at which the event was fired
        this._attachedObject = null;
        this._params = {};

        this._down = false;
        this._move = false;

        this.button = null;

        // current coordinates
        this.x = 0;
        this.y = 0;

        // point of Mouse down (origin)
        this.ox = 0;
        this.oy = 0;

        // offset from origin
        this.dx = 0;
        this.dy = 0;

        // offset from last update
        this.rx = 0;
        this.ry = 0;
    }

    Mouse.prototype.attachObject = function(object, params) {
        this._attachedObject = object;
        this._params = params || {};
    };

    Mouse.prototype.detachObject = function() {
        this._attachedObject = null;
        this._params = {};
    };

    Mouse.prototype.getParams = function() {
        return this._params;
    };

    Mouse.prototype.setParam = function(name, value) {
        this._params[name] = value;
    };

    Mouse.prototype.getTarget = function() {
        return this._targetObject;
    };

    /**
     * Set current coordinates from mouse event
     */
    Mouse.prototype.update = function(e) {
        var offset = this._node.getBoundingClientRect();
        this.x = (e.clientX - offset.left) / this._canvas._zoom;
        this.y = (e.clientY - offset.top) / this._canvas._zoom;

        if (this.button != 1) {
            this.x += this._canvas._offset.x;
            this.y += this._canvas._offset.y;

            if (this._canvas.snap) {
                var gs = ns.Consts.CanvasGridSize;
                this.x = Math.ceil(this.x/gs)*gs;
                this.y = Math.ceil(this.y/gs)*gs;
            }
        }
    };

    Mouse.prototype.isDown = function() {
        return this._down;
    };

    Mouse.prototype.didMove = function() {
        return this._move;
    };

    Mouse.prototype.down = function(e, object, params) {
        ns.Diagram.lastCanvas = this._canvas;

        this._targetObject = object;

        if (this._canvas.ui.shown() && !this._canvas.ui.inTutorial) {
            this._canvas.ui.hideMessage();
        }

        e.stopPropagation();
        if (this._attachedObject) { return; }
        if (e.button == 1) {
            object = this._canvas;
            params = null;
            e.preventDefault();
        } else if (e.button != 0) {
            return;
        }
        this.button = e.button;

        DBSDM.Menu.hide(); // hide menu

        this.attachObject(object, params);
        if (!this._attachedObject) {
            return;
        }
        this._down = true;
        this.update(e);

        this.ox = this.x;
        this.oy = this.y;
        this.dx = 0;
        this.dy = 0;
        this.rx = 0;
        this.ry = 0;

        if (this._attachedObject.onMouseDown) {
            this._attachedObject.onMouseDown(e, this);
        }
    };

    Mouse.prototype.move = function(e) {
        e.stopPropagation();
        if (!this._attachedObject) { return; }
        var x = this.x;
        var y = this.y;

        this.update(e);

        this._move = this._move || this.rx != 0 || this.ry != 0;
        this.dx = this.x - this.ox;
        this.dy = this.y - this.oy;

        this.rx = this.x - x;
        this.ry = this.y - y;

        if (this._attachedObject.onMouseMove) {
            this._attachedObject.onMouseMove(e, this);
        }
    };

    Mouse.prototype.up = function(e) {
        e.stopPropagation();
        if (!this._attachedObject) { return; }

        this.update(e);

        if (this._attachedObject.onMouseUp) {
            this._attachedObject.onMouseUp(e, this);
        }

        if (this._attachedObject.onMouseDblClick) {
            if (this.button == 0) {
                if (first.x == this.x && first.y == this.y && Date.now() - timer < ns.Consts.DoubleClickInterval) {
                    timer = 0;
                    this._attachedObject.onMouseDblClick(e, this);
                } else {
                    timer = Date.now();
                    first.x = this.x;
                    first.y = this.y;
                }
            } else {
                timer = 0;
            }
        }

        this.detachObject();

        this._down = false;
        this._move = false;

        this.button = null;
    };


    Mouse.prototype.enter = function(e, object) {
        this._targetObject = object;

        e.stopPropagation();
        if (e.button != 0 || this._attachedObject) { return; }

        if (this._attachedObject && this._attachedObject.onMouseEnter) {
            this._attachedObject.onMouseEnter(e, this);
        }
    };

    Mouse.prototype.leave = function(e) {
        this._targetObject = null;

        e.stopPropagation();
        if (e.button != 0 || this._attachedObject) { return; }

        if (this._attachedObject && this._attachedObject.onMouseLeave) {
            this._attachedObject.onMouseLeave(e, this);
        }
    };

    return Mouse;
})();/** src/Random.js */

DBSDM.Random = {
    string: function(length) {
        var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        var str = "";
        for (var i=0; i<length; i++) {
            str += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return str;
    },

    id: function(length) {
        var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
        var str = chars.charAt(Math.floor(Math.random() * chars.length));
        str += DBSDM.Random.string(length - 1);
        return str;
    }
};/** src/UI.js */

/**
 * General UI controller
 */
// TODO refactor to three separate classes for messages, zoom and information window control?
DBSDM.UI = (function() {
    var ns = DBSDM;

    var tutorial = {
        Entity: "Start by <strong>drawing</strong> an entity or <strong>dragging</strong> an exported JSON or SQL Developer zip file into canvas",
        Select: "<strong>Click</strong> on <i>Entity</i> to select it",
        Menu: "<strong>Right click</strong> on <i>any element</i> of the canvas to get more options",
        Scroll: "Click and drag <strong>middle mouse button</strong> to move the layout"
    };

    function UI(container, canvas) {
        this._canvas = canvas;

        this._ui = document.createElement("div");
        this._ui.className = "ui";

        this._message = this._ui.appendChild(this._createMessage());

        this._zoom = null;
        this._help = null;

        var ledge = document.createElement("div");
        ledge.className = "ledge";

        if (ns.Diagram.allowCorrectMode) {
            this._cCommentSwitch = ledge.appendChild(this._createCorrectionCommentSwitch());
            this._cModeSwitch = ledge.appendChild(this._createCorrectionModeSwitch());
        }

        ledge.appendChild(this._createHistoryControls());
        ledge.appendChild(this._createZoomControls());
        this._helpSwitch = ledge.appendChild(this._createHelp());

        this._ui.appendChild(ledge);
        container.appendChild(this._ui);

        this._shown = false;
        this._timer = false;

        // setup tutorial
        this._tutorialCurrent = null;
        if (ns.Diagram.showTutorial) {
            this.inTutorial = true;
            this._tutorialLeft = ["Entity", "Menu", "Select", "Scroll"]
        } else {
            this.inTutorial = false;
            this._tutorialLeft = [];
        }

        // events
        var that = this;
        this._message.addEventListener("click", function(e) { that.hideMessage(); });
    }

    UI.prototype._createMessage = function() {
        var message = document.createElement("div");
        message.className = "message";
        message.style.transitionDuration = ns.Consts.UIMessageTransition+"s";
        return message;
    };

    UI.prototype._createZoomControls = function() {
        var zoom = document.createElement("div");
        zoom.className = "zoom";

        var canvas = this._canvas;
        var a;

        // zoom in
        a = document.createElement("a");
        a.innerHTML = "<i class='fa fa-search-plus'></i>";
        a.addEventListener("click", function() { canvas.zoomIn(); });
        zoom.appendChild(a);

        // reset
        a = document.createElement("a");
        a.className = "reset";
        a.innerHTML = "100%";
        a.addEventListener("click", function() { canvas.zoomReset(); });
        this._zoom = a;
        zoom.appendChild(a);

        // zoom out
        a = document.createElement("a");
        a.innerHTML = "<i class='fa fa-search-minus'></i>";
        a.addEventListener("click", function() { canvas.zoomOut(); });
        zoom.appendChild(a);

        return zoom; // return last reset, need to update it on zoom
    };

    UI.prototype._createHelp = function() {
        var a = document.createElement("a");
        a.className = "uiIcon";
        a.innerHTML = "<i class='fa fa-info-circle'></i>";

        var that = this;
        a.addEventListener("click", function() { that.toggleHelp(); });

        return a;
    };

    UI.prototype._createCorrectionModeSwitch = function() {
        var a = document.createElement("a");
        a.className = "uiIcon";
        a.innerHTML = "<i class='fa fa-check-circle-o'></i>";

        var that = this;
        a.addEventListener("click", function() { that._toggleCorrectionMode(); });

        return a;
    };

    UI.prototype._createCorrectionCommentSwitch = function() {
        var a = document.createElement("a");
        a.className = "uiIcon";
        a.innerHTML = "<i class='fa fa-comment-o'></i>";

        var that = this;
        a.addEventListener("click", function() { that._toggleCorrectionComment(); });

        return a;
    };

    UI.prototype._createHistoryControls = function() {
        var that = this;

        var f = document.createDocumentFragment();

        // undo
        var a = document.createElement("a");
        a.className = "uiIcon";
        a.innerHTML = "<i class='fa fa-undo'></i>";
        a.title = "Undo";

        a.addEventListener("click", function() { that._canvas.History.undo();} );
        f.appendChild(a);

        // redo
        a = document.createElement("a");
        a.className = "uiIcon";
        a.innerHTML = "<i class='fa fa-repeat'></i>";
        a.title = "Redo";

        a.addEventListener("click", function() { that._canvas.History.redo();} );
        f.appendChild(a);

        return f;
    };


    // zoom
    UI.prototype.updateZoomLevels = function(zoom) {
        this._zoom.innerHTML = Math.round(zoom*100) + "%";
    };

    // tutorial

    UI.prototype.advanceTutorial = function() {
        if (!this.inTutorial) { return; }

        if (this._tutorialLeft.length == 0) {
            this.inTutorial = false;
            this._tutorialCurrent = null;
            this.hideMessage();
        } else {
            var action = this._tutorialLeft.shift();
            this._tutorialCurrent = action;
            this.hint(tutorial[action]);
        }
    };
    /**
     * In case action is made before tutorial message is shown, don't show the message again
     */
    UI.prototype.acceptTutorialAction = function(action) {
        if (!this.inTutorial) { return; }

        var index = this._tutorialLeft.lastIndexOf(action);
        if (index != -1) {
            this._tutorialLeft.splice(index, 1);
        }

        if (this._tutorialCurrent == action) {
            this.advanceTutorial();
        }
    };

    UI.prototype.hint = function(message, time, callback) {
        this._showMessage("hint", message, time, callback);
    };
    UI.prototype.error = function(message, time, callback) {
        this._showMessage("error", message, time, callback);
    };
    UI.prototype.success = function(message, time, callback) {
        this._showMessage("success", message, time, callback);
    };

    UI.prototype._showMessage = function(className, message, time, callback) {
        window.clearTimeout(this._timer);

        if (this._shown) {
            var that = this;
            this.hideMessage(function() { that._showMessage(className, message, time, callback)});
            return;
        }

        this._message.classList.remove("success");
        this._message.classList.remove("error");
        this._message.classList.remove("hint");

        var icon = "";
        switch(className) {
            case "hint":    icon = "bell"; break;
            case "error":   icon = "exclamation-triangle"; break;
            case "success": icon = "check"; break;
        }

        this._shown = true;
        this._message.classList.add(className);
        this._message.style.marginTop = 0;
        this._message.innerHTML = '<i class="fa fa-'+ icon +'"></i>'+message;
        this._timeMessage(time, callback);
    };

    UI.prototype.hideMessage = function(callback) {
        this._shown = false;
        var bounds = this._message.getBoundingClientRect();
        this._message.style.marginTop = "-" + (bounds.height+5) + "px";

        if (callback) {
            this._timer = window.setTimeout(callback, ns.Consts.UIMessageTransition*1000);
        }
    };

    UI.prototype._timeMessage = function(time, callback) {
        if (!time) { return; }
        if (!callback) {
            var that = this;
            callback = function() { that.hideMessage(); }
        }
        this._timer = window.setTimeout(callback, time*1000);
    };

    UI.prototype.shown = function() {
        return this._shown;
    };

    // help
    UI.prototype.toggleHelp = function() {
        if (this._help) {
            this._help.remove();
            this._help = null;
            this._helpSwitch.classList.remove("active");
            return;
        }
        this._helpSwitch.classList.add("active");

        var data = {
            "Basics": [
                ["Import", "Drag JSON file or zip of SQL Developer DMD onto canvas"],
                ["New entity", "Click and drag or double click"]
            ],
            "Shortcuts on selected Entity": [
                ["DEL", "Delete Entity"],
                ["a, [Dbl click]", "Add new attribute"],
                ["r", "Create new 1:N relation"],
                ["f", "Fit to contents"],
                ["i", "Initiate ISA creation"]
            ],
            "When editing Attribute": [
                ["TAB", "Select next or create new"],
                ["SHIFT + TAB", "Select previous"],
                ["[Leave empty]", "Delete attribute"]
            ]
        };

        var div = document.createElement("div");
        div.className = "help";

        var content = "";
        for (var headline in data) {
            if (!data.hasOwnProperty(headline)) { continue; }
            content += headline + "<table>";

            for (var i=0; i<data[headline].length; i++) {
                content += "<tr>"
                        + "<td>"+data[headline][i][0]+"</td>"
                        + "<td>"+data[headline][i][1]+"</td>"
                    + "</tr>";
            }

            content += "</table>";
        }
        div.innerHTML = content;

        this._help = this._ui.appendChild(div);
    };

    UI.prototype.correctionMode = function() {
        if (!ns.Diagram.allowCorrectMode) { return }
        this._canvas.inCorrectionMode = false;
        this._toggleCorrectionMode();
    };

    UI.prototype._toggleCorrectionMode = function() {
        if (!ns.Diagram.allowCorrectMode) { return }
        this._canvas.inCorrectionMode = !this._canvas.inCorrectionMode;
        if (this._canvas.inCorrectionMode) {
            this._cModeSwitch.classList.add("active");
            this._canvas.setMode("correction");

            var that = this;
            ns.Diagram.cancelAction = function() { that._toggleCorrectionMode(); }
        } else {
            this._cModeSwitch.classList.remove("active");
            this._canvas.unsetMode("correction");
            ns.Diagram.cancelAction = null;
        }
    };

    UI.prototype._toggleCorrectionComment = function() {
        if (!ns.Diagram.allowCorrectMode) { return }
        this._canvas.inCorrectionCommentMode = !this._canvas.inCorrectionCommentMode;
        if (this._canvas.inCorrectionCommentMode) {
            this._cCommentSwitch.classList.add("active");
            this._cCommentSwitch.querySelector("i").classList.add("fa-comment");
            this._cCommentSwitch.querySelector("i").classList.remove("fa-comment-o");
        } else {
            this._cCommentSwitch.classList.remove("active");
            this._cCommentSwitch.querySelector("i").classList.remove("fa-comment");
            this._cCommentSwitch.querySelector("i").classList.add("fa-comment-o");
        }
    };

    return UI;
})();
/** src/Vector.js */
DBSDM.Geometry = DBSDM.Geometry || {};

DBSDM.Geometry.Vector = (function() {
    var ns = DBSDM;

    function Vector(x, y) {
        this.x = x || 0;
        this.y = y || 0;
    }

    Vector.prototype.fromPoints = function(A, B) {
        this.x = B.x - A.x;
        this.y = B.y - A.y;
        return this;
    };

    Vector.prototype.reset = function() {
        this.x = 0;
        this.y = 0;
    };

    Vector.prototype.add = function(vector) {
        this.x += vector.x;
        this.y += vector.y;
    };

    Vector.prototype.multiply = function(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        return this;
    };

    Vector.prototype.normalize = function() {
        var len = this.getLength();
        if (len != 0) {
            this.multiply(1/len)
        }
        return this;
    };

    Vector.prototype.getLength = function() {
        return Math.sqrt(this.y*this.y + this.x*this.x);
    };

    Vector.prototype.getManhattan = function() {
        return Math.abs(this.x) + Math.abs(this.y);
    };

    Vector.prototype.getOpposite = function() {
        return new ns.Geometry.Vector(-this.x, -this.y);
    };

    return Vector;
}());
/** src/control/Attribute.js */
DBSDM.Control = DBSDM.Control ||{};

DBSDM.Control.Attribute = (function(){
    var ns = DBSDM;

    function Attribute(list, model, canvas, entityControl) {
        this._list = list;

        this._canvas = canvas;
        this._model = (model || new DBSDM.Model.Attribute());
        this._entityControl = entityControl;
        this._view = new ns.View.Attribute(this._model, this, canvas);
        this.draw();

        this._dragOffset = null;
        this._dragStartPosition = null;
        this._dragCurrentPosition = null;
    }

    Attribute.prototype.draw = function() {
        this._view.create(this, this._entityControl.getAttrContainer());
    };

    Attribute.prototype.delete = function() {
        this._list.removeAttribute(this._model, this);
        this._view.destroy();
    };

    Attribute.prototype.getPosition = function() {
        return this._list.getPosition(this._model);
    };

    Attribute.prototype.reposition = function() {
        this._view.reposition();
    };

    Attribute.prototype.getMinimalSize = function() {
        return this._view.getMinimalSize();
    };

    /** Select another attribute for edit at given index */
    Attribute.prototype.selectAt = function(index, create) {
        this._list.select(index, create);
    };

    Attribute.prototype.select = function() {
        this._view.showInput();
    };

    Attribute.prototype._markIncorrect = function() {
        this._model.incorrect = true;
        this._view.markIncorrect();
    };

    Attribute.prototype._toggleIncorrect = function() {
        this._model.incorrect = !this._model.incorrect;
        if (this._model.incorrect) {
            this._view.markIncorrect();
        } else {
            this._view.markCorrect();
        }
        this._view.updateComment();
    };

    /** Parameter toggles */

    Attribute.prototype.setName = function(name) {
        var oldName = this._model.getName();
        if (oldName != name) {
            this._model.setName(name);
            this._canvas.History.record(this, "name", oldName, name, false);
        }
    };

    Attribute.prototype._togglePrimary = function() {
        this._model.setPrimary(  !this._model.isPrimary()  );
        this._view.redrawIndex();
    };
    Attribute.prototype._toggleUnique = function() {
        this._model.setUnique(   !this._model.isUnique()   );
        this._view.redrawIndex();
    };
    Attribute.prototype._toggleNullable = function() {
        this._model.setNullable( !this._model.isNullable() );
        this._view.redrawNullable();
    };

    // Menu Handlers
    Attribute.prototype.handleMenu = function(action) {
        switch(action) {
            case "primary":
                this._togglePrimary();
                this._canvas.History.record(this, "primary", null, null, false);
                break;
            case "unique":
                this._toggleUnique();
                this._canvas.History.record(this, "unique", null, null, false);
                break;
            case "nullable":
                this._toggleNullable();
                this._canvas.History.record(this, "nullable", null, null, false);
                break;
            case "delete":
                this.delete();
                break;
        }
    };

    Attribute.prototype.getMenuState = function() {
        return {
            //primary: this._model.isPrimary(),
            unique: this._model.isUnique(),
            nullable: this._model.isNullable()
        }
    };

    // Event Handlers
    Attribute.prototype.onMouseDown = function(e, mouse) {
        if (this._canvas.inCorrectionMode) { return; }
        if (!ns.Diagram.allowEdit) { return; }
        this._dragOffset = e.clientY - this._view.getEdges().top;

        this._dragStartPosition = this._list.getPosition(this._model);
        this._dragCurrentPosition = this._dragStartPosition;

        this._view.dragStarted();
    };

    Attribute.prototype.onMouseMove = function(e, mouse) {
        if (this._canvas.inCorrectionMode) { return; }
        if (!ns.Diagram.allowEdit) { return; }
        var delta = Math.floor((mouse.dy + this._dragOffset) / 18);
        var position = this._dragStartPosition + delta;

        if (position != this._dragCurrentPosition) {
            this._dragCurrentPosition = this._list.setPosition(this._model, position);
        }
    };

    Attribute.prototype.onMouseUp = function(e, mouse) {
        if (this._canvas.inCorrectionMode) {
            if (this._canvas.inCorrectionCommentMode) {
                this._markIncorrect();
                this._model.setComment(window.prompt("Comment:", this._model.getComment()));
                this._view.updateComment();
            } else {
                this._toggleIncorrect();
            }
            return;
        }

        if (this._dragStartPosition != this._dragCurrentPosition) {
            this._canvas.History.record(this, "position", this._dragStartPosition, this._dragCurrentPosition, false);
        }

        this._view.dragEnded();
    };

    // History

    Attribute.prototype.playback = function(action, from, to) {
        switch(action) {
            case "name":
                this.setName(to);
                this._view.redrawName();
                break;
            case "position": this._list.setPosition(this._model, to); break;
            case "primary":  this._togglePrimary();  break;
            case "unique":   this._toggleUnique();   break;
            case "nullable": this._toggleNullable(); break;
        }
    };

    // Automatic correction check

    Attribute.prototype.checkAgainst = function(referenceAttributes, nameComparator) {
        var name = this._model.getName();

        // find attribute
        var i = referenceAttributes.length;
        while(--i>=0) {
            if (nameComparator(referenceAttributes[i].name, name)) {
                var ref = referenceAttributes[i];

                var correct = (ref.primary == this._model.isPrimary()
                            && ref.unique == this._model.isUnique()
                            && ref.nullable == this._model.isNullable());
                referenceAttributes.splice(i, 1);

                if (!correct) {
                    this._markIncorrect();
                    return 1;
                } else {
                    return 0;
                }
            }
        }

        /**
         * Mark not found attributes as incorrect
         */
        this._markIncorrect();
        return 1;
    };

    return Attribute;
})();
/** src/control/AttributeList.js */
DBSDM.Control = DBSDM.Control ||{};

DBSDM.Control.AttributeList = (function(){
    var ns = DBSDM;

    function AttributeList(model, canvas, entityControl) {
        this._model = model;
        this._canvas = canvas;
        this._entityControl = entityControl;

        this._controls = [];
    }

    AttributeList.prototype.createAttribute = function() {
        if (!ns.Diagram.allowEdit) { return; }
        var attrModel = new ns.Model.Attribute();
        this._model.add(attrModel);

        var control = this._createAttributeControl(attrModel);
        this._entityControl.encompassContent();
        control.select();

        this._canvas.History.record(this, "create", null, control, false);
    };

    AttributeList.prototype._createAttributeControl = function(attributeModel) {
        var control = new ns.Control.Attribute(this, attributeModel, this._canvas, this._entityControl);
        this._controls.push(control);
        return control
    };

    /** Draw current model (after import) */
    AttributeList.prototype.draw = function() {
        var list = this._model.getList();
        var count = list.length;
        for (var i=0; i<count; i++) {
            this._createAttributeControl(list[i]);
        }
    };

    AttributeList.prototype.redraw = function() {
        for (var i=0; i<this._controls.length; i++) {
            this._controls[i].draw();
        }
    };

    AttributeList.prototype.removeAttribute = function(attrModel, control) {
        this._model.remove(attrModel);

        var index = this._controls.findIndex(function(element, index, array) {
            return element == control;
        });
        this._controls.splice(index, 1);
        this._updatePositions();
        this._entityControl.computeNeededSize();

        this._canvas.History.record(this, "delete", [attrModel, control, index], null, false);
    };

    AttributeList.prototype.getPosition = function(attrModel) {
        return this._model.getPosition(attrModel);
    };

    AttributeList.prototype.setPosition = function(attrModel, position) {
        if (position < 0) {
            position = 0;
        } else if (position > this._model.getSize()) {
            position = this._model.getSize() - 1;
        }

        this._model.setPosition(attrModel, position);
        this._updatePositions();
        return position;
    };

    AttributeList.prototype.select = function(index, create) {
        create = (typeof create == "boolean" ? create : true);
        var count = this._controls.length;
        if (index < count || !create) {
            if (count != 0) {
                index = Math.max(0, Math.min(count-1, index));
                this._controls[index].select();
            }
        } else {
            this.createAttribute();
        }
    };

    AttributeList.prototype._updatePositions = function() {
        for (var i=0; i<this._controls.length; i++) {
            this._controls[i].reposition();
        }
    };

    AttributeList.prototype.getMinimalSize = function() {
        var size = {
            width: 0,
            height: 0
        };
        for (var i=0; i<this._controls.length; i++) {
            var a = this._controls[i].getMinimalSize();
            size.width = Math.max(size.width, a.width);
            size.height += a.height;
        }
        return size;
    };

    // History

    AttributeList.prototype.playback = function(action, from, to) {
        switch(action) {
            case "delete":
                if (to) {
                    var model=to[0], control=to[1], position=to[2];
                    this._model.add(model);
                    this._controls.push(control);
                    this.setPosition(model, position);
                    control.draw();
                } else {
                    from[1].delete();
                }
                break;
            case "create":
                if (to) {
                    this._model.add(to._model);
                    this._controls.push(to);
                    to.draw();
                } else {
                    from.delete();
                }
                break;
        }
    };

    // Automatic correction check

    AttributeList.prototype.checkAgainst = function(referenceAttributes, nameComparator) {
        var markedCnt = 0;
        this._controls.forEach(function(attrControl){
            markedCnt += attrControl.checkAgainst(referenceAttributes, nameComparator);
        });
        return markedCnt;
    };

    return AttributeList;
})();
/** src/control/CanvasObject.js */
DBSDM.Control = DBSDM.Control ||{};

DBSDM.Control.CanvasObject = (function(){
    var ns = DBSDM;

    CanvasObject.active = null;

    function CanvasObject(canvas, model) {
        this._canvas = canvas;
        this._model = model;
        this._view = null; // specify in subclass

        this._neededSize = {width:0,height:0}; // size needed to encompass all content with it's current size
        this._force = new ns.Geometry.Vector();

        if (CanvasObject.active) {
            CanvasObject.active.deactivate();
        }
    }

    CanvasObject.prototype.getDom = function() {
        return this._view.getDom();
    };

    CanvasObject.prototype.getEdges = function() {
        return this._model.getEdges();
    };

    CanvasObject.prototype.drag = function(mouse) {
        var delta = {
            x: mouse.rx,
            y: mouse.ry
        };
        var tr = this._model.getTransform();
        if (this._canvas.snap && (delta.x != 0 || delta.y != 0)) {
            if (delta.x != 0) { delta.x -= tr.x % ns.Consts.CanvasGridSize; }
            if (delta.y != 0) { delta.y -= tr.y % ns.Consts.CanvasGridSize; }
        }

        var initial = [tr.x, tr.y];
        this._model.translate(delta.x, delta.y);

        var final = [tr.x, tr.y];
        this._canvas.History.record(this, "drag", initial, final);
        return delta;
    };

    CanvasObject.prototype.dragControlPoint = function(mouse, cp) {
        var transform = this._model.getTransform();
        var x=null, y=null;
        var width=null, height=null;

        var cursor = {
            x: mouse.x,
            y: mouse.y
        };

        // set desired state

        if (/n/.test(cp)) {
            y = cursor.y;
            height = (transform.y - y) + transform.height;
        } else if (/s/.test(cp)) {
            height = cursor.y - transform.y;
        }

        if (/w/.test(cp)) {
            x = cursor.x;
            width = (transform.x - x) + transform.width;
        } else if (/e/.test(cp)) {
            width = cursor.x - transform.x;
        }

        // constrain width/height

        this._setConstrainedTransform(x, y, width, height);
    };

    CanvasObject.prototype.notifyDrag = function(x, y) {
        // intentionally empty
    };

    /**
     * Update position and size of element with regards to constraints
     */
    CanvasObject.prototype._setConstrainedTransform = function(x, y, width, height) {
        var transform = this._model.getTransform();

        if (width != null && width < this._neededSize.width) {
            width = this._neededSize.width;
            if (x != null) {
                x = transform.x + transform.width - this._neededSize.width;
            }
        }
        if (height != null && height < this._neededSize.height) {
            height = this._neededSize.height;
            if (y != null) {
                y = transform.y + transform.height - this._neededSize.height;
            }
        }

        var initial = [transform.x, transform.y, transform.width, transform.height];

        this._model.setPosition(x, y);
        this._model.setSize(width, height);

        var final = [transform.x, transform.y, transform.width, transform.height];
        this._canvas.History.record(this, "resize", initial, final);
    };

    CanvasObject.prototype.computeNeededSize = function() {
        var size = this._view.getMinimalSize();
        this._neededSize.width = size.width;
        this._neededSize.height = size.height;
    };

    /**
     * Resize object to its minimal size, in case its dimensions are smaller than minimal required
     * @returns boolean     Indication whether redraw happened
     */
    CanvasObject.prototype.encompassContent = function() {
        this.computeNeededSize();
        var transform = this._model.getTransform();

        var width = (transform.width < this._neededSize.width ? this._neededSize.width : null);
        var height = (transform.height < this._neededSize.height ? this._neededSize.height : null);

        if (width != null || height != null) {
            this._model.setSize(width, height);
            this._view.redraw();
            return true;
        }
        return false;
    };


    /**
     * Layout forces
     */

    CanvasObject.prototype.getCenter = function() {
        var transform = this._model.getTransform();
        return {
            x: transform.x + transform.width * 0.5,
            y: transform.y + transform.height * 0.5
        }
    };

    CanvasObject.prototype.resetForce = function() {
        this._force.reset();
    };

    CanvasObject.prototype.addForce = function(force) {
        this._force.add(force);
    };

    CanvasObject.prototype.applyForce = function(modifier) {
        if (modifier && modifier != 1) {
            this._force.multiply(modifier);
        }

        this._model.translate(this._force.x, this._force.y);
        this.notifyDrag(this._force.x, this._force.y);
        this._view.redraw();
        this.resetForce();
    };

    /**
     * Activation/Deactivation
     */

    CanvasObject.prototype.activate = function() {
        if (CanvasObject.active) {
           CanvasObject.active.deactivate();
        }
        CanvasObject.active = this;
        this._view.showControls();
    };

    CanvasObject.prototype.deactivate = function() {
        if (CanvasObject.active == this) {
            CanvasObject.active = null;
            this._view.hideControls();
        }
    };

    CanvasObject.prototype._toggleIncorrect = function() {
        this._model.incorrect = !this._model.incorrect;
        this._view.defaultMark();
        this._view.updateComment();
    };

    CanvasObject.prototype.markIncorrect = function() {
        this._model.incorrect = true;
        this._view.defaultMark();
    };

    /** Handlers */

    CanvasObject.prototype.handleMenu = function(action) {
        switch(action) {
            case "delete": this.delete(); break;
            case "fit": this.fitToContents(); break;
            case "toback":  this._view.toBack(); break;
            case "tofront": this._view.toFront(); break;
        }
    };

    CanvasObject.prototype.onMouseUp = function(e, mouse) {
        if (this._canvas.inCorrectionMode) {
            if (this._canvas.inCorrectionCommentMode) {
                this.markIncorrect();
                this._model.setComment(window.prompt("Comment:", this._model.getComment()));
                this._view.updateComment();
            } else {
                this._toggleIncorrect();
            }
            return true;
        }
        return false;
    };
    CanvasObject.prototype.onMouseDown = function(e, mouse) {
        if (this._canvas.inCorrectionMode) { return; }

        var matches = e.target.className.baseVal.match(/e-cp-(\w+)/);
        if (matches) {
            mouse.setParam("action", "cp");
            mouse.setParam("cp", matches[1]);
        }
    };

    CanvasObject.prototype.onKeyPress = function(e) {
        switch(e.keyCode) {
            case 46: this.delete(); break; // del
            case 27: this.deactivate(); break; // esc
            case 34: this._view.toBack(); e.preventDefault(); break; // pgdn
            case 33: this._view.toFront(); e.preventDefault(); break; // pgup
        }
        switch(e.key.toLowerCase()) {
            case "f": this.fitToContents(); break; // "f"
        }
    };

    /**
     * History
     */
    CanvasObject.prototype.playback = function(action, from, to) {
        switch(action) {
            case "drag":
                this.drag({rx: to[0] - from[0], ry: to[1] - from[1]});
                this._view.redraw();
                break;
            case "resize":
                this._setConstrainedTransform(to[0], to[1], to[2], to[3]);
                this._view.redraw();
                break;
        }
    };

    return CanvasObject;
})();
/** src/control/Entity.js */
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
/** src/control/Note.js */
DBSDM.Control = DBSDM.Control ||{};

DBSDM.Control.Note = (function(){
    var ns = DBSDM;

    var Super = ns.Control.CanvasObject;

    function Note(canvas, model) {
        Super.call(this, canvas, model);
        this._view = new ns.View.Note(this._canvas, this._model, this);
    }
    Note.prototype = Object.create(Super.prototype);
    Note.prototype.constructor = Note;


    Note.prototype.getDom = function() {
        return this._view.getDom();
    };

    Note.prototype.getModel = function() {
        return this._model;
    };

    /**
     * Create empty Note at mouse coordinates
     */
    Note.prototype.create = function() {
        var x = this._canvas.Mouse.x;
        var y = this._canvas.Mouse.y;
        this._model.setPosition(x, y);

        this._view.create(this);
        this._canvas.addNote(this);

        this.computeNeededSize();
        this.encompassContent();

        var final = Object.assign({}, this._model.getTransform());
        this._canvas.History.record(this, "create", null, final);
    };

    /**
     * Create entity from current model data (after import)
     */
    Note.prototype.import = function() {
        this._view.create();
        this._canvas.addNote(this);
        return this;
    };

    Note.prototype.setText = function(text) {
        var initial = Object.assign({}, this._model.getTransform());
        initial.text = this._model.getText();

        this._model.setText(text);
        this.encompassContent();

        var final = Object.assign({}, this._model.getTransform());
        final.text = text;
        this._canvas.History.record(this, "edit", initial, final);
    };

    Note.prototype.delete = function() {
        if (!ns.Diagram.allowEdit) { return; }

        var initial = Object.assign({}, this._model.getTransform());
        initial.text = this._model.getText();

        this._canvas.removeNote(this);
        this._view.remove();

        this._canvas.History.record(this, "delete", initial, null);
    };

    Note.prototype.show = function() {
        this._view.show();
    };
    Note.prototype.hide = function() {
        this._view.hide();
    };

    Note.prototype.fitToContents = function() {
        var initial = Object.assign({}, this._model.getTransform());

        var size = this._view.getMinimalSize();
        this._model.setSize(size.width, size.height);
        this._view.redraw();

        var final = Object.assign({}, this._model.getTransform());
        this._canvas.History.record(this, "fit", initial, final);
        return this;
    };

    // Menu Handlers
    Note.prototype.handleMenu = function(action) {
        Super.prototype.handleMenu.call(this, action);
    };

    // Event Handlers

    Note.prototype.onMouseMove = function(e, mouse) {
        if (this._canvas.inCorrectionMode) { return; }

        if (mouse.isDown()) {
            var params = mouse.getParams();
            if (params.action == "cp") {
                this.dragControlPoint(mouse, params.cp);
            } else {
                this.drag(mouse);
            }
            this._view.redraw();
        }
    };

    Note.prototype.onMouseUp = function(e, mouse) {
        if (Super.prototype.onMouseUp.call(this, e, mouse)) {
            return;
        }

        if (!mouse.didMove()) {
            this.activate();
        }
    };

    Note.prototype.onMouseDblClick = function(e, mouse) {
        if (this._canvas.isInMode("correction") || this._canvas.isInMode("isa")) { return; }
        this._view.edit();
    };

    Note.prototype.onKeyPress = function(e) {
        if (this._canvas.inCorrectionMode) { return; }
        if (ns.View.EditableContent.shown) { return; }
        Super.prototype.onKeyPress.call(this, e);
    };

    // History

    Note.prototype.playback = function(action, from, to) {
        switch(action) {
            case "create":
            case "delete":
                if (to == null) {
                    this.delete();
                } else {
                    this._model.setPosition(to.x, to.y);
                    this._model.setSize(to.width, to.height);

                    if (to.text) {
                        this._model.setText(to.text);
                    }

                    this._view.create();
                    this._canvas.addNote(this);
                }
                break;

            case "fit":
            case "edit":
                this._model.setPosition(to.x, to.y);
                this._model.setSize(to.width, to.height);
                this._view.redraw();

                if (to.text) {
                    this._model.setText(to.text);
                    this._view._text.redraw();
                }
                break;

            default:
                Super.prototype.playback.call(this, action, from, to);
        }
    };

    return Note;
})();
/** src/control/Relation.js */
DBSDM.Control = DBSDM.Control ||{};

DBSDM.Control.Relation = (function() {
    var ns = DBSDM;
    var Enum = ns.Enums;

    var RecursiveEntityOffset = 20; // visual offset from anchor for the first control point

    function Relation(canvas, sourceEntityControl, targetEntityControl, sourceCardinality, targetCardinality, model) {
        this._canvas = canvas;

        this._sourceEntity = sourceEntityControl;
        this._targetEntity = targetEntityControl || null;

        this._new = true;

        // model
        var source, target;
        if (!model) {
            source = new ns.Model.RelationLeg(false, true, sourceCardinality);
            target = new ns.Model.RelationLeg(true, false, targetCardinality);
            this._model = new ns.Model.Relation(source, target);
        } else {
            this._model = model;
            source = this._model.getSource();
            target = this._model.getTarget();
        }

        // legs control
        this._legs = {
            source: new ns.Control.RelationLeg(this, canvas, source),
            target: new ns.Control.RelationLeg(this, canvas, target)
        };

        // view
        this._view = new ns.View.Relation(this._canvas, this._model, this);
        this._view.draw(
            this._legs.source.getDom(),
            this._legs.target.getDom()
        );

        this._canvas.History.record(this, "create", false, true);
    }

    /**
     * Finish creation of relation by connecting with entities and saving relation
     */
    Relation.prototype._setupEntities = function() {
        this._new = false;

        this._sourceEntity.addRelationLeg(this._legs.source);
        this._legs.source.setEntityControl(this._sourceEntity);

        this._targetEntity.addRelationLeg(this._legs.target);
        this._legs.target.setEntityControl(this._targetEntity);

        this._canvas.addRelation(this);
        this._model.middleManual = (this._sourceEntity == this._targetEntity);
    };

    Relation.prototype.import = function(manageRelations) {
        this._setupEntities();
        if (manageRelations) {
            this._moveToEntity();
        }
        this.redraw();
    };

    Relation.prototype.cancel = function() {
        if (!this._new) { return; }
        this._new = false;
        this._view.clear();
        this._canvas.Mouse.detachObject();
    };

    //

    Relation.prototype.getCanvas = function() {
        return this._canvas;
    };

    Relation.prototype.getModel = function() {
        return this._model;
    };

    Relation.prototype.redraw = function() {
        this._legs.source.redraw();
        this._legs.target.redraw();
        this._view.redraw();
    };

    Relation.prototype.redrawType = function() {
        this._legs.source.redrawType();
        this._legs.target.redrawType();
    };

    Relation.prototype.clear = function() {
        this._sourceEntity.removeRelationLeg(this._legs.source);
        this._targetEntity.removeRelationLeg(this._legs.target);
        this._view.clear();
        this._canvas.removeRelation(this);

        this._canvas.History.record(this, "clear", true, false);
    };
    Relation.prototype.undoClear = function() {
        this._legs.source.draw();
        this._legs.target.draw();

        this._view.draw(
            this._legs.source.getDom(),
            this._legs.target.getDom()
        );

        this._setupEntities();
        this.redraw();
        this.redrawType();
    };

    Relation.prototype.straighten = function() {
        this._model.straighten();
    };

    Relation.prototype.translate = function(dx, dy) {
        this._legs.source.translate(dx, dy);
        this._legs.target.translate(dx, dy);
        this._model.translateMiddlePoint(dx, dy);
        this.redraw();
    };

    Relation.prototype.isRecursive = function() {
        return this._sourceEntity == this._targetEntity;
    };

    // middle point

    Relation.prototype._moveMiddle = function(pos) {
        var s = this._legs.source._model.getPoint(-2);
        var t = this._legs.target._model.getPoint(-2);

        var x = ns.Geometry.snap(pos.x, s.x, t.x, ns.Consts.SnappingLimit);
        var y = ns.Geometry.snap(pos.y, s.y, t.y, ns.Consts.SnappingLimit);

        var initial = Object.assign({manual: this._model.middleManual}, this._model.getMiddlePoint());

        this._model.setMiddlePointPosition(x, y);
        this._model.middleManual = true;

        this._canvas.History.record(this, "middle", initial, {x: x, y: y, manual: true});
    };

    Relation.prototype.centerMiddlePoint = function() {
        if (!this._model.middleManual) {
            this._model.resetMiddlePoint();
        }
        this.redraw();
    };

    // creation

    Relation.prototype._moveToCursor = function(x, y) {
        var cursor = {x: x, y: y};

        // get possible edges
        var edges = this._sourceEntity.getEdges();
        var center = {
            x: (edges.left + edges.right)*0.5,
            y: (edges.top + edges.bottom)*0.5
        };

        var edgeLR, posLR, lenLR;
        if (x < edges.left || x > edges.right) {
            edgeLR = (x < center.x ? Enum.Edge.LEFT : Enum.Edge.RIGHT);
            posLR = this._sourceEntity.getEdgePosition(edgeLR);
            lenLR = ns.Geometry.pointToPointDistance(cursor, posLR);
        }

        var edgeTB, posTB, lenTB;
        if (y < edges.top || y > edges.bottom) {
            edgeTB = (y < center.y ? Enum.Edge.TOP : Enum.Edge.BOTTOM);
            posTB = this._sourceEntity.getEdgePosition(edgeTB);
            lenTB = ns.Geometry.pointToPointDistance(cursor, posTB);
        }

        // choose shorter of the two possible edges
        var pos, edge;
        if (!lenTB || lenLR <= lenTB) {
            pos = posLR;
            edge = edgeLR;
        } else {
            pos = posTB;
            edge = edgeTB;
        }

        if (!pos) {
            console.log("Can't find appropriate position");
            return;
        }

        // rotate and position anchor
        this._model.getSource().setAnchor(pos.x, pos.y, edge);
        this._model.getTarget().setAnchor(x, y, (edge+2)%4);

        this._model.straighten();

        // update view
        this.redraw();
    };

    Relation.prototype._moveToSameEntity = function() {
        // rotate and position anchor
        var sourceModel = this._model.getSource();
        var posSource = this._sourceEntity.getEdgePosition(Enum.Edge.TOP);
        var sourcePoint = { x: posSource.x, y: posSource.y - RecursiveEntityOffset };
        sourceModel.setAnchor(posSource.x, posSource.y, Enum.Edge.TOP);
        if (sourceModel.getPointsCount() == 2) {
            sourceModel.addPoint(1, sourcePoint);
        } else {
            sourceModel.setPoint(1, sourcePoint.x, sourcePoint.y);
        }

        var targetModel = this._model.getTarget();
        var posTarget = this._targetEntity.getEdgePosition(Enum.Edge.LEFT);

        var targetPoint = { x: posTarget.x - RecursiveEntityOffset, y: posTarget.y };
        targetModel.setAnchor(posTarget.x, posTarget.y, Enum.Edge.LEFT);
        if (targetModel.getPointsCount() == 2) {
            targetModel.addPoint(1, targetPoint);
        } else {
            targetModel.setPoint(1, targetPoint.x, targetPoint.y);
        }

        this._model.setMiddlePointPosition(posTarget.x - RecursiveEntityOffset, posSource.y - RecursiveEntityOffset);

        // update view
        this.redraw();
    };

    Relation.prototype._moveToDifferentEntity = function() {
        this._model.straighten(true, this._sourceEntity._model, this._targetEntity._model);
        this.redraw();
    };

    Relation.prototype._moveToEntity = function() {
        if (this._targetEntity == this._sourceEntity) {
            this._moveToSameEntity();
        } else {
            this._moveToDifferentEntity();
        }
    };

    // sort

    Relation.prototype.getVector = function() {
        var vector = new ns.Geometry.Vector(0,0);
        if (this._sourceEntity != this._targetEntity) {
            vector.fromPoints(
                this._model.getSource().getAnchor(),
                this._model.getTarget().getAnchor()
            );
        }
        return vector;
    };

    Relation.prototype.addForceToEntities = function(force) {
        this._sourceEntity.addForce(force);
        this._targetEntity.addForce(force.getOpposite());
    };

    // swap

    Relation.prototype._swap = function() {
        this._canvas.History.begin();
        this._swapCardinality();
        this._swapIdentifying();
        this._swapRequired();
        this._canvas.History.commit();
    };
    Relation.prototype._swapCardinality = function() {
        var s = this._legs.source.getModel().getCardinality();
        var t = this._legs.target.getModel().getCardinality();

        this._canvas.History.begin();
        this._legs.source.setCardinality(t);
        this._legs.target.setCardinality(s);
        this._canvas.History.commit();
    };
    Relation.prototype._swapIdentifying = function() {
        var s = this._legs.source.getModel().isIdentifying();
        var t = this._legs.target.getModel().isIdentifying();

        this._canvas.History.begin();
        this._legs.source.toggleIdentifying(t);
        this._legs.target.toggleIdentifying(s);
        this._canvas.History.commit();
    };
    Relation.prototype._swapRequired = function() {
        var s = this._legs.source.getModel().isOptional();
        var t = this._legs.target.getModel().isOptional();

        this._canvas.History.begin();
        this._legs.source.toggleOptional(t);
        this._legs.target.toggleOptional(s);
        this._canvas.History.commit();
    };

    // names
    Relation.prototype.showNames = function() {
        this._legs.source.showName();
        this._legs.target.showName();
    };
    Relation.prototype.hideNames = function() {
        this._legs.source.hideName();
        this._legs.target.hideName();
    };

    // Events

    // handles non-recursive relations
    Relation.prototype.onEntityDrag = function(dx, dy) {
        if (!this._model.hasManualPoints()) {
            this._model.resetAnchors();
        }
        if (!this.isRecursive()) {
            this.centerMiddlePoint();
        }

        if (this._legs.source.getModel().inXor) {
            this._sourceEntity.redrawXor(null, this._legs.source);
        }
        if (this._legs.target.getModel().inXor) {
            this._targetEntity.redrawXor(null, this._legs.target);
        }
    };

    Relation.prototype.onXorUpdate = function() {
        if (!this._model.hasManualPoints()) {
            this._model.resetMiddlePoint();
        }
        this.redraw();
    };

    Relation.prototype.onEntityResize = function() {
        if (!this._model.middleManual) {
            this._model.resetMiddlePoint();
        }
        this.redraw();
    };

    Relation.prototype.onAnchorMove = function() {
        if (!this._model.middleManual) {
            this._model.resetMiddlePoint();
        }
        this.redraw();
    };

    Relation.prototype.onMouseMove = function(e, mouse) {
        if (this._canvas.inCorrectionMode) { return; }
        if (this._new) {
            var target = mouse.getTarget();
            if (target instanceof ns.Control.Entity) {
                this._targetEntity = target;
                this._moveToEntity();
            } else {
                this._targetEntity = null;
                this._moveToCursor(mouse.x, mouse.y);
            }
        } else {
            this._moveMiddle(mouse);
            this.redraw();
        }
    };

    Relation.prototype.onMouseUp = function(e, mouse) {
        if (!this._new) { return; }
        this._new = false;

        if (this._targetEntity == null) {
            this._view.clear();
        } else {
            this._setupEntities();
        }
    };

    // Menu

    Relation.prototype.handleMenu = function(action, params) {
        if (ns.Diagram.allowEdit) {
            switch(action) {
                case "swap":       this._swap();            this.redrawType(); return;
                case "swap-card":  this._swapCardinality(); this.redrawType(); return;
                case "swap-ident": this._swapIdentifying(); this.redrawType(); return;
                case "swap-req":   this._swapRequired();    this.redrawType(); return;
                case "delete":     this.clear();                               return;
            }
        }

        switch(action) {
            case "reset":      this._model.resetMiddlePoint(); break;
            case "straighten": this.straighten(); break;
            case "toback":     this._view.toBack(); break;
            case "tofront":    this._view.toFront(); break;
        }
        this.redraw();

    };

    // History

    Relation.prototype.playback = function(action, from, to) {
        switch(action) {
            case "create":
            case "clear":
                if (to) {
                    this.undoClear()
                } else {
                    this.clear();
                }
                break;
            case "middle":
                this._moveMiddle(to);
                this._model.middleManual = to.manual;
                this.redraw();
                break;
        }
    };

    // Automatic correction check

    Relation.prototype.checkAgainst = function(referenceRelations, nameComparator) {
        var s = this._legs.source;
        var t = this._legs.target;

        var sName = s.getEntityName();
        var tName = t.getEntityName();

        var markedCnt = 0;

        var i = referenceRelations.length;
        while (--i >= 0) {
            if (nameComparator(referenceRelations[i][0].entity, sName) && nameComparator(referenceRelations[i][1].entity, tName)) {
                markedCnt += s.checkAgainst(referenceRelations[i][0]);
                markedCnt += t.checkAgainst(referenceRelations[i][1]);

                referenceRelations.splice(i, 1);
                return markedCnt;
            } else if (nameComparator(referenceRelations[i][0].entity, tName) && nameComparator(referenceRelations[i][1].entity, sName)) {
                markedCnt += t.checkAgainst(referenceRelations[i][0]);
                markedCnt += s.checkAgainst(referenceRelations[i][1]);

                referenceRelations.splice(i, 1);
                return markedCnt;
            }
        }

        //this.markIncorrect();
        s.markIncorrect();
        t.markIncorrect();
        return markedCnt + 2;
    };

    return Relation;
})();
/** src/control/RelationLeg.js */
DBSDM.Control = DBSDM.Control ||{};

DBSDM.Control.RelationLeg = (function() {
    var ns = DBSDM;
    var Enum = ns.Enums;

    var EdgeOffset = 10;
    var ControlCreationOffset = 10; // to not require exact clicks on the relation leg

    function RelationLeg(relationControl, canvas, model) {
        this._relation = relationControl;
        this._canvas = relationControl.getCanvas();
        this._entity = null;
        this._model = model;
        this._view = null;
        this.draw();

        var name = model.getName();
        if (name) {
            this._view.toggleName();
        }

        this._inXorCreation = false;
    }

    /**
     * Attach relation leg to the given entity Control
     */
    RelationLeg.prototype.setEntityControl = function(entityControl) {
        this._entity = entityControl;
        this._view.onEntityAttached();
    };

    RelationLeg.prototype.getEntityName = function() {
        return this._entity.getModel().getName();
    };

    RelationLeg.prototype.getRelation = function() {
        return this._relation;
    };

    RelationLeg.prototype.draw = function() {
        this._view = new ns.View.RelationLeg(this._canvas, this._model, this);
        this._view.draw();
    };

    RelationLeg.prototype.redraw = function() {
        this._view.updateAnchorPosition();
        this._view.updatePoints();
    };

    RelationLeg.prototype.redrawType = function() {
        this._view.updateType();
        this._view.updateAnchorType();
    };

    RelationLeg.prototype.getDom = function() {
        return this._view.getDom();
    };

    RelationLeg.prototype.getModel = function() {
        return this._model;
    };

    RelationLeg.prototype.translateAnchor = function(x, y) {
        var anchor = this._model.getAnchor();
        this._model.setAnchor(anchor.x + x, anchor.y + y, anchor.edge);

        if (this._model.inXor) {
            this._entity.redrawXor(null, this);
        }
    };

    RelationLeg.prototype.translate = function(dx, dy) {
        this.translateAnchor(dx, dy);
        this._model.translatePoints(dx, dy);
    };

    RelationLeg.prototype._moveAnchor = function(mouse) {
        var initial = Object.assign({}, this._model.getAnchor());

        var pos = this._entity.getEdgeCursorPosition(mouse.x, mouse.y);
        if (pos != null) {
            if ((pos.edge & 1) != 0) { // right/left
                pos.y = ns.Geometry.snap(pos.y, this._model.getPoint(1).y, null, ns.Consts.SnappingLimit);
            } else {
                pos.x = ns.Geometry.snap(pos.x, this._model.getPoint(1).x, null, ns.Consts.SnappingLimit);
            }
            this._model.setAnchor(pos.x, pos.y, pos.edge);
        }

        this._relation.onAnchorMove();

        if (this._model.inXor) {
            this._entity.redrawXor(null, this);
        }

        this._canvas.History.record(this, "anchor", initial, Object.assign({}, this._model.getAnchor()));
    };

    RelationLeg.prototype.createControlPoint = function(P, index) {
        var points = this._model.getPoints();

        if (!index) {
            index = 1;
            var minDist = -1;
            for (var i=1; i<points.length; i++) {
                var A = points[i-1];
                var B = points[i];

                if (ns.Geometry.pointIsInBox(P, A, B, ControlCreationOffset)) {
                    var dist = ns.Geometry.pointToLineDistance(P, A, B);
                    if (minDist == -1 || dist < minDist) {
                        minDist = dist;
                        index = i;
                    }
                }
            }
        }

        this._model.addPoint(index, P);
        this._view.buildControlPoint(index, P);
        this._view.updatePoints();

        this._model.pointsManual = true;

        this._canvas.History.record(this, "cp:"+this._model.getPointsCount(), null, {x: P.x, y: P.y, index: index});
        return index;
    };

    RelationLeg.prototype._removeControlPoint = function(index) {
        this._canvas.History.record(this, "cp:"+this._model.getPointsCount(),
            Object.assign({index:index}, this._model.getPoint(index)),
            null, false
        );

        this._model.removePoint(index);
        this._view.removeControlPoint(index - 1);
        this._view.updatePoints();
    };

    RelationLeg.prototype._moveControlPoint = function(index, pos) {
        var p = this._model.getPoint(index);
        var prev = this._model.getPoint(index - 1);
        var next = this._model.getPoint(index + 1);

        var initial = {x: p.x, y: p.y, index: index};

        p.x = ns.Geometry.snap(pos.x, prev.x, next.x, ns.Consts.SnappingLimit);
        p.y = ns.Geometry.snap(pos.y, prev.y, next.y, ns.Consts.SnappingLimit);

        this._relation.centerMiddlePoint();

        this._canvas.History.record(this, "cp:"+this._model.getPointsCount(), initial, {x: p.x, y: p.y, index: index});
    };

    // XOR

    RelationLeg.prototype._initXor = function() {
        if (ns.Diagram.allowEdit) {
            this._relation.getCanvas().Mouse.attachObject(this);
            this._view.select();
            this._entity.markRelations(this, this._model.inXor);
            this._inXorCreation = true;

            var that = this;
            ns.Diagram.cancelAction = function() { that.xor(null); };
        }
    };

    RelationLeg.prototype.xor = function(leg) {
        if (!this._inXorCreation) { return; }
        this._inXorCreation = false;
        this._entity.unmarkRelations();

        ns.Diagram.cancelAction = null;
        if (!leg) {return;}

        if (this == leg) {
            this._relation.getCanvas().ui.error("Same leg selected", ns.Consts.UIDefaultErrorDuration);
            console.log("Same leg selected");
            return;
        }

        if (this._model.inXor && leg._model.inXor) {
            this._relation.getCanvas().ui.error("Both relations are already in XOR", ns.Consts.UIDefaultErrorDuration);
            console.log("Both relations are already in XOR");
            return;
        }
        if (this._entity != leg._entity) {
            this._relation.getCanvas().ui.error("Relations have different parent", ns.Consts.UIDefaultErrorDuration);
            console.log("Legs have different parent");
            return;
        }

        if (this._model.inXor) {
            this._entity.xorWith(leg, this);
        } else {
            this._entity.xorWith(this, leg);
        }
    };

    RelationLeg.prototype._removeXor = function() {
        this._entity.removeXorLeg(this);
    };

    // Marks

    RelationLeg.prototype.mark = function() {
        this._view.mark();
    };

    RelationLeg.prototype.allow = function() {
        this._view.allow();
    };

    RelationLeg.prototype.clearMarks = function() {
        this._view.clearSelectionClasses();
    };

    RelationLeg.prototype.markIncorrect = function() {
        this._model.incorrect = true;
        this._view.markIncorrect();
    };

    RelationLeg.prototype._toggleIncorrect = function() {
        this._model.incorrect = !this._model.incorrect;
        if (this._model.incorrect) {
            this._view.markIncorrect();
        } else {
            this._view.markCorrect();
        }
        this._view.updateComment();
    };

    // Names

    RelationLeg.prototype.showName = function() {
        this._view.showName();
    };
    RelationLeg.prototype.hideName = function() {
        this._view.hideName();
    };
    RelationLeg.prototype.toggleName = function() {
        this._view.toggleName();
    };

    // Events

    RelationLeg.prototype.onEntityDrag = function(dx, dy) {
        if (this._relation.isRecursive()) {
            this._relation.translate(dx*0.5, dy*0.5);
        } else {
            this.translateAnchor(dx, dy);
        }
    };

    RelationLeg.prototype.onEntityResize = function(edges) {

        // first, snap to edge if needed
        var a = this._model.getAnchor();
        switch(a.edge) {
            case Enum.Edge.LEFT:   a.x = edges.left; break;
            case Enum.Edge.RIGHT:  a.x = edges.right; break;
            case Enum.Edge.TOP:    a.y = edges.top; break;
            case Enum.Edge.BOTTOM: a.y = edges.bottom; break;
        }

        if ((a.edge & 1) != 0) {
            a.y = Math.max(a.y, edges.top    + EdgeOffset);
            a.y = Math.min(a.y, edges.bottom - EdgeOffset);
        } else {
            a.x = Math.max(a.x, edges.left   + EdgeOffset);
            a.x = Math.min(a.x, edges.right  - EdgeOffset);
        }
        this._model.setAnchor(a.x, a.y, a.edge);

        if (this._model.inXor) {
            this._entity.redrawXor(null, this);
        }
        this._relation.onEntityResize();
    };

    RelationLeg.prototype.onMouseDown = function(e, mouse) {
        if (this._canvas.inCorrectionMode) { return; }

        var params = mouse.getParams();
        if (params.action && params.action == "line") {
            params.action = "cp";
            params.index = this.createControlPoint({x: mouse.x, y: mouse.y});

        }
    };

    RelationLeg.prototype.onMouseMove = function(e, mouse) {
        if (this._canvas.inCorrectionMode) { return; }

        var params = mouse.getParams();
        if (!params.action) { return; }

        if (params.action == "anchor") {
            this._moveAnchor(mouse);
        } else if (params.action == "cp") {
            this._moveControlPoint(params.index, mouse);
        }
    };

    RelationLeg.prototype.onMouseUp = function(e, mouse) {
        if (this._canvas.inCorrectionMode) {
            if (this._canvas.inCorrectionCommentMode) {
                this.markIncorrect();
                this._model.setComment(window.prompt("Comment:", this._model.getComment()));
                this._view.updateComment();
            } else {
                this._toggleIncorrect();
            }
            return;
        }

        // TODO check for fast mouse movement bug, as in Entity
        var leg = mouse.getTarget();
        if (leg instanceof ns.Control.RelationLeg) {
            this.xor(leg);
        } else {
            this.xor(null);
        }
    };

    // Properties

    RelationLeg.prototype.setCardinality = function(cardinality) {
        var initial = this._model.getCardinality();
        this._model.setCardinality(cardinality);
        this._canvas.History.record(this, "cardinality", initial, cardinality);
    };

    RelationLeg.prototype.toggleIdentifying = function(value) {
        value = typeof(value) === "boolean" ? value : !this._model.isIdentifying();
        this._model.setIdentifying(value);
        this._canvas.History.record(this, "identifying", !value, value);
    };

    RelationLeg.prototype.toggleOptional = function(value) {
        value = typeof(value) === "boolean" ? value : !this._model.isOptional();
        this._model.setOptional(value);
        this._canvas.History.record(this, "optional", !value, value);
    };

    // Menu

    RelationLeg.prototype.handleMenu = function(action, params) {
        switch(action) {
            case "cp-delete":
                if (params.index) {
                    this._removeControlPoint(params.index);
                    return;
                }
                break;
            case "name":
                this.toggleName();
                return;
        }

        if (!ns.Diagram.allowEdit) { return; }
        switch(action) {
            case "one":         this.setCardinality( Enum.Cardinality.ONE ); break;
            case "many":        this.setCardinality( Enum.Cardinality.MANY ); break;
            case "identifying": this.toggleIdentifying(); break;
            case "required":    this.toggleOptional(); break;
            case "xor":         this._initXor(); break;
            case "remove-xor":  this._removeXor(); break;
        }

        this.redrawType();
    };

    RelationLeg.prototype.getMenuState = function() {
        return {
            one: this._model.getCardinality() == Enum.Cardinality.ONE,
            many: this._model.getCardinality() == Enum.Cardinality.MANY,
            identifying: this._model.isIdentifying(),
            required: !this._model.isOptional(),
            name: (this._view._name != null),
            "remove-xor": this._model.inXor
        }
    };

    // History

    RelationLeg.prototype.playback = function(action, from, to) {
        var list = action.split(":");
        switch(list[0]) {
            case "cp":
                if (from == null) {
                    this.createControlPoint(to, to.index);
                } else if (to == null) {
                    this._removeControlPoint(from.index);
                } else {
                    this._moveControlPoint(to.index, to);
                }
                this._relation.centerMiddlePoint();
                break;
            case "anchor":
                this._model.setAnchor(to.x, to.y, to.edge);
                this._relation.onAnchorMove();
                break;
            case "cardinality":
                this.setCardinality(to);
                this.redrawType();
                break;
            case "optional":
                this.toggleOptional(to);
                this.redrawType();
                break;
            case "identifying":
                this.toggleIdentifying(to);
                this.redrawType();
                break;
        }
    };


    // Automatic correction check

    RelationLeg.prototype.checkAgainst = function(referenceLeg) {
        if (referenceLeg.identifying != this._model.isIdentifying()
         || referenceLeg.optional    != this._model.isOptional()
         || referenceLeg.cardinality != this._model.getCardinality()) {
            this.markIncorrect();
            return 1;
        }
        return 0;
    };


    return RelationLeg;
})();
/** src/model/Attribute.js */
DBSDM.Model = DBSDM.Model ||{};

/**
 * Attribute model class
 */
DBSDM.Model.Attribute = (function(){

    function Attribute(name) {
        this._name = name || "attribute";
        this._primary = false;
        this._unique = false;
        this._nullable = false;

        this.incorrect = false;
        this.comment = null;
    }

    Attribute.prototype.getName = function() {
        return this._name;
    };

    Attribute.prototype.setName = function(name) {
        this._name = name.trim().toLocaleLowerCase();
        return this;
    };

    Attribute.prototype.setComment = function(comment) {
        this.comment = comment;
        return this;
    };
    Attribute.prototype.getComment = function(){
        return this.incorrect && this.comment ? this.comment : "";
    };

    //
    Attribute.prototype.isPrimary = function() {
        return this._primary;
    };

    Attribute.prototype.setPrimary = function(bool) {
        if (typeof bool == 'boolean') {
            this._primary = bool;
            if (bool) {
                this._unique = false;
            }
        }
        return this;
    };

    //
    Attribute.prototype.isUnique = function(bool) {
        return this._unique;
    };

    Attribute.prototype.setUnique = function(bool) {
        if (typeof bool == 'boolean') {
            this._unique = bool;
            if (bool) {
                this._primary = false;
            }
        }
        return this;
    };

    //
    Attribute.prototype.isNullable = function() {
        return this._nullable;
    };

    Attribute.prototype.setNullable = function(bool) {
        if (typeof bool == 'boolean') {
            this._nullable = bool;
        }
        return this;
    };

    Attribute.prototype.toString = function() {
        var str = "";
        str += this._name;

        var atrs = [];
        if (this._primary) {
            atrs.push("PRIMARY KEY");
        } else if (this._unique) {
            atrs.push("UNIQUE")
        }

        if (this._nullable) {
            atrs.push("NULL");
        } else {
            atrs.push("NOT NULL")
        }

        if (atrs.length != 0) {
            str += ": "+atrs.join(" ");
        }
        return str;
    };

    Attribute.prototype.getData = function() {
        this.setName(this._name); // force normalization
        var data = {
            name: this._name,
            primary: this._primary,
            unique: this._unique,
            nullable: this._nullable
        };
        if (this.incorrect) {
            data.incorrect = true;
            if (this.comment) { data.comment = this.comment; }
        }
        return data;
    };

    return Attribute;
})();
/** src/model/AttributeList.js */
DBSDM.Model = DBSDM.Model ||{};

DBSDM.Model.AttributeList = (function(){
    var ns = DBSDM;

    function AttributeList() {
        this._list = [];
    }

    AttributeList.prototype.getList = function() {
        return this._list;
    };

    AttributeList.prototype.add = function(attribute, position) {
        if (position == undefined) {
            this._list.push(attribute);
        } else {
            this._list.splice(position, 0, attribute);
        }
    };

    AttributeList.prototype.remove = function(attribute) {
        this._list.splice(this.getPosition(attribute), 1);
    };

    AttributeList.prototype.getPosition = function(attribute) {
        return this._list.findIndex(function(element, index, array) {
            return element == attribute;
        });
    };

    AttributeList.prototype.setPosition = function(attribute, position) {
        this.remove(attribute);
        this.add(attribute, position);
    };

    AttributeList.prototype.getSize = function() {
        return this._list.length;
    };

    // Data representation

    AttributeList.prototype.toString = function() {
        var str = "";
        for (var i in this._list) {
            str += " " + this._list[i].toString() + "\n";
        }
        return str;
    };

    AttributeList.prototype.getExportData = function() {
        var list = Object.assign([], this._list);
        var result = [];
        for (var i=0; i<list.length; i++) {
            result.push(list[i].getData());
        }
        return result;
    };

    AttributeList.prototype.import = function(data) {
        if (typeof data != "object") { return; }
        var count = data.length;
        for (var i=0; i<count; i++) {
            var a = data[i];
            if (!a.name) { return; }

            var atr = (new ns.Model.Attribute(a.name))
                .setPrimary(a.primary)
                .setUnique(a.unique)
                .setNullable(a.nullable);

            if (typeof(a.incorrect) === "boolean" && a.incorrect) {
                atr.incorrect = a.incorrect;
                if (a.comment) { atr.setComment(a.comment); }
            }
            this.add(atr);
        }
    };

    return AttributeList;
})();
/** src/model/CanvasObject.js */
DBSDM.Model = DBSDM.Model ||{};

/**
 * Canvas Object base class
 * ! Should be treated as abstract
 */
DBSDM.Model.CanvasObject = (function(){
    var ns = DBSDM;

    function CanvasObject() {
        this._transform = {
            x: 0,
            y: 0,
            width: 1,
            height: 1
        };

        this.incorrect = false;
        this.comment = null;
    }

    CanvasObject.prototype.setComment = function(comment) {
        this.comment = comment;
        return this;
    };
    CanvasObject.prototype.getComment = function(){
        return this.incorrect && this.comment ? this.comment : "";
    };

    CanvasObject.prototype.setPosition = function(x, y) {
        this._transform.x = (x != null ? x : this._transform.x);
        this._transform.y = (y != null ? y : this._transform.y);
    };

    CanvasObject.prototype.translate = function(dx, dy) {
        this._transform.x += (dx != null ? dx : 0);
        this._transform.y += (dy != null ? dy : 0);
    };

    CanvasObject.prototype.setSize = function(w, h) {
        this._transform.width = (w != null ? w : this._transform.width);
        this._transform.height = (h != null ? h : this._transform.height);
    };

    CanvasObject.prototype.resize = function(dw, dh) {
        this._transform.width += (dw != null ? dw : 0);
        this._transform.height += (dh != null ? dh : 0);
    };

    CanvasObject.prototype.getTransform = function() {
        return this._transform;
    };

    /** in canvas coordinates */
    CanvasObject.prototype.getEdges = function() {
        var transform = Object.assign({}, this._transform);
        return {
            top: transform.y,
            right: transform.x + transform.width,
            bottom: transform.y + transform.height,
            left: transform.x
        };
    };

    CanvasObject.prototype.getExportData = function(properties) {
        var data = {};
        if (properties['saveTransform']) {
            data.transform = this._transform;
        }
        if (this.incorrect) {
            data.incorrect = true;
            if (this.comment) { data.comment = this.comment; }
        }
        return data;
    };

    CanvasObject.prototype.import = function(data) {
        if (data.transform) {
            this.setPosition(data.transform.x, data.transform.y);
            this.setSize(data.transform.width, data.transform.height);
        }
        if (typeof(data.incorrect) === "boolean" && data.incorrect) {
            this.incorrect = data.incorrect;
            if (data.comment) { this.setComment(data.comment); }
        }
    };

    return CanvasObject;
})();
/** src/model/Entity.js */
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
/** src/model/Note.js */
DBSDM.Model = DBSDM.Model ||{};

DBSDM.Model.Note = (function(){
    var ns = DBSDM;
    var Consts = ns.Consts;

    var Super = ns.Model.CanvasObject;

    function Note() {
        Super.call(this);
        this.setSize(Consts.NoteDefaultWidth, Consts.NoteDefaultHeight);
        this._text = "Click to edit";
    }
    Note.prototype = Object.create(Super.prototype);
    Note.prototype.constructor = Note;

    Note.prototype.getText = function(text) {
        return this._text;
    };
    Note.prototype.setText = function(text) {
        this._text = text;
    };

    // Data representation

    Note.prototype.toString = function() {
        return "Note: "+this._text + "\n\n";
    };

    Note.prototype.getExportData = function(properties) {
        var data = {
            text: this._text
        };
        Object.assign(data, Super.prototype.getExportData.call(this, properties));

        return data;
    };

    Note.prototype.import = function(data) {
        if (data.text) { this.setText(data.text); }
        Super.prototype.import.call(this, data);
    };

    return Note;
})();
/** src/model/Relation.js */
DBSDM.Model = DBSDM.Model ||{};

/**
 * Relation model class
 */
DBSDM.Model.Relation = (function(){
    var ns = DBSDM;
    var Enum = ns.Enums;

    function Relation(source, target) {
        this._source = source;
        this._target = target;

        this._source.setRelation(this);
        this._target.setRelation(this);

        this.middleManual = false;
    }

    Relation.prototype.getSource = function() {
        return this._source;
    };

    Relation.prototype.getTarget = function() {
        return this._target
    };

    Relation.prototype.hasManualPoints = function() {
        return this._source.pointsManual || this._target.pointsManual;
    };

    // middle point

    Relation.prototype.getMiddlePoint = function() {
        return this._source.getPoint(-1);
    };

    Relation.prototype.setMiddlePointPosition = function(x, y) {
        this._source.setPoint(-1, x, y);
        this._target.setPoint(-1, x, y);
    };

    Relation.prototype.translateMiddlePoint = function(dx, dy) {
        var middle = this.getMiddlePoint();
        var x = middle.x + dx;
        var y = middle.y + dy;
        this._source.setPoint(-1, x, y);
        this._target.setPoint(-1, x, y);
    };

    Relation.prototype.resetMiddlePoint = function() {
        var lft = this._source.getPoint(-2);
        var rgt = this._target.getPoint(-2);
        this.setMiddlePointPosition((lft.x + rgt.x) / 2, (lft.y + rgt.y) / 2);
        this.middleManual = false;
    };

    // anchors

    /**
     * Set anchors on entities edges, so the relation is as short as possible
     * If recompute is false, entity won't change position on the same edge that it is already at
     */


    Relation.prototype._addPoints = function(leg, entity, edge, recompute) {
        var anchor = leg.getAnchor();
        if (!recompute && anchor.edge == edge) {
            return anchor;
        } else {
            return entity.getEdgePosition(edge);
        }
    };

    Relation.prototype.resetAnchors = function(recompute, sourceEntity, targetEntity) {
        sourceEntity = sourceEntity || this._source.getEntity();
        targetEntity = targetEntity || this._target.getEntity();
        if (sourceEntity == targetEntity) { return; }
        recompute = recompute || false;

        /**
         * Get possible anchor points
         */
        var source = [];
        var target = [];
        var sourceEdges = sourceEntity.getEdges();
        var targetEdges = targetEntity.getEdges();
        if (sourceEdges.right < targetEdges.left) {
            source.push(this._addPoints(this._source, sourceEntity, Enum.Edge.RIGHT, recompute));
            target.push(this._addPoints(this._target, targetEntity, Enum.Edge.LEFT,  recompute));
        } else if (sourceEdges.left > targetEdges.right) {
            source.push(this._addPoints(this._source, sourceEntity, Enum.Edge.LEFT,  recompute));
            target.push(this._addPoints(this._target, targetEntity, Enum.Edge.RIGHT, recompute));
        }
        if (sourceEdges.bottom < targetEdges.top) {
            source.push(this._addPoints(this._source, sourceEntity, Enum.Edge.BOTTOM, recompute));
            target.push(this._addPoints(this._target, targetEntity, Enum.Edge.TOP,    recompute));
        } else if (sourceEdges.top > targetEdges.bottom) {
            source.push(this._addPoints(this._source, sourceEntity, Enum.Edge.TOP,    recompute));
            target.push(this._addPoints(this._target, targetEntity, Enum.Edge.BOTTOM, recompute));
        }

        if (source.length == 0) { // ISA or something weird
            for (var i=0;i<4; i++) {
                source.push(this._addPoints(this._source, sourceEntity, i, recompute));
                target.push(this._addPoints(this._target, targetEntity, i, recompute));
            }
        }

        /**
         * Pick combination of anchor points, that creates shortest relation
         */
        var minLen = null;
        var bestSource = null;
        var bestTarget = null;
        for (var s=0; s<source.length; s++) {
            for (var t=0; t<target.length; t++) {
                var len = ns.Geometry.pointToPointSquareDistance(source[s], target[t]);
                if (minLen == null || len < minLen) {
                    minLen = len;
                    bestSource = source[s];
                    bestTarget = target[t];
                }
            }
        }

        /**
         * Rotate and position anchors
         */
        this._source.setAnchor(bestSource.x, bestSource.y, bestSource.edge);
        this._target.setAnchor(bestTarget.x, bestTarget.y, bestTarget.edge);
    };

    Relation.prototype.straighten = function(recompute, sourceEntity, targetEntity) {
        this._source.clearPoints();
        this._target.clearPoints();
        this.resetAnchors(recompute, sourceEntity, targetEntity);
        this.resetMiddlePoint();
    };

    //

    Relation.prototype.toString = function() {
        var src = this._source.toString();
        var tgt = this._target.toString();
        if (src.localeCompare(tgt) > 0) {
            return tgt + " -> " + src;
        }
        return src + " -> " + tgt;
    };

    Relation.prototype.getExportData = function(properties) {
        var src = this._source.toString();
        var tgt = this._target.toString();

        if (src.localeCompare(tgt) > 0) {
            return [
                this._target.getExportData(properties),
                this._source.getExportData(properties)
            ];
        }
        return [
            this._source.getExportData(properties),
            this._target.getExportData(properties)
        ];
    };

    Relation.prototype.getHash = function() {
        return [this._source.getHash(), this._target.getHash()].sort().join("");
    };

    return Relation;
})();/** src/model/RelationLeg.js */
DBSDM.Model = DBSDM.Model ||{};

/**
 * Model class modelling one part of relation (source or target)
 */
DBSDM.Model.RelationLeg = (function(){
    var ns = DBSDM;
    var Enum = ns.Enums;

    function RelationLeg(identifying, optional, cardinality) {
        this._relation = null;

        this._entity = null;
        this._identifying = false;
        this._optional = false;
        this._cardinality = false;

        this.setIdentifying(identifying)
            .setOptional(optional)
            .setCardinality(cardinality);

        this._name = null;

        // it would be enough to store just one coordinate and edge,
        // and compute rest from entity, but this simplifies things
        this._anchor = {
            x: 0, y: 0,
            edge: null
        };

        // all description points of the line, two points are minimum
        this._anchorOffset = 0;
        this._points = [
            {x: 0, y: 0}, // 0th point, associated to anchor
            {x: 0, y: 0}  // middle point
        ];
        this.pointsManual = false;

        this.inXor = false;

        this.incorrect = false;
        this.comment = null;
    }

    RelationLeg.prototype.setComment = function(comment) {
        this.comment = comment;
        return this;
    };
    RelationLeg.prototype.getComment = function(){
        return this.incorrect && this.comment ? this.comment : "";
    };

    RelationLeg.prototype.setRelation = function(relation) {
        this._relation = relation;
    };

    RelationLeg.prototype.getRelation = function() {
        return this._relation;
    };

    RelationLeg.prototype.setEntity = function(entity) {
        this._entity = entity;
    };
    RelationLeg.prototype.getEntity = function() {
        return this._entity;
    };

    RelationLeg.prototype.getName = function() {
        return this._name;
    };

    RelationLeg.prototype.setName = function(name) {
        this._name = (name ? name.trim().toLocaleLowerCase() : null);
        return this;
    };

    RelationLeg.prototype.isIdentifying = function() {
        return this._identifying
    };
    RelationLeg.prototype.setIdentifying = function(bool) {
        if (typeof bool == 'boolean') {
            this._identifying = bool;
        }
        return this;
    };

    RelationLeg.prototype.isOptional = function() {
        return this._optional
    };
    RelationLeg.prototype.setOptional = function(bool) {
        if (typeof bool == 'boolean') {
            this._optional = bool;
        }
        return this;
    };

    RelationLeg.prototype.getCardinality = function() {
        return this._cardinality;
    };
    RelationLeg.prototype.setCardinality = function(cardinality) {
        if (cardinality == Enum.Cardinality.ONE || cardinality == Enum.Cardinality.MANY) {
            this._cardinality = cardinality;
        }
        return this;
    };

    // anchor
    RelationLeg.prototype.getAnchor = function() {
        return this._anchor;
    };

    RelationLeg.prototype.setAnchor = function(x, y, edge) {
        this._anchor.x = x;
        this._anchor.y = y;
        this._anchor.edge = edge;
        this._updateFirstPoint();
    };

    RelationLeg.prototype.getAnchorOffset = function() {
        return this._anchorOffset;
    };
    RelationLeg.prototype.setAnchorOffset = function(offset) {
        this._anchorOffset = offset;
        this._updateFirstPoint();
    };

    RelationLeg.prototype._updateFirstPoint = function() {
        var edge = this._anchor.edge;
        if (edge == null) { return; }

        var offsetX = 0;
        var offsetY = 0;
        if ((edge & 1) != 0) { // left/right
            offsetX = (edge-2) * this._anchorOffset;
        } else { // top/bottom
            offsetY = (edge-1) * this._anchorOffset;
        }
        this._points[0].x = this._anchor.x - offsetX;
        this._points[0].y = this._anchor.y + offsetY;
    };

    // points

    RelationLeg.prototype.getPointsCount = function() {
        return this._points.length;
    };

    RelationLeg.prototype.addPoint = function(index, point) {
        this._points.splice(index, 0, point);
    };

    RelationLeg.prototype.setPoint = function(index, x, y) {
        var key = index % this._points.length;
        if (key < 0) {
            key += this._points.length;
        }
        this._points[key].x = x;
        this._points[key].y = y;
    };

    RelationLeg.prototype.getPoint = function(index) {
        var key = index % this._points.length;
        if (key < 0) {
            key += this._points.length;
        }
        return this._points[key];
    };
    RelationLeg.prototype.getPointIndex = function(x, y) {
        for (var i=0; i<this._points.length; i++) {
            var p = this._points[i];
            if (p.x == x && p.y == y) {
                return i;
            }
        }
    };

    RelationLeg.prototype.removePoint = function(index) {
        this._points.splice(index, 1);
    };

    RelationLeg.prototype.clearPoints = function() {
        this._points.splice(1, this._points.length - 2);
        this.pointsManual = false;
    };

    RelationLeg.prototype.getPoints = function() {
        return this._points;
    };
    RelationLeg.prototype.getPointsCount = function() {
        return this._points.length;
    };

    RelationLeg.prototype.translatePoints = function(dx, dy) {
        for (var i=1; i<this._points.length-1; i++) {
            this._points[i].x += dx;
            this._points[i].y += dy;
        }
    };

    RelationLeg.prototype.toString = function() {
        var str = this._entity.getName();
        str += " [";
        str += (this._identifying ? "I" : "i");
        str += (this._optional    ? "O" : "o");
        str += "] ";
        str += (this._cardinality == Enum.Cardinality.ONE ? "1" : "N");
        return str;
    };

    RelationLeg.prototype.getHash = function() {
        return ns.Hash.object([
            this._entity.getName(),
            this._identifying,
            this._optional,
            this._cardinality
        ]).toString(16);
    };

    RelationLeg.prototype.getExportData = function(properties) {
        var data = {
            entity: this._entity.getName(), // TODO maybe setName first, to force normalization, just to be sure? Shouldnt be needed, since entities are exported first, but who knows...
            identifying: this._identifying,
            optional: this._optional,
            cardinality: this._cardinality,
            xor: this._entity.getXorHash(this)
        };

        if (properties['saveRelationNames']) {
            data.name = this._name;
        }

        if (properties['saveTransform']) {
            data.transform = {
                anchor: this._anchor,
                points: this._points.slice(1),
                manual: this.pointsManual
            };
        }

        if (this.incorrect) {
            data.incorrect = true;
            if (this.comment) { data.comment = this.comment; };
        }
        return data;
    };

    RelationLeg.prototype.import = function(data) {

        this.setIdentifying(data.identifying)
            .setOptional(data.optional)
            .setCardinality(data.cardinality);

        if (data.name) {
            this.setName(data.name);
        }

        if (data.transform) {
            // sets anchor position as well as first point's position
            this.setAnchor(data.transform.anchor.x, data.transform.anchor.y, data.transform.anchor.edge);

            var pts = data.transform.points;
            this.setPoint(1, pts[pts.length-1].x, pts[pts.length-1].y); // set middle point first

            for (var i=0; i<pts.length-1; i++) {
                this.addPoint(i+1, pts[i]);
            }
            this.pointsManual = data.transform.manual;
        }

        if (typeof(data.incorrect) === "boolean" && data.incorrect) {
            this.incorrect = data.incorrect;
            if (data.comment) { this.setComment(data.comment); }
        }

        return this;
    };

    return RelationLeg;
})();/** src/view/Arc.js */
DBSDM.View = DBSDM.View ||{};

DBSDM.View.Arc = (function(){
    var self = {};

    var ns = DBSDM;
    var Edge = ns.Enums.Edge;
    var TOP = Edge.TOP;
    var RIGHT = Edge.RIGHT;
    var BOTTOM = Edge.BOTTOM;
    var LEFT = Edge.LEFT;

    /**
     * @param order    Order of the arc in the same entity, to figure out edge offset. Should start at 0
     */
    self.getEdgeDistance = function(order) {
        return ns.Consts.ArcEdgeDistance + order*ns.Consts.ArcArcDistance;
    };

    /**
     * @param edges    Entity edges
     * @param legs     List of relation legs models, which are in same XOR
     * @param edgeDist Distance of arc from edge
     */
    self.build = function(edges, legs, edgeDist) {
        if (legs.length < 1) { return null;}

        var points = self._getArcPoints(legs);
        self._sortPoints(points);

        var dx=0, dy=0;
        function setDistMod(edge) {
            switch(edge) {
                case TOP:    dx = 0; dy = -edgeDist; break;
                case RIGHT:  dx =  edgeDist; dy = 0; break;
                case BOTTOM: dx = 0; dy =  edgeDist; break;
                case LEFT:   dx = -edgeDist; dy = 0; break;
            }
        }

        var g = ns.Element.el("g", {pointerEvents: "none"});

        var path = new ns.Element.Path();

        var edge = self._getStartingEdge(points, edges);
        var prev = null;
        var skipped = null;
        for (var i=0; i<4; i++,edge = (edge+1)%4) {

            // solve edge that has no points
            if (i!=0) {
                if (!points[edge]) {
                    skipped = edge;
                    continue;
                }
                if (skipped != null) {
                    setDistMod(skipped);
                    switch(edge) {
                        case TOP:    x = edges.left;  y = edges.bottom; break;
                        case RIGHT:  x = edges.left;  y = edges.top;    break;
                        case BOTTOM: x = edges.right; y = edges.top;    break;
                        case LEFT:   x = edges.right; y = edges.bottom; break;
                    }
                    this._arcCorner(path, skipped, Math.round(x+dx-edges.left),  Math.round(y+dy-edges.top));
                }
            }

            // edge with points
            setDistMod(edge);
            for (var pi=0; pi<points[edge].length; pi++) {
                var p = points[edge][pi];
                var x = Math.round(p.x + dx - edges.left);
                var y = Math.round(p.y + dy - edges.top);
                if (path.isEmpty()) {
                    this._arcStart(path, edge, x,y);
                } else if (pi == 0) {
                    this._arcCorner(path, edge, x,y);
                }
                path.L(x,y);

                g.appendChild(ns.Element.el("circle", {cx:x, cy:y, r:2.5}));

                prev = edge;
            }
        }
        this._arcEnd(path, prev, x, y);

        g.appendChild( path.path({stroke: "black", fill: "transparent"}) );
        return g;
    };

    self._getArcPoints = function(legs) {
        var points = {};
        for (var i=0; i<legs.length; i++) {
            var anchor = legs[i].getAnchor();

            var edge = anchor.edge;
            if (!points[edge]) {
                points[edge] = [];
            }
            points[edge].push(anchor);
        }
        return points;
    };

    /**
     * Sort points on edges in clockwise order
     */
    self._pointsComparator = function(a, b){
        if (a.edge == b.edge) {
            switch(a.edge) {
                case TOP:    return a.x - b.x;
                case RIGHT:  return a.y - b.y;
                case BOTTOM: return b.x - a.x;
                case LEFT:   return b.y - a.y;
            }
        } else {
            return a.edge - b.edge;
        }
    };
    self._sortPoints = function(points) {
        for (var e in points) {
            if (!points.hasOwnProperty(e)) { continue; }
            points[e].sort(self._pointsComparator);
        }
    };

    /**
     * Figure out where to start drawing arc
     * Arc is drawn in a clockwise manner, start at the edge which which would create shortest possible arc
     * If there are points at opposite edges, try to start at edge which has point closest to the corner
     * @param points    Clockwise sorted arc points
     * @param edges     Entity edges
     */
    self._getStartingEdge = function(points, edges) {
        if (points.length == 2 && ((points[TOP] && points[BOTTOM]) || (points[LEFT] && points[RIGHT]))) {
            var a,b,len;
            if (points[TOP]) {
                len = points[TOP].length;
                a = edges.right - points[TOP][len-1].x;

                len = points[BOTTOM].length;
                b = points[BOTTOM][len-1].x - edges.left;

                return (a < b ? TOP : BOTTOM);
            } else {
                len = points[RIGHT].length;
                a = edges.bottom - points[RIGHT][len-1].y;

                len = points[LEFT].length;
                b = points[LEFT][len-1].x - edges.top;

                return (a < b ? RIGHT : LEFT);
            }
        } else {
            for (var e=1; e<4; e++) {
                if (!points[e-1] && points[e]) {
                    return e;
                }
            }
        }
        return 0;
    };

    self._arcCorner = function(path, edge, x, y) {
        var a = ns.Consts.ArcSize;
        switch(edge) {
            case TOP:    path.V(y+a).c( 0,-a,  a,-a,  a,-a); break;
            case RIGHT:  path.H(x-a).c( a, 0,  a, a,  a, a); break;
            case BOTTOM: path.V(y-a).c( 0, a, -a, a, -a, a); break;
            case LEFT:   path.H(x+a).c(-a, 0, -a,-a, -a,-a); break;
        }
    };
    self._arcStart = function(path, edge, x, y) {
        var a = ns.Consts.ArcSize;
        var o = ns.Consts.ArcEndPointOffset;
        switch(edge) {
            case TOP:    path.M(x-a-o,y+a).c( 0,-a,  a,-a,  a,-a); break;
            case RIGHT:  path.M(x-a,y-a-o).c( a, 0,  a, a,  a, a); break;
            case BOTTOM: path.M(x+a+o,y-a).c( 0, a, -a, a, -a, a); break;
            case LEFT:   path.M(x+a,y+a+o).c(-a, 0, -a,-a, -a,-a); break;
        }
    };
    self._arcEnd = function(path, edge, x, y) {
        var a = ns.Consts.ArcSize;
        var o = ns.Consts.ArcEndPointOffset;
        switch(edge) {
            case TOP:    path.l( o, 0).c(0,0,  a, 0,  a, a); break;
            case RIGHT:  path.l( 0, o).c(0,0,  0, a, -a, a); break;
            case BOTTOM: path.l(-o, 0).c(0,0, -a,0,  -a,-a); break;
            case LEFT:   path.l( 0,-o).c(0,0,  0,-a,  a,-a); break;
        }
    };

    return self;
})();
/** src/view/Attribute.js */
DBSDM.View = DBSDM.View ||{};

DBSDM.View.Attribute = (function(){
    var ns = DBSDM;

    var height = 18;

    function Attribute(model, control, canvas) {
        this._model = model;
        this._control = control;
        this._canvas = canvas;

        this._svg = null;
        this._comment = null;
        this._text = null;
        this._index = null;
        this._nullable = null;

        this._nameInput = null;
    }

    /***/

    Attribute.prototype._getIndex = function() {
        if (this._model.isPrimary()) {
            return "#";
        } else if (this._model.isUnique()) {
            return "U";
        }
        return " "; // !! UNBREAKABLE SPACE
    };

    Attribute.prototype._getNullable = function() {
        return (this._model.isNullable() ? "o" : "*");
    };

    Attribute.prototype._getY = function() {
        return height * this._control.getPosition();
    };

    Attribute.prototype.getMinimalSize = function() {
        return {
            width: this._text.getBoundingClientRect().width,
            height: this._svg.getBoundingClientRect().height
        };
    };

    /**
     * Finish creation of entity, create other elements and attach control
     * */
    Attribute.prototype.create = function(control, parentDom) {
        this._svg = ns.Element.el("svg", {
            class: "attr",
            x: 0, y: this._getY(),
            width: "100%", height: height
        });

        if (ns.Diagram.allowEdit) {
            this._svg.classList.add("draggable");
            this._svg.classList.add("editable");
        }

        this._comment = this._svg.appendChild(ns.Element.title());
        this.updateComment();

        // add background
        this._svg.appendChild(
            ns.Diagram.getSharedElement("Attr.Bg", { class: "attr-bg" })
        );

        // create text elements
        this._text = this._svg.appendChild( ns.Element.text(5, "50%") );

        this._index    = this._text.appendChild( ns.Element.el("tspan", { class: "attr-index" }) );
        this._index.textContent = this._getIndex();

        this._nullable = this._text.appendChild( ns.Element.el("tspan", { class: "attr-nullable", dx: "2", dy: "0"}) );
        this._nullable.textContent = this._getNullable();

        var model = this._model;
        this._nameInput = new ns.View.EditableText(this._canvas,
            null, null,
            { dominantBaseline: "central", dx: "4" },
            function() { return model.getName(); },
            function(value) { that._control.setName(value); },
            "tspan"
        );
        var that = this;
        this._nameInput.setNextHandler(function(prev){
            var dir = (prev ? -1 : 1);
            that._control.selectAt(that._control.getPosition() + dir, true);
        });
        this._nameInput.setEmptyHandler(function() {
            var position = that._control.getPosition();
            that._control.delete();
            that._control.selectAt(position-1, false);
        });

        this._text.appendChild(this._nameInput.getTextDom());

        this._svg.appendChild(this._text);
        parentDom.appendChild(this._svg);

        if (this._model.incorrect) {
            this.markIncorrect();
        }

        var mouse = this._canvas.Mouse;
        this._svg.addEventListener("mousedown", function(e) {
            if (that._canvas.isInMode("isa")) { return; }
            mouse.down(e, control);
        });
        this._svg.addEventListener("contextmenu", function(e) { ns.Menu.attach(control, "attribute"); });
    };

    Attribute.prototype.showInput = function() {
        this._nameInput.showInput();
    };

    Attribute.prototype.redrawName = function() {
        this._nameInput.redraw();
    };

    Attribute.prototype.redrawIndex = function() {
        this._index.textContent = this._getIndex();
    };

    Attribute.prototype.redrawNullable = function() {
        this._nullable.textContent = this._getNullable();
    };

    Attribute.prototype.reposition = function() {
        ns.Element.attr(this._svg, {y: this._getY() });
    };

    Attribute.prototype.destroy = function() {
        this._svg.remove();
    };

    Attribute.prototype.getEdges = function() {
        return this._svg.getBoundingClientRect();
    };

    Attribute.prototype.dragStarted = function() {
        this._svg.classList.add("dragged");
    };

    Attribute.prototype.dragEnded = function() {
        this._svg.classList.remove("dragged");
    };

    Attribute.prototype.markIncorrect = function() {
        this._svg.classList.add("incorrect");
    };
    Attribute.prototype.markCorrect = function() {
        this._svg.classList.remove("incorrect");
    };

    Attribute.prototype.updateComment = function() {
        if (!this._comment) { return; }

        let comment = this._model.getComment();
        this._comment.innerHTML = comment;

        if (comment) {
            this._svg.classList.add("hasComment");
        } else {
            this._svg.classList.remove("hasComment");
        }
    };

    return Attribute;
})();
/** src/view/CanvasObject.js */
DBSDM.View = DBSDM.View ||{};

DBSDM.View.CanvasObject = (function(){
    var ns = DBSDM;

    function CanvasObject(canvas, model, control) {
        this._canvas = canvas;
        this._model = model;
        this._control = control;

        this._dom = null;
        this._comment = null;
        this._controls = null;
    }

    CanvasObject.prototype.getDom = function() {
        return this._dom;
    };

    CanvasObject.prototype.redraw = function() {
        ns.Element.attr(this._dom, this._model.getTransform());
    };

    CanvasObject.prototype.remove = function() {
        this._dom.remove();
    };

    CanvasObject.prototype.showControls = function() {
        this._controls = ns.Element.g(
            ns.Diagram.getSharedElement("Entity.ControlRectangle"),
            ns.Element.attr(ns.Diagram.getSharedElement("Entity.ControlPoint"), { class: "e-cp-nw", x:      0, y:      0 }),
            ns.Element.attr(ns.Diagram.getSharedElement("Entity.ControlPoint"), { class: "e-cp-n",  x:  "50%", y:      0 }),
            ns.Element.attr(ns.Diagram.getSharedElement("Entity.ControlPoint"), { class: "e-cp-ne", x: "100%", y:      0 }),
            ns.Element.attr(ns.Diagram.getSharedElement("Entity.ControlPoint"), { class: "e-cp-e",  x: "100%", y:  "50%" }),
            ns.Element.attr(ns.Diagram.getSharedElement("Entity.ControlPoint"), { class: "e-cp-se", x: "100%", y: "100%" }),
            ns.Element.attr(ns.Diagram.getSharedElement("Entity.ControlPoint"), { class: "e-cp-s",  x:  "50%", y: "100%" }),
            ns.Element.attr(ns.Diagram.getSharedElement("Entity.ControlPoint"), { class: "e-cp-sw", x:      0, y: "100%" }),
            ns.Element.attr(ns.Diagram.getSharedElement("Entity.ControlPoint"), { class: "e-cp-w",  x:      0, y:  "50%" })
        );
        ns.Element.attr(this._controls, { class: "e-control" });
        this._dom.appendChild(this._controls);
    };

    CanvasObject.prototype.hideControls = function() {
        this._controls.remove();
    };

    // order

    CanvasObject.prototype.toBack = function() {
        var first = this._dom.parentNode.querySelector(":first-child");
        if (first == this._dom) { return; }
        this._dom.parentNode.insertBefore(this._dom, first);
    };
    CanvasObject.prototype.toFront = function() {
        this._dom.parentNode.insertBefore(this._dom, null);
    };

    // comment

    CanvasObject.prototype.updateComment = function() {
        if (!this._comment) { return; }

        let comment = this._model.getComment();
        this._comment.innerHTML = comment;

        if (comment) {
            this._dom.classList.add("hasComment");
        } else {
            this._dom.classList.remove("hasComment");
        }
    };

    return CanvasObject;
})();
/** src/view/EditableContent.js */
DBSDM.View = DBSDM.View ||{};

DBSDM.View.EditableContent = (function(){
    var ns = DBSDM;

    EditableContent.shown = false;

    /**
     * Create new editable content (text) in view
     * @param canvas     Canvas          Canvas in which editable text is created
     * @param properties object          Object of element's SVG attributes
     * @param getHandler function        Function used to get current content
     * @param setHandler function        Function used to set new content
     */
    function EditableContent(canvas, properties, getHandler, setHandler) {
        this._canvas = canvas;

        this._properties = Object.assign({
            dominantBaseline: "text-before-edge"
        }, (properties || {}));

        // handlers
        this._getHandler = getHandler;
        this._setHandler = setHandler;
        this._emptyHandler = null;

        this._text = null;
        this._input = null;

        var that = this;
        this._sizeHandler = function() {
            return that._text.getBoundingClientRect();
        };

        // dom
        this._createSharedElements(); // abstract
    }

    EditableContent.prototype._setInputHandlers = function() {
        var that = this;
        if (ns.Diagram.allowEdit) {
            this._text.classList.add("editable");

            this._text.addEventListener("mousedown", function(e) {
                if (!that._canvas.inCorrectionMode && !that._canvas.isInMode("isa")) {
                    that._canvas.Mouse.down(e, that);
                }
            });
        }
    };

    EditableContent.prototype.getTextDom = function() {
        return this._text;
    };

    EditableContent.prototype.setEmptyHandler = function(callback) {
        this._emptyHandler = callback;
    };

    /**
     * Handler for computing desired size should return object with width and height,
     * usually bounding client rectangle
     */
    EditableContent.prototype.setSizeHandler = function(callback) {
        this._sizeHandler = callback;
    };

    /** Value handling */

    EditableContent.prototype._getValue = function() {
        return this._getHandler() || "Editable Text";
    };
    EditableContent.prototype._setValue = function() {
        this._setHandler(this._input.value);
        this._text.innerHTML = this._getValue();
    };

    EditableContent.prototype.redraw = function() {
        this._text.innerHTML = "";
        this._text.innerHTML = this._getValue();
    };

    /** Input handling */

    EditableContent.prototype.getFontSize = function(considerZoom) {
        considerZoom = (typeof considerZoom == "boolean" ? considerZoom : true);

        var fontSize = window.getComputedStyle(this._text, null).getPropertyValue("font-size");
        if (fontSize) {
            var size = parseFloat(fontSize);
            if (considerZoom) { size *= this._canvas.getZoomLevel(); }
            return size+"px";
        }
        return null;
    };

    EditableContent.prototype._placeInput = function(x, y, align) {
        var cont = this._canvas._container.getBoundingClientRect();
        this._input.style.textAlign = align || "left";
        this._input.style.left   = (x - cont.left) + "px";
        this._input.style.top    = (y - cont.top) + "px";
    };

    EditableContent.prototype._hideInput = function() {
        this._input.style.display = "none";
        this._text.style.visibility = "visible";

        EditableContent.shown = false;
    };

    EditableContent.prototype.onMouseUp = function(e, mouse) {
        if (!this._canvas.inCorrectionMode) {
            this.showInput();
        }
    };

    /** Key press handling */

    EditableContent.prototype._confirm = function() {
        this._input.value = this._input.value.trim();
        if (this._input.value == "") {
            if (this._emptyHandler) {
                this._hideInput();
                this._emptyHandler();
            } else {
                this._cancel();
            }
        } else {
            this._setValue();
            this._hideInput();
        }
    };

    EditableContent.prototype._cancel = function() {
        this._input.onblur = null;
        this._input.value = this._getValue(); // set old value, so the blur event won't update it
        this._hideInput();
    };

    return EditableContent;
})();
/** src/view/EditableLongText.js */
DBSDM.View = DBSDM.View ||{};

DBSDM.View.EditableLongText = (function(){
    var ns = DBSDM;

    var Super = ns.View.EditableContent;

    /**
     * Create new editable text in view
     * @param canvas     Canvas          Canvas in which editable text is created
     * @param x          number|string   x coordinate of text, may be either number of pixels
     *                                   or percent string (and possibly all other CSS options).
     *                                   Has no effect when creating `tspan` element (leave null)
     * @param y          number|string   y coordinate of text, see @x
     * @param properties object          Object of element's SVG attributes
     * @param getHandler function        Function used to get current content
     * @param setHandler function        Function used to set new content
     */
    function EditableLongText(canvas, x, y, properties, getHandler, setHandler) {
        this._canvas = canvas;

        this._properties = Object.assign({
            dominantBaseline: "text-before-edge"
        }, (properties || {}));

        var that = this;

        // handlers
        this._getHandler = getHandler;
        this._setHandler = setHandler;
        this._emptyHandler = null;

        this._sizeHandler = function() {
            return that._text.getBoundingClientRect();
        };

        // dom
        this._createSharedElements();

        this._x = x;

        this._text = ns.Element.text(x, y, "", this._properties);
        this._input = this._canvas.getSharedHTMLElement("EditableLongText.Textarea");
        this._hideInput();

        this._text.appendChild(this._getTextSVG());

        // set input handlers
        this._setInputHandlers.call(this);
    }
    EditableLongText.prototype = Object.create(Super.prototype);
    EditableLongText.prototype.constructor = EditableLongText;


    EditableLongText.prototype._createSharedElements = function() {
        if (this._canvas.hasSharedHTMLElement('EditableLongText.Textarea')) { return; }

        var input = document.createElement("textarea");
        input.className = "editableSvgText";
        this._canvas.createSharedHTMLElement("EditableLongText.Textarea", input);
    };

    EditableLongText.prototype._getTextSVG = function() {
        var that = this;
        var dy = 0;

        var lineHeight = window.getComputedStyle(this._text, null).getPropertyValue("line-height");

        if (!lineHeight) { // dirty hack for chrome, where it doesn't seem to work on SVG element
            var div = document.createElement("div");
            div.classList.add("note-content-helper"); // TODO change if used elsewhere
            document.body.appendChild(div);
            lineHeight = window.getComputedStyle(div, null).getPropertyValue("line-height");
            document.body.removeChild(div);
        }

        var fragment = document.createDocumentFragment();
        this._getValue().split("\n").forEach(function(line){
            var tspan = ns.Element.el("tspan", that._properties);
            tspan.innerHTML = line;

            ns.Element.attr(tspan, {x: that._x, dy: dy});
            fragment.appendChild(tspan);

            dy = lineHeight;
        });
        return fragment;
    };

    /** @override */
    EditableLongText.prototype._setValue = function() {
        this._setHandler(this._input.value);
        this._text.innerHTML = "";
        this._text.appendChild(this._getTextSVG())
    };

    /** @override */
    EditableLongText.prototype.redraw = function() {
        this._text.innerHTML = "";
        this._text.appendChild(this._getTextSVG())
    };

    /** Input handling */

    EditableLongText.prototype._setInputPosition = function() {

        var sizeRect = this._sizeHandler();
        this._input.style.width = sizeRect.width + "px";
        this._input.style.height = sizeRect.height +"px";

        var svgRect = this._text.getBoundingClientRect();
        var x = svgRect.left;
        var y = svgRect.top - 1;

        this._placeInput(x, y);
    };

    EditableLongText.prototype.showInput = function() {
        if (!ns.Diagram.allowEdit) { return; }
        ns.Menu.hide();

        var fontSize = this.getFontSize();
        if (fontSize) {
            this._input.style.fontSize = this.getFontSize();
        }

        this._input.value = this._getValue();

        this._setInputPosition();
        this._input.style.display = "block";
        this._input.focus();

        this._text.style.visibility = "hidden";

        Super.shown = true;

        //
        var that = this;
        this._input.onkeyup = function(e) { that._keyHandler(e); };
        this._input.onblur  = function(e) { that._confirm(e); };
    };

    /** Key press handling */

    EditableLongText.prototype._keyHandler = function(e) {
        if (e.keyCode == 27) { // esc
            this._confirm();
        }
    };

    return EditableLongText;
})();
/** src/view/EditableText.js */
DBSDM.View = DBSDM.View ||{};

DBSDM.View.EditableText = (function(){
    var ns = DBSDM;

    var Super = ns.View.EditableContent;

    /**
     * Create new editable text in view
     * @param canvas     Canvas          Canvas in which editable text is created
     * @param x          number|string   x coordinate of text, may be either number of pixels
     *                                   or percent string (and possibly all other CSS options).
     *                                   Has no effect when creating `tspan` element (leave null)
     * @param y          number|string   y coordinate of text, see @x
     * @param properties object          Object of element's SVG attributes
     * @param getHandler function        Function used to get current content
     * @param setHandler function        Function used to set new content
     * @param el         string          Name of the SVG element to be created. Currently only "tspan" is supported,
     *                                   all other values generate `text` element
     */
    function EditableText(canvas, x, y, properties, getHandler, setHandler, el) {
        Super.call(this, canvas, properties, getHandler, setHandler);

        this._leftOffset = 0;

        // handlers
        this._nextHandler = null;

        var that = this;
        this._sizeHandler = function(){
            that._span.innerHTML = that._input.value;
            return {width: that._span.getBoundingClientRect().width};
        };

        // dom
        if (el == "tspan") {
            this._text = ns.Element.el("tspan", this._properties);
            this._text.innerHTML = this._getValue();
        } else {
            this._text = ns.Element.text(x, y, this._getValue(), this._properties);
        }

        this._input = this._canvas.getSharedHTMLElement("EditableText.Input");
        this._span = this._canvas.getSharedHTMLElement("EditableText.Span");
        this._hideInput();

        // set input handlers
        this._setInputHandlers.call(this);
    }
    EditableText.prototype = Object.create(Super.prototype);
    EditableText.prototype.constructor = EditableText;


    EditableText.prototype._createSharedElements = function() {
        if (this._canvas.hasSharedHTMLElement('EditableText.Input')) { return; }

        var input = document.createElement("input");
        input.className = "editableSvgText";
        input.type = "text";
        this._canvas.createSharedHTMLElement("EditableText.Input", input);

        var span = document.createElement("span");
        span.style.position = "absolute";
        span.style.left = "-2000px";
        this._canvas.createSharedHTMLElement("EditableText.Span", span);
    };

    EditableText.prototype.setNextHandler = function(callback) {
        this._nextHandler = callback;
    };

    /** Input handling */

    EditableText.prototype._setInputPosition = function() {
        var sizeRect = this._sizeHandler();
        this._input.style.width = sizeRect.width + "px";

        var svgRect = this._text.getBoundingClientRect();

        var align = "left";
        var x = svgRect.left + this._leftOffset;
        var y = svgRect.top - 1;
        if (this._properties.textAnchor && this._properties.textAnchor == "middle") {
            align = "center";
            x = Math.floor((svgRect.left + svgRect.right - sizeRect.width)/2 + 3);
        }

        this._placeInput(x, y, align);
    };

    EditableText.prototype.showInput = function() {
        if (!ns.Diagram.allowEdit) { return; }
        ns.Menu.hide();

        var fontSize = this.getFontSize();
        if (fontSize) {
            this._input.style.fontSize = fontSize;
            this._span.style.fontSize = fontSize;
        }

        var value = this._getValue();
        this._input.value = value;

        this._leftOffset = this._text.getBoundingClientRect().width - this._text.getComputedTextLength(); // fix for Chrome not handling boundClientRect of tspans correctly

        this._setInputPosition();
        this._input.style.display = "block";

        // select all contents
        this._input.focus();
        this._input.setSelectionRange(0, value.length);

        this._text.style.visibility = "hidden";

        Super.shown = true;

        //
        var that = this;
        this._input.onkeydown = function(e) { that._keyDownHandler(e); };
        this._input.onkeyup = function(e) { that._keyHandler(e); };
        this._input.onblur  = function(e) { that._confirm(e); };
    };

    /** Key press handling */

    EditableText.prototype._next = function(e) {
        if (!this._nextHandler) { return; }
        this._confirm();
        this._nextHandler(e.shiftKey);
        e.preventDefault();
    };

    EditableText.prototype._keyDownHandler = function(e) {
        if (e.keyCode == 9) {
            this._next(e);
        }
    };

    EditableText.prototype._keyHandler = function(e) {
        if (e.keyCode == 13) { // enter
            this._confirm();
        } else if (e.keyCode == 27) { // esc
            this._cancel();
        } else if (e.keyCode == 9) {
            // handled on key down
        } else {
            this._setInputPosition();
        }
    };

    return EditableText;
})();
/** src/view/Entity.js */
DBSDM.View = DBSDM.View ||{};

DBSDM.View.Entity = (function(){
    var ns = DBSDM;

    var Super = ns.View.CanvasObject;

    function Entity(canvas, model, control) {
        Super.call(this, canvas, model, control);

        this._bg = null;
        this._name = null;
        this._attrContainer = null;

        this._xorNodes = [];
    }
    Entity.prototype = Object.create(Super.prototype);
    Entity.prototype.constructor = Entity;

    Entity.prototype.getAttrContainer = function() {
        return this._attrContainer;
    };

    Entity.prototype.getMinimalSize = function() {
        var rect = this._name.getBoundingClientRect();
        return {
            width: rect.width + ns.Consts.EntityPadding,
            height: rect.height + ns.Consts.EntityPadding + ns.Consts.EntityExtraHeight
        };
    };

    Entity.prototype.setParent = function(parentDom) {
        parentDom.appendChild(this._dom);
    };

    /**
     * Create empty entity (background only), when creating new Entity from canvas
     */
    Entity.prototype.createEmpty = function() {
        var transform = this._model.getTransform();
        this._dom = ns.Element.el("svg", transform);
        this._dom.style.overflow = "visible";

        this._bg = this._dom.appendChild(ns.Diagram.getSharedElement("Entity.Bg"));
        this._canvas.svg.appendChild(this._dom);
    };

    /**
     * Finish creation of entity, create other elements and attach control
     */
    Entity.prototype.create = function(control) {
        var mouse = this._canvas.Mouse;

        var that = this;
        var nameInput = new ns.View.EditableText(this._canvas,
            "50%", ns.Consts.EntityStrokeWidth,
            { class: "entity-name", textAnchor: "middle" },
            function() { return that._model.getName(); },
            function(value) { that._control.setName(value); }
        );

        this._name = this._dom.appendChild(nameInput.getTextDom());
        this._attrContainer = this._dom.appendChild(
            ns.Element.el("svg", {
                x: 0, y: ns.Consts.EntityAttributesOffset
            })
        );

        this.defaultMark();

        this._comment = this._dom.appendChild(ns.Element.title());
        this.updateComment();

        this._dom.addEventListener("mousedown", function(e) { mouse.down(e, control); });
        this._dom.addEventListener("mouseenter", function(e) { mouse.enter(e, control); });
        this._dom.addEventListener("mouseleave", function(e) { mouse.leave(e); });
        this._dom.addEventListener("contextmenu", function(e) { DBSDM.Menu.attach(control, "entity"); });
    };

    // XOR

    Entity.prototype.clearXor = function(index) {
        this._xorNodes[index].remove();
        this._xorNodes.splice(index, 1);
    };

    Entity.prototype.drawXor = function(edges, index, edgeDistance) {
        if (this._xorNodes[index]) {
            this._xorNodes[index].remove();
            this._xorNodes[index] = null;
        }

        var arcNode = ns.View.Arc.build(edges, this._model.getXor(index), edgeDistance);
        this._dom.appendChild(arcNode);
        this._xorNodes[index] = arcNode;
    };

    //

    Entity.prototype.select = function() {
        ns.Element.attr(this._bg, {href: "#Entity.Bg.Selected"});
    };

    Entity.prototype.defaultMark = function() {
        if (this._model.incorrect) {
            ns.Element.attr(this._bg, {href: "#Entity.Bg.Incorrect"});
        } else {
            ns.Element.attr(this._bg, {href: "#Entity.Bg"});
        }
    };

    return Entity;
})();
/** src/view/Note.js */
DBSDM.View = DBSDM.View ||{};

DBSDM.View.Note = (function(){
    var ns = DBSDM;

    var Super = ns.View.CanvasObject;

    function Note(canvas, model, control) {
        Super.call(this, canvas, model, control);
        this._bg = null;
        this._text = null;
    }
    Note.prototype = Object.create(Super.prototype);
    Note.prototype.constructor = Note;

    Note.prototype.getMinimalSize = function() {
        var div = document.createElement("div");
        div.classList.add("note-content-helper");
        div.style.whiteSpace = "pre";

        var fontSize = this._text.getFontSize(false);
        if (fontSize) {
            div.style.fontSize = fontSize;
        }
        div.textContent = this._model.getText();

        document.body.appendChild(div);
        var rect = div.getBoundingClientRect();

        document.body.removeChild(div);

        return {
            width: rect.width + ns.Consts.NotePadding*2,
            height: rect.height + ns.Consts.NotePadding*2
        };
    };

    /**
     * Create Note
     */
    Note.prototype.create = function() {
        var transform = this._model.getTransform();
        this._dom = ns.Element.el("svg", transform);
        this._dom.style.overflow = "visible";

        this._bg = this._dom.appendChild(ns.Diagram.getSharedElement("Note.Bg"));
        this._canvas.svg.appendChild(this._dom);

        var that = this;

        this._text = new ns.View.EditableLongText(this._canvas,
            ns.Consts.NotePadding, ns.Consts.NotePadding - 2, // -2 due to weird positioning in svg text
            { class: "note-content" },
            function() { return that._model.getText(); },
            function(value) { that._control.setText(value); }
        );
        this._text.setSizeHandler(function(){
            var rect = that._bg.getBoundingClientRect();
            return {
                width: rect.width - 2*ns.Consts.NotePadding,
                height: rect.height - 2*ns.Consts.NotePadding
            };
        });
        this._dom.appendChild(this._text.getTextDom());

        this.defaultMark();

        this._comment = this._dom.appendChild(ns.Element.title());
        this.updateComment();

        this._dom.addEventListener("mousedown", function(e) { that._canvas.Mouse.down(e, that._control); });
        this._dom.addEventListener("contextmenu", function() { ns.Menu.attach(that._control, "note"); });
    };

    Note.prototype.edit = function() {
        this._text.showInput();
    };

    Note.prototype.show = function() {
        this._dom.style.display='block';
    };
    Note.prototype.hide = function() {
        this._dom.style.display='none';
    };

    Note.prototype.defaultMark = function() {
        if (this._model.incorrect) {
            ns.Element.attr(this._bg, {href: "#Note.Bg.Incorrect"});
        } else {
            ns.Element.attr(this._bg, {href: "#Note.Bg"});
        }
    };

    return Note;
})();
/** src/view/Relation.js */
DBSDM.View = DBSDM.View ||{};

DBSDM.View.Relation = (function(){
    var ns = DBSDM;

    function Relation(canvas, model, control) {
        this._canvas = canvas;
        this._model = model;
        this._control = control;

        // DOM
        this._g = null;
        this._middle = null;
    }

    Relation.prototype.draw = function(sourceLegDomFragment, targetLegDomFragment) {
        this._middle = ns.Diagram.getSharedElement("Relation.MiddlePoint", { class: "cp middle" });

        this._g = ns.Element.g(
            sourceLegDomFragment,
            targetLegDomFragment,
            this._middle
        );
        this._g.classList.add("rel");

        this._canvas.svg.appendChild(this._g);

        var that = this;
        this._middle.addEventListener("mousedown", function(e) { that._canvas.Mouse.down(e, that._control); });

        this._g.addEventListener("contextmenu", function(e) {
            if (e.target.classList.contains("middle")) {
                ns.Menu.attach(that._control, "relationMiddle");
            }

            ns.Menu.attach(that._control, "relation");
        });
    };

    Relation.prototype.redraw = function() {
        ns.Element.attr(this._middle, this._model.getMiddlePoint());
    };

    Relation.prototype.toBack = function() {
        var first = this._g.parentNode.querySelector(":first-child");
        if (first == this._g) { return; }
        this._canvas.svg.insertBefore(this._g, first);
    };
    Relation.prototype.toFront = function() {
        this._canvas.svg.insertBefore(this._g, null);
    };

    Relation.prototype.clear = function() {
        this._g.remove();
        this._g = null;
        this._middle = null;
    };

    return Relation;
})();
/** src/view/RelationLeg.js */
DBSDM.View = DBSDM.View ||{};

DBSDM.View.RelationLeg = (function(){
    var ns = DBSDM;
    var Enum = ns.Enums;

    function RelationLeg(canvas, model, control) {
        this._canvas = canvas;
        this._model = model;
        this._control = control;

        // dom
        this._g = null;
        this._anchor = null;
        this._line = null;
        this._lineControl = null;
        this._name = null;
        this._comment = null;

        this._cp = [];

        this._cardinality = null;
        this._identifying = null;
    }

    RelationLeg.prototype.draw = function() {
        this._g = ns.Element.g();

        this._comment = ns.Element.title();

        this._buildLine();
        this._buildAnchor();

        this._g = ns.Element.g(
            this._comment,
            this._lineControl,
            this._line,
            this._anchor
        );

        this.updatePoints();
        this.updateType();

        ns.Element.attr(this._g, {class: "leg"});

        this.updateComment();

        if (this._model.incorrect) {
            this.markIncorrect();
        }

        var that = this;
        this._g.addEventListener("mousedown", function(e) {
            var className = e.target.getAttribute("class");

            var params = null;
            if (className == "anchor" || className == "line") {
                params = {
                    action: className
                }
            }
            if (className == "cp") {
                params = { action: className, index: 1 + that.getCpIndex(e.target) };
            }

            if (params != null) {
                that._canvas.Mouse.down(e, that._control, params);
            }
        });

        this._g.addEventListener("contextmenu", function(e){
            var cls = e.target.getAttribute("class");
            if (cls == "cp") {
                ns.Menu.attach(that._control, "relationCP", {index: 1 + that.getCpIndex(e.target)});
            }
            ns.Menu.attach(that._control, "relationLeg");
        });
    };

    RelationLeg.prototype.getDom = function() {
        return this._g;
    };

    RelationLeg.prototype.onEntityAttached = function() {
        this._g.classList.add("attached");
    };

    // anchor

    RelationLeg.prototype._buildAnchor = function() {
        this._anchor = ns.Element.g(
            ns.Diagram.getSharedElement('Relation.AnchorControl', {class: "anchor"})
        );
        this.updateAnchorType();

        this._model.setAnchorOffset(ns.Consts.DefaultAnchorOffset);
    };

    RelationLeg.prototype.updateAnchorType = function() {
        if (this._model.getCardinality() == Enum.Cardinality.MANY) {
            if (this._cardinality == null) {
                this._cardinality = this._anchor.appendChild(ns.Diagram.getSharedElement('Relation.AnchorMany'));
            }
        } else {
            if (this._cardinality != null) {
                this._cardinality.remove();
                this._cardinality = null;
            }
        }

        if (this._model.isIdentifying()) {
            if (this._identifying == null) {
                this._identifying = this._anchor.appendChild(ns.Diagram.getSharedElement('Relation.AnchorIdentifying'));
            }
        } else {
            if (this._identifying != null) {
                this._identifying.remove();
                this._identifying = null;
            }
        }
    };

    RelationLeg.prototype.updateAnchorPosition = function() {
        var anchor = this._model.getAnchor();
        ns.Element.transform(this._anchor, [anchor.x, anchor.y], [anchor.edge*90, 0, 0]);
    };

    // line

    RelationLeg.prototype._buildLine = function() {
        this._line = ns.Element.el("polyline", {
            points: "0 0 0 0",
            fill: "none",
            stroke: "black",
            strokeWidth: 1,
            strokeLinejoin: "round"
        });
        this._lineControl = ns.Element.el("polyline", {
            points: "0 0 0 0",
            fill: "none",
            stroke: "none",
            strokeWidth: 10,
            strokeLinecap: "butt",
            strokeLinejoin: "round",
            class: "line"
        });
    };

    RelationLeg.prototype._getPointsString = function(points) {
        var a = this._model.getAnchor();
        return a.x+" "+a.y+" "+ points
            .map(function(p) { return [p.x, p.y] })
            .reduce(function(a, b) { return a.concat(b) })
            .join(" ");
    };

    RelationLeg.prototype.updatePoints = function() {
        var points = this._model.getPoints();
        var pointsString = this._getPointsString(points);

        ns.Element.attr(this._line, { points: pointsString });
        ns.Element.attr(this._lineControl, { points: pointsString });

        // update control points
        var i;
        if (this._cp.length != points.length-2) {
            this._clearControlPoints();
            for (i=1; i<points.length-1; i++) {
                this.buildControlPoint(i, points[i])
            }
        } else {
            for (i=1; i<points.length-1; i++) {
                ns.Element.attr(this._cp[i-1], points[i]);
            }
        }

        this.updateNamePosition();
    };

    RelationLeg.prototype.updateType = function() {
        ns.Element.attr(this._line, {
            strokeDasharray: (this._model.isOptional() ? 5 : null)
        });
    };

    // select
    RelationLeg.prototype.select = function() {
        this._g.classList.add("selected");
    };
    RelationLeg.prototype.allow = function() {
        this._g.classList.add("allowed");
    };
    RelationLeg.prototype.mark = function() {
        this._g.classList.add("marked");
    };
    RelationLeg.prototype.clearSelectionClasses = function() {
        this._g.classList.remove("selected");
        this._g.classList.remove("allowed");
        this._g.classList.remove("marked");
    };

    RelationLeg.prototype.markIncorrect = function() {
        this._g.classList.add("incorrect");
    };
    RelationLeg.prototype.markCorrect = function() {
        this._g.classList.remove("incorrect");
    };

    // control points

    RelationLeg.prototype.buildControlPoint = function(index, p) {
        var cp = this._g.appendChild(
            ns.Diagram.getSharedElement("Relation.CP", {
                x: p.x, y: p.y,
                class: "cp"
            })
        );

        this._cp.splice(index-1, 0, cp);
    };

    RelationLeg.prototype.getCpIndex = function(cp) {
        for (var index = 0; index < this._cp.length; index++) {
            if (this._cp[index] == cp) {
                return index
            }
        }
        return -1;
    };

    RelationLeg.prototype.removeControlPoint = function(index) {
        this._cp[index].remove();
        this._cp.splice(index, 1);
    };

    RelationLeg.prototype._clearControlPoints = function() {
        for (var i=0;i <this._cp.length; i++) {
            this._cp[i].remove();
        }
        this._cp = [];
    };

    // name
    RelationLeg.prototype.showName = function() {
        if (this._name) { return; }

        var that = this;
        var model = this._model;
        var name = new ns.View.EditableText(this._canvas, 0, 0, {},
            function()     { return model.getName() || "relation"; },
            function(name) { model.setName(name); }
        );
        name.setEmptyHandler(function(){
            model.setName(null);
            that.hideName();
        });

        this._name = name.getTextDom();
        this.updateNamePosition();
        this._g.appendChild(this._name);
    };

    RelationLeg.prototype.hideName = function() {
        if (!this._name) { return; }
        this._name.remove();
        this._name = null;
    };

    RelationLeg.prototype.toggleName = function() {
        if (this._name) {
            this.hideName();
        } else {
            this.showName();
        }
    };

    RelationLeg.prototype.updateNamePosition = function() {
        if (!this._name) { return; }
        var nameOffset = 10; // TODO

        var A = this._model.getAnchor();
        var P = this._model.getPoint(0);

        var textAnchor = "start";
        var baseline = "text-after-edge";
        var dx = 0;
        var dy = 0;
        switch(A.edge) {
            case Enum.Edge.TOP:    dy = -nameOffset; break;
            case Enum.Edge.RIGHT:  dx =  nameOffset; break;
            case Enum.Edge.BOTTOM: dy =  nameOffset; baseline = "text-before-edge"; break;
            case Enum.Edge.LEFT:   dx = -nameOffset; textAnchor = "end"; break;
        }

        ns.Element.attr(this._name, {
            x: P.x + dx,
            y: P.y + dy,
            dominantBaseline: baseline,
            textAnchor: textAnchor
        });
    };

    // comment

    RelationLeg.prototype.updateComment = function() {
        if (!this._comment) { return; }

        let comment = this._model.getComment();
        this._comment.innerHTML = comment;

        if (comment) {
            this._g.classList.add("hasComment");
        } else {
            this._g.classList.remove("hasComment");
        }
    };

    return RelationLeg;
})();
