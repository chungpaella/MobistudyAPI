'use strict'

/**
* This provides the API endpoints for authentication.
*/
import express from 'express'
import passport from 'passport'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import getDB from '../DB/DB'
import getConfig from '../config'
import { applogger } from '../logger'
import { sendEmail } from '../mailSender'

const router = express.Router()

const config = getConfig()

export default async function () {
  const db = await getDB()

  router.post('/login', passport.authenticate('local', { session: false }), function (req, res, next) {
    res.send(req.user)
  })

  router.post('/sendResetPasswordEmail', async function (req, res) {
    if (req.body.email) {
      let email = req.body.email
      let existing = await db.findUser(email)
      if (!existing) return res.sendStatus(200)

      let daysecs = 24 * 60 * 60
      const token = jwt.sign({
        email: email
      }, config.auth.secret, {
        expiresIn: daysecs
      })
      let serverlink = req.protocol + '://' + req.headers.host + '/resetPassword?email=' + email + '&token=' + token
      sendEmail(email, 'Mobistudy Password recovery', `<p>You have requested to reset your password on Mobistudy.</p>
      <p>Please go to <a href="${serverlink}">this webpage</a> to set another password.</p>
      <p>Or use the following code if required: ${token}</p>
      <p>This code will expire after 24 hours.</p>`)
      res.sendStatus(200)
    } else res.sendStatus(200)
  })

  router.post('/resetPassword', async function (req, res) {
    if (req.body.token && req.body.password) {
      try {
        var decoded = jwt.verify(req.body.token, config.auth.secret)
      } catch (err) {
        applogger.error(err, 'Resetting password, cannot parse token')
        console.error(err)
        return res.sendStatus(500)
      }
      if (new Date().getTime() >= (decoded.exp * 1000)) {
        applogger.error('Resetting password, token has expired')
        res.sendStatus(400)
      } else {
        let email = decoded.email
        let newpasssword = req.body.password
        let hashedPassword = bcrypt.hashSync(newpasssword, 8)
        let existing = await db.findUser(email)
        if (!existing) return res.status(409).send('This email is not registered')
        await db.patchUser(existing._key, {
          hashedPassword: hashedPassword
        })
        res.sendStatus(200)
      }
    } else res.sendStatus(400)
  })

  router.post('/users', async (req, res) => {
    let user = req.body
    let hashedPassword = bcrypt.hashSync(user.password, 8)
    delete user.password
    user.hashedPassword = hashedPassword
    try {
      let existing = await db.findUser(user.email)
      if (existing) return res.status(409).send('This email is already registered')
      if (user.role === 'admin') return res.sendStatus(403)
      // if (user.role === 'researcher' && user.invitationCode !== '827363423') return res.status(400).send('Bad invitation code')
      await db.createUser(user)
      res.sendStatus(200)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot store new user')
      res.sendStatus(500)
    }
  })

  // possible query parameters:
  // studyKey: the key of the study
  router.get('/users', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
      let val
      if (req.user.role === 'admin') {
        val = await db.getAllUsers(null, req.query.studyKey)
      } else if (req.user.role === 'researcher') {
        // TODO: make sure the study Key is among the ones the researcher is allowed
        if (req.query.studyKey) val = await db.getAllUsers('participant', req.query.studyKey)
        else {
          // TODO: retrieve studies where this participant is involved in
          let studyKeys = undefined
          val = await db.getAllUsers('participant', undefined, studyKeys)
        }
      } else { // a participant
        val = await db.getOneUser(req.user._key)
      }
      res.send(val)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot store new user')
      res.sendStatus(500)
    }
  })

  router.get('/users/:user_key', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
      let val
      if (req.user.role === 'admin') {
        val = await db.getOneUser(req.params.user_key)
      } else if (req.user.role === 'researcher') {
        // TODO: make sure the user Key is among the ones the researcher is allowed. i.e is part of the team key
        val = await db.getOneUser(req.params.user_key)
        }
      res.send(val)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve user details')
      res.sendStatus(500)
    }
  })

  return router
}