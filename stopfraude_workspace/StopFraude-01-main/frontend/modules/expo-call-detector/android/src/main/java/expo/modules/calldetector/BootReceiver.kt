package expo.modules.calldetector

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class BootReceiver : BroadcastReceiver() {
    companion object {
        const val TAG = "BootReceiver"
    }

    override fun onReceive(context: Context?, intent: Intent?) {
        if (intent?.action == Intent.ACTION_BOOT_COMPLETED) {
            Log.d(TAG, "Boot completed - StopFrauda call detector ready")
            // The module will be initialized when the app starts
            // The app will auto-launch due to RECEIVE_BOOT_COMPLETED
            CallDetectorModule.isServiceEnabled = true
        }
    }
}
