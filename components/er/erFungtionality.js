/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */

var $ = go.GraphObject.make;
let contents = {}
const ername = document.getElementById("er-name-input")
const logicalName = document.getElementById("logical-schema-name")
const logicalSection = document.getElementById("logical-schema-section")
let logicalModel
let allAttribute = []
let erAttribute = []

// Clear Diagram
const clearDiagram = () => {
  myDiagram.model = go.Model.fromJson(
  { "class": "GraphLinksModel",
  "nodeDataArray": [],
  "linkDataArray": []})
  ername.value = ""
  logicalName.innerHTML = ""
  logicalSection.style.display = "none"

  document.getElementById("convertDDL-btn").style.display = "inline-block"
  document.getElementById("button-container-logical").style.display = "block"
  document.getElementById("data-type-input").innerHTML = ""
  document.getElementById("data-type-input-container").style.display = "none"
  document.getElementById("ddl-section").style.display = "none"
}

// Save Diagram
const download = (filename, text) => {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

const save = () => {
  document.getElementById('mySavedModel').value = myDiagram.model.toJson();
  download(`${ername.value}.ercvt`, myDiagram.model.toJson());
  myDiagram.isModified = false;
}

// Load Diagram
const readSingleFile = (evt) => {
  clearDiagram()
  var f = evt.target.files[0];
  if (f) {
      var r = new FileReader();
      r.onload = function(e) { 
        contents = e.target.result;
        try {
          myDiagram.model = go.Model.fromJson(contents)
        }
        catch {
          alert("Error loading file, please select .ercvt file")
        }
      }
      r.readAsText(f);
      ername.value = f.name.slice(0, -6)
  } else {
      alert("Failed to load file");
  }
  document.getElementById('load-input').value = ''
}

document.getElementById('load-input').addEventListener('change', readSingleFile, false);

const load = () => {
  document.getElementById('load-input').click();
}

const extractERFromRDButton = document.getElementById('extract-er-model');
const popupBackground = document.getElementById('popupBackground');
const popupForm = document.getElementById('popupForm');
const cancelFormButton = document.getElementById("cancelFormButton");
const submitFormButton = document.getElementById('submitFormButton');
var params = {}

// Add click event listener to open form button
extractERFromRDButton.addEventListener('click', function() {
  popupBackground.style.display = 'block';
});

// Add click event listener to close button
popupBackground.addEventListener('click', function(event) {
  if (event.target === popupBackground) {
    popupBackground.style.display = 'none';
  }
});

cancelFormButton.addEventListener("click", () => {
  popupBackground.style.display = 'none';
});

submitFormButton.addEventListener('click', function() {
  params = {
    username: document.getElementById('username').value,
    password: document.getElementById('password').value,
    dbName: document.getElementById('dbName').value,
    port: document.getElementById('port').value,
    url: document.getElementById('url').value,
    driver: document.querySelector('input[name="dbType"]:checked').value,
  }

  fetch('http://localhost:8080/extract-eer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params)
  })
  .then(response => response.json())
  .then(data => {
    console.log(data)
    try {
      myDiagram.model = go.Model.fromJson(data)
    }
    catch(e) {
      console.log(e)
      alert("Error loading file, please select .ercvt file")
    }
    ername.value = params.dbName
  })
  .catch(error => console.error(error));

  // Hide form
  popupBackground.style.display = 'none';
});

const loadDefault = () => {
  myDiagram.model = go.Model.fromJson(document.getElementById('mySavedModel').value);
  ername.value = ""
  logicalSection.style.display = "none"

  // development
  // document.getElementById("convert-logical-btn").click()
  // document.getElementById("convertDDL-btn").click()
}

