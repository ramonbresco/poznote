<?php
/**
 * When an automatic backup (Server Backups, S3 Backups) is due.
 *
 * Without a chosen hour the schedule is what it always was: the next run is
 * one interval after the end of the previous one, so it drifts with the
 * worker tick and the time the backup takes, and the first run starts within
 * a few minutes of enabling.
 *
 * With a chosen hour (issue #1780), a run starts at the first worker tick
 * after that hour, in the timezone of the administrator who saved it, on the
 * first day the interval allows. A missed hour (server down, worker stopped)
 * is caught up at the next tick, and never more than once. The very first run
 * waits for the chosen hour instead of starting right away.
 *
 * Pure functions, no database: the services read the settings and pass them.
 */

/**
 * How much earlier than a full interval the next run may start. A run is
 * recorded when it ends, so a backup that takes an hour to build, or a worker
 * tick five minutes late, would otherwise push the next one to the following
 * day. Half a day keeps a daily schedule on its daily slot and weeks on their
 * weekday, while still never running twice the same day.
 */
const POZNOTE_BACKUP_SCHEDULE_SLACK = 43200;

/**
 * How long after the chosen hour the first run may still start. Past that,
 * enabling the schedule late in the day waits for the next day's hour rather
 * than running at an hour nobody chose.
 */
const POZNOTE_BACKUP_SCHEDULE_FIRST_RUN_WINDOW = 3600;

/**
 * The stored hour, or null for "any time". Anything but an integer from 0 to
 * 23 is "any time", which is the historical behaviour.
 */
function poznoteNormalizeBackupHour($raw): ?int {
    if (is_int($raw)) {
        return ($raw >= 0 && $raw <= 23) ? $raw : null;
    }
    $raw = trim((string)$raw);
    if ($raw === '' || !ctype_digit($raw)) {
        return null;
    }
    $hour = (int)$raw;
    return $hour <= 23 ? $hour : null;
}

/**
 * The stored timezone, or UTC when it is missing or not one PHP knows.
 */
function poznoteNormalizeBackupTimezone($raw): string {
    $raw = trim((string)$raw);
    if ($raw === '') {
        return 'UTC';
    }
    try {
        new DateTimeZone($raw);
        return $raw;
    } catch (Exception $e) {
        return 'UTC';
    }
}

/**
 * The latest occurrence of $hour:00 in $timezone at or before $now.
 */
function poznoteBackupSlotAtOrBefore(int $now, int $hour, string $timezone): int {
    $zone = new DateTimeZone(poznoteNormalizeBackupTimezone($timezone));
    $local = (new DateTimeImmutable('@' . $now))->setTimezone($zone);
    $slot = $local->setTime($hour, 0, 0);
    if ($slot->getTimestamp() > $now) {
        $slot = $local->modify('-1 day')->setTime($hour, 0, 0);
    }
    return $slot->getTimestamp();
}

/**
 * The occurrence of $hour:00 that follows $slot (the next day's).
 */
function poznoteBackupSlotAfter(int $slot, int $hour, string $timezone): int {
    $zone = new DateTimeZone(poznoteNormalizeBackupTimezone($timezone));
    // Noon of the slot's day, plus a day: never lands on a DST gap or twice
    // on the same day, whatever the clock change.
    $local = (new DateTimeImmutable('@' . $slot))->setTimezone($zone)->setTime(12, 0, 0)->modify('+1 day');
    return $local->setTime($hour, 0, 0)->getTimestamp();
}

/**
 * Whether the run of the slot starting at $slot is allowed, given the last one.
 */
function poznoteBackupSlotAllowed(int $slot, int $now, int $lastRun, int $interval): bool {
    if ($lastRun >= $slot) {
        return false;
    }
    if ($lastRun <= 0) {
        return $now < $slot + POZNOTE_BACKUP_SCHEDULE_FIRST_RUN_WINDOW;
    }
    return $slot - $lastRun >= $interval - POZNOTE_BACKUP_SCHEDULE_SLACK;
}

/**
 * True when the automatic backup should start now.
 *
 * $lastRun is when the previous automatic run ended (0 = never), $interval
 * the frequency in seconds, $hour the chosen hour or null for any time.
 */
function poznoteBackupScheduleIsDue(int $now, int $lastRun, int $interval, ?int $hour, string $timezone): bool {
    if ($hour === null) {
        // A small slack keeps the schedule from drifting by one worker tick
        // on every run (the behaviour from before the hour existed).
        return $now >= $lastRun + $interval - 150;
    }
    $slot = poznoteBackupSlotAtOrBefore($now, $hour, $timezone);
    return poznoteBackupSlotAllowed($slot, $now, $lastRun, $interval);
}

/**
 * When the next automatic backup will start, for the settings page: $now when
 * it is due already (it starts at the next worker tick), null when it cannot
 * be told (no chosen hour and no run yet: the first one starts within a few
 * minutes of enabling).
 */
function poznoteBackupScheduleNextRun(int $now, int $lastRun, int $interval, ?int $hour, string $timezone): ?int {
    if ($hour === null) {
        return $lastRun > 0 ? $lastRun + $interval : null;
    }
    $slot = poznoteBackupSlotAtOrBefore($now, $hour, $timezone);
    if (poznoteBackupSlotAllowed($slot, $now, $lastRun, $interval)) {
        return $now;
    }
    // A monthly schedule needs at most ~31 slots; 62 leaves room for any
    // interval the services define without ever looping for long.
    for ($i = 0; $i < 62; $i++) {
        $slot = poznoteBackupSlotAfter($slot, $hour, $timezone);
        if (poznoteBackupSlotAllowed($slot, $slot, $lastRun, $interval)) {
            return $slot;
        }
    }
    return null;
}

/**
 * The timezone a schedule saved now should keep: the stored one while the hour
 * does not change (so another administrator saving the form does not move the
 * backup to their own clock), the saving administrator's otherwise.
 */
function poznoteBackupTimezoneToStore(?int $postedHour, ?int $storedHour, string $storedTimezone, string $adminTimezone): string {
    if ($postedHour !== null && $postedHour === $storedHour && trim($storedTimezone) !== '') {
        return poznoteNormalizeBackupTimezone($storedTimezone);
    }
    return poznoteNormalizeBackupTimezone($adminTimezone);
}

/**
 * The "Time" field of an automatic backup form (Server Backups, S3 Backups).
 * $timezone is the one the hour is read in, shown under the field.
 */
function poznoteRenderBackupHourField(string $name, ?int $hour, string $timezone): void {
    $id = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
    ?>
                    <div class="git-field-group">
                        <label class="git-field-label" for="<?php echo $id; ?>"><?php echo t_h('s3_backup.hour_label', [], 'Time'); ?></label>
                        <select name="<?php echo $id; ?>" id="<?php echo $id; ?>" class="git-field-input">
                            <option value="" <?php echo $hour === null ? 'selected' : ''; ?>><?php echo t_h('s3_backup.hour_any', [], 'Any time'); ?></option>
                            <?php for ($h = 0; $h <= 23; $h++): ?>
                            <option value="<?php echo $h; ?>" <?php echo $hour === $h ? 'selected' : ''; ?>><?php echo sprintf('%02d:00', $h); ?></option>
                            <?php endfor; ?>
                        </select>
                        <span class="label-desc"><?php echo t_h('s3_backup.hour_description', ['timezone' => poznoteNormalizeBackupTimezone($timezone)], 'Backups start in the first minutes after this hour, in the {{timezone}} timezone. With Any time, the first one starts a few minutes after enabling, and each next one an interval after the previous one.'); ?></span>
                    </div>
    <?php
}
