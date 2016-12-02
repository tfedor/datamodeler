var DBSDM = DBSDM || {};
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

    AttributeList.prototype.removeAttribute = function(attrModel, control) {
        this._model.remove(attrModel);

        var index = this._controls.findIndex(function(element, index, array) {
            return element == control;
        });
        this._controls.splice(index, 1);
        this._updatePositions();
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

    return AttributeList;
})();
