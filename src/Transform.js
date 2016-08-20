
var Transform = (function(){

    function Transform(x, y, parent) {
        this.localPosition = {
            'x': 0,
            'y': 0
        };
        this.localPosition.x = x || 0;
        this.localPosition.y = y || 0;
        this.parent = parent || null;

        this._domObject = null;
    }

    Transform.prototype.attach = function(object) {
        this._domObject = object;
    };

    Transform.prototype.getPosition = function() {
        var position = this.localPosition;
        if (this.parent) {
            var parent = this.parent.getPosition();
            position.x += parent.x;
            position.y += parent.y;
        }
        return position;
    };

    Transform.prototype.translateTo = function(x, y) {
        this.localPosition.x = x;
        this.localPosition.y = y;
    };

    return Transform;
})();
