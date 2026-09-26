package ro.stopfrauda.calldetector

import android.os.Build
import android.telecom.Call
import android.telecom.CallScreeningService
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.TimeUnit

class CallScreeningServiceImpl : CallScreeningService() {

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(5, TimeUnit.SECONDS)
        .build()

    private val coroutineScope = CoroutineScope(Dispatchers.IO)

    companion object {
        private const val TAG = "StopFrauda.Screening"
        var backendBaseUrl: String = "https://stopfrauda-backend-539120389345.europe-west1.run.app" // Live Cloud Run backend
        var currentUserId: String = "user_default"
        var autoRejectUnknown: Boolean = false
    }

    override fun onScreenCall(callDetails: Call.Details) {
        val rawNumber = callDetails.handle?.schemeSpecificPart
        Log.d(TAG, "Incoming call detected: $rawNumber")

        val match = ContactsHelper.isNumberInContacts(this, rawNumber)
        val phoneNumber = match.normalizedNumber

        if (match.isContact) {
            Log.d(TAG, "Call from safe contact: ${match.contactName} ($phoneNumber)")
            
            // Allow call to ring normally
            val response = CallResponse.Builder().build()
            respondToCall(callDetails, response)

            // Notify React Native layer
            CallDetectorModule.emitCallEvent(
                phoneNumber = phoneNumber,
                isUnknown = false,
                contactName = match.contactName
            )
        } else {
            Log.w(TAG, "🚨 UNKNOWN CALLER DETECTED: $phoneNumber! NOT in contacts.")

            // 1. Show immediate high-priority warning notification
            CallAlertNotificationHelper.showUnknownCallAlert(this, phoneNumber)

            // 2. Dispatch alert event to React Native UI
            CallDetectorModule.emitCallEvent(
                phoneNumber = phoneNumber,
                isUnknown = true,
                contactName = null
            )

            // 3. Dispatch native background HTTP alert to Cloud Run API to trigger Twilio SMS
            dispatchNativeAlert(phoneNumber)

            // 4. Configure call response (allow ring by default with alert, or reject if enabled)
            val responseBuilder = CallResponse.Builder()
            if (autoRejectUnknown) {
                responseBuilder.setDisallowCall(true)
                responseBuilder.setRejectCall(true)
                responseBuilder.setSkipCallLog(false)
            }
            respondToCall(callDetails, responseBuilder.build())
        }
    }

    private fun dispatchNativeAlert(callerNumber: String) {
        coroutineScope.launch {
            try {
                val isoDateFormatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
                    timeZone = TimeZone.getTimeZone("UTC")
                }
                val timestamp = isoDateFormatter.format(Date())

                val jsonBody = JSONObject().apply {
                    put("userId", currentUserId)
                    put("callerNumber", callerNumber)
                    put("timestamp", timestamp)
                }

                val mediaType = "application/json; charset=utf-8".toMediaType()
                val requestBody = jsonBody.toString().toRequestBody(mediaType)

                val request = Request.Builder()
                    .url("$backendBaseUrl/api/v1/alerts/dispatch")
                    .post(requestBody)
                    .build()

                val response = httpClient.newCall(request).execute()
                Log.d(TAG, "Native alert dispatch status: ${response.code}")
                response.close()
            } catch (e: Exception) {
                Log.e(TAG, "Failed to dispatch native alert HTTP request: ${e.message}")
            }
        }
    }
}
