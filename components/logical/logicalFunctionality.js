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

const convertToDDLCQL = () => {
  document.getElementById("ddl-section").style.display = "block"
  const physicalCassandra = logicalModel.logicalToPhysicalCassandra(logicalModel)

  console.log(physicalCassandra)

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