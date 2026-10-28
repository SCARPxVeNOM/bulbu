package app.bulbu.usage

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Process
import android.provider.Settings
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Reads how long each app was in the foreground, from Android's usage access (UsageStatsManager).
 * Only apps with a launcher icon are reported, with their label, package and minutes. Nothing else leaves the phone.
 */
class BulbuUsageModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw CodedException("ERR_NO_CONTEXT", "React context is not available", null)

  override fun definition() = ModuleDefinition {
    Name("BulbuUsage")

    Function("hasAccess") { hasAccess() }

    Function("openSettings") {
      val pkg = context.packageName
      // some phones open straight to Bulbu's toggle with the package uri; others only support the list
      val direct = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS, Uri.parse("package:$pkg")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      val list = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      try { context.startActivity(direct) } catch (e: Exception) { context.startActivity(list) }
    }

    AsyncFunction("getUsage") { startMs: Double, endMs: Double ->
      if (!hasAccess()) throw CodedException("ERR_NO_ACCESS", "Usage access is off. Turn it on for Bulbu in Settings.", null)
      foregroundMinutes(startMs.toLong(), endMs.toLong())
    }
  }

  private fun hasAccess(): Boolean {
    val ops = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q)
      ops.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
    else @Suppress("DEPRECATION") ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
    return mode == AppOpsManager.MODE_ALLOWED
  }

  /** Foreground time per app between start and end, from resume/pause events (more exact than the daily buckets). */
  private fun foregroundMinutes(start: Long, end: Long): List<Map<String, Any>> {
    val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val until = minOf(end, System.currentTimeMillis())
    val events = usm.queryEvents(start, until)
    val openSince = HashMap<String, Long>()
    val total = HashMap<String, Long>()
    val last = HashMap<String, Long>()
    val seen = HashSet<String>()
    val e = UsageEvents.Event()
    val resumed = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) UsageEvents.Event.ACTIVITY_RESUMED else @Suppress("DEPRECATION") UsageEvents.Event.MOVE_TO_FOREGROUND
    val paused = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) UsageEvents.Event.ACTIVITY_PAUSED else @Suppress("DEPRECATION") UsageEvents.Event.MOVE_TO_BACKGROUND
    while (events.hasNextEvent()) {
      events.getNextEvent(e)
      val pkg = e.packageName ?: continue
      when (e.eventType) {
        resumed -> { openSince[pkg] = e.timeStamp; seen.add(pkg) }
        paused -> {
          // an app already open when the window started has no resume event: count from the start
          val from = openSince.remove(pkg) ?: if (pkg !in seen) start else null
          seen.add(pkg)
          if (from != null) total[pkg] = (total[pkg] ?: 0L) + (e.timeStamp - from)
          last[pkg] = e.timeStamp
        }
      }
    }
    for ((pkg, from) in openSince) { total[pkg] = (total[pkg] ?: 0L) + (until - from); last[pkg] = until }

    val pm = context.packageManager
    val own = context.packageName
    return total.filter { (pkg, ms) -> ms >= 60_000 && pkg != own && pm.getLaunchIntentForPackage(pkg) != null }
      .map { (pkg, ms) ->
        val label = try { pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0)).toString() } catch (x: PackageManager.NameNotFoundException) { pkg }
        mapOf("name" to label, "package" to pkg, "minutes" to Math.round(ms / 60_000.0).toDouble(), "lastUsedAt" to (last[pkg] ?: until).toDouble())
      }
      .sortedByDescending { it["minutes"] as Double }
  }
}
