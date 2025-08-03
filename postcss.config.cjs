module.exports = {
  plugins: [
    require('postcss-import')({
      // Resolve imports from node_modules
      path: ['node_modules']
    })
  ]
};