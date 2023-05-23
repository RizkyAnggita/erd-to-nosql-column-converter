function loadLogical(logicalSchema) {
  myLogicalDiagram.model = go.Model.fromJson(JSON.stringify(logicalSchema));
}

const createTableInput = (cf) => {
  let dataTable = ''

  dataTable += `
  <div class="table-input-container">
    <div class="table-title">${cf.label}</div>
  `
  
  cf.attributes?.forEach((attr) => {
    dataTable += `
    <div class="attribute-container">
      <div class="attribute-name">${attr.label}</div>
      <select class="attribute-input" id="${cf.label}-${attr.label}">
    `;
    
    const options = ['text', 'ascii', 'bigint', 'blob', 'boolean', 'date', 'decimal', 'double','smallint', 'int', 'float', 'timestamp', 'varchar', 'uuid', 'time'];
    for (const option of options) {
      if (option === attr.dataType) {
        dataTable += `<option value="${option}" selected>${option}</option>`;
      } else {
        dataTable += `<option value="${option}">${option}</option>`;
      }
    }

    dataTable += `
      </select>
    </div>
    `;
 
  })

  dataTable +=`
  </div>
  `

  return dataTable
}

const createTableInputAttribute = (columnFamilies) => {  
  let data = ''

  columnFamilies.forEach((cf) => {
    data += createTableInput(cf)
  })

  return data
}

const showDataTypeForm = () => {
  document.getElementById("convertDDL-btn").style.display = "none"
  document.getElementById("button-container-logical").style.display = "none"
  document.getElementById("data-type-input-container").style.display = "block"

  const dataTypeFormComponent = createTableInputAttribute(logicalModel.columnFamilies)
  document.getElementById('data-type-input').insertAdjacentHTML("afterbegin", dataTypeFormComponent);
}

const createKeyspace = (name) => {
  const newName = name.replace(/ /g, "_");

  return `CREATE KEYSPACE ${newName}
WITH replication = {'class': 'SimpleStrategy', 'replication_factor' : 1};

USE ${newName};

`
  
}

const visitedCF = new Map();

const insideExtractData = (cf, columnFamilies, tablesNoData) => {  
  if (!visitedCF.has(cf.label)) {
    var hasParent = false;
    visitedCF.set(cf.label);
    
    if (cf.parentColumnFam) {
      hasParent = true
      if (!visitedCF.has(cf.parentColumnFam.label)) {
        insideExtractData(cf.parentColumnFam, columnFamilies, tablesNoData);
      }
    } 
    
    for (const attr of cf.attributes) {
      if (attr.type === "Auxiliary") {
        console.log("AUX: ", attr.label);
        if (!visitedCF.has(attr.label)) {
          const idxCFAux = columnFamilies.findIndex(cf => cf.label === attr.label)
          const CFAux = columnFamilies[idxCFAux]
          insideExtractData(CFAux, columnFamilies, tablesNoData)
        }
      }
    }

    if (!cf.isFromRelationship || cf.relationshipType === "BinaryManyToMany") {
      var relationName = cf.label
      if (cf.relationshipType == "BinaryManyToMany") {
        relationName = cf.label.split("_")[0]
      }
      var xhttp = new XMLHttpRequest(); 
      xhttp.onreadystatechange = function() {
          if (this.readyState == 4 && this.status == 200) {
            const temp = xhttp.responseText;            
            const idxTable = tablesNoData.findIndex(tablet => tablet.label === cf.label)
            tablesNoData[idxTable].data = JSON.parse(JSON.parse(temp))

          }
      };
      xhttp.open("GET", 'http://localhost:8080/extract/'+relationName, false);
      xhttp.send();


    } else {
      if (hasParent) {
        // get keys from the parent
        const colKeys = [];
        cf.parentColumnFam.attributes.forEach((attr) => {
          if (attr.type === 'Key') {
            colKeys.push(attr)
          }
        })

        const parentIdx = tablesNoData.findIndex(table => table.label === cf.parentColumnFam.label)
        const parentDataOrigin = tablesNoData[parentIdx].data
        const parentDataExtracted = [];
        parentDataOrigin.forEach((data) => {
          tempObject = {}
          colKeys.forEach((col) => {
            tempObject[col.label] = data[col.label]
          })
          parentDataExtracted.push(tempObject)
        })
        
        const idxTable = tablesNoData.findIndex(tablet => tablet.label === cf.label)
        tablesNoData[idxTable].data = parentDataExtracted
      }

      cf.attributes.forEach((attr) => {
        const tempArr = []
        if (attr.type === 'Auxiliary') {
          // kita extract dari yg dirujuknya
          const tableReferred = attr.label
          const artificialIDReferred = attr.artificialID;
          const idxCurrTable = tablesNoData.findIndex(tablet => tablet.label === cf.label)
          const idxTableReferred = tablesNoData.findIndex(tablet => tablet.label === tableReferred)
          const idxCF = columnFamilies.findIndex(cf => cf.label === tableReferred)
          const sharedKeyCurrName = cf.parentColumnFam.attributes.find(attr => attr.type === 'Key').label
          var referredKeyName = columnFamilies[idxCF].attributes.find(attr => attr.type === 'Key').label
          

          const idxAttrReferred = columnFamilies[idxCF].attributes.findIndex(attr => attr.artificialID === artificialIDReferred)
          const attrReferred = columnFamilies[idxCF].attributes[idxAttrReferred]

          var colNameToCheck = attrReferred.label?.split("_")[0];

          tablesNoData[idxTableReferred].data.forEach((datum) => {
            const tempObj = {}
            tempObj[referredKeyName] = datum[referredKeyName]
            tempObj[colNameToCheck] = datum[colNameToCheck]
            tempArr.push(tempObj)
          })

          const dataCurr = tablesNoData[idxCurrTable].data
          const lenDataCurr = dataCurr.length
          const lenDataReferred = tempArr.length
          const newDataCurr = [];

          if (cf.relationshipType === 'ReflexiveRelationship') {
            referredKeyName = colNameToCheck
            colNameToCheck =  sharedKeyCurrName
          }

          for (let i = 0; i < lenDataCurr; i++) {
            for (let j = 0; j < lenDataReferred; j++) {
              if (dataCurr[i][sharedKeyCurrName] == tempArr[j][colNameToCheck]) {
                const tempObj = {};
                tempObj[sharedKeyCurrName] = dataCurr[i][sharedKeyCurrName]
                tempObj[attr.label] = tempArr[j][referredKeyName]
                console.log("INSIDE: ", tempObj)
                newDataCurr.push(tempObj)
              }
            }
            
          } 
          tablesNoData[idxCurrTable].data = newDataCurr
        }
      })
    }
  }
}

