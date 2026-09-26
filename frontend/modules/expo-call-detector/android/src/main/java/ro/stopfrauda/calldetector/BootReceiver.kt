package ro.stopfrauda.calldetector

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * BootReceiver ensures StopFrauda call screening & protection service
 * restarts automatically when the phone reboots or the app updates.
 */
class BootReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "StopFrauda.BootReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        Log.d(TAG, "Received broadcast action: $action")

        if (Intent.ACTION_BOOT_COMPLETED == action || Intent.ACTION_MY_PACKAGE_REPLACED == action) {
            Log.i(TAG, "Device booted or app updated. Resuming StopFrauda active protection...")
            try {
                CallDetectorForegroundService.start(context)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to start protection service on boot: ${e.message}")
            }
        }
    }
}
