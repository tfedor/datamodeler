var DBSDM = DBSDM || {};
DBSDM.Model = DBSDM.Model ||{};

DBSDM.Model.AttributeList = (function(){
    var ns = DBSDM;

    function AttributeList() {
        this._list = [];
    }

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

    return AttributeList;
})();
