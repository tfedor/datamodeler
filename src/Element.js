var DBSDM = DBSDM || {};

/**
 * Support class for generating SVG elements and their manipulation
 */
DBSDM.Element = (function() {
    var svgNS = 'http://www.w3.org/2000/svg';
    var xlinkNS = 'http://www.w3.org/1999/xlink';

    var self = {};

    var create = function(element) {
        return document.createElementNS(svgNS, element);
    };

    /**
     * Create SVG element
     * @param element   string  Name of the element
     * @param attr      object  Optional attributes of the element, see `attr` method for more information
     */
    self.el = function(element, attr) {
        return self.attr(create(element), attr);
    };

    /**
     * Set attributes for given SVG element. Attributes are automatically converted from camelCase to lisp-case.
     * If the value of the property is null, attribute is removed from the element
     * @param node          SVGelement
     * @param attributes    object  Object of name-value pairs of element's attributes.
     */
    self.attr = function(node, attributes) {
        for (var name in attributes) {
            if (!attributes.hasOwnProperty(name)) { continue; }
            var value = attributes[name];

            // convert attributeName ("object style") to attribute-name ("dom style")
            if (name[0] == "_") {
                name = name.substr(1);
            } else {
                name = name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
            }

            var ns = null;
            if (name == "href") {
                ns = xlinkNS;
            }

            if (value == null) {
                node.removeAttributeNS(ns, name);
            } else {
                node.setAttributeNS(ns, name, value)
            }
        }
        return node;
    };

    self.addClass = function(node, className) {
        node.classList.add(className);
    };

    self.transform = function(node, translate, rotate, scale) {
        var tran = [];
        if (translate) {
            tran.push("translate(" + translate.join(" ") + ")");
        }
        if (rotate) {
            tran.push("rotate(" + rotate.join(" ") + ")");
        }
        if (scale) {
            tran.push("scale(" + scale.join(" ") + ")");
        }

        self.attr(node, {transform: tran.join(" ")});
    };

    /**
     * Element creation helpers for common elements
     */

    self.use = function(id, attrs) {
        attrs = attrs || {};
        return self.attr(
            create("use"),
            Object.assign(attrs, { href: "#" + id })
        );
    };

    self.rect = function(x, y, width, height, params) {
        var attrs = {
            x: x || 0,
            y: y || 0,
            width: width || "100%",
            height: height || "100%"
        };
        Object.assign(attrs, params);
        return self.attr(create("rect"), attrs);
    };

    self.g = function() {
        var node = create("g");
        for (var i=0; i<arguments.length; i++) {
            node.appendChild(arguments[i]);
        }
        return node;
    };

    self.text = function(x, y, text, attrs) {
        var params = {
            x: x || 0,
            y: y || 0
        };

        Object.assign(params, attrs);
        var node = self.attr(
            create("text"),
            params
        );

        if (text) {
            node.innerHTML = text;
        }

        return node;
    };

    self.title = function(text) {
        let node = create("title");
        node.innerHTML = text;
        return node;
    };

    /**
     * Path builder
     */
    self.Path = (function(){
        function Path() {
            this._str = "";
        }
        Path.prototype.isEmpty = function() {
            return this._str == "";
        };

        /**
         * Generate path element
         * @param attr  object  Object of SVG element attributes, see `attr` method
         */
        Path.prototype.path = function(attr) {
            attr = attr || {};
            var prop = Object.assign(attr, {d: this._str});
            return DBSDM.Element.el("path", prop);
        };

        Path.prototype.M = function(x,y) { this._str += "M"+x+" "+y; return this; };
        Path.prototype.m = function(x,y) { this._str += "m"+x+" "+y; return this; };

        Path.prototype.H = function(x) { this._str += "H"+x; return this; };
        Path.prototype.h = function(x) { this._str += "h"+x; return this; };

        Path.prototype.V = function(x) { this._str += "V"+x; return this; };
        Path.prototype.v = function(x) { this._str += "v"+x; return this; };

        Path.prototype.L = function(x,y) { this._str += "L"+x+" "+y; return this; };
        Path.prototype.l = function(x,y) { this._str += "l"+x+" "+y; return this; };

        Path.prototype.C = function(x1,y1, x2,y2, x,y) { this._str += "C"+x1+" "+y1+","+x2+" "+y2+","+x+" "+y; return this; };
        Path.prototype.c = function(x1,y1, x2,y2, x,y) { this._str += "c"+x1+" "+y1+","+x2+" "+y2+","+x+" "+y; return this; };

        return Path;
    })();

    return self;
}());
