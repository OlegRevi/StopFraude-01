package com.stopfrauda.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import com.facebook.react.HeadlessJsTaskService;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.jstasks.HeadlessJsTaskConfig;

public class CallDetectionTaskService extends HeadlessJsTaskService {

    private static final String CHANNEL_ID = "call_detection_channel";
    private static final String TAG = "CallDetectionTaskSvc";

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        
        // Required for foreground service on Android 8+
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("StopFrauda")
            .setContentText("Monitoring for scam calls...")
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();

        // Wrapped in try-catch to prevent Android 12+ SecurityExceptions 
        // if the user hasn't granted permissions yet.
        try {
            startForeground(1001, notification);
        } catch (Exception e) {
            Log.e(TAG, "Prevented crash: Failed to attach foreground notification. " + e.getMessage());
        }
    }

    @Override
    protected HeadlessJsTaskConfig getTaskConfig(Intent intent) {
        Bundle extras = intent != null ? intent.getExtras() : null;
        if (extras != null) {
            return new HeadlessJsTaskConfig(
                "CallDetection",
                Arguments.fromBundle(extras),
                10000,  // 10s timeout
                true    // allowed in foreground
            );
        }
        return null;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Call Detection",
                NotificationManager.IMPORTANCE_LOW
            );
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
}
