package ro.stopfrauda.calldetector

import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.content.ContextCompat

class CallDetectorForegroundService : Service() {

    companion object {
        private const val TAG = "StopFrauda.Service"
        const val ACTION_START = "ro.stopfrauda.calldetector.ACTION_START"
        const val ACTION_STOP = "ro.stopfrauda.calldetector.ACTION_STOP"

        var isRunning: Boolean = false
            private set

        fun start(context: Context) {
            val intent = Intent(context, CallDetectorForegroundService::class.java).apply {
                action = ACTION_START
            }
            ContextCompat.startForegroundService(context, intent)
        }

        fun stop(context: Context) {
            val intent = Intent(context, CallDetectorForegroundService::class.java).apply {
                action = ACTION_STOP
            }
            context.stopService(intent)
        }
    }

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "CallDetectorForegroundService created")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            Log.d(TAG, "Stopping foreground service")
            isRunning = false
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
            return START_NOT_STICKY
        }

        Log.d(TAG, "Starting foreground service with ongoing notification")
        val notification = CallAlertNotificationHelper.buildForegroundServiceNotification(this)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                startForeground(
                    CallAlertNotificationHelper.SERVICE_NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_PHONE_CALL
                )
            } else {
                startForeground(
                    CallAlertNotificationHelper.SERVICE_NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_PHONE_CALL
                )
            }
        } else {
            startForeground(CallAlertNotificationHelper.SERVICE_NOTIFICATION_ID, notification)
        }

        isRunning = true
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        isRunning = false
        Log.d(TAG, "CallDetectorForegroundService destroyed")
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
