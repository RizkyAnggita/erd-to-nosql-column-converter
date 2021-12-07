/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
function init() {
  var $ = go.GraphObject.make;
  myDiagram = $(go.Diagram, 'myDiagramDiv', {
    'undoManager.isEnabled': true,
  });

  myDiagram.nodeTemplate = $(
    go.Node,
    'Auto',
    {locationSpot: go.Spot.Center},
    new go.Binding('location', 'location', go.Point.parse).makeTwoWay(go.Point.stringify),
    $(go.Shape, 'Circle',
      {
        fill: 'white',
        stroke: 'gray',
        strokeWidth: 1,
        portId: '',
        fromLinkable: true,
        toLinkable: true,
      },
      new go.Binding('stroke', 'color'),
      new go.Binding('strokeDashArray'),
      new go.Binding('figure'),
      new go.Binding('width'),
      new go.Binding('height'),
    ),
    $(
      go.TextBlock,
      {
        margin: new go.Margin(5, 5, 5, 5),
        font: '10pt sans-serif',
        minSize: new go.Size(16, 16),
        maxSize: new go.Size(120, NaN),
        textAlign: 'center',
        editable: true,
      },
      new go.Binding('text').makeTwoWay(),
      new go.Binding("isUnderline", "underline"),
    )
  );

  myDiagram.linkTemplate =
    $(go.Link,
      $(go.Shape),
      $(go.Shape, {toArrow: ""},  // the "to" arrowhead
        new go.Binding("toArrow", "toArrow"),
      ),
    );
  
    

  // initialize Palette
  myPalette = $(go.Palette, 'myPaletteDiv', {
    nodeTemplate: myDiagram.nodeTemplate,
    contentAlignment: go.Spot.Center,
    layout: $(go.GridLayout, {wrappingColumn: 4, cellSize: new go.Size(4, 4)}),
  });

  // now add the initial contents of the Palette
  myPalette.model.nodeDataArray = [
    {text: 'Derived\nAttribute', color: 'black', figure: 'Ellipse', strokeDashArray: [2, 2]},
    {text: 'Identifier\nAttribute', color: 'black', figure: 'Ellipse', underline: true},
    {text: 'Regular\nAttribute', color: 'black', figure: 'Ellipse', },
    {text: 'Relation', color: 'black', figure: 'Diamond'},
    {text: 'Entity', color: 'black', figure: 'Rectangle', width: 90, height: 50},
    {text: 'Is A', color: 'black', figure: 'TriangleDown'},
    {text: 'Custom', color: 'black', figure: 'Custom'},
  ];

  var inspector = new Inspector('myInspectorDiv', myDiagram, {
    // uncomment this line to only inspect the named properties below instead of all properties on each object:
    includesOwnProperties: true,
    properties: {
      text: {show: Inspector.showIfPresent},
      // key would be automatically added for nodes, but we want to declare it read-only also:
      key: {readOnly: true, show: Inspector.showIfPresent},
      // color would be automatically added for nodes, but we want to declare it a color also:
      color: {type: 'color', show: Inspector.showIfPresent},
      figure: {show: Inspector.showIfPresent},
      toArrow: {show: Inspector.showIfLink}
    },
  });

  load();
}

// Show the diagram's model in JSON format
function save() {
  document.getElementById('mySavedModel').value = myDiagram.model.toJson();
  myDiagram.isModified = false;
}
function load() {
  console.log(go.Model.fromJson(document.getElementById('mySavedModel').value));
  myDiagram.model = go.Model.fromJson(document.getElementById('mySavedModel').value);
}

function addToPalette() {
  var node = myDiagram.selection
    .filter(function (p) {
      return p instanceof go.Node;
    })
    .first();
  if (node !== null) {
    myPalette.startTransaction();
    var item = myPalette.model.copyNodeData(node.data);
    myPalette.model.addNodeData(item);
    myPalette.commitTransaction('added item to palette');
  }
}

// The user cannot delete selected nodes in the Palette with the Delete key or Control-X,
// but they can if they do so programmatically.
function removeFromPalette() {
  myPalette.commandHandler.deleteSelection();
}
window.addEventListener('DOMContentLoaded', init);