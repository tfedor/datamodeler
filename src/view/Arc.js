var DBSDM = DBSDM || {};
DBSDM.View = DBSDM.View ||{};

DBSDM.View.Arc = (function(){
    var self = {};

    var ns = DBSDM;
    var Edge = ns.Enums.Edge;
    var TOP = Edge.TOP;
    var RIGHT = Edge.RIGHT;
    var BOTTOM = Edge.BOTTOM;
    var LEFT = Edge.LEFT;

    /**
     * @param order    Order of the arc in the same entity, to figure out edge offset. Should start at 0
     */
    self.getEdgeDistance = function(order) {
        return ns.Consts.ArcEdgeDistance + order*ns.Consts.ArcArcDistance;
    };

    /**
     * @param edges    Entity edges
     * @param legs     List of relation legs models, which are in same XOR
     * @param edgeDist Distance of arc from edge
     */
    self.build = function(edges, legs, edgeDist) {
        if (legs.length < 1) { return null;}

        var points = self._getArcPoints(legs);
        self._sortPoints(points);

        var dx=0, dy=0;
        function setDistMod(edge) {
            switch(edge) {
                case TOP:    dx = 0; dy = -edgeDist; break;
                case RIGHT:  dx =  edgeDist; dy = 0; break;
                case BOTTOM: dx = 0; dy =  edgeDist; break;
                case LEFT:   dx = -edgeDist; dy = 0; break;
            }
        }

        var g = ns.Element.el("g", {pointerEvents: "none"});

        var path = new ns.Element.Path();

        var edge = self._getStartingEdge(points, edges);
        var prev = null;
        var skipped = null;
        for (var i=0; i<4; i++,edge = (edge+1)%4) {

            // solve edge that has no points
            if (i!=0) {
                if (!points[edge]) {
                    skipped = edge;
                    continue;
                }
                if (skipped != null) {
                    setDistMod(skipped);
                    switch(edge) {
                        case TOP:    x = edges.left;  y = edges.bottom; break;
                        case RIGHT:  x = edges.left;  y = edges.top;    break;
                        case BOTTOM: x = edges.right; y = edges.top;    break;
                        case LEFT:   x = edges.right; y = edges.bottom; break;
                    }
                    this._arcCorner(path, skipped, Math.round(x+dx-edges.left),  Math.round(y+dy-edges.top));
                }
            }

            // edge with points
            setDistMod(edge);
            for (var pi=0; pi<points[edge].length; pi++) {
                var p = points[edge][pi];
                var x = Math.round(p.x + dx - edges.left);
                var y = Math.round(p.y + dy - edges.top);
                if (path.isEmpty()) {
                    this._arcStart(path, edge, x,y);
                } else if (pi == 0) {
                    this._arcCorner(path, edge, x,y);
                }
                path.L(x,y);

                g.appendChild(ns.Element.el("circle", {cx:x, cy:y, r:2.5}));

                prev = edge;
            }
        }
        this._arcEnd(path, prev, x, y);

        g.appendChild( path.path({stroke: "black", fill: "transparent"}) );
        return g;
    };

    self._getArcPoints = function(legs) {
        var points = {};
        for (var i=0; i<legs.length; i++) {
            var anchor = legs[i].getAnchor();

            var edge = anchor.edge;
            if (!points[edge]) {
                points[edge] = [];
            }
            points[edge].push(anchor);
        }
        return points;
    };

    /**
     * Sort points on edges in clockwise order
     */
    self._pointsComparator = function(a, b){
        if (a.edge == b.edge) {
            switch(a.edge) {
                case TOP:    return a.x - b.x;
                case RIGHT:  return a.y - b.y;
                case BOTTOM: return b.x - a.x;
                case LEFT:   return b.y - a.y;
            }
        } else {
            return a.edge - b.edge;
        }
    };
    self._sortPoints = function(points) {
        for (var e in points) {
            if (!points.hasOwnProperty(e)) { continue; }
            points[e].sort(self._pointsComparator);
        }
    };

    /**
     * Figure out where to start drawing arc
     * Arc is drawn in a clockwise manner, start at the edge which which would create shortest possible arc
     * If there are points at opposite edges, try to start at edge which has point closest to the corner
     * @param points    Clockwise sorted arc points
     * @param edges     Entity edges
     */
    self._getStartingEdge = function(points, edges) {
        if (points.length == 2 && ((points[TOP] && points[BOTTOM]) || (points[LEFT] && points[RIGHT]))) {
            var a,b,len;
            if (points[TOP]) {
                len = points[TOP].length;
                a = edges.right - points[TOP][len-1].x;

                len = points[BOTTOM].length;
                b = points[BOTTOM][len-1].x - edges.left;

                return (a < b ? TOP : BOTTOM);
            } else {
                len = points[RIGHT].length;
                a = edges.bottom - points[RIGHT][len-1].y;

                len = points[LEFT].length;
                b = points[LEFT][len-1].x - edges.top;

                return (a < b ? RIGHT : LEFT);
            }
        } else {
            for (var e=1; e<4; e++) {
                if (!points[e-1] && points[e]) {
                    return e;
                }
            }
        }
        return 0;
    };

    self._arcCorner = function(path, edge, x, y) {
        var a = ns.Consts.ArcSize;
        switch(edge) {
            case TOP:    path.V(y+a).c( 0,-a,  a,-a,  a,-a); break;
            case RIGHT:  path.H(x-a).c( a, 0,  a, a,  a, a); break;
            case BOTTOM: path.V(y-a).c( 0, a, -a, a, -a, a); break;
            case LEFT:   path.H(x+a).c(-a, 0, -a,-a, -a,-a); break;
        }
    };
    self._arcStart = function(path, edge, x, y) {
        var a = ns.Consts.ArcSize;
        var o = ns.Consts.ArcEndPointOffset;
        switch(edge) {
            case TOP:    path.M(x-a-o,y+a).c( 0,-a,  a,-a,  a,-a); break;
            case RIGHT:  path.M(x-a,y-a-o).c( a, 0,  a, a,  a, a); break;
            case BOTTOM: path.M(x+a+o,y-a).c( 0, a, -a, a, -a, a); break;
            case LEFT:   path.M(x+a,y+a+o).c(-a, 0, -a,-a, -a,-a); break;
        }
    };
    self._arcEnd = function(path, edge, x, y) {
        var a = ns.Consts.ArcSize;
        var o = ns.Consts.ArcEndPointOffset;
        switch(edge) {
            case TOP:    path.l( o, 0).c(0,0,  a, 0,  a, a); break;
            case RIGHT:  path.l( 0, o).c(0,0,  0, a, -a, a); break;
            case BOTTOM: path.l(-o, 0).c(0,0, -a,0,  -a,-a); break;
            case LEFT:   path.l( 0,-o).c(0,0,  0,-a,  a,-a); break;
        }
    };

    return self;
})();
