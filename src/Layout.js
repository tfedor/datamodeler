var DBSDM = DBSDM || {};

DBSDM.Layout = (function() {
    var ns = DBSDM;

    var iterations = 1000;
    var optimal = 100;
    var attractionScale = 0.25;
    var straightenScale = 0.1;
    var repulsionScale = 25;
    var repulsionDistanceScale = 2; // of optimal length
    var applyScale = 0.4;
    var origin = {
        x: 10,
        y: 10
    };

    function Layout() {
        this._entities = null;
        this._relations = null;
    }

    Layout.prototype.sort = function(entities, relations) {
        this._entities = entities;
        this._relations = relations;

        this._fit();
        for (var i=0; i<iterations; i++) {
            this._computeRelationsStrenghts();
            this._computeEntitiesRepulsions();
            this._applyForces();
        }
        this._moveToOrigin();
    };

    Layout.prototype._fit = function() {
        var count = this._entities.length;
        for (var i=0; i<count; i++) {
            this._entities[i].fitToContents();
        }
    };

    Layout.prototype._computeRelationsStrenghts = function() {
        var relations = this._relations;
        var count = relations.length;
        for (var i=0; i<count; i++) {
            var force = relations[i].getVector();
            var rot = (Math.abs(force.x) < Math.abs(force.y) ? new ns.Geometry.Vector(force.x, 0) : new ns.Geometry.Vector(0, force.y));

            var length = force.getManhattan();
            if (length == 0) { continue; }

            // attraction
            force.multiply(0.5 * attractionScale*(length - optimal) / length); // only count half of vector, since it's applied to both sides
            relations[i].addForceToEntities(force);

            // straighten
            rot.multiply(-0.5 * straightenScale*(rot.getManhattan()-optimal) / length); // scale also by length, should prefer shorter leg for straightening
            relations[i].addForceToEntities(rot);
        }
    };

    Layout.prototype._computeEntitiesRepulsions = function() {
        var entities = this._entities;
        var count = entities.length;
        for (var i=0; i<count; i++) {
            if (entities[i].hasParent()) { continue; }
            var centerA = entities[i].getCenter();

            for (var j=i+1; j<count; j++) {
                if (entities[j].hasParent()) { continue; }

                var centerB = entities[j].getCenter();
                var length = ns.Geometry.pointToPointDistance(centerA, centerB);
                if (length > optimal*repulsionDistanceScale) { continue; }

                var force = (new ns.Geometry.Vector()).fromPoints(centerA, centerB) // create new vector
                    .multiply(repulsionScale*optimal / (length*length));

                // add repulsive forces to entities
                entities[i].addForce(force.getOpposite());
                entities[j].addForce(force);
            }
        }
    };

    Layout.prototype._applyForces = function() {
        var entities = this._entities;
        var count = entities.length;
        for (var i=0; i<count; i++) {
            entities[i].applyForce(applyScale);
        }
    };

    Layout.prototype._moveToOrigin = function() {
        var entities = this._entities;
        var edges = entities[0].getEdges();
        var local = {
            x: edges.left,
            y: edges.top
        };
        var count = entities.length;
        for (var i=1; i<count; i++) {
            edges = entities[i].getEdges();
            if (edges.left < local.x) { local.x = edges.left; }
            if (edges.top  < local.y) { local.y = edges.top;  }
        }

        var vector = (new ns.Geometry.Vector()).fromPoints(local, origin);
        for (i=0; i<count; i++) {
            entities[i].addForce(vector);
            entities[i].applyForce();
        }
    };

    return Layout;
})();
