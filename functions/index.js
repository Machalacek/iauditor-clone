/**
 * Cloud Functions for Firebase
 * Trigger: send an invite email via SendGrid whenever a new user document is created.
 */

const functions = require('firebase-functions');
const { setGlobalOptions } = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');
const logger = require('firebase-functions/logger');

admin.initializeApp();

// Limit to 10 concurrent instances per function
setGlobalOptions({ maxInstances: 10 });

// Configure SendGrid
const SENDGRID_API_KEY = functions.config().sendgrid.key;
const FROM_EMAIL       = functions.config().sendgrid.sender;
sgMail.setApiKey(SENDGRID_API_KEY);

/**
 * Firestore trigger on creation of /users/{userId}
 */
exports.sendInviteEmail = functions
  .region('us-central1')
  .firestore
  .document('users/{userId}')
  .onCreate(async (snap, context) => {
    const userData = snap.data();
    const email    = userData.email;
    if (!email) {
      logger.warn(`User ${context.params.userId} has no email; skipping invite.`);
      return null;
    }
    const name = userData.name || '';
    const role = userData.role || 'user';

    const msg = {
      to: email,
      from: FROM_EMAIL,
      subject: 'You’ve been invited to join our app!',
      html: `
        <p>Hi ${name},</p>
        <p>You’ve been granted <strong>${role}</strong> access to our application.</p>
        <p>
          Click <a href="https://your-app-domain.com/login">here to log in</a>
          and set your password if you haven’t already.
        </p>
        <p>— The Team</p>
      `,
    };

    try {
      await sgMail.send(msg);
      logger.info(`Invite email sent to ${email}`);
    } catch (err) {
      logger.error('Error sending invite email:', err);
    }

    return null;
  });
