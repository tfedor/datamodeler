var DBSDM = DBSDM || {};

DBSDM.Layout = (function() {
    var ns = DBSDM;

    var M = 100; // iterations
    var c1 = 2;
    var c2 = 1;
    var c3 = 10000;
    var c4 = 5;

    var optimal = 150;
    var C = 0.2;

    function Layout() {
        this.limits = {
            top: 0,
            right: 0,
            left: 0,
            bottom: 0
        };
        this.center = {
            x: 0,
            y: 0
        }
    }

    Layout.prototype.sort = function(entities, relations) {
        for (var i=0; i<1; i++) {
            this._computeRelationsStrenghts(relations);
            this._computeEntitiesRepulsions(entities);
            this._applyForces(entities);
        }
    };

    Layout.prototype._computeRelationsStrenghts = function(relations) {
        var count = relations.length;
        for (var i=0; i<count; i++) {
            var force = relations[i].getVector();
            var rot = (Math.abs(force.x) < Math.abs(force.y) ? new ns.Geometry.Vector(force.x, 0) : new ns.Geometry.Vector(0, force.y));

            var length = force.getLength();

            //var strength = c1 * Math.log(length / c2);
            //force.multiply(strength/length); // normalize and set strength

            var scale = 0.8;
            force.multiply(scale*0.5*(length - optimal) / length);
            relations[i].addForceToEntities(force);

            rot.multiply(0.1);
            relations[i].addForceToEntities(rot);
        }
    };

    Layout.prototype._computeEntitiesRepulsions = function(entities) {
        var count = entities.length;
        console.log(count);
        for (var i=0; i<count; i++) {
            var centerA = entities[i].getCenter();

            for (var j=i+1; j<count; j++) {
                var centerB = entities[j].getCenter();
                var length = ns.Geometry.pointToPointDistance(centerA, centerB);

                //var strength = (c3 / (length * length));
                //var force = (new ns.Geometry.Vector()).fromPoints(centerA, centerB) // create new vector
                //    .multiply(strength/length); // normalize and set strength

                if (length > optimal*1.5) { continue; }

                var q1 = optimal*0.4;
                var q2 = optimal*0.4;
                var scale = 15;

                var force = (new ns.Geometry.Vector()).fromPoints(centerA, centerB) // create new vector
                    .multiply(scale * (q1*q2) / (length*length*length));

                // add repulsive forces to entities
                entities[i].addForce(force.getOpposite());
                entities[j].addForce(force);
            }
        }
    };

    Layout.prototype._applyForces = function(entities) {
        var count = entities.length;
        for (var i=0; i<count; i++) {
            entities[i].applyForce(1);
        }
    };

    return Layout;
})();
