var DBSDM = DBSDM || {};

/**
 * Canvas controller
 * Creates canvas which is used to manipulate other elements
 */
DBSDM.UI = (function() {
    var ns = DBSDM;

    var tutorial = {
        Entity: "Start by <strong>drawing</strong> an entity or <strong>dragging</strong> an exported json or SQLDeveloper zip file into canvas",
        Select: "<strong>Click</strong> on <i>Entity</i> to select it",
        Menu: "<strong>Right click</strong> on <i>any element</i> of the canvas to get more options",
        Scroll: "Click and drag <strong>middle mouse button</strong> to move the layout"
    };

    function UI(container, canvas) {
        this._canvas = canvas;

        this._ui = document.createElement("div");
        this._ui.className = "ui";

        this._message = this._ui.appendChild(this._createMessage());

        this._zoom = null;
        this._ui.appendChild(this._createZoomControls());

        container.appendChild(this._ui);

        this._shown = false;
        this._timer = false;

        // setup tutorial
        this._tutorialCurrent = null;
        if (ns.Diagram.showTutorial) {
            this.inTutorial = true;
            this._tutorialLeft = ["Entity", "Menu", "Select", "Scroll"]
        } else {
            this.inTutorial = false;
            this._tutorialLeft = [];
        }

        // events
        var that = this;
        this._message.addEventListener("click", function(e) { that.hideMessage(); });
    }

    UI.prototype._createMessage = function() {
        var message = document.createElement("div");
        message.className = "message";
        message.style.transitionDuration = ns.Consts.UIMessageTransition+"s";
        return message;
    };

    UI.prototype._createZoomControls = function() {
        var zoom = document.createElement("div");
        zoom.className = "zoom";

        var canvas = this._canvas;
        var a;

        // zoom in
        a = document.createElement("a");
        a.innerHTML = "<i class='fa fa-search-plus'></i>";
        a.addEventListener("click", function() { canvas.zoomIn(); });
        zoom.appendChild(a);

        // reset
        a = document.createElement("a");
        a.className = "reset";
        a.innerHTML = "100%";
        a.addEventListener("click", function() { canvas.zoomReset(); });
        this._zoom = a;
        zoom.appendChild(a);

        // zoom out
        a = document.createElement("a");
        a.innerHTML = "<i class='fa fa-search-minus'></i>";
        a.addEventListener("click", function() { canvas.zoomOut(); });
        zoom.appendChild(a);

        return zoom; // return last reset, need to update it on zoom
    };

    // zoom
    UI.prototype.updateZoomLevels = function(zoom) {
        this._zoom.innerHTML = Math.round(zoom*100) + "%";
    };

    // tutorial

    UI.prototype.advanceTutorial = function() {
        if (!this.inTutorial) { return; }

        if (this._tutorialLeft.length == 0) {
            this.inTutorial = false;
            this._tutorialCurrent = null;
            this.hideMessage();
        } else {
            var action = this._tutorialLeft.shift();
            this._tutorialCurrent = action;
            this.hint(tutorial[action]);
        }
    };
    /**
     * In case action is made before tutorial message is shown, don't show the message again
     */
    UI.prototype.acceptTutorialAction = function(action) {
        if (!this.inTutorial) { return; }

        var index = this._tutorialLeft.lastIndexOf(action);
        if (index != -1) {
            this._tutorialLeft.splice(index, 1);
        }

        if (this._tutorialCurrent == action) {
            this.advanceTutorial();
        }
    };

    UI.prototype.hint = function(message, time, callback) {
        this._showMessage("hint", message, time, callback);
    };
    UI.prototype.error = function(message, time, callback) {
        this._showMessage("error", message, time, callback);
    };
    UI.prototype.success = function(message, time, callback) {
        this._showMessage("success", message, time, callback);
    };

    UI.prototype._showMessage = function(className, message, time, callback) {
        window.clearTimeout(this._timer);

        if (this._shown) {
            var that = this;
            this.hideMessage(function() { that._showMessage(className, message, time, callback)});
            return;
        }

        this._message.classList.remove("success");
        this._message.classList.remove("error");
        this._message.classList.remove("hint");

        var icon = "";
        switch(className) {
            case "hint":    icon = "bell"; break;
            case "error":   icon = "exclamation-triangle"; break;
            case "success": icon = "check"; break;
        }

        this._shown = true;
        this._message.classList.add(className);
        this._message.style.marginTop = 0;
        this._message.innerHTML = '<i class="fa fa-'+ icon +'"></i>'+message;
        this._timeMessage(time, callback);
    };

    UI.prototype.hideMessage = function(callback) {
        this._shown = false;
        var bounds = this._message.getBoundingClientRect();
        this._message.style.marginTop = "-" + (bounds.height+5) + "px";

        if (callback) {
            this._timer = window.setTimeout(callback, ns.Consts.UIMessageTransition*1000);
        }
    };

    UI.prototype._timeMessage = function(time, callback) {
        if (!time) { return; }
        if (!callback) {
            var that = this;
            callback = function() { that.hideMessage(); }
        }
        this._timer = window.setTimeout(callback, time*1000);
    };

    return UI;
})();