// Convert Diagram
const convertToERModel = (ername) => {
  const ERModelName = ername
  const ERSchema = JSON.parse(myDiagram.model.toJson());
  
  let newERModel = new ERModel(ERModelName)
  entityRelations = []
  let attributeArray = []

  // Get the entity, relationship and attributes
  ERSchema.nodeDataArray.forEach((ER) => {
    // Entity
    if (["Rectangle", "DoubleRectangle", "AssociativeRectangle"].includes(ER.figure)) {
      const newEntity = new Entity(ERModelName, ER.text)
      newEntity.id = ER.key

      if (ER.figure == "Rectangle") newEntity.type = "Entity"
      else if (ER.figure == "DoubleRectangle") newEntity.type = "WeakEntity"
      else if (ER.figure == "AssociativeRectangle") newEntity.type = "AssociativeEntity"

      entityRelations.push(newEntity)
    }
    // Relationship
    else if (["TriangleDown", "Diamond", "DoubleDiamond"].includes(ER.figure)) {
      const newRelationship = new Relationship(ERModelName, ER.text)
      newRelationship.id = ER.key
      newRelationship.identificator = ER.identificator

      if (ER.figure == "TriangleDown") newRelationship.type = "SpecialConnector"
      else if (ER.figure == "Diamond") newRelationship.type = "Relationship"
      else if (ER.figure == "DoubleDiamond") newRelationship.type = "WeakRelationship"

      entityRelations.push(newRelationship)
    }
    // Attribute
    else {
      if (ER.dataType) {
        ER.dataType = mapDataType(ER.dataType)
      }

      allAttribute.push(ER.text);
      const newAttribute = new Attribute(ER.text)
      newAttribute.id = ER.key
      newAttribute.dataType = ER.dataType

      if (ER.figure == "Ring"){
        newAttribute.type = "Multivalued"
        const min = parseInt(ER.min)
        const max = parseInt(ER.max)
        if (min) newAttribute.min = ER.min
        if (max) newAttribute.max = ER.max
      } 
      else if (ER.figure == "Ellipse" && ER.underline) newAttribute.type = "Key"
      else if (ER.figure == "Ellipse" && ER.strokeDashArray?.length > 0) newAttribute.type = "Derived"
      else newAttribute.type = "Regular"

      attributeArray.push(newAttribute)
    }
  })

  let ERToERLinks = []
  let attrToAttrLinks = []
  let attrToERLinks = []
  let attrDirectToER = []
  let processedAttribute = []
  ERSchema.linkDataArray.forEach((link) => {
    let attrFrom = attributeArray.find(o => o.id == link.from)
    let attrTo = attributeArray.find(o => o.id == link.to)

    if (attrFrom && attrTo) {
      attrToAttrLinks.push(link)
    }
    else if (!attrFrom && !attrTo){
      ERToERLinks.push(link)
    }
    else {
      attrToERLinks.push(link)
      if (attrFrom) {
        attrDirectToER.push(link.from)
        processedAttribute.push(link.from)
      }
      else {
        attrDirectToER.push(link.to)
        processedAttribute.push(link.to)
      }
    }
  })

  while (attrToAttrLinks.length > 0) {
    tempArr = [...attrToAttrLinks]
    attrToAttrLinks.forEach((link, index) => {
      let attrFrom = attributeArray.find(o => o.id == link.from)
      let attrTo = attributeArray.find(o => o.id == link.to)
  
      // the unprocessed is on the to side
      if (processedAttribute.includes(link.from)) {
        attrFrom.children.push(attrTo)
        processedAttribute.push(link.to)
      }
      // the unprocessed is on the from side
      else if (processedAttribute.includes(link.to)) {
        attrTo.children.push(attrFrom)
        processedAttribute.push(link.from)
      }
      tempArr[index] = null
    })

    attrToAttrLinks = tempArr.filter(function (el) {
      return el != null;
    });

  }


  // Process the link
  ERSchema.linkDataArray.forEach((link) => {
    const cardinality = link.isOne ? "One" : "Many"
    const participation = link.isTotal ? "Total" : "Partial"
    const isParentConnector = link.isParent
    const newConnector = new Connector(ERModelName, link.from, link.to, cardinality, participation)
    let ERFrom = entityRelations.find(o => o.id == link.from)
    let ERTo = entityRelations.find(o => o.id == link.to)

    // Relation between Entity and Relationship
    if (ERFrom && ERTo) {

      newConnector.type = "RelationConnector"
      if (ERFrom.type == "SpecialConnector") newConnector.type = "SpecialConnector"

      if (isParentConnector) {
        ERFrom.superID = link.to
        newConnector.type = "ParentSpecialization"
        if (link.isTotal) ERFrom.isTotal = true
        else ERFrom.isTotal = false
      }
      ERFrom.connectors.push(newConnector)
      ERTo.connectors.push(newConnector)
    }
    // From attribute to attribute
    else if (!ERFrom && !ERTo) {
      // unprocessedLinks.push(link)
    }
    // From Attribute to Entity/Relationship
    else if (!ERFrom) {
      ERFrom = attributeArray.find(o => o.id == link.from)
      ERFrom.ER = ERTo.label
      ERTo.attributes.push(ERFrom)
    }
    else if (!ERTo) {
      ERTo = attributeArray.find(o => o.id == link.to)
      ERTo.ER = ERFrom.label
      ERFrom.attributes.push(ERTo)
    }
  })
  return newERModel
}

