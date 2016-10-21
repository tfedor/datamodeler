var DBSDM = DBSDM || {};

/**
 * Canvas controller
 * Creates canvas which is used to manipulate other elements
 */
DBSDM.Canvas = (function() {
    var ns = DBSDM;

    function Canvas() {
        this.id = Random.string(5);

        this._container = null;
        this.svg = null;
        this._defs = null;
        this.Paper = null;

        /**
         * Mouse controller
         */
        this.Mouse = null;

        this.menu = {};

        this._entities = {};
    }

    Canvas.prototype.create = function() {
        this._container = document.createElement("div");
        this._container.className = "dbsdmCanvas";

        this.svg = this._container.appendChild(ns.Element.el("svg"));
        this._defs = this.svg.appendChild(ns.Element.el("defs"));

        if (document.currentScript) {
            document.currentScript.parentNode.insertBefore(this._container, document.currentScript);
        } else {
            document.body.appendChild(this._container);
        }

        this.Mouse = new DBSDM.Mouse(this.svg);

        // set up callbacks
        var that = this;
        this.svg.addEventListener("mousedown", function(e) { that.Mouse.down(e, that); });
        this.svg.addEventListener("mousemove", function(e) { that.Mouse.move(e); });
        this.svg.addEventListener("mouseup",   function(e) { that.Mouse.up(e); });

        this.svg.addEventListener("contextmenu", function(e) { DBSDM.Menu.show(e); });
    };

    // shared elements for all canvas

    // svg elements
    Canvas.prototype._sharedElementName = function(name) {
        return this.id + "." + name;
    };

    Canvas.prototype.hasSharedElement = function(name) {
        return document.getElementById(this._sharedElementName(name)) != null;
    };

    Canvas.prototype.createSharedElement = function(name, element) {
        ns.Element.attr(element, { id: this._sharedElementName(name) });
        this._defs.appendChild(element);
    };

    Canvas.prototype.getSharedElement = function(name, attrs) {
        if (!this.hasSharedElement(name)) { return null; }
        return ns.Element.use(this._sharedElementName(name), attrs);
    };

    Canvas.prototype.getSharedElementId = function(name) {
        if (!this.hasSharedElement(name)) { return null; }
        return "#" + this._sharedElementName(name);
    };

    // html elements
    Canvas.prototype.hasSharedHTMLElement = function(name) {
        return document.getElementById(this._sharedElementName(name)) != null;
    };

    Canvas.prototype.createSharedHTMLElement = function(id, element) {
        element.id = this.id + "." + id;
        this._container.appendChild(element);
    };

    Canvas.prototype.getSharedHTMLElement = function(name) {
        if (!this.hasSharedHTMLElement(name)) { return null; }
        return document.getElementById(this._sharedElementName(name));
    };

    // event handlers

    Canvas.prototype.onMouseDown = function() {
        var ent = new DBSDM.Control.Entity(this);
        ent.create();

        this.Mouse.attachObject(ent);
    };


/*
    Canvas.prototype._createSharedElements = function(){


        this._sharedElements.CentralControlPoint =
            this.Paper.rect(0, 0, 6, 6)
                .attr({
                    fill: "black",
                    strokeWidth: 1,
                    stroke: "black",
                    shapeRendering: "crispEdges",
                    transform: "translate(-3,-3)",
                    pointerEvents: "visible"
                })
                .toDefs();

        // relation anchors
        this._sharedElements.anchorControl = canvas.Paper.rect(-0.5,-7.5, 10.5,16.5).attr({
            fill: 'none',
            stroke:'none'
        }).toDefs();
        this._sharedElements.anchorBase = canvas.Paper.polyline(0.5,0.5, 10.5,0.5).attr({
            fill: 'none',
            stroke:'black',
            strokeWidth: 1,
            shapeRendering: 'auto'
        }).toDefs();
        this._sharedElements.anchorMulti = canvas.Paper.polyline(0.5,-7.5, 10.5,0.5, 0.5,8.5).attr({
            fill: 'none',
            stroke:'black',
            strokeWidth: 1,
            shapeRendering: 'auto'
        }).toDefs();
        this._sharedElements.anchorIdentifying = canvas.Paper.polyline(10.5,-7.5, 10.5,7.5).attr({
            fill: 'none',
            stroke:'black',
            strokeWidth: 1,
            shapeRendering: 'auto'
        }).toDefs();
    };

    Canvas.prototype.getRelationAnchor = function(multi, identifying) {
        var g = this.Paper.g(
            this.Paper.use(this.getSharedElement('anchorControl')),
            this.Paper.use(this.getSharedElement('anchorBase'))
        );
        if (multi) {
            g.add(this.Paper.use(this.getSharedElement('anchorMulti')));
        }
        if (identifying) {
            g.add(this.Paper.use(this.getSharedElement('anchorIdentifying')));
        }
        return g;
    };

    Canvas.prototype.removeEntity =  function(id) {
        if (this._entities.hasOwnProperty(id)) {
            delete this._entities[id];
        }
    };

    Canvas.prototype.clear = function() {
        this._sharedElements = {};
        this.Paper.clear();
    };

*/

    return Canvas;
})();
