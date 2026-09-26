package ro.stopfrauda.calldetector

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import androidx.core.app.NotificationCompat

object CallAlertNotificationHelper {
    const val CHANNEL_ALERT_ID = "stopfrauda_scam_alerts"
    const val CHANNEL_SERVICE_ID = "stopfrauda_active_protection"

    private const val ALERT_NOTIFICATION_ID = 9110
    const val SERVICE_NOTIFICATION_ID = 9111

    fun createNotificationChannels(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            // 1. High-priority scam alert channel
            val alertChannel = NotificationChannel(
                CHANNEL_ALERT_ID,
                "Scam & Unknown Caller Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Urgent alerts when an unknown number calls your phone."
                enableLights(true)
                lightColor = Color.RED
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 400, 200, 400)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }

            // 2. Foreground protection service channel
            val serviceChannel = NotificationChannel(
                CHANNEL_SERVICE_ID,
                "StopFrauda Active Protection",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows that StopFrauda call screening is active."
                setShowBadge(false)
            }

            notificationManager.createNotificationChannel(alertChannel)
            notificationManager.createNotificationChannel(serviceChannel)
        }
    }

    fun showUnknownCallAlert(context: Context, callerNumber: String) {
        createNotificationChannels(context)

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Intent to launch app on click
        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }

        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ALERT_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle("⚠️ UNKNOWN CALLER ALERT!")
            .setContentText("Incoming call from: $callerNumber (Not in Contacts)")
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText(
                        "🚨 Number $callerNumber is NOT in your contacts! StopFrauda has dispatched an instant SMS warning to your emergency contacts."
                    )
            )
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setColor(Color.RED)
            .setVibrate(longArrayOf(0, 400, 200, 400))
            .build()

        notificationManager.notify(ALERT_NOTIFICATION_ID, notification)
    }

    fun buildForegroundServiceNotification(context: Context): Notification {
        createNotificationChannels(context)

        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(context, CHANNEL_SERVICE_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_charging)
            .setContentTitle("🛡️ StopFrauda Protection Active")
            .setContentText("Screening incoming calls to protect against scams.")
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(pendingIntent)
            .build()
    }
}
