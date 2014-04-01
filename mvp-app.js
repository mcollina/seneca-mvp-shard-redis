/* Copyright (c) 2013 Richard Rodger, MIT License */
"use strict";


var _       = require('underscore')
var express = require('express')

var seneca = require('seneca')()



process.on('uncaughtException', function(err) {
  console.error('uncaughtException:', err.message)
  console.error(err.stack)
  process.exit(1)
})



seneca.use('options','options.mine.js')

//seneca.use('redis-store',{
//  host: 'localhost',
//  port: 6379,
//  db: 1
//})


seneca.use('redis-store',{
  map: {
    'shard1/-/-': '*'
  },
  host: 'localhost',
  port: 6379,
  db: 1
})

seneca.use('redis-store',{
  map: {
    'shard2/-/-': '*'
  },
  host: 'localhost',
  port: 6379,
  db: 2
})

seneca.use('shard-store',{
  shards: {
    1: {
      zone: 'shard1',
      append: true
    },
    2: {
      zone: 'shard2',
      append: true
    }
  }
})

seneca.use('user',{confirm:true})
seneca.use('mail')
seneca.use('auth')
seneca.use('account')
seneca.use('project')

seneca.use('settings')



seneca.ready(function(err){
  if( err ) return process.exit( !console.error(err) );

  var options = seneca.export('options')

  var u = seneca.pin({role:'user',cmd:'*'})
  var projectpin = seneca.pin({role:'project',cmd:'*'})

  console.log('adding u1')
  u.register({nick:'u1',name:'nu1',email:'u1@example.com',password:'u1',active:true}, function(err,out){
    console.log('aaaa')
    console.log(out)
    if (out.ok) {
      projectpin.save( {account:out.user.accounts[0],name:'p1'} )
      seneca.act('role:settings, cmd:save, kind:user, settings:{a:"aaa"}, ref:"'+out.user.id+'"')
    }
  })
  u.register({nick:'u2',name:'nu2',email:'u2@example.com',password:'u2',active:true})
  u.register({nick:'a1',name:'na1',email:'a1@example.com',password:'a1',active:true,admin:true})


  seneca.act('role:settings, cmd:define_spec, kind:user',{spec:options.settings.spec})

  var web = seneca.export('web')

  var app = express()

  app.use( express.cookieParser() )
  app.use( express.query() )
  app.use( express.bodyParser() )
  app.use( express.methodOverride() )
  app.use( express.json() )

  app.use(express.session({secret:'seneca'}))

  app.use( web )


  app.use( function( req, res, next ){
    if( 0 == req.url.indexOf('/reset') ||
        0 == req.url.indexOf('/confirm') )
    {
      req.url = '/'
    }

    next()
  })


  app.use( express.static(__dirname+options.main.public) )

  app.listen( options.main.port )

  seneca.log.info('listen',options.main.port)

  seneca.listen()

})


