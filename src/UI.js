var DBSDM = DBSDM || {};

/**
 * General UI controller
 */
// TODO refactor to three separate classes for messages, zoom and information window control?
DBSDM.UI = (function() {
    var ns = DBSDM;

    var tutorial = {
        Entity: "Start by <strong>drawing</strong> an entity or <strong>dragging</strong> an exported JSON or SQL Developer zip file into canvas",
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
        this._help = null;

        var ledge = document.createElement("div");
        ledge.className = "ledge";

        if (ns.Diagram.allowCorrectMode) {
            this._cCommentSwitch = ledge.appendChild(this._createCorrectionCommentSwitch());
            this._cModeSwitch = ledge.appendChild(this._createCorrectionModeSwitch());
        }

        ledge.appendChild(this._createHistoryControls());
        ledge.appendChild(this._createZoomControls());
        this._helpSwitch = ledge.appendChild(this._createHelp());

        this._ui.appendChild(ledge);
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

    UI.prototype._createHelp = function() {
        var a = document.createElement("a");
        a.className = "uiIcon";
        a.innerHTML = "<i class='fa fa-info-circle'></i>";

        var that = this;
        a.addEventListener("click", function() { that.toggleHelp(); });

        return a;
    };

    UI.prototype._createCorrectionModeSwitch = function() {
        var a = document.createElement("a");
        a.className = "uiIcon";
        a.innerHTML = "<i class='fa fa-check-circle-o'></i>";

        var that = this;
        a.addEventListener("click", function() { that._toggleCorrectionMode(); });

        return a;
    };

    UI.prototype._createCorrectionCommentSwitch = function() {
        var a = document.createElement("a");
        a.className = "uiIcon";
        a.innerHTML = "<i class='fa fa-comment-o'></i>";

        var that = this;
        a.addEventListener("click", function() { that._toggleCorrectionComment(); });

        return a;
    };

    UI.prototype._createHistoryControls = function() {
        var that = this;

        var f = document.createDocumentFragment();

        // undo
        var a = document.createElement("a");
        a.className = "uiIcon";
        a.innerHTML = "<i class='fa fa-undo'></i>";
        a.title = "Undo";

        a.addEventListener("click", function() { that._canvas.History.undo();} );
        f.appendChild(a);

        // redo
        a = document.createElement("a");
        a.className = "uiIcon";
        a.innerHTML = "<i class='fa fa-repeat'></i>";
        a.title = "Redo";

        a.addEventListener("click", function() { that._canvas.History.redo();} );
        f.appendChild(a);

        return f;
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

    UI.prototype.shown = function() {
        return this._shown;
    };

    // help
    UI.prototype.toggleHelp = function() {
        if (this._help) {
            this._help.remove();
            this._help = null;
            this._helpSwitch.classList.remove("active");
            return;
        }
        this._helpSwitch.classList.add("active");

        var data = {
            "Basics": [
                ["Import", "Drag JSON file or zip of SQL Developer DMD onto canvas"],
                ["New entity", "Click and drag or double click"]
            ],
            "Shortcuts on selected Entity": [
                ["DEL", "Delete Entity"],
                ["a, [Dbl click]", "Add new attribute"],
                ["r", "Create new 1:N relation"],
                ["f", "Fit to contents"],
                ["i", "Initiate ISA creation"]
            ],
            "When editing Attribute": [
                ["TAB", "Select next or create new"],
                ["SHIFT + TAB", "Select previous"],
                ["[Leave empty]", "Delete attribute"]
            ]
        };

        var div = document.createElement("div");
        div.className = "help";

        var content = "";
        for (var headline in data) {
            if (!data.hasOwnProperty(headline)) { continue; }
            content += headline + "<table>";

            for (var i=0; i<data[headline].length; i++) {
                content += "<tr>"
                        + "<td>"+data[headline][i][0]+"</td>"
                        + "<td>"+data[headline][i][1]+"</td>"
                    + "</tr>";
            }

            content += "</table>";
        }
        div.innerHTML = content;

        this._help = this._ui.appendChild(div);
    };

    UI.prototype.correctionMode = function() {
        if (!ns.Diagram.allowCorrectMode) { return }
        this._canvas.inCorrectionMode = false;
        this._toggleCorrectionMode();
    };

    UI.prototype._toggleCorrectionMode = function() {
        if (!ns.Diagram.allowCorrectMode) { return }
        this._canvas.inCorrectionMode = !this._canvas.inCorrectionMode;
        if (this._canvas.inCorrectionMode) {
            this._cModeSwitch.classList.add("active");
            this._canvas.setMode("correction");

            var that = this;
            ns.Diagram.cancelAction = function() { that._toggleCorrectionMode(); }
        } else {
            this._cModeSwitch.classList.remove("active");
            this._canvas.unsetMode("correction");
            ns.Diagram.cancelAction = null;
        }
    };

    UI.prototype._toggleCorrectionComment = function() {
        if (!ns.Diagram.allowCorrectMode) { return }
        this._canvas.inCorrectionCommentMode = !this._canvas.inCorrectionCommentMode;
        if (this._canvas.inCorrectionCommentMode) {
            this._cCommentSwitch.classList.add("active");
            this._cCommentSwitch.querySelector("i").classList.add("fa-comment");
            this._cCommentSwitch.querySelector("i").classList.remove("fa-comment-o");
        } else {
            this._cCommentSwitch.classList.remove("active");
            this._cCommentSwitch.querySelector("i").classList.remove("fa-comment");
            this._cCommentSwitch.querySelector("i").classList.add("fa-comment-o");
        }
    };

    return UI;
})();
