
var Menu = (function(){

    function Menu(namedPosition, color) {
        this._position = namedPosition; // top | right | bottom | left
        this._color = color || "#bada55";
        this._options = [];

        // determines how is the position modified when attaching menu to object
        this._posModifier = { x: 0, y: 0 };

        this._menuHandler = null;

        this._canvas = null;
        this._dom = null;
        this._timer = null;
        this._attachedTo = null;
    }

    Menu.prototype.addOption = function(name, action) {
        this._options.push({name: name, action: action});
        return this;
    };

    Menu.prototype.attachTo = function(parentObject, offset, menuHandler) {
        if (!this._dom) { return; }

        if (this._timer) {
            window.clearTimeout(this._timer);
            this._timer = null;
        }

        if (this._attachedTo == parentObject) { return; }
        this._attachedTo = parentObject;

        this._menuHandler = menuHandler;

        this._dom.insertBefore(parentObject.firstChild);
        this.reposition(offset);
        this._show();
    };

    Menu.prototype.reposition = function(offset) {
        this._dom.attr({
            x: offset + this._posModifier.x,
            y: this._posModifier.y * (this._position == "left" || this._position == "right" ? 0.5 : 1)
        });
    };

    Menu.prototype.detach = function() {
        if (!this._dom || !this._canvas) { return; }
        var that = this;
        if (this._timer) {
            window.clearTimeout(this._timer);
        }
        this._timer = window.setTimeout(function(){
            that._dom.appendTo(that._canvas.Paper);
            that._hide();
            that._timer = null;
            that._attachedTo = null;
        }, 200);
    };

    Menu.prototype._show = function() {
        this._dom.attr({
            class: ""
        });
    };
    Menu.prototype._hide = function() {
        this._dom.attr({
            class: "hidden"
        });
    };

    Menu.prototype.draw = function(canvas) {
        this._canvas = canvas;

        var menuPadding = [20, 8]; // space from borders
        var optionsMargin = 10; // space between options
        var tr = 10; // triangle size

        //
        this._dom = canvas.Paper.svg(0, 0, 1, 1)
            .attr({
                style: "overflow:visible"
            });

        // create options
        var widthOffset = 0;
        if (this._position == "right") {
            widthOffset = tr;
        }
        var heightOffset = menuPadding[1];
        if (this._position == "bottom") {
            heightOffset += tr;
        }

        var width = menuPadding[0];
        for (var key in this._options) {
            if (!this._options.hasOwnProperty(key)) {
                continue;
            }

            var option = this._options[key];
            var el = canvas.Paper.text(widthOffset + width, heightOffset, option.name);
            el.attr({
                class: "option",
                dominantBaseline: "text-before-edge",
                "data-action": option.action
            });
            width += optionsMargin + el.getBBox().width;
            this._dom.append(el);
        }
        width += menuPadding[0];

        // create background
        var height = 2*menuPadding[1] + this._dom.getBBox().height;

        var path;
        switch(this._position) {
            case "top":
                path = "m0 0"
                    +"v"+ height
                    +"h" + (width*0.5 - tr)
                    +"l "+tr+" "+tr
                    +"l "+tr+"-"+tr
                    +"h" + (width*0.5 - tr)
                    +"v-" + height;
                break;
            case "bottom":
                path = "m0 " + (height + tr)
                    +"v-"+ height
                    +"h" + (width*0.5 - tr)
                    +"l "+tr+"-"+tr
                    +"l "+tr+" "+tr
                    +"h" + (width*0.5 - tr)
                    +"v" + height;
                break;
            case "left":
                path = "m0 0"
                    +"v" + height
                    +"h"  + width
                    +"v-" + (height*0.5 - tr)
                    +"l "+tr+"-"+tr
                    +"l-"+tr+"-"+tr
                    +"v-" + (height*0.5 - tr);
                break;
            case "right":
                path = "m"+(width+tr)+ " "+height
                    +"v-" + height
                    +"h-"  + width
                    +"v" + (height*0.5 - tr)
                    +"l-"+tr+" "+tr
                    +"l "+tr+" "+tr
                    +"v" + (height*0.5 - tr);
                break;
        }

        canvas.Paper
            .path(path + "Z")
            .attr({
                fill: this._color,
                stroke: "black",
                strokeWidth: 1,
                shapeRendering: "crispEdges"
            })
            .insertBefore(this._dom.node.firstChild);

        // set size, create invisible background for mouse events
        this._dom.attr({
            width: width   + (this._position == 'left' || this._position == 'right' ? tr : 0),
            height: height + (this._position == 'left' || this._position == 'right' ? 0 : tr)
        });

        canvas.Paper.rect(0, 0, "100%", "100%")
            .attr({style: "visibility:hidden"})
            .insertBefore(this._dom.node.firstChild);

        // save position modifiers (used when attaching to object)
        var domBBox = this._dom.getBBox();

        var modx;
        var mody;
        switch(this._position) {
            case "top":    modx = -0.5; mody = -1; break;
            case "bottom": modx = -0.5; mody =  0; break;
            case "left":   modx = -1;   mody = -0.5; break;
            case "right":  modx =  0;   mody = -0.5; break;
        }

        this._posModifier.x = domBBox.width*modx + 1;
        this._posModifier.y = domBBox.height*mody + 1;

        // create mouse events
        var that = this;
        this._dom.node.addEventListener("click", function(e) { that.onClick(e); });

        // hide
        this._hide();

        return this._dom;
    };

    Menu.prototype.onClick = function(e) {
        if (e.target.nodeName == "text" && this._menuHandler && this._menuHandler.handleMenu) {
            this._menuHandler.handleMenu(e.target.getAttribute('data-action'));

        }
        e.stopPropagation();
    };
    return Menu;
})();
