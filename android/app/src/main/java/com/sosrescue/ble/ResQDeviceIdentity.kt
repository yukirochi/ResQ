package com.sosrescue.ble

import android.content.Context
import java.util.UUID

/** Stable, app-scoped identity used to route messages when Android rotates BLE addresses. */
object ResQDeviceIdentity {
    private const val PREFS = "resq_device_identity"
    private const val KEY_ID = "device_id"

    fun get(context: Context): String {
        val preferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val existing = preferences.getString(KEY_ID, null)
        if (existing != null) return existing
        val created = UUID.randomUUID().toString().replace("-", "").take(8)
        preferences.edit().putString(KEY_ID, created).apply()
        return created
    }
}
