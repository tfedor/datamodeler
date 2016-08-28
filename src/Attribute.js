
var Attribute = (function(){

    var offset = 60;
    var height = 60;

    function Attribute(order) {
        this._order = order || 0;

        this._index = {
            primary: false,
            unique: false
        };
        this._type = {
            nullable: false
        };
        this._name = new EditableText(20, 0, "Attribute", {dominantBaseline: "text-before-edge"});

        this._dom = null;
        this._indexDom = null;
        this._typeDom = null;
    }

    Attribute.prototype.isPrimary = function(bool) {
        if (typeof bool == 'boolean') {
            this._index.primary = bool;
        } else {
            return this._index.primary;
        }
    };

    Attribute.prototype.isUnique = function(bool) {
        if (typeof bool == 'boolean') {
            this._index.unique = bool;
        } else {
            return this._index.unique;
        }
    };

    Attribute.prototype.isNullable = function(bool) {
        if (typeof bool == 'boolean') {
            this._type.nullable = bool;
        } else {
            return this._type.nullable;
        }
    };

    Attribute.prototype._updateIndex = function() {
        if (this._indexDom) {
            var str = "";
            if (this._index.primary) {
                str = "#";
            } else if (this._index.unique) {
                str = "U";
            }
            this._indexDom.node.innerHTML = str
        }
    };

    Attribute.prototype._updateType = function() {
        if (this._indexDom) {
            var str = "*";
            if (this._type.nullable) {
                str = "o";
            }
            this._typeDom.node.innerHTML = str
        }
    };

    Attribute.prototype.draw = function(canvas) {
        this._indexDom = canvas.Paper.text(0, 0, "").attr({dominantBaseline: "text-before-edge"});
        this._typeDom = canvas.Paper.text(10, 0, "").attr({dominantBaseline: "text-before-edge"});

        this._updateIndex();
        this._updateType();

        this._dom = canvas.Paper.svg(0, offset + this._order*height, "100%", height);
        this._dom.append(this._indexDom);
        this._dom.append(this._typeDom);
        this._dom.append(this._name.draw(canvas));

        return this._dom;
    };

    return Attribute;
})();
