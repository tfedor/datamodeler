var DBSDM = DBSDM || {};

DBSDM.Geometry = (function() {
    var self = {};

    self.pointToPointDistance = function(A, B) {
        var x = B.x - A.x;
        var y = B.y - A.y;
        return Math.sqrt(x*x + y*y);
    };
    self.pointToPointSquareDistance = function(A, B) {
        var x = B.x - A.x;
        var y = B.y - A.y;
        return x*x + y*y;
    };

    self.pointToLineDistance = function(p, P1, P2) {
        var a = (P2.y - P1.y);
        var b = (P2.x - P1.x);
        var c = P2.x*P1.y - P2.y*P1.x;

        var y = P2.y - P1.y;
        var x = P2.x - P1.x;

        return Math.abs(a*p.x - b*p.y + c) / Math.sqrt(y*y + x*x);
    };

    self.isBetween = function(x, a, b, offset) {
        if (b < a) {
            return b-offset <= x && x <= a+offset;
        } else {
            return a-offset <= x && x <= b+offset;
        }
    };

    self.pointIsInBox = function(P, A, B, offset) {
        return self.isBetween(P.x, A.x, B.x, offset) &&
            self.isBetween(P.y, A.y, B.y, offset);
    };

    /**
     * Snap @coor to @snapA or @snapB, if inside @limit
     */
    self.snap = function(coor, snapA, snapB, limit) {
        snapB = snapB || snapA;
        var dA = Math.abs(coor - snapA);
        var dB = Math.abs(coor - snapB);

        if (dA < dB) {
            if (dA < limit) {
                return snapA;
            }
        } else {
            if (dB < limit) {
                return snapB;
            }
        }
        return coor;
    };

    self.triangleSides = function(A, B, C) {
        return [
            self.pointToPointDistance(B, C),
            self.pointToPointDistance(A, C),
            self.pointToPointDistance(A, B)
        ].sort(function(a, b) {
            return a - b;
        });
    };

    self.triangleIsRight = function(A, B, C) {
        var t = self.triangleSides(A, B, C);
        var a = t[0], b = t[1], c = t[2];
        return a*a + b*b == c*c;
    };

    self.triangleIsAcute = function(A, B, C) {
        var t = self.triangleSides(A, B, C);
        var a = t[0], b = t[1], c = t[2];
        return a*a + b*b > c*c;
    };

    self.triangleIsObtuse = function(A, B, C) {
        var t = self.triangleSides(A, B, C);
        var a = t[0], b = t[1], c = t[2];
        return a*a + b*b < c*c;
    };

    return self;
}());
