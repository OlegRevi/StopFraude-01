package expo.modules.calldetector

import android.Manifest
import android.app.role.RoleManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.telephony.TelephonyManager
import android.util.Log
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class CallDetectorModule : Module() {
    companion object {
        const val TAG = "CallDetector"
        const val EVENT_CALL_STATE = "onCallStateChanged"
        const val EVENT_INCOMING_CALL = "onIncomingCall"

        // Shared state accessible by services
        var isServiceEnabled: Boolean = false
        var moduleInstance: CallDetectorModule? = null
    }

    private var phoneStateReceiver: BroadcastReceiver? = null

    override fun definition() = ModuleDefinition {
        Name("ExpoCallDetector")

        Events(EVENT_CALL_STATE, EVENT_INCOMING_CALL)

        OnCreate {
            moduleInstance = this@CallDetectorModule
        }

        OnDestroy {
            stopListening()
            moduleInstance = null
        }

        // Start listening for call state changes
        AsyncFunction("startListening") {
            startListening()
            "Listening started"
        }

        // Stop listening
        AsyncFunction("stopListening") {
            stopListening()
            "Listening stopped"
        }

        // Check if call screening role is held
        AsyncFunction("hasCallScreeningRole") {
            hasCallScreeningRole()
        }

        // Request call screening role
        AsyncFunction("requestCallScreeningRole") {
            requestCallScreeningRole()
        }

        // Check permissions
        AsyncFunction("checkPermissions") {
            checkPermissions()
        }

        // Get service status
        AsyncFunction("isEnabled") {
            isServiceEnabled
        }

        // Enable/disable service
        AsyncFunction("setEnabled") { enabled: Boolean ->
            isServiceEnabled = enabled
            if (enabled) {
                startListening()
            } else {
                stopListening()
            }
            enabled
        }
    }

    private fun startListening() {
        val context = appContext.reactContext ?: return

        if (phoneStateReceiver != null) {
            Log.d(TAG, "Already listening")
            return
        }

        phoneStateReceiver = object : BroadcastReceiver() {
            private var lastState = TelephonyManager.CALL_STATE_IDLE
            private var incomingNumber: String? = null
            private var callStartTime: Long = 0

            override fun onReceive(context: Context?, intent: Intent?) {
                if (intent?.action != TelephonyManager.ACTION_PHONE_STATE_CHANGED) return

                val stateStr = intent.getStringExtra(TelephonyManager.EXTRA_STATE) ?: return
                val number = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER)

                val state = when (stateStr) {
                    TelephonyManager.EXTRA_STATE_RINGING -> TelephonyManager.CALL_STATE_RINGING
                    TelephonyManager.EXTRA_STATE_OFFHOOK -> TelephonyManager.CALL_STATE_OFFHOOK
                    TelephonyManager.EXTRA_STATE_IDLE -> TelephonyManager.CALL_STATE_IDLE
                    else -> return
                }

                onCallStateChanged(state, number)
            }

            private fun onCallStateChanged(state: Int, number: String?) {
                when (state) {
                    TelephonyManager.CALL_STATE_RINGING -> {
                        incomingNumber = number ?: "Unknown"
                        lastState = state
                        Log.d(TAG, "Incoming call from: $incomingNumber")
                        emitCallEvent("ringing", incomingNumber!!, 0)
                        emitIncomingCallEvent(incomingNumber!!)
                    }
                    TelephonyManager.CALL_STATE_OFFHOOK -> {
                        if (lastState == TelephonyManager.CALL_STATE_RINGING) {
                            // Call answered
                            callStartTime = System.currentTimeMillis()
                            Log.d(TAG, "Call answered: $incomingNumber")
                            emitCallEvent("connected", incomingNumber ?: "Unknown", 0)
                        }
                        lastState = state
                    }
                    TelephonyManager.CALL_STATE_IDLE -> {
                        if (lastState == TelephonyManager.CALL_STATE_OFFHOOK) {
                            // Call ended
                            val duration = if (callStartTime > 0) {
                                ((System.currentTimeMillis() - callStartTime) / 1000).toInt()
                            } else 0
                            Log.d(TAG, "Call ended: $incomingNumber, duration: ${duration}s")
                            emitCallEvent("disconnected", incomingNumber ?: "Unknown", duration)
                        } else if (lastState == TelephonyManager.CALL_STATE_RINGING) {
                            // Call missed/rejected
                            Log.d(TAG, "Call missed: $incomingNumber")
                            emitCallEvent("missed", incomingNumber ?: "Unknown", 0)
                        }
                        lastState = state
                        incomingNumber = null
                        callStartTime = 0
                    }
                }
            }
        }

        val filter = IntentFilter(TelephonyManager.ACTION_PHONE_STATE_CHANGED)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.registerReceiver(phoneStateReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            context.registerReceiver(phoneStateReceiver, filter)
        }

        isServiceEnabled = true
        Log.d(TAG, "Phone state listener registered")
    }

    private fun stopListening() {
        val context = appContext.reactContext ?: return
        phoneStateReceiver?.let {
            try {
                context.unregisterReceiver(it)
            } catch (e: Exception) {
                Log.e(TAG, "Error unregistering receiver", e)
            }
        }
        phoneStateReceiver = null
        isServiceEnabled = false
        Log.d(TAG, "Phone state listener unregistered")
    }

    fun emitCallEvent(state: String, number: String, duration: Int) {
        try {
            this@CallDetectorModule.sendEvent(EVENT_CALL_STATE, mapOf(
                "state" to state,
                "number" to number,
                "duration" to duration,
                "timestamp" to System.currentTimeMillis()
            ))
        } catch (e: Exception) {
            Log.e(TAG, "Error emitting call event", e)
        }
    }

    fun emitIncomingCallEvent(number: String) {
        try {
            this@CallDetectorModule.sendEvent(EVENT_INCOMING_CALL, mapOf(
                "number" to number,
                "timestamp" to System.currentTimeMillis()
            ))
        } catch (e: Exception) {
            Log.e(TAG, "Error emitting incoming call event", e)
        }
    }

    private fun hasCallScreeningRole(): Boolean {
        val context = appContext.reactContext ?: return false
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return false
        val roleManager = context.getSystemService(Context.ROLE_SERVICE) as? RoleManager
        return roleManager?.isRoleHeld(RoleManager.ROLE_CALL_SCREENING) == true
    }

    private fun requestCallScreeningRole(): Boolean {
        val context = appContext.reactContext ?: return false
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return false
        val roleManager = context.getSystemService(Context.ROLE_SERVICE) as? RoleManager ?: return false
        val intent = roleManager.createRequestRoleIntent(RoleManager.ROLE_CALL_SCREENING)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        return true
    }

    private fun checkPermissions(): Map<String, Boolean> {
        val context = appContext.reactContext ?: return emptyMap()
        return mapOf(
            "READ_PHONE_STATE" to (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED),
            "READ_CALL_LOG" to (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CALL_LOG) == PackageManager.PERMISSION_GRANTED),
            "RECORD_AUDIO" to (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED),
        )
    }
}
