var DBSDM = DBSDM || {};

DBSDM.Element = (function() {
    var svgNS = 'http://www.w3.org/2000/svg';
    var xlinkNS = 'http://www.w3.org/1999/xlink';

    var self = {};

    var create = function(element) {
        return document.createElementNS(svgNS, element);
    };

    self.el = function(element, attr) {
        return self.attr(create(element), attr);
    };

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

    /** Element creation helpers */

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

    return self;
}());
