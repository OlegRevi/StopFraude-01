package ro.stopfrauda.calldetector

import android.content.Context
import android.os.Bundle
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class CallDetectorModule : Module() {

    companion object {
        private const val TAG = "StopFrauda.Module"
        private var instance: CallDetectorModule? = null

        fun emitCallEvent(phoneNumber: String, isUnknown: Boolean, contactName: String?) {
            instance?.sendEvent(
                "onCallScreened",
                mapOf(
                    "phoneNumber" to phoneNumber,
                    "isUnknown" to isUnknown,
                    "contactName" to (contactName ?: ""),
                    "timestamp" to System.currentTimeMillis().toString()
                )
            )
        }
    }

    private val context: Context
        get() = appContext.reactContext ?: throw IllegalStateException("React Context not available")

    override fun definition() = ModuleDefinition {
        Name("ExpoCallDetector")

        Events("onCallScreened")

        OnCreate {
            instance = this@CallDetectorModule
            CallAlertNotificationHelper.createNotificationChannels(context)
        }

        OnDestroy {
            if (instance == this@CallDetectorModule) {
                instance = null
            }
        }

        // Configure backend endpoint and current user ID
        Function("configure") { userId: String, backendUrl: String, autoReject: Boolean ->
            CallScreeningServiceImpl.currentUserId = userId
            CallScreeningServiceImpl.backendBaseUrl = backendUrl
            CallScreeningServiceImpl.autoRejectUnknown = autoReject
            Log.d(TAG, "Configured with userId: $userId, backend: $backendUrl, autoReject: $autoReject")
            mapOf("success" to true)
        }

        // Check if a specific number is in the contacts list
        Function("checkContact") { phoneNumber: String ->
            val result = ContactsHelper.isNumberInContacts(context, phoneNumber)
            mapOf(
                "isContact" to result.isContact,
                "contactName" to (result.contactName ?: ""),
                "normalizedNumber" to result.normalizedNumber
            )
        }

        // Start active background protection service
        Function("startProtection") {
            CallDetectorForegroundService.start(context)
            mapOf("success" to true, "active" to true)
        }

        // Stop background protection service
        Function("stopProtection") {
            CallDetectorForegroundService.stop(context)
            mapOf("success" to true, "active" to false)
        }

        // Query whether protection is running
        Function("isProtectionActive") {
            mapOf("active" to CallDetectorForegroundService.isRunning)
        }

        // Test Call Simulator for onboarding and QA
        Function("simulateIncomingCall") { testNumber: String ->
            Log.d(TAG, "Simulating incoming call for: $testNumber")
            val match = ContactsHelper.isNumberInContacts(context, testNumber)
            
            if (!match.isContact) {
                CallAlertNotificationHelper.showUnknownCallAlert(context, testNumber)
            }

            emitCallEvent(
                phoneNumber = testNumber,
                isUnknown = !match.isContact,
                contactName = match.contactName
            )

            mapOf(
                "success" to true,
                "simulatedNumber" to testNumber,
                "isUnknown" to !match.isContact,
                "contactName" to (match.contactName ?: "")
            )
        }
    }
}
