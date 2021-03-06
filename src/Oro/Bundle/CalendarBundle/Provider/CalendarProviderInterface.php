<?php

namespace Oro\Bundle\CalendarBundle\Provider;

interface CalendarProviderInterface
{
    /**
     * Gets default properties for the given calendar
     *
     * @param int   $userId      The id of an user requested this information
     * @param int   $calendarId  The target calendar id
     * @param int[] $calendarIds The list of ids of connected calendars
     *
     * @return array Each item of this array can contains any properties of a calendar you need to set as default.
     *               You can return any property defined in CalendarProperty class.
     *               If you need extra properties you can return them in 'options' array.
     *               There are several additional properties you can return as well:
     *                  calendarName - a name of a calendar. This property is mandatory.
     *                  removable - indicated whether a calendar can be disconnected from the target calendar
     *                              defaults to true
     *               Also there is special property names 'options' where you can return some additional options.
     *               For example:
     *                  widgetRoute   - route name of a widget can be used to view an event. defaults to empty
     *                  widgetOptions - options of a widget can be used to view an event. defaults to empty
     */
    public function getCalendarDefaultValues($userId, $calendarId, array $calendarIds);

    /**
     * Gets the list of calendar events
     *
     * @param int       $userId      The id of an user requested this information
     * @param int       $calendarId  The target calendar id
     * @param \DateTime $start       A date/time specifies the begin of a time interval
     * @param \DateTime $end         A date/time specifies the end of a time interval
     * @param bool      $subordinate Determines whether events from connected calendars should be included or not
     *
     * @return array Each item of this array should contains all properties of a calendar event.
     *               There are several additional properties you can return as well:
     *                  editable  - indicated whether an event can be modified. defaults to true
     *                  removable - indicated whether an event can be deleted. defaults to true
     *                  reminders - the list of attached reminders. defaults to empty
     */
    public function getCalendarEvents($userId, $calendarId, $start, $end, $subordinate);
}
