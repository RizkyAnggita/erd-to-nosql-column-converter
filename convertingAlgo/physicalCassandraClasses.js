class PhysicalCassandra {
  constructor(label, tables) {
    this.label = label
    this.tables = tables || []
  }

  createDDL() {
    let stringQuery = []
    this.tables.forEach((table) => {
      stringQuery.push(`DROP TABLE IF EXISTS ${table.label};`)
      stringQuery.push(`CREATE TABLE ${table.label} (`)

      table.columns?.forEach((column) => {
        stringQuery.push(`  ${column.label} ${column.dataType},`)
      })

      stringQuery.push(`  PRIMARY KEY (${table.keys})`)
      if (table.comments.length > 0) stringQuery.push(`) WITH comment = '${table.comments.join(', ')}';`)
      else stringQuery.push(');')
      stringQuery.push('')
    })

    this.tables.forEach((table) => {
      stringQuery.push('')
      stringQuery.push(`/* Insert Data for ${table.label} */`)
      table.data.forEach((datum) => {
        var keys = [];
        for (var key in datum) {
          keys.push(key)
        }
        
        const keyString = keys.toString()
        var stringTemp = ""
        stringTemp += `INSERT INTO ${table.label} (${keyString}) VALUES(`
        
        keys.forEach((key, index) => {
          if (index !== keys.length-1 ) {
            stringTemp += `${JSON.stringify(datum[key])}, `
          } else {
            stringTemp += `${JSON.stringify(datum[key])});`
          }
        })
        stringQuery.push(stringTemp)
        stringQuery.push('')
      })
    })



    return stringQuery
  }

  addTable(table) {
    this.tables.push(table)
  }

  setTables(tables) {
    this.tables = tables
  }

  getIdxTableByLabel(label) {
    return this.tables.findIndex(table => table.label === label);
  }
}

class Table {
  constructor(label, keys, columns) {
    this.label = label
    this.keys = keys
    this.columns = columns || []
    this.comments = []
    this.data = []
  }

  setLabel(label) {
    this.label = label
  }

  setKeys(keys) {
    this.keys = keys
  }

  setColumns(columns) {
    this.columns = columns
  }

  addColumn(column) {
    this.columns.push(column)
  }

  setComments(comments) {
    this.comments = comments
  }

  setData(data) {
    this.data = data
  }
}

class Column {
  constructor(label, dataType, data) {
    this.label = label
    this.dataType = dataType
  }

  setLabel(label) {
    this.label = label
  }

  setDataType(dataType) {
    this.dataType = dataType
  }

  setAttrNameInRelational(name) {
    this.attrNameInRelational = name
  }
}