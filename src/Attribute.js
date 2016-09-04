
var Attribute = (function(){

    var offset = 20;
    var height = 20;

    function Attribute(entity, order) {
        this._entity = entity;
        this._order = order || 0;

        this._index = {
            primary: false,
            unique: false
        };
        this._type = {
            nullable: false
        };
        this._name = new EditableText(30, 0, "Attribute", {dominantBaseline: "text-before-edge"});

        this._dom = null;
        this._indexDom = null;
        this._typeDom = null;
    }

    Attribute.prototype.isPrimary = function(bool) {
        if (typeof bool == 'boolean') {
            this._index.primary = bool;
            this._index.unique = !bool;
        } else {
            return this._index.primary;
        }
    };

    Attribute.prototype.isUnique = function(bool) {
        if (typeof bool == 'boolean') {
            this._index.primary = !bool;
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
            var str = "&nbsp;";
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

    Attribute.prototype._setPosition = function() {
        this._dom.attr({
            transform: "translate(0, "+ (offset + this._order * height) +")"
        });
    };

    Attribute.prototype.reorder = function(newOrder) {
        this._order = newOrder;
        if (this._dom) {
            this._setPosition();
        }
    };

    Attribute.prototype.draw = function(canvas) {
        this._indexDom = canvas.Paper.text(10, 0, "").attr({dominantBaseline: "text-before-edge"});
        this._typeDom = canvas.Paper.text(20, 0, "").attr({dominantBaseline: "text-before-edge"});

        this._updateIndex();
        this._updateType();

        this._dom = canvas.Paper.g();
        this._dom.append(this._indexDom);
        this._dom.append(this._typeDom);
        this._dom.append(this._name.draw(canvas));

        this._setPosition();

        // menu
        var that = this;
        this._dom.node.addEventListener("mouseenter", function() { that.attachMenu(); });
        this._dom.node.addEventListener("mouseleave", function() { that.detachMenu(); });

        return this._dom;
    };

    Attribute.prototype.attachMenu = function() {
        //if (this._menuBlocked) { return; }
        //this._menuAttached = true;
        canvas.menu.AttributeLeft.attachTo(this._dom.node, 0, this);
        canvas.menu.AttributeRight.attachTo(this._dom.node, 30 + this._name.getWidth(), this);
    };

    Attribute.prototype.detachMenu = function() {
        //if (this._menuBlocked) { return; }
        canvas.menu.AttributeLeft.detach();
        canvas.menu.AttributeRight.detach();
        //this._menuAttached = false;
    };

    Attribute.prototype.handleMenu = function(action) {
        if (action == "changePrimary") {
            this.isPrimary(!this.isPrimary());
            this._updateIndex();
        } else if (action == "changeUnique") {
            this.isUnique(!this.isUnique());
            this._updateIndex();
        } else if (action == "changeRequired") {
            this.isNullable(!this.isNullable());
            this._updateType();
        } else if ("delete") {
            this._entity.deleteAttribute(this._order);
            this._dom.remove();
        }
    };

    return Attribute;
})();
