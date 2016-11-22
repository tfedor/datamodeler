var DBSDM = DBSDM || {};
DBSDM.Geometry = DBSDM.Geometry || {};

DBSDM.Geometry.Vector = (function() {
    var ns = DBSDM;

    function Vector(x, y) {
        this.x = x || 0;
        this.y = y || 0;
    }

    Vector.prototype.fromPoints = function(A, B) {
        this.x = B.x - A.x;
        this.y = B.y - A.y;
        return this;
    };

    Vector.prototype.reset = function() {
        this.x = 0;
        this.y = 0;
    };

    Vector.prototype.add = function(vector) {
        this.x += vector.x;
        this.y += vector.y;
    };

    Vector.prototype.multiply = function(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        return this;
    };

    Vector.prototype.normalize = function() {
        var len = this.getLength();
        if (len != 0) {
            this.multiply(1/len)
        }
        return this;
    };

    Vector.prototype.getLength = function() {
        return Math.sqrt(this.y*this.y + this.x*this.x);
    };

    Vector.prototype.getManhattan = function() {
        return Math.abs(this.x) + Math.abs(this.y);
    };

    Vector.prototype.getOpposite = function() {
        return new ns.Geometry.Vector(-this.x, -this.y);
    };

    return Vector;
}());
