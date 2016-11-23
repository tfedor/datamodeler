var DBSDM = DBSDM || {};
DBSDM.Model = DBSDM.Model ||{};

DBSDM.Model.AttributeList = (function(){
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

    AttributeList.prototype._sortAttributes = function(a, b) {
        var cmp = b.isPrimary() - a.isPrimary();
        if (cmp != 0) { return cmp; }

        cmp = b.isUnique() - a.isUnique();
        if (cmp != 0) { return cmp; }

        cmp = a.isNullable() - b.isNullable();
        if (cmp != 0) { return cmp; }

        cmp = a.getName().localeCompare(b.getName());
        return cmp;
    };

    AttributeList.prototype.getExportData = function() {
        var list = Object.assign([], this._list);
        list.sort(this._sortAttributes);

        var result = [];
        for (var i=0; i<list.length; i++) {
            result.push(list[i].getData());
        }
        return result;
    };

    return AttributeList;
})();
