'use strict'

/**
* This allows email to be structured and sent to participants wrt studies.
*/
import { applogger } from './logger.mjs'
import getDB from '../DB/DB.mjs'
import i8n from '../i8n/i8n.mjs'

export async function passwordRecoveryCompose(serverlink, token) {
  i8n.locale = 'en-gb' //TODO: change it to actual user language

  let title = i8n.t('account.passwordRecoveryTitle')
  let content = i8n.t('account.passwordRecoveryContent', {serverlink: serverlink, token: token})
  return { title: title, content: content }
}

// Creates the content of an email to be sent to a user when the status of a study changes
// returns { title: '...', content: '...'}
export async function studyStatusUpdateCompose(studyKey, participant) {
  let db = await getDB()

  let study = await db.getOneStudy(studyKey)
  i8n.locale = 'en-gb' //TODO: change it to actual user language
  let studyTitle = study.generalities.title
  let emailTitle = ''
  let emailContent = ''
  let taskConDesc = ''
  let taskNotConDesc = ''

  // get the participant's role in this study
  let partStudy = participant.studies.find( s => s.studyKey === studyKey )

  // Send EMAILS according to status
  if (partStudy.currentStatus === 'accepted') {
    emailTitle = i8n.t('studyStatusUpdate.studyAcceptedTitle', { studyTitle: studyTitle })
    emailContent = i8n.t('studyStatusUpdate.studyAcceptedThanks', { studyTitle: studyTitle })
    // If there are consented task items, get them from study
    if (partStudy.taskItemsConsent.length !== 0 || partStudy.extraItemsConsent.length !== 0) {
      emailContent += '\n\n'
      for (let i = 0; i < partStudy.taskItemsConsent.length; i++) {
        let taskID = partStudy.taskItemsConsent[i].taskId
        // get description of task from study description using ID
        let descr = '\u2022 ' + study.consent.taskItems.find(t => t.taskId == taskID).description + '\n'
        if (partStudy.taskItemsConsent[i].consented === true) taskConDesc += descr
        else taskNotConDesc += descr
      }
      for (let i = 0; i < partStudy.extraItemsConsent.length; i++) {
        let descr = '\u2022 ' + study.consent.extraItems[i].description + '\n'
        if(partStudy.extraItemsConsent[i].consented) taskConDesc += descr
        else taskNotConDesc += descr
      }
      emailContent += i8n.t('studyStatusUpdate.studyAcceptedConsentedTasks') + '\n'
      emailContent += taskConDesc
      if (!!taskNotConDesc) {
        emailContent += '\n ' + i8n.t('studyStatusUpdate.studyAcceptedNotConsentedTasks') + '\n'
        emailContent += taskNotConDesc
      }
    }
  }
  if (partStudy.currentStatus === 'completed') {
    emailTitle = i8n.t('studyStatusUpdate.studyCompletedTitle', { studyTitle: studyTitle })
    emailContent = i8n.t('studyStatusUpdate.studyCompletedThanks', { studyTitle: studyTitle })
  }
  if (partStudy.currentStatus === 'withdrawn') {
    emailTitle = i8n.t('studyStatusUpdate.studyWithdrawnTitle', { studyTitle: studyTitle })
    emailContent = i8n.t('studyStatusUpdate.studyWithdrawnThanks', { studyTitle: studyTitle })
  }
  return { title: emailTitle, content: emailContent }
}