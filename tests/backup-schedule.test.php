<?php
lib('backup-schedule');

// Issue #1780: automatic backups (Server Backups, S3 Backups) can be pinned
// to an hour of the day. Without one, the schedule must stay exactly what it
// was. Times are built in Europe/Paris, the timezone the hour is saved in.

const BS_DAY = 86400;
const BS_WEEK = 604800;
const BS_MONTH = 2592000;
const BS_TZ = 'Europe/Paris';

function bsAt(string $local, string $tz = BS_TZ): int {
    return (new DateTimeImmutable($local, new DateTimeZone($tz)))->getTimestamp();
}

test('the hour is 0 to 23, anything else means any time', function () {
    assertSame(null, poznoteNormalizeBackupHour(''));
    assertSame(null, poznoteNormalizeBackupHour(null));
    assertSame(0, poznoteNormalizeBackupHour('0'));
    assertSame(3, poznoteNormalizeBackupHour('03'));
    assertSame(23, poznoteNormalizeBackupHour(23));
    assertSame(null, poznoteNormalizeBackupHour('24'));
    assertSame(null, poznoteNormalizeBackupHour('-1'));
    assertSame(null, poznoteNormalizeBackupHour('3.5'));
    assertSame(null, poznoteNormalizeBackupHour('abc'));
    assertSame(null, poznoteNormalizeBackupHour(-2));
});

test('an unknown timezone falls back to UTC', function () {
    assertSame('Europe/Paris', poznoteNormalizeBackupTimezone('Europe/Paris'));
    assertSame('UTC', poznoteNormalizeBackupTimezone(''));
    assertSame('UTC', poznoteNormalizeBackupTimezone('Mars/Olympus'));
});

test('without an hour, the schedule is the historical one', function () {
    $last = bsAt('2026-11-10 22:07');
    assertFalse(poznoteBackupScheduleIsDue($last + BS_DAY - 151, $last, BS_DAY, null, BS_TZ));
    assertTrue(poznoteBackupScheduleIsDue($last + BS_DAY - 150, $last, BS_DAY, null, BS_TZ));
    // Never run: due right away, and no next date to show.
    assertTrue(poznoteBackupScheduleIsDue(bsAt('2026-11-10 15:00'), 0, BS_DAY, null, BS_TZ));
    assertSame(null, poznoteBackupScheduleNextRun(bsAt('2026-11-10 15:00'), 0, BS_DAY, null, BS_TZ));
    assertSame($last + BS_DAY, poznoteBackupScheduleNextRun($last + 10, $last, BS_DAY, null, BS_TZ));
});

test('a daily backup at 3:00 starts at the first tick after 3:00, once', function () {
    $last = bsAt('2026-11-10 03:04');
    assertFalse(poznoteBackupScheduleIsDue(bsAt('2026-11-10 23:59'), $last, BS_DAY, 3, BS_TZ));
    assertFalse(poznoteBackupScheduleIsDue(bsAt('2026-11-11 02:59'), $last, BS_DAY, 3, BS_TZ));
    assertTrue(poznoteBackupScheduleIsDue(bsAt('2026-11-11 03:00'), $last, BS_DAY, 3, BS_TZ));
    assertTrue(poznoteBackupScheduleIsDue(bsAt('2026-11-11 03:05'), $last, BS_DAY, 3, BS_TZ));
    // The run ended at 3:40: not again until the next day.
    $last = bsAt('2026-11-11 03:40');
    assertFalse(poznoteBackupScheduleIsDue(bsAt('2026-11-11 03:45'), $last, BS_DAY, 3, BS_TZ));
    assertFalse(poznoteBackupScheduleIsDue(bsAt('2026-11-11 23:00'), $last, BS_DAY, 3, BS_TZ));
    assertSame(bsAt('2026-11-12 03:00'), poznoteBackupScheduleNextRun(bsAt('2026-11-11 12:00'), $last, BS_DAY, 3, BS_TZ));
});

test('a long backup does not push the next one to the day after', function () {
    // Started at 3:00, ended at 5:30: tomorrow's 3:00 is still allowed.
    $last = bsAt('2026-11-10 05:30');
    assertTrue(poznoteBackupScheduleIsDue(bsAt('2026-11-11 03:02'), $last, BS_DAY, 3, BS_TZ));
});

test('a missed hour is caught up at the next tick, and only once', function () {
    $last = bsAt('2026-11-09 03:05');
    // Server down on the 10th at 3:00, back at 14:00.
    assertTrue(poznoteBackupScheduleIsDue(bsAt('2026-11-10 14:00'), $last, BS_DAY, 3, BS_TZ));
    $caughtUp = bsAt('2026-11-10 14:20');
    assertFalse(poznoteBackupScheduleIsDue(bsAt('2026-11-10 20:00'), $caughtUp, BS_DAY, 3, BS_TZ));
    // The 11th at 3:00 is 12h40 after the catch-up: allowed, back on time.
    assertTrue(poznoteBackupScheduleIsDue(bsAt('2026-11-11 03:00'), $caughtUp, BS_DAY, 3, BS_TZ));
});

