'use strict'

/**
* Sets-up the application.
* Returns an express app.
*/

import express from 'express'
import helmet from 'helmet'
import bodyParser from 'body-parser'
import passport from 'passport'

import { applogger, httplogger } from './logger'
import authConfig from './authConfig'

import indexRouter from './routes/index'
import studiesRouter from './routes/studies'
import formsRouter from './routes/forms'
import usersRouter from './routes/users'
import participantsRouter from './routes/participants'
import teamsRouter from './routes/teams'
import answersRouter from './routes/answers'
import healthStoreDataRouter from './routes/healthStoreData'
import auditLogRouter from './routes/auditLog'
import testerRouter from './routes/tester'

export default async function () {
  authConfig()

  var app = express()

  app.use(helmet())
  app.use(httplogger)
  // setup body parser
  // default limit is 100kb, so we need to extend the limit
  // see http://stackoverflow.com/questions/19917401/node-js-express-request-entity-too-large
  app.use(bodyParser.urlencoded({ limit: '20mb', extended: false }))
  app.use(bodyParser.json({ limit: '20mb' }))
  app.use(bodyParser.text({ limit: '20mb' }))

  app.use(express.static('./public'))

  app.use(passport.initialize())

  app.use('/api', await indexRouter())
  app.use('/api', await studiesRouter())
  app.use('/api', await formsRouter())
  app.use('/api', await usersRouter())
  app.use('/api', await participantsRouter())
  app.use('/api', await teamsRouter())
  app.use('/api', await answersRouter())
  app.use('/api', await healthStoreDataRouter())
  app.use('/api', await auditLogRouter())
  app.use('/api', await testerRouter())

  // error handler
  app.use(function (err, req, res, next) {
    applogger.error(err, 'General error')

    // set locals, only providing error in development
    res.locals.message = err.message
    res.locals.error = req.app.get('env') === 'development' ? err : {}

    // render the error page
    res.status(err.status || 500)
    res.send('<p>INTERNAL ERROR</p>')
  })

  applogger.info('Starting server')

  return app
}
