var DBSDM = DBSDM || {};
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
