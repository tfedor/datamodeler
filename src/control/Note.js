var DBSDM = DBSDM || {};
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
        this._model.setText(text);
        this.encompassContent();
    };

    Note.prototype.delete = function() {
        if (!ns.Diagram.allowEdit) { return; }
        this._canvas.removeNote(this);
        this._view.remove();
    };

    Note.prototype.show = function() {
        this._view.show();
    };
    Note.prototype.hide = function() {
        this._view.hide();
    };

    Note.prototype.fitToContents = function() {
        var size = this._view.getMinimalSize();
        this._model.setSize(size.width, size.height);
        this._view.redraw();
        return this;
    };

    // Menu Handlers
    Note.prototype.handleMenu = function(action) {
        switch(action) {
            case "delete": this.delete(); break;
            case "fit": this.fitToContents(); break;
        }
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
        if (this._canvas.inCorrectionMode) {
            this._toggleIncorrect();
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
        switch(e.keyCode) {
            case 46: this.delete(); break; // del
            case 27: this.deactivate(); break; // esc
        }
    };

    return Note;
})();
