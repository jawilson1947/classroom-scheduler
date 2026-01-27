package com.classroomscheduler.data.models

import com.google.gson.annotations.SerializedName
import java.text.SimpleDateFormat
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.*

data class Event(
    val id: Int,
    val title: String,
    @SerializedName("facilitator_name")
    val facilitatorName: String?,
    @SerializedName("Facilitator_id")
    val facilitatorId: Int?,
    @SerializedName("facilitator_icon_url")
    val facilitatorIconUrl: String?,
    @SerializedName("facilitator_picture_url")
    val facilitatorPictureUrl: String?,
    @SerializedName("facilitator_bio")
    val facilitatorBio: String?,
    @SerializedName("start_time")
    val startTime: String,
    @SerializedName("end_time")
    val endTime: String,
    val description: String?,
    val narrative: String?,
    @SerializedName("recurrence_days")
    val recurrenceDays: String?,
    @SerializedName("daily_start_time")
    val dailyStartTime: String?,
    @SerializedName("daily_end_time")
    val dailyEndTime: String?
) {
    val isRecurring: Boolean
        get() = recurrenceDays != null

    val displayStart: Date?
        get() {
            return if (recurrenceDays != null && dailyStartTime != null) {
                parseTimeForToday(dailyStartTime)
            } else {
                parseDate(startTime)
            }
        }

    val displayEnd: Date?
        get() {
            return if (recurrenceDays != null && dailyEndTime != null) {
                parseTimeForToday(dailyEndTime)
            } else {
                parseDate(endTime)
            }
        }

    fun occursToday(): Boolean {
        val calendar = Calendar.getInstance()
        val today = Date()
        calendar.time = today
        val todayStart = calendar.apply {
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }.time

        if (recurrenceDays != null) {
            // Check date range first
            val start = parseDate(startTime) ?: return false
            val end = parseDate(endTime) ?: return false

            val startCal = Calendar.getInstance().apply { time = start }
            startCal.set(Calendar.HOUR_OF_DAY, 0)
            startCal.set(Calendar.MINUTE, 0)
            startCal.set(Calendar.SECOND, 0)
            startCal.set(Calendar.MILLISECOND, 0)

            val endCal = Calendar.getInstance().apply { time = end }
            endCal.set(Calendar.HOUR_OF_DAY, 0)
            endCal.set(Calendar.MINUTE, 0)
            endCal.set(Calendar.SECOND, 0)
            endCal.set(Calendar.MILLISECOND, 0)

            if (todayStart.before(startCal.time) || todayStart.after(endCal.time)) {
                return false
            }

            // Check if today is one of the recurrence days
            val days = listOf("Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat")
            val weekday = Calendar.getInstance().get(Calendar.DAY_OF_WEEK)
            val todayDay = days[weekday - 1]

            return recurrenceDays.contains(todayDay)
        }

        // For non-recurring events, check if they occur today
        val start = displayStart ?: return false
        val end = displayEnd ?: return false

        val startCal = Calendar.getInstance().apply { time = start }
        val endCal = Calendar.getInstance().apply { time = end }
        val todayCal = Calendar.getInstance().apply { time = today }

        return isSameDay(startCal, todayCal) ||
                isSameDay(endCal, todayCal) ||
                (start.before(today) && end.after(today))
    }

    private fun isSameDay(cal1: Calendar, cal2: Calendar): Boolean {
        return cal1.get(Calendar.YEAR) == cal2.get(Calendar.YEAR) &&
                cal1.get(Calendar.DAY_OF_YEAR) == cal2.get(Calendar.DAY_OF_YEAR)
    }

    private fun parseTimeForToday(timeString: String): Date? {
        return try {
            val formatter = SimpleDateFormat("HH:mm:ss", Locale.US)
            val time = formatter.parse(timeString) ?: return null

            val calendar = Calendar.getInstance()
            val timeCalendar = Calendar.getInstance().apply { this.time = time }

            calendar.set(Calendar.HOUR_OF_DAY, timeCalendar.get(Calendar.HOUR_OF_DAY))
            calendar.set(Calendar.MINUTE, timeCalendar.get(Calendar.MINUTE))
            calendar.set(Calendar.SECOND, timeCalendar.get(Calendar.SECOND))

            calendar.time
        } catch (e: Exception) {
            null
        }
    }

    companion object {
        fun parseDate(dateString: String): Date? {
            return try {
                // Try ISO8601 with fractional seconds
                val instant = Instant.parse(dateString)
                Date.from(instant)
            } catch (e: Exception) {
                try {
                    // Try without fractional seconds
                    val formatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
                    formatter.timeZone = TimeZone.getTimeZone("UTC")
                    formatter.parse(dateString)
                } catch (e2: Exception) {
                    null
                }
            }
        }
    }
}
