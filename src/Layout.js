var DBSDM = DBSDM || {};

DBSDM.Layout = (function() {
    var ns = DBSDM;

    var iterations = 100;
    var optimal = 150;
    var attractionScale = 0.3;
    var straightenScale = 0.1;
    var repulsionScale = 15;
    var applyScale = 0.4;

    function Layout() {
    }

    Layout.prototype.sort = function(entities, relations) {
        for (var i=0; i<iterations; i++) {
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

            // attraction
            force.multiply(0.5 * attractionScale*(length - optimal) / length); // only count half of vector, since it's applied to both sides
            relations[i].addForceToEntities(force);

            // straighten
            rot.multiply(straightenScale * (1 - (rot.getLength() / length))); // scale also by length, should prefer shorter leg for straightening
            relations[i].addForceToEntities(rot);
        }
    };

    Layout.prototype._computeEntitiesRepulsions = function(entities) {
        var count = entities.length;
        for (var i=0; i<count; i++) {
            if (entities[i].hasParent()) { continue; }
            var centerA = entities[i].getCenter();

            for (var j=i+1; j<count; j++) {
                if (entities[j].hasParent()) { continue; }

                var centerB = entities[j].getCenter();
                var length = ns.Geometry.pointToPointDistance(centerA, centerB);
                if (length > optimal*1.5) { continue; }

                var force = (new ns.Geometry.Vector()).fromPoints(centerA, centerB) // create new vector
                    .multiply(repulsionScale*optimal*optimal / (length*length*length));

                // add repulsive forces to entities
                entities[i].addForce(force.getOpposite());
                entities[j].addForce(force);
            }
        }
    };

    Layout.prototype._applyForces = function(entities) {
        var count = entities.length;
        for (var i=0; i<count; i++) {
            entities[i].applyForce(applyScale);
        }
    };

    return Layout;
})();
