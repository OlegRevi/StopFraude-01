package expo.modules.calldetector

import android.telecom.Call
import android.telecom.CallScreeningService
import android.util.Log

class CallScreeningServiceImpl : CallScreeningService() {
    companion object {
        const val TAG = "CallScreening"
    }

    override fun onScreenCall(callDetails: Call.Details) {
        val isIncoming = callDetails.callDirection == Call.Details.DIRECTION_INCOMING
        val handle = callDetails.handle
        val number = handle?.schemeSpecificPart ?: "Unknown"

        Log.d(TAG, "Screening call: $number, incoming: $isIncoming")

        // Emit event to React Native module if available
        CallDetectorModule.moduleInstance?.emitIncomingCallEvent(number)

        // Always allow the call through (we detect, not block)
        val response = CallResponse.Builder()
            .setDisallowCall(false)
            .setRejectCall(false)
            .setSilenceCall(false)
            .setSkipCallLog(false)
            .setSkipNotification(false)
            .build()

        respondToCall(callDetails, response)
    }
}
