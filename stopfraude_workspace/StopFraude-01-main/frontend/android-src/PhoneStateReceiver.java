package com.stopfrauda.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.telephony.TelephonyManager;
import android.os.Build;

public class PhoneStateReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;

        String state = intent.getStringExtra(TelephonyManager.EXTRA_STATE);
        String number = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER);

        if (state == null) return;

        Intent serviceIntent = new Intent(context, CallDetectionTaskService.class);
        serviceIntent.putExtra("state", state);
        if (number != null) serviceIntent.putExtra("number", number);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}