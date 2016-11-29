var DBSDM = DBSDM || {};
DBSDM.Control = DBSDM.Control ||{};

DBSDM.Control.Attribute = (function(){
    var ns = DBSDM;

    function Attribute(list, model, canvas, entityControl) {
        this._list = list;

        this._model = (model || new DBSDM.Model.Attribute());
        this._view = new ns.View.Attribute(this._model, this, canvas);
        this._view.create(this, entityControl.getAttrContainer());

        this._dragOffset = null;
        this._dragStartPosition = null;
        this._dragCurrentPosition = null;
    }

    Attribute.prototype._delete = function() {
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

    // Menu Handlers
    Attribute.prototype.handleMenu = function(action) {
        switch(action) {
            case "primary":
                this._model.setPrimary(  !this._model.isPrimary()  );
                this._view.redrawIndex();
                break;
            case "unique":
                this._model.setUnique(   !this._model.isUnique()   );
                this._view.redrawIndex();
                break;
            case "nullable":
                this._model.setNullable( !this._model.isNullable() );
                this._view.redrawNullable();
                break;
            case "delete":
                this._delete();
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
        if (!ns.Diagram.allowEdit) { return; }
        this._dragOffset = e.clientY - this._view.getEdges().top;

        this._dragStartPosition = this._list.getPosition(this._model);
        this._dragCurrentPosition = this._dragStartPosition;

        this._view.dragStarted();
    };

    Attribute.prototype.onMouseMove = function(e, mouse) {
        if (!ns.Diagram.allowEdit) { return; }
        var delta = Math.floor((mouse.dy + this._dragOffset) / 18);
        var position = this._dragStartPosition + delta;

        if (position != this._dragCurrentPosition) {
            this._dragCurrentPosition = this._list.setPosition(this._model, position);
        }
    };

    Attribute.prototype.onMouseUp = function(e, mouse) {
        this._view.dragEnded();
    };

    return Attribute;
})();