checkParentColumFam = (columnFamilies) => {
  let isSwapping = false
  columnFamilies.forEach((cf, index) => {
    if (Number.isInteger(cf.parentColumnFam)) {
      const parentIdx = columnFamilies.findIndex(o => o.id == cf.parentColumnFam)
      cf.parentColumnFam = columnFamilies[parentIdx]
      cf.parentColumnFam =  getParentCF(cf.parentColumnFam, logicalModel.columnFamilies)


      isSwapping = !isSwapping
      if (isSwapping) {
        var temp = columnFamilies[index];
        columnFamilies[index] = columnFamilies[parentIdx];
        columnFamilies[parentIdx] = temp;
      }

    } 

    // Might Error
    if (cf == cf.parentColumnFam){
      cf.parentColumnFam = null
    }
  })
}
const mapDataType = (mySQLType) => {
  mySQLType = mySQLType.toLowerCase();
  switch (mySQLType) {
    case 'int':
      return 'int';
    case 'smallint':
      return 'smallint';
    case 'bigint':
      return 'bigint';
    case 'float':
      return 'float';
    case 'double':
      return 'double';
    case 'decimal':
      return 'decimal';
    case 'char':
    case 'varchar':
    case 'tinytext':
    case 'text':
    case 'mediumtext':
    case 'longtext':
    case 'json':
      return 'text';
    case 'blob':
    case 'mediumblob':
    case 'longblob':
      return 'blob';
    case 'date':
      return 'date';
    case 'datetime':
    case 'timestamp':
      return 'timestamp';
    case 'time':
      return 'text';
    case 'boolean':
      return 'boolean';
    default:
      return mySQLType;
  }
}


