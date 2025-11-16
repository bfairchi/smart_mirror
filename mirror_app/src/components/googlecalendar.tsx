import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Users, RefreshCw, AlertCircle } from 'lucide-react';
import './googlecalendar.css';

interface CalendarEvent {
  id?: string;
  summary?: string;
  description?: string;
  location?: string;
  attendees?: Array<unknown>;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

type EventsByWeek = Record<string, CalendarEvent[]>;

const GoogleCalendar: React.FC = () => {
  // Events are stored per week, keyed by week start date (YYYY-MM-DD)
  const [eventsByWeek, setEventsByWeek] = useState<EventsByWeek>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // --- Helpers --------------------------------------------------------------

  const getWeekStart = (date: Date): Date => {
    const start = new Date(date);
    const day = start.getDay(); // 0 (Sun) - 6 (Sat)
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);
    return start;
  };

  const getWeekKey = (date: Date): string => {
    const start = getWeekStart(date);
    // YYYY-MM-DD
    return start.toISOString().slice(0, 10);
  };

  const currentWeekKey = getWeekKey(selectedDate);
  const currentEvents: CalendarEvent[] = eventsByWeek[currentWeekKey] || [];

  // -------------------------------------------------------------------------

  useEffect(() => {
    fetchCalendarEvents();

    // Refresh every 5 minutes for the current week
    const interval = setInterval(fetchCalendarEvents, 5 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const fetchCalendarEvents = async () => {
    try {
      setError(null);

      // Only show "big" loading when we don't have this week cached yet
      if (!eventsByWeek[currentWeekKey] || eventsByWeek[currentWeekKey].length === 0) {
        setLoading(true);
      }

      const weekStart = getWeekStart(selectedDate);
      const startDate = new Date(weekStart);
      const endDate = new Date(weekStart);
      endDate.setDate(endDate.getDate() + 7);
      endDate.setHours(23, 59, 59, 999);

      const response = await fetch('http://localhost:3001/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch calendar events');
      }

      const data = await response.json();
      const newEvents = (data.events || []) as CalendarEvent[];

      const weekKey = getWeekKey(selectedDate);

      // 🔑 KEY: update only this week's entry and never overwrite
      // non-empty events with an empty array.
      setEventsByWeek(prev => {
        const prevForWeek = prev[weekKey] || [];

        // If we already have events for this week and the new response is empty,
        // keep the existing events instead of clearing them.
        if (newEvents.length === 0 && prevForWeek.length > 0) {
          console.warn(
            'Calendar API returned empty events for week',
            weekKey,
            '; keeping previously loaded events.'
          );
          return prev;
        }

        return {
          ...prev,
          [weekKey]: newEvents,
        };
      });
    } catch (err: any) {
      console.error('Error fetching calendar events:', err);
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatEventTime = (event: CalendarEvent): string => {
    if (event.start.date) return 'All day';

    const startTime = new Date(event.start.dateTime as string);
    const endTime = new Date(event.end.dateTime as string);

    const fmt = (d: Date) =>
      d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

    return `${fmt(startTime)} – ${fmt(endTime)}`;
  };

  const displayKeyForDate = (date: Date): string =>
    date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

  const buildEventsByDate = (events: CalendarEvent[]) => {
    const eventsByDate: Record<string, CalendarEvent[]> = {};

    events.forEach((event) => {
      const rawDate = event.start.dateTime
        ? new Date(event.start.dateTime)
        : new Date(event.start.date as string);

      const key = displayKeyForDate(rawDate);
      if (!eventsByDate[key]) {
        eventsByDate[key] = [];
      }
      eventsByDate[key].push(event);
    });

    return eventsByDate;
  };

  const getWeekDays = (eventsByDate: Record<string, CalendarEvent[]>) => {
    const start = getWeekStart(selectedDate);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const key = displayKeyForDate(date);
      days.push({
        date,
        key,
        events: eventsByDate[key] || [],
      });
    }
    return days;
  };

  const changeWeek = (direction: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + direction * 7);
    setSelectedDate(newDate);
  };

  /* === RENDER STATES === */

  if (loading && currentEvents.length === 0) {
    return (
      <div className="calendar-loading">
        <div className="calendar-loading-inner">
          <RefreshCw className="calendar-loading-icon" />
          <p className="calendar-loading-text">Loading family calendar...</p>
        </div>
      </div>
    );
  }

  // Only show the error card if we truly have nothing cached for this week
  if (error && currentEvents.length === 0) {
    return (
      <div className="calendar-error">
        <div className="calendar-error-header">
          <div className="calendar-error-icon">
            <AlertCircle width={24} height={24} />
          </div>
          <div>
            <h3 className="calendar-error-title">Error Loading Calendar</h3>
            <p className="calendar-error-message">{error}</p>
            <button className="calendar-error-button" onClick={fetchCalendarEvents}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const eventsByDate = buildEventsByDate(currentEvents);
  const weekDays = getWeekDays(eventsByDate);

  return (
    <div className="calendar-container">
      {/* Header */}
      <div className="calendar-header">
        <div className="calendar-title">
          <div className="calendar-title-icon">
            <Calendar />
          </div>
          <div className="calendar-title-text">
            <h2>Family Calendar</h2>
            <p>Upcoming events this week</p>
          </div>
        </div>
        <button
          className="calendar-refresh-btn"
          onClick={fetchCalendarEvents}
          disabled={loading}
          title="Refresh events"
        >
          <RefreshCw
            style={loading ? { animation: 'calendar-spin 1s linear infinite' } : undefined}
          />
        </button>
      </div>

      {/* Week navigation */}
      <div className="calendar-nav">
        <button className="calendar-nav-button" onClick={() => changeWeek(-1)}>
          ← Previous Week
        </button>
        <span className="calendar-month-label">
          {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <button className="calendar-nav-button" onClick={() => changeWeek(1)}>
          Next Week →
        </button>
      </div>

      {/* Main calendar content */}
      <div className="calendar-main">
        {weekDays.every((d) => d.events.length === 0) ? (
          <div className="calendar-no-events-panel">
            <div>
              <Calendar className="calendar-no-events-panel-icon" />
              <div className="calendar-no-events-title">No events scheduled this week</div>
              <div className="calendar-no-events-subtitle">Enjoy your free time!</div>
            </div>
          </div>
        ) : (
          <div className="calendar-grid">
            {weekDays.map((day) => (
              <div key={day.key} className="calendar-day">
                <div className="calendar-day-header">
                  <span className="calendar-day-name">
                    {day.date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <span className="calendar-day-date">{day.date.getDate()}</span>
                </div>

                <div className="calendar-events">
                  {day.events.length === 0 && (
                    <span className="calendar-no-events">No events</span>
                  )}

                  {day.events.map((event, idx) => (
                    <div key={event.id || idx} className="calendar-event">
                      <div className="calendar-event-time">
                        <Clock width={14} height={14} />
                        {formatEventTime(event)}
                      </div>
                      <div className="calendar-event-title">
                        {event.summary || 'Untitled Event'}
                      </div>
                      <div className="calendar-event-meta">
                        {event.location && (
                          <span className="calendar-event-meta-item">
                            <MapPin width={14} height={14} />
                            {event.location}
                          </span>
                        )}
                        {event.attendees && event.attendees.length > 0 && (
                          <span className="calendar-event-meta-item">
                            <Users width={14} height={14} />
                            {event.attendees.length} attendee
                            {event.attendees.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GoogleCalendar;
