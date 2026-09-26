package ro.stopfrauda.calldetector

import android.content.Context
import android.database.Cursor
import android.net.Uri
import android.provider.ContactsContract
import android.util.Log

data class ContactMatchResult(
    val isContact: Boolean,
    val contactName: String? = null,
    val normalizedNumber: String
)

object ContactsHelper {
    private const val TAG = "StopFrauda.Contacts"

    /**
     * Checks if the given phone number exists in the device address book.
     * Uses Android's indexed PhoneLookup table for millisecond lookup performance.
     */
    fun isNumberInContacts(context: Context, rawNumber: String?): ContactMatchResult {
        if (rawNumber.isNullOrBlank()) {
            return ContactMatchResult(isContact = false, normalizedNumber = "Unknown")
        }

        val cleanNumber = rawNumber.trim()

        try {
            val uri = Uri.withAppendedPath(
                ContactsContract.PhoneLookup.CONTENT_FILTER_URI,
                Uri.encode(cleanNumber)
            )

            val projection = arrayOf(
                ContactsContract.PhoneLookup.DISPLAY_NAME,
                ContactsContract.PhoneLookup.NUMBER
            )

            val cursor: Cursor? = context.contentResolver.query(
                uri,
                projection,
                null,
                null,
                null
            )

            cursor?.use {
                if (it.moveToFirst()) {
                    val nameIndex = it.getColumnIndex(ContactsContract.PhoneLookup.DISPLAY_NAME)
                    val contactName = if (nameIndex >= 0) it.getString(nameIndex) else "Known Contact"
                    Log.d(TAG, "Number $cleanNumber recognized as contact: $contactName")
                    return ContactMatchResult(
                        isContact = true,
                        contactName = contactName,
                        normalizedNumber = cleanNumber
                    )
                }
            }
        } catch (e: SecurityException) {
            Log.e(TAG, "READ_CONTACTS permission not granted: ${e.message}")
        } catch (e: Exception) {
            Log.e(TAG, "Error looking up contact for $cleanNumber: ${e.message}")
        }

        Log.d(TAG, "Number $cleanNumber is NOT in device contacts (UNKNOWN)")
        return ContactMatchResult(
            isContact = false,
            contactName = null,
            normalizedNumber = cleanNumber
        )
    }
}
