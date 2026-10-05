const Notification = require('../models/Notification');

/**
 * Dispatch an in-app and simulated email/push notification
 */
async function sendNotification({
  recipient,
  sender = null,
  type,
  title,
  message,
  link = '',
  projectId = null,
  meta = {},
  io = null,
}) {
  try {
    if (!recipient) return null;

    const notification = await Notification.create({
      recipient,
      sender,
      type,
      title,
      message,
      link,
      projectId,
      meta,
      emailSent: true, // Marked as dispatched
      pushSent: true,
    });

    const populated = await Notification.findById(notification._id)
      .populate('sender', 'name avatar')
      .populate('recipient', 'name email');

    // Real-time Socket.IO emission
    if (io) {
      const room = `user_${recipient.toString()}`;
      io.to(room).emit('new_notification', populated);
      console.log(`🔔 Socket notification dispatched to room ${room}: ${title}`);
    }

    // Simulated email & push alert dispatch
    console.log(`📧 [EMAIL NOTIFICATION] To: ${populated.recipient?.email || recipient} | Subject: ${title} | Body: ${message}`);
    console.log(`📱 [PUSH NOTIFICATION] Alert triggered for user ${recipient}: "${title}"`);

    return populated;
  } catch (err) {
    console.error('Failed to send notification:', err.message);
    return null;
  }
}

module.exports = { sendNotification };
