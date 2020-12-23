// This script removes files
var rimraf = require('rimraf')

rimraf('node_modules/*', () => {
  console.log()
  console.log('Files Removed')
  console.log()
})
rimraf('node_modules', () => {
  console.log()
  console.log('Folder Removed')
  console.log()
})