const convertToLogical = () => {
  visited = []
  artificialID = 0
  const ername = document.getElementById("er-name-input")
  document.getElementById("convertDDL-btn").style.display = "inline-block"
  document.getElementById("button-container-logical").style.display = "block"
  document.getElementById("data-type-input").innerHTML = ""
  document.getElementById("data-type-input-container").style.display = "none"
  document.getElementById("ddl-section").style.display = "none"

  let error = []

  if (ername.value == "") {
    alert("Please fill The entity relationship name")
  }
  else {
    allAttribute = []
    erAttribute = []
    const newERModel = convertToERModel(ername.value)
    try {
      // Validate attribute 
      entityRelations.forEach(er => {
        let isHaveId = false
        if (er.type == "Entity" || er.type == 'WeakEntity') {
          er?.attributes.forEach(attr => {
            if (attr.type == 'Key') {
              isHaveId = true
            }
          })

          if (!isHaveId) {
            let isRelatedSpecialization = false
            er?.connectors?.forEach(conn => {
              if (conn.type == "SpecialConnector") {
                isRelatedSpecialization = true
              }
            })
            if (!isRelatedSpecialization) error.push(`>> Entity ${er.label} does not have identifier attribute`)
          }
        }
      })

      const addERattribute = (erAttribute, attr) => {
        erAttribute.push(attr.label)
        attr.children?.forEach((child) => {
          addERattribute(erAttribute, child)
        })
      }

      // Validate duplicate attribute
      entityRelations.forEach(er => {
        const attrLookUp = createLookup(er.attributes)

        er?.attributes.forEach(attr => {
          addERattribute(erAttribute, attr)
        })

        for (const property in attrLookUp) {
          if (attrLookUp[property] != 0) {
            error.push(`>> Duplicate attribute ${property} in ${er.type} ${er.label}`)
          }
        }

      })

      // Validate attribute has to connect to entity, relationship or other attribute
      let difference = allAttribute.filter(x => !erAttribute.includes(x));
      difference.forEach((diff) => {
        error.push(`>> Attribute ${diff} need to connect to entity, relationship or other attribute`)
      })

      createReference(entityRelations)
      splitER(newERModel, entityRelations)

      // Validation duplicate ER Name
      const entityLookUp = createLookup(newERModel.entities)
      const relationshipLookUp = createLookup(newERModel.relationships)

      for (const property in entityLookUp) {
        if (entityLookUp[property] != 0) {
          error.push(`>> Duplicate Entity Label ${property}`)
        }
      }

      for (const property in relationshipLookUp) {
        if (relationshipLookUp[property] != 0 && property != "Speciali\nzation") {
          error.push(`>> Duplicate Relationship Label ${property}`)
        }
      }

      // Validate entities
      newERModel.entities.forEach(entity => {
        // Validate Weak Entity
        let count = 9999
        if (entity.type == 'WeakEntity') {
          count = 0

          entity.connectors.forEach(conn => {
            if (conn.fromER.type == 'WeakRelationship') {
              count += 1
            }
          })
        }

        if (count < 1) {
          error.push(`>> Weak Entity ${entity.label} has no relation with any weak relationship`)
        }

        // Validate  Associatibe Entity
        let countEntity = 999
        let countRelationship = 999

        if (entity.type == 'AssociativeEntity') {
          countEntity = 0
          countRelationship = 0
          entity.connectors.forEach(conn => {
            if (conn.fromER.type == 'WeakRelationship' || conn.fromER.type == 'Relationship') {
              countRelationship += 1
            }
            if (conn.toER.type == 'WeakEntity' || conn.toER.type == 'Entity') {
              countEntity += 1
            }
          })
        
          if (countEntity != 2) {
            error.push(`>> Associative Entity ${entity.label} has to have 2 connections with other entity`)
          }
          if (countRelationship < 1) {
            error.push(`>> Associative Entity ${entity.label} has to have 1 connections with other relationship`)
          }
        }

      })

      // Validate relationship
      newERModel.relationships.forEach(relation => {
        // Validate Specialization
        let count = -1
        if (relation.type == 'SpecialConnector') {
          count = 0
          
          relation.connectors.forEach(conn => {
            if (conn.toER.type != 'Entity') {
              error.push(`>> Specialization ERD Error has ${conn.toER.type}`)
            }
            if (conn.type == 'ParentSpecialization') {
              count += 1
            }
          })
        }

        if (count > 1) {
          error.push(`>> Parent of Specialization on ${relation.superER.label} has ${count} parents`)
        }
        else if (count == 0) {
          error.push(`>> No Parent on a specialization`)
        }

        // Validate Weak Relationship
        count = -1
        if (relation.type == 'WeakRelationship') {
          count = 0
          relation.connectors.forEach(conn => {
            if (conn.toER.type == 'WeakEntity') {
              count += 1
            }
          })
        }

        if (count == 0) {
          error.push(`>> Weak relationship ${relation.label} has no weak entity`)
        }

        // Validate relationship
        let countEntity = 0
        if (relation.type == 'Relationship') {
          relation.connectors.forEach(conn => {
            if (['WeakEntity', 'AssociativeEntity', 'Entity'].includes(conn.toER.type)) {
              countEntity += 1
            }
          })  
          
          if (countEntity != 2) {
            error.push(`>> Entity ${relation.label} has to be connected to two entities`)
          }
        }


        // Create ReflexiveRelationship
        if (relation.type == 'Relationship') {
          const erConnectors = relation.connectors 
          if (erConnectors.length == 2) {
            if (erConnectors[0].to == erConnectors[1].to) {
              relation.type = 'ReflexiveRelationship'
            }
          }
        }
      })
    } 
    catch (e) {
      error.push(`>> Error converting, please check your ERD`)
      console.log(e)
    }


    // Finish Validating
    if (error.length != 0) {
      alert(error.join('\n'))
    }
    else {
      try {
        logicalModel = newERModel.convertERToLogical()
        checkParentColumFam(logicalModel.columnFamilies)
  
        logicalSection.style.display = "block"
        logicalName.innerHTML = `for ${ername.value}`
  
        const logicalTitle = document.getElementById("logical-schema-title")
        logicalTitle.scrollIntoView()
        
        const logicalSchema = logicalModel.visualizeLogicalModel(logicalModel.columnFamilies)
        loadLogical(logicalSchema);
      }
      catch(e) {
        alert(`>> Error converting, please check your ER Diagram`)
        console.log(e)
      }
    }
  }
}

const createLookup = (arr) => {
  const lookup = arr.reduce((a, e) => {
    a[e.label] = ++a[e.label] || 0;
    return a;
  }, {});

  return lookup
}



// createReference(ERModel)
// splitER(ERModel)


// Kekurangan
// Type di connector blm implement
// How can kita membatasi konstrain2 saat membangun ERD
// kalo yg one to many gtu gmn supaya yang ada cuma buat shape2 tertentu aja
// Kalau composite attribute agak susah karena tidak tau from to nya
// Attribute bisa nyambung kemana pun sesuka hati