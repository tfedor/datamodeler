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
