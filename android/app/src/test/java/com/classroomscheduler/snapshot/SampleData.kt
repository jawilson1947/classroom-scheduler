package com.classroomscheduler.snapshot

import com.classroomscheduler.data.models.Event
import com.classroomscheduler.data.models.Room
import com.google.gson.Gson
import java.time.Instant
import java.util.Date

/**
 * Deterministic fixtures for Roborazzi snapshot tests. Decoded via Gson so they
 * exercise the real parse path. Times are absolute UTC around a fixed `now` (10:30Z)
 * giving one past, one current, two upcoming events. Keep this in sync with the iOS
 * SampleData fixtures so both platforms snapshot the same content.
 */
object SampleData {
    val now: Date = Date.from(Instant.parse("2026-06-19T10:30:00Z"))

    private val gson = Gson()

    private const val EVENTS_JSON = """
    [
      {"id":1,"title":"Morning Assembly","facilitator_name":"Ms. Reyes","Facilitator_id":null,"facilitator_icon_url":null,"facilitator_picture_url":null,"facilitator_bio":null,"start_time":"2026-06-19T09:00:00Z","end_time":"2026-06-19T09:45:00Z","description":null,"narrative":null,"recurrence_days":null,"daily_start_time":null,"daily_end_time":null},
      {"id":2,"title":"English Literature","facilitator_name":"Mr. Thompson","Facilitator_id":null,"facilitator_icon_url":null,"facilitator_picture_url":null,"facilitator_bio":null,"start_time":"2026-06-19T10:00:00Z","end_time":"2026-06-19T11:00:00Z","description":null,"narrative":"<p>Reading Chapter 5.</p>","recurrence_days":null,"daily_start_time":null,"daily_end_time":null},
      {"id":3,"title":"Chemistry Lab","facilitator_name":"Dr. Patel","Facilitator_id":null,"facilitator_icon_url":null,"facilitator_picture_url":null,"facilitator_bio":null,"start_time":"2026-06-19T11:30:00Z","end_time":"2026-06-19T12:15:00Z","description":null,"narrative":null,"recurrence_days":null,"daily_start_time":null,"daily_end_time":null},
      {"id":4,"title":"Study Hall","facilitator_name":null,"Facilitator_id":null,"facilitator_icon_url":null,"facilitator_picture_url":null,"facilitator_bio":null,"start_time":"2026-06-19T13:00:00Z","end_time":"2026-06-19T14:00:00Z","description":null,"narrative":null,"recurrence_days":null,"daily_start_time":null,"daily_end_time":null}
    ]
    """

    private const val ROOM_JSON = """
    {"id":10,"name":"121 - English Classroom","building_name":"High School Building","tenant_name":"Oakwood Adventist Academy","tenant_address":"5378 Adventist Blvd., Huntsville AL 35896","tenant_logo_url":null,"resolved_theme":null}
    """

    val events: List<Event> = gson.fromJson(EVENTS_JSON, Array<Event>::class.java).toList()
    val room: Room = gson.fromJson(ROOM_JSON, Room::class.java)

    val currentEvent: Event = events.first { e ->
        val s = e.displayStart; val en = e.displayEnd
        s != null && en != null && now >= s && now <= en
    }
    val upcomingEvent: Event = events.first { (it.displayStart ?: Date(0)) > now }
    val pastEvent: Event = events.first { (it.displayEnd ?: Date(Long.MAX_VALUE)) < now }
}
