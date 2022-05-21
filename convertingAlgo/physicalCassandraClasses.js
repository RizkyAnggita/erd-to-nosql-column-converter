class PhysicalCassandra {
  constructor(label, tables) {
    this.label = label
    this.tables = tables
  }
}

class Table {
  constructor(label, keys, columns) {
    this.label = label
    this.keys = keys
    this.columns = columns
  }
}

class Column {
  constructor(label, dataType) {
    this.label = label
    this.dataType = dataType
  }
}