test('the first run waits for the chosen hour', function () {
    // Enabled at 15:00 with 3:00 chosen: nothing today, tomorrow at 3:00.
    assertFalse(poznoteBackupScheduleIsDue(bsAt('2026-11-10 15:00'), 0, BS_DAY, 3, BS_TZ));
    assertSame(bsAt('2026-11-11 03:00'), poznoteBackupScheduleNextRun(bsAt('2026-11-10 15:00'), 0, BS_DAY, 3, BS_TZ));
    assertTrue(poznoteBackupScheduleIsDue(bsAt('2026-11-11 03:00'), 0, BS_DAY, 3, BS_TZ));
    assertTrue(poznoteBackupScheduleIsDue(bsAt('2026-11-11 03:55'), 0, BS_DAY, 3, BS_TZ));
    // Enabled at 3:20 with 3:00 chosen: the hour is still open, it runs now.
    assertTrue(poznoteBackupScheduleIsDue(bsAt('2026-11-11 03:20'), 0, BS_DAY, 3, BS_TZ));
    assertSame(bsAt('2026-11-11 03:20'), poznoteBackupScheduleNextRun(bsAt('2026-11-11 03:20'), 0, BS_DAY, 3, BS_TZ));
    assertFalse(poznoteBackupScheduleIsDue(bsAt('2026-11-11 04:00'), 0, BS_DAY, 3, BS_TZ));
});

test('weekly and monthly keep their interval and run at the hour', function () {
    $last = bsAt('2026-11-02 03:06'); // a Monday
    assertFalse(poznoteBackupScheduleIsDue(bsAt('2026-11-08 03:10'), $last, BS_WEEK, 3, BS_TZ));
    assertTrue(poznoteBackupScheduleIsDue(bsAt('2026-11-09 03:01'), $last, BS_WEEK, 3, BS_TZ));
    assertSame(bsAt('2026-11-09 03:00'), poznoteBackupScheduleNextRun(bsAt('2026-11-04 10:00'), $last, BS_WEEK, 3, BS_TZ));

    $last = bsAt('2026-10-01 23:10');
    assertFalse(poznoteBackupScheduleIsDue(bsAt('2026-10-30 23:05'), $last, BS_MONTH, 23, BS_TZ));
    assertTrue(poznoteBackupScheduleIsDue(bsAt('2026-10-31 23:05'), $last, BS_MONTH, 23, BS_TZ));
    assertSame(bsAt('2026-10-31 23:00'), poznoteBackupScheduleNextRun(bsAt('2026-10-15 12:00'), $last, BS_MONTH, 23, BS_TZ));
});

test('changing the hour skips at most one day', function () {
    // Ran at 22:05 under the old hour, then 3:00 is chosen.
    $last = bsAt('2026-11-10 22:05');
    assertFalse(poznoteBackupScheduleIsDue(bsAt('2026-11-11 03:00'), $last, BS_DAY, 3, BS_TZ));
    assertSame(bsAt('2026-11-12 03:00'), poznoteBackupScheduleNextRun(bsAt('2026-11-11 08:00'), $last, BS_DAY, 3, BS_TZ));
});

test('the hour stays the local hour across a clock change', function () {
    // Paris goes back to winter time on 2026-10-25.
    $last = bsAt('2026-10-24 03:05');
    assertSame(bsAt('2026-10-25 03:00'), poznoteBackupScheduleNextRun(bsAt('2026-10-24 12:00'), $last, BS_DAY, 3, BS_TZ));
    assertSame(bsAt('2026-10-26 03:00'), poznoteBackupScheduleNextRun(bsAt('2026-10-25 12:00'), bsAt('2026-10-25 03:05'), BS_DAY, 3, BS_TZ));
    // And to summer time on 2027-03-28, when 2:00 does not exist.
    $next = poznoteBackupScheduleNextRun(bsAt('2027-03-27 12:00'), bsAt('2027-03-27 02:05'), BS_DAY, 2, BS_TZ);
    assertSame(bsAt('2027-03-28 03:00'), $next, 'the missing 2:00 becomes 3:00');
});

test('the hour is read in the timezone it was saved in', function () {
    // 3:00 in New York is 8:00 or 9:00 in Paris, never 3:00 Paris time.
    $last = bsAt('2026-11-10 03:05', 'America/New_York');
    assertFalse(poznoteBackupScheduleIsDue(bsAt('2026-11-11 03:30', BS_TZ), $last, BS_DAY, 3, 'America/New_York'));
    assertTrue(poznoteBackupScheduleIsDue(bsAt('2026-11-11 03:01', 'America/New_York'), $last, BS_DAY, 3, 'America/New_York'));
});

test('another administrator saving the form does not move the hour to their clock', function () {
    // Hour unchanged: the stored timezone stays.
    assertSame('Europe/Paris', poznoteBackupTimezoneToStore(3, 3, 'Europe/Paris', 'America/New_York'));
    // Hour changed, or first chosen: the saving administrator's timezone.
    assertSame('America/New_York', poznoteBackupTimezoneToStore(4, 3, 'Europe/Paris', 'America/New_York'));
    assertSame('America/New_York', poznoteBackupTimezoneToStore(3, null, '', 'America/New_York'));
    // Any time: nothing to anchor, the saving administrator's timezone.
    assertSame('America/New_York', poznoteBackupTimezoneToStore(null, null, 'Europe/Paris', 'America/New_York'));
    // A broken stored or admin timezone never reaches the schedule.
    assertSame('UTC', poznoteBackupTimezoneToStore(5, null, '', 'Not/AZone'));
});
