# Data Modeler

Data Modeler is a Entity-Relationship web component for drawing diagrams in Barker notation. It was developed as a master's thesis project at Faculty of Information Technology at Czech Technical University in Prague. The main purpose of this modeler was to support education process of the Database Systems course. Since students will work in this modeler mostly during tests and exams, we have aimed for minimalism, simplicity and efficiency in user interface design.

## Preview

- Production: https://tfedor.github.io/datamodeler/example.html
- Development: https://tfedor.github.io/datamodeler/dev.html

## Features

- support for drawing logical models in the Barker notation, including XOR relationships, ISA hierarchy and notes
- automatic diagram layout, which ensures that equivalent diagrams are displayed in the same way
- save to local storage to preserve your work
- undo/redo (experimental)
- marking mode, used to mark incorrect parts of the diagram
- import and export to JSON, which may also be used to compare models as strings 
- import of Oracle SQL Developer Data Modeler Design, in form of a zip file
- support for multiple diagrams on one page
- tutorial for new users
- option to set up permissions and restrict certain functionality (e.g. export and import, which can not be used during exams)
- keyboard shortcuts

## Creating Canvas

To create a canvas, you have to initialize Diagram class and create canvas itself.

### Minimal Example

In this example Diagram is initialized with default settings and one canvas is created.

```javascript
DBSDM.Diagram.init();
(new DBSDM.Canvas()).create();
```

### More Realistic Example

It is possible to initialize diagram with non-default settings. These settings will apply to all canvases created on the page. Following settings are available:

Option           | Default | Description |
---------------- | ------- | ----------- |
allowEdit        | true    | Allow changes to the data of the diagram |
allowFile        | true    | Allow import and export actions from the interface |
allowCorrectMode | false   | Allow switching to marking mode |
allowRecent      | true    | Allow saving and loading recent models from local storage |
showTutorial     | true    | Determines whether the tutorial will be shown or not |
confirmLeave     | false   | Ask user to confirm leaving the page if there is a diagram with unsaved changes |
importIsChange   | false   | Determines whether import will be treated as a change (makes sense when used with confirmLeave on)
  
More realistic example of canvas creation follows, full code can be found in `example.html`

```javascript
/**
 * Initialize Diagram
 */
DBSDM.Diagram.init({
    allowEdit: true,
    allowFile: true,
    allowCorrectMode: true,
    confirmLeave: true,
    showTutorial: true
});

/**
 * Create empty canvas
 */
var canvas1 = new DBSDM.Canvas();
canvas1.create();

/**
 * Create canvas and programmatically import diagram
 * Note that JSON string is truncated
 */
var json = JSON.parse('{"entities": [...],"relations": [...]}');
var canvas2 = new DBSDM.Canvas();
canvas2.create();
canvas2.import(json);

/**
 * Export contents of second diagram
 * and print JSON string into console
 */
var promptDownload = false;
var prettify = false;
console.log(canvas2.export(promptDownload, prettify));
```

### As a Child of Specified Element

It is also possible to create child at given element, by providing Node as a parameter of `DBSDM.Canvas.create`.
 
```javascript
var parent = document.getElementById('parent');
DBSDM.Diagram.init();
(new DBSDM.Canvas()).create(parent);
```

## Code Structure

The code of the data modeler is in its entirety in `src` folder, `libs` contain 3rd party libraries while `styles` CSS files.

General or support classes are located in the root of `src` folder. Classes that handle model, render and user control
are located in `model`, `view` and `control` folder and follow MVC architecture.

## Deployment

Refer to `dev.html` and `example.html`.

`dev.html` shows deployment of non-merged source files,
useful during development because there is no need to build production file.
  
`example.html` similar than previous example, this one is using minimized production file for loading data modeler code. 

When building production file (found in `dist` folder with the minified version),
you can use proprietary ruby build script (very crude implementation,
which just merges all JavaScript source files together and then uses `uglifyjs` to minify it).


## Declaration/License

As the declaration from the thesis states, you may use this project for nonprofit purposes:

```text
I hereby declare that the presented thesis is my own work and that I have
cited all sources of information in accordance with the Guideline for adhering
to ethical principles when elaborating an academic final thesis.

I acknowledge that my thesis is subject to the rights and obligations stipulated
by the Act No. 121/2000 Coll., the Copyright Act, as amended. In
accordance with Article 46(6) of the Act, I hereby grant a nonexclusive authorization
(license) to utilize this thesis, including any and all computer programs
incorporated therein or attached thereto and all corresponding documentation
(hereinafter collectively referred to as the “Work”), to any and all persons that
wish to utilize the Work. Such persons are entitled to use the Work for nonprofit
purposes only, in any way that does not detract from its value. This
authorization is not limited in terms of time, location and quantity.
```
