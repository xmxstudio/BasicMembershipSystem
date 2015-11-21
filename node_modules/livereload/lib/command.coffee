runner = ->
  pjson      = require('../package.json')
  version    = pjson.version
  livereload = require './livereload'
  resolve    = require('path').resolve
  opts       = require 'opts'
  debug      = false;
  opts.parse [
    {
      short: "v"
      long:  "version"
      description: "Show the version"
      required: false
      callback: ->
        console.log version
        process.exit(1)
    }
    {
      short: "p"
      long:  "port"
      description: "Specify the port"
      value: true
      required: false
    }
    {
      short: "x"
      long: "exclusions"
      description: "Exclude files by specifying an array of regular expressions. Will be appended to default value which is [/\\.git\//, /\\.svn\//, /\\.hg\//]",
      required: false,
      value: true
    }
    {
      short: "d"
      long: "debug"
      description: "Additional debugging information",
      required: false,
      callback: -> debug = true
    }
  ].reverse(), true

  port = opts.get('port') || 35729
  exclusions = opts.get('exclusions') || []

  server = livereload.createServer({
    port: port
    debug: debug
    exclusions: exclusions
  })

  path = resolve(process.argv[2] || '.')
  console.log "Starting LiveReload v#{version} for #{path} on port #{port}."
  server.watch(path)

module.exports =
  run: runner
