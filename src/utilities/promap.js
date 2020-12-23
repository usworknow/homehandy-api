module.exports = (array, fn) =>
  Promise.all(array.map(fn))