const extractData = (columnFamilies, physicalCassandra) => {
  const tablesNoData = physicalCassandra.tables;
  columnFamilies.forEach((cf) => {
    insideExtractData(cf, columnFamilies, tablesNoData);
  })

}

const convertData = (physicalCassandra) => {
  physicalCassandra.tables.forEach((table) => {
    table.columns.forEach((col) => {
      const currAttr = col.label
      // var isDataEmpty = false;
      table.data.forEach((datum) => {
        var convertDatum = datum[currAttr]
        if (convertDatum) {
          switch (col.dataType) {
            case "SMALLINT":
            case "BIGINT":
            case "INT":
              convertDatum = parseInt(convertDatum)
              break;
            case "FLOAT":
            case "DECIMAL":
              convertDatum = parseFloat(convertDatum)
              break;
            default:
              break;
              
          }
          datum[currAttr] = convertDatum
        }
      })
    })
  })
}

const convertToDDLCQL = () => {
  document.getElementById("ddl-section").style.display = "block"
  const physicalCassandra = logicalModel.logicalToPhysicalCassandra(logicalModel)

  console.log(physicalCassandra)

  extractData(logicalModel.columnFamilies, physicalCassandra);

  convertData(physicalCassandra)
  console.log("AFTER CONVERT DATA: ", physicalCassandra)

  const stringQuery = physicalCassandra.createDDL()
  const joinedQuery = createKeyspace(ername.value) +  stringQuery.join('\n')


  const textareaDDL = document.getElementById("ddl-content")
  textareaDDL.value = joinedQuery
  textAreaAdjust(textareaDDL)
}

const copyDDL = () => {
  const textareaDDL = document.getElementById("ddl-content")
  copyToClipboard(textareaDDL.value)
  alert('Successfully Copy DDL to Clipboard')
}

function textAreaAdjust(element) {
  element.style.height = "1px";
  element.style.height = (25+element.scrollHeight)+"px";
}

function copyToClipboard(text) {
  var dummy = document.createElement("textarea");
  document.body.appendChild(dummy);
  dummy.value = text;
  dummy.select();
  document.execCommand("copy");
  document.body.removeChild(dummy);
}

const scrollToTop = () => {
  document.getElementById("er-section").scrollIntoView()
}