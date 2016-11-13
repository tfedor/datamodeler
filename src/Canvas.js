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
