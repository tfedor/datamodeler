var DBSDM = DBSDM || {};

/**
 * Diagram layout (sort) handler
 */
DBSDM.Layout = (function() {
    var ns = DBSDM;

    var iterations = 100;
    var optimal = 100;
    var attractionScale = 0.25;
    var straightenScale = 0.1;
    var repulsionScale = 25;
    var repulsionDistanceScale = 2; // of optimal length
    var applyScale = 1;
    var origin = {
        x: 10,
        y: 10
    };

    function Layout() {
        this._objects = null;
        this._relations = null;
    }

    Layout.prototype.sort = function(canvasObjects, relations) {
        this._objects = canvasObjects;
        this._relations = relations;

        applyScale = 1;

        this._fit();
        for (var i=0; i<iterations; i++) {
            this._computeRelationsStrenghts();
            this._computeObjectsRepulsions();
            this._applyForces();

            /*
            // annealing?
            if (i > iterations/2) {
                applyScale -= (1 - 0.1) / (iterations/2);
            }
            */
        }
        this._moveToOrigin();
    };

    Layout.prototype._fit = function() {
        var count = this._objects.length;
        for (var i=0; i<count; i++) {
            this._objects[i].fitToContents();
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

    Layout.prototype._computeObjectsRepulsions = function() {
        var objects = this._objects;
        var count = objects.length;
        for (var i=0; i<count; i++) {
            if (objects[i].hasParent && objects[i].hasParent()) { continue; }
            var centerA = objects[i].getCenter();

            for (var j=i+1; j<count; j++) {
                if (objects[j].hasParent && objects[j].hasParent()) { continue; }

                var centerB = objects[j].getCenter();
                var length = ns.Geometry.pointToPointDistance(centerA, centerB);
                if (length > optimal*repulsionDistanceScale) { continue; }

                var force = (new ns.Geometry.Vector()).fromPoints(centerA, centerB) // create new vector
                    .multiply(repulsionScale*optimal / (length*length));

                // add repulsive forces to entities
                objects[i].addForce(force.getOpposite());
                objects[j].addForce(force);
            }
        }
    };

    Layout.prototype._applyForces = function() {
        for (var i=0; i<this._objects.length; i++) {
            this._objects[i].applyForce(applyScale);
        }
    };

    Layout.prototype._moveToOrigin = function() {
        var objects = this._objects;
        var edges = objects[0].getEdges();
        var local = {
            x: edges.left,
            y: edges.top
        };
        var count = objects.length;
        for (var i=1; i<count; i++) {
            edges = objects[i].getEdges();
            if (edges.left < local.x) { local.x = edges.left; }
            if (edges.top  < local.y) { local.y = edges.top;  }
        }

        var vector = (new ns.Geometry.Vector()).fromPoints(local, origin);
        for (i=0; i<count; i++) {
            objects[i].addForce(vector);
            objects[i].applyForce(1);
        }
    };

    return Layout;
})();
