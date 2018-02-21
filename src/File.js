var DBSDM = DBSDM || {};

DBSDM.File = (function() {
    var ns = DBSDM;

    var self = {};

    /**
     * See http://stackoverflow.com/a/30832210/4705537
     */
    self.download = function(data, filename, type) {
        if (!ns.Diagram.allowFile) { return; }

        var a = document.createElement("a"),
            file = new Blob([data], {type: type});
        if (window.navigator.msSaveOrOpenBlob) // IE10+
            window.navigator.msSaveOrOpenBlob(file, filename);
        else { // Others
            var url = URL.createObjectURL(file);
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(function() {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 0);
        }
    };

    self.upload = function(e, canvas) {
        e.stopPropagation();
        e.preventDefault();

        if (!ns.Diagram.allowFile) {
            canvas.ui.error("File upload is turned off");
            return;
        }

        // fetch FileList object
        var files = e.target.files || e.dataTransfer.files;

        // process all File objects
        if (files.length > 0) {
            var file = files[0];
            if (file.type == "application/x-zip-compressed" || file.type == "application/zip") {
                self._processZip(canvas, file);
            } else if (file.type == "application/json" || /\.json$/.test(file.name)) {
                self._processJson(canvas, file);
            } else {
                canvas.ui.error("File couldn't be imported: unsupported file type. Import either json with exported data or SQLDeveloper zip");
                console.log(e);
            }
        }
    };

    /**
     * Programmatic upload of files/blobs to specific canvas
     * canvas   Canvas      Canvas to which to import blob
     * blob     Blob        Blob or File to be imported, e.g. loaded via xmlHttpRequest
     */
    self.loadBlob = function(canvas, blob) {
        return new Promise((resolve, reject) => {
            if (blob.type == "application/x-zip-compressed" || blob.type == "application/zip") {
                self._processZip(canvas, blob, resolve, reject);
            } else if (blob.type == "application/json") {
                self._processJson(canvas, blob, resolve, reject);
            } else {
                console.log("File couldn't be imported: unsupported file type. Import either json with exported data or SQLDeveloper zip");
                console.log(e);
            }
        });
    };

    self._processJson = function(canvas, jsonfile, resolve, reject) {
        var reader = new FileReader();
        reader.onload = function(e) {
            var result = e.target.result;
            try {
                var data = JSON.parse(result);
                canvas.import(data);
                canvas.ui.success("File was imported", ns.Consts.UIDefaultSuccessDuration);
                console.log("done");

                if (resolve) { resolve(); }
            } catch(e) {
                canvas.ui.error("File couldn't be parsed properly - make sure it is valid JSON file");
                console.log(e);

                if (reject) { reject(e); }
            }
        };
        reader.onerror = function(e) {
            canvas.ui.error("File couldn't be uploaded, please try again");
            console.log(e);

            if (reject) { reject(e); }
        };
        reader.readAsText(jsonfile);
    };

    self._processZip = function(canvas, zipfile, resolve, reject) {

        function toArray(obj) {
            return Object.keys(obj).map(function (key) { return obj[key]; })
        }

        function parseAttributes(nodeList) {
            var attributeMap = {};
            if (nodeList) {
                for (var i=0; i<nodeList.length; i++) {
                    var node = nodeList[i];

                    if (node.querySelector("referedAttribute")) { continue; } // skip referred attributes in ISA hierarchy

                    var id = node.getAttribute("id");
                    var name = node.getAttribute("name");
                    if (!id || !name) { continue; }

                    var nullableNode = node.querySelector("nullsAllowed");
                    attributeMap[id] = {
                        name: name,
                        primary: false,
                        unique: false,
                        nullable: (nullableNode && nullableNode.innerHTML == "true") || false
                    };
                }
            }
            return attributeMap;
        }

        function parseKeys(nodeList, attributeMap) {
            if (!nodeList) { return; }
            for (var i=0; i<nodeList.length; i++) {
                var node = nodeList[i];

                // attribute ids
                var attributes = null;
                var atrIdsNode = node.querySelector("newElementsIDs");
                if (atrIdsNode) {
                    attributes = atrIdsNode.innerHTML.split(",");
                } else {
                    var refNodes = node.querySelectorAll("usedAttributes attributeRef");
                    if (refNodes) {
                        attributes = [];
                        for (var k=0; k<refNodes.length; k++) {
                            attributes.push(refNodes[k].innerHTML);
                        }
                    }
                }
                if (!attributes) { continue; }

                // key type
                var primary = false;
                var unique = false;
                var pkNode = node.querySelector("pk");
                if (pkNode && pkNode.innerHTML == "true") {
                    primary = true;
                } else {
                    unique = true;
                }

                for (var j=0; j<attributes.length; j++) {
                    var id = attributes[j];
                    if (!attributeMap[id]) { continue; } // ignore keys that came from different entity
                    attributeMap[id].primary = primary;
                    attributeMap[id].unique = unique;
                }
            }
        }

        function parseEntity(node, entityMap, parentMap) {
            var id = node.getAttribute("id");
            var name = node.getAttribute("name");
            if (!id || !name) { return; }

            entityMap[id] = {
                name: name,
                parent: null,
                attr: null
            };

            // isa
            var parentNode = node.querySelector("hierarchicalParent");
            if (parentNode) {
                parentMap.push([id, parentNode.innerHTML]);
            }

            // attributes
            var attributeMap = parseAttributes(node.querySelectorAll("attributes > Attribute"));
            parseKeys(node.querySelectorAll("identifiers > identifier"), attributeMap);

            entityMap[id].attr = toArray(attributeMap); // map to array
        }

        function parseRelation(node, relationsMap, relationsRef) {
            var sourceEntityIdNode = node.querySelector("sourceEntity");
            var optionalSourceNode = node.querySelector("optionalSource");
            var sourceCardinalityNode = node.querySelector("sourceCardinality");
            var nameOnSource = node.querySelector("nameOnSource");

            var targetEntityIdNode = node.querySelector("targetEntity");
            var optionalTargetNode = node.querySelector("optionalTarget");
            var targetCardinalityNode = node.querySelector("targetCardinalityString");
            var nameOnTarget = node.querySelector("nameOnTarget");

            var sourceIdentifyingNode = false;
            var targetIdentifyingNode = false;

            if (node.querySelector("identifying").innerHTML == "true") {

                // export does not says which end of the relation is identifying, so we'll try to determine it:

                // identyfing relation cannot have a * cardinality
                if (sourceCardinalityNode && sourceCardinalityNode.innerHTML == "*") {
                    sourceIdentifyingNode = true;
                } else if (targetCardinalityNode && targetCardinalityNode.innerHTML == "*") {
                    targetIdentifyingNode = true;
                } else {

                    // both cardinalities are not *, determine based on optionality
                    if (optionalSourceNode) {
                        targetIdentifyingNode = true;
                    } else {
                        sourceIdentifyingNode = true;
                    }
                }
                // CAUTON: If the export is in invalid state (ie. "cardinalities are * at the both ends"
                // or "cardinalities are both not * while also both ends being optional") this code returns undefined behaviour!
            }

            if (!sourceEntityIdNode || !targetEntityIdNode) { return; }

            relationsMap.push([
                {
                    entity: sourceEntityIdNode.innerHTML,
                    identifying: sourceIdentifyingNode,
                    optional: (optionalSourceNode ? optionalSourceNode.innerHTML == "true" : false),
                    cardinality: (sourceCardinalityNode && sourceCardinalityNode.innerHTML == "*" ? 0 : 1),
                    xor: null,
                    name: nameOnSource && nameOnSource.innerHTML != "" ? nameOnSource.innerHTML : null
                }, {
                    entity: targetEntityIdNode.innerHTML,
                    identifying: targetIdentifyingNode,
                    optional: (optionalTargetNode ? optionalTargetNode.innerHTML == "true" : false),
                    cardinality: (targetCardinalityNode && targetCardinalityNode.innerHTML == "*" ? 0 : 1),
                    xor: null,
                    name: nameOnTarget && nameOnTarget.innerHTML != "" ? nameOnTarget.innerHTML : null
                }
            ]);
            relationsRef[node.getAttribute("id")] = relationsMap.length-1;
        }

        function parseArc(node, arcMap) {
            var arcID = node.getAttribute("id");
            var entityID = node.querySelector("entity").innerHTML;
            var relations = node.querySelectorAll("relationID");

            arcMap[arcID] = [];
            for (var i=0; i<relations.length; i++) {
                var relationID = relations[i].innerHTML;
                arcMap[arcID].push([entityID, relationID]);
            }
        }

        function parseNote(text, transform) {
            text = text.replace(/<br\s*\/?>/i, "\n");

            // split on new lines
            var div = document.createElement("div");
            div.classList.add("note-content-helper");
            div.style.width = (transform.width - 2*ns.Consts.NotePadding)+"px";

            document.body.appendChild(div);

            div.textContent = "&nbsp;"; // to get default height
            var defaultHeight = div.getBoundingClientRect().height;

            var resultText = "";
            div.textContent = "";

            var skipSpace = false;
            text.trim().split(/\n/).forEach(function(line){

                var prevHeight = defaultHeight;

                line.split(/\s+/).forEach(function(word){
                    div.textContent += " "+word;

                    var currentHeight = div.getBoundingClientRect().height;
                    if (currentHeight > prevHeight) {
                        resultText += "\n";
                    } else if (!skipSpace) {
                        resultText += " ";
                    }
                    resultText += word;

                    prevHeight = currentHeight;
                    skipSpace = false;
                });

                // add original new lines
                div.textContent += "\n";
                resultText += "\n";
                skipSpace = true;
                prevHeight = div.getBoundingClientRect().height;
            });

            document.body.removeChild(div);

            return {
                text: resultText.trim(),
                transform: transform
            };
        }

        function parseTransforms(node, map) {
            if (/DPVLogicalSubView$/.test(node.getAttribute("class"))) { return; }

            map.entities = map.entities || {};
            map.relations = map.relations || {};
            map.notes = map.notes || {};

            var vid = {};

            // entities and notes
            var objects = node.querySelectorAll("OView");
            for (var i=0; i<objects.length; i++) {
                var id = objects[i].getAttribute("oid");
                var bounds = objects[i].querySelector("bounds");

                var type = objects[i].getAttribute("otype");
                if (type === "Entity") {
                    map.entities[id] = {
                        x: parseInt(bounds.getAttribute("x")),
                        y: parseInt(bounds.getAttribute("y")),
                        width: parseInt(bounds.getAttribute("width")),
                        height: parseInt(bounds.getAttribute("height"))
                    };

                    vid[objects[i].getAttribute("vid")] = id;
                } else if (type === "Note") {
                    map.notes[id] = {
                        x: parseInt(bounds.getAttribute("x")),
                        y: parseInt(bounds.getAttribute("y")),
                        width: parseInt(bounds.getAttribute("width")),
                        height: parseInt(bounds.getAttribute("height"))
                    };
                }
            }

            // relations
            var connectors = node.querySelectorAll("Connector");
            for (i=0; i<connectors.length; i++) {
                var pointNodes = connectors[i].querySelectorAll("point");
                if (pointNodes.length == 0) { continue; }
                id = connectors[i].getAttribute("oid");

                // read points
                var points = [];
                for (var j=0; j<pointNodes.length; j++) {
                    var point = pointNodes[j];
                    points.push({
                        x: parseInt(point.getAttribute("x")),
                        y: parseInt(point.getAttribute("y"))
                    });
                }

                // add middle point if relation is specified only by anchors
                if (points.length == 2) {
                    points.splice(1, 0, {
                        x: (points[0].x+points[1].x)*0.5,
                        y: (points[0].y+points[1].y)*0.5
                    });
                }

                // set up transform
                var transform = [{}, {}];

                // set source points
                transform[0] = {
                    anchor: {
                        x: points[0].x,
                        y: points[0].y,
                        edge: null
                    },
                    points: [],
                    manual: true
                };
                for (var p=1; p<points.length-1; p++) {
                    transform[0].points.push({
                        x: points[p].x,
                        y: points[p].y
                    });
                }

                // set target points
                var last = points.length - 1;
                transform[1] = {
                    anchor: {
                        x: points[last].x,
                        y: points[last].y,
                        edge: null
                    },
                    points: [{
                        x: points[last-1].x,
                        y: points[last-1].y
                    }],
                    manual: true
                };

                // set anchor edges
                function computeEdge(anchor, entity) {
                    if (anchor.x < entity.x+1) {
                        return ns.Enums.Edge.LEFT;
                    } else if (anchor.x > entity.x + entity.width-1) {
                        return ns.Enums.Edge.RIGHT;
                    } else if (anchor.y < entity.y+1) {
                        return ns.Enums.Edge.TOP;
                    } else {
                        return ns.Enums.Edge.BOTTOM;
                    }
                }

                var vidSource = connectors[i].getAttribute("vid_source");
                transform[0].anchor.edge = computeEdge(transform[0].anchor, map.entities[vid[vidSource]]);

                var vidTarget = connectors[i].getAttribute("vid_target");
                transform[1].anchor.edge = computeEdge(transform[1].anchor, map.entities[vid[vidTarget]]);

                //
                map.relations[id] = transform;
            }
        }

        var zip = new JSZip();
        zip.loadAsync(zipfile)
            .then(function(contents) {
                var toPromise = [];
                var files = zip.file(/(\W|^)logical\/((entity|relation|arc|note)\/seg_0|subviews)\/.*?\.xml$/);
                for (var i=0; i<files.length; i++) {
                    toPromise.push(files[i].async("string"));
                }

                if (files.length === 0) {
                    files = zip.file(/(\W|^)logical\/.*?.model.local$/);
                    if (files.length !== 0) {
                        for (let i=0; i<files.length; i++) {
                            toPromise.push(files[i].async("string"));
                        }
                    }
                }

                Promise.all(toPromise).then(function(result){
                    var entityMap = {};
                    var parentMap = [];
                    var relationsMap = [];
                    var relationsRef = {}; // map of {relation ID} => {relationsMap index}
                    var arcMap = {};
                    var transformsMap = {};
                    var notesMap = {};
                    var notes = [];

                    let parsers = {
                        "Entity":   function(node) { parseEntity(node, entityMap, parentMap) },
                        "Relation": function(node) { parseRelation(node, relationsMap, relationsRef); },
                        "Arc":      function(node) { parseArc(node, arcMap); },
                        "Note":     function(node) {
                            let text = node.querySelector("comment").textContent;
                            let id = node.id;
                            notesMap[id] = text;
                        },
                        "Diagram":  function(node) {
                            let commentNodes = node.querySelectorAll("comment");
                            if (commentNodes.length !== 0) {
                                for (let i=0; i<commentNodes.length; ++i) {
                                    let commentNode = commentNodes[i];
                                    notesMap[commentNode.parentNode.getAttribute("oid")] = commentNode.textContent;
                                }
                            }
                            parseTransforms(node, transformsMap);
                        }
                    };

                    var parser = new DOMParser();
                    for (var i=0; i<result.length; i++) {
                        var xml = parser.parseFromString(result[i], "application/xml");

                        switch (xml.documentElement.nodeName) {
                            case "LogicalDesign": // single file format

                                let selectors = {
                                    "Entities > Entity":            "Entity",
                                    "Relationships > Relationship": "Relation",
                                    "Arcs > Arc":                   "Arc",
                                    "NoteObjects > NoteObject":     "Note",
                                    "mainView":                     "Diagram"
                                };

                                Object.entries(selectors).forEach(function(entry) {
                                    let selector = entry[0];
                                    let parser = parsers[entry[1]];

                                    let nodes = xml.querySelectorAll(selector);
                                    for (let i=0; i<nodes.length; i++) { parser(nodes[i]); }
                                });
                                break;

                            default:
                                if (parsers.hasOwnProperty(xml.documentElement.nodeName)) {
                                    parsers[xml.documentElement.nodeName](xml.documentElement);
                                }
                        }

                    }

                    // set parents
                    for(i=0; i<parentMap.length; i++) {
                        var entity = parentMap[i][0];
                        var parent = parentMap[i][1];

                        if (entityMap[entity] && entityMap[parent]) {
                            entityMap[entity].parent = entityMap[parent].name;
                        }
                    }

                    // add arc data
                    for (var arcID in arcMap) {
                        if (!arcMap.hasOwnProperty(arcID)) { continue; }
                        for (i=0; i<arcMap[arcID].length; i++) {
                            var entityID = arcMap[arcID][i][0];
                            var relationID = arcMap[arcID][i][1];
                            var relIndex = relationsRef[relationID];
                            var rel = relationsMap[relIndex];
                            if (rel[0].entity == entityID) {
                                rel[0].xor = arcID;
                            } else if (rel[1].entity == entityID) {
                                rel[1].xor = arcID;
                            }
                        }
                    }

                    // add transforms
                    for (var entID in transformsMap.entities) {
                        if (!transformsMap.entities.hasOwnProperty(entID)) { continue; }
                        if (!entityMap.hasOwnProperty(entID)) { continue; }
                        entityMap[entID].transform = transformsMap.entities[entID];
                    }

                    for (var relID in transformsMap.relations) {
                        if (!transformsMap.relations.hasOwnProperty(relID)) { continue; }
                        if (!relationsRef.hasOwnProperty(relID)) { continue; }
                        var ref = relationsRef[relID];
                        relationsMap[ref][0].transform = transformsMap.relations[relID][0];
                        relationsMap[ref][1].transform = transformsMap.relations[relID][1];
                    }

                    for (var noteID in transformsMap.notes) {
                        if (!transformsMap.notes.hasOwnProperty(noteID)) { continue; }
                        if (!notesMap.hasOwnProperty(noteID)) { continue; }
                        var note = parseNote(notesMap[noteID], transformsMap.notes[noteID]);
                        if (note.transform.height !== 1) {
                            notes.push(note);
                        }
                    }

                    // convert relations' entity ids to names
                    for(i=0; i<relationsMap.length; i++) {
                        var source = relationsMap[i][0].entity;
                        var target = relationsMap[i][1].entity;

                        relationsMap[i][0].entity = entityMap[source].name;
                        relationsMap[i][1].entity = entityMap[target].name;
                    }

                    //

                    var data = {
                        entities: toArray(entityMap),
                        relations: relationsMap,
                        notes: notes
                    };

                    try {
                        canvas.import(data);
                        canvas.ui.success("File was imported", ns.Consts.UIDefaultSuccessDuration);

                        if (resolve) { resolve(); }
                    } catch(e) {
                        canvas.ui.error("File couldn't be imported: check you are importing zip with exported SQL Developer model");
                        console.log(e);

                        if (reject) { reject(e); }
                    }
                });
            });
    };

    return self;
}());
