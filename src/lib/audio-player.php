<?php
/**
 * The audio player a note shows, as markup.
 *
 * One renderer for the two places a note's audio is drawn: the iframe of the
 * editor (audio_player.php, because Chrome refuses to render <audio> controls
 * inside a contenteditable) and the pages that only read a note (a public
 * share, the journal). Both get the same element, so a recording looks the
 * same wherever it is read.
 *
 * What it draws is decided by the tags the file carries (lib/audio-metadata.php):
 * nothing but a waveform for a voice note, a cover with a title and an artist
 * for a music file. The waveform itself is drawn by js/audio-player.js, which
 * is the only thing that can read the samples; this renders the shell.
 *
 * The <audio> element is the one piece that must carry the real address in a
 * src attribute: a public page rewrites every src= of a note to add the share
 * token, so the player follows without knowing anything about shares.
 */

require_once __DIR__ . '/i18n.php';

/**
 * @param array{
 *   src: string,
 *   cover_url?: string,
 *   title?: string,
 *   artist?: string,
 *   size?: int,
 *   class?: string
 * } $options
 */
function poznoteRenderAudioPlayer(array $options): string
{
    $src = trim((string)($options['src'] ?? ''));
    if ($src === '') {
        return '';
    }

    $escape = static function ($value): string {
        return htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    };

    $title = trim((string)($options['title'] ?? ''));
    $artist = trim((string)($options['artist'] ?? ''));
    $coverUrl = trim((string)($options['cover_url'] ?? ''));
    $size = (int)($options['size'] ?? 0);
    $tagged = $title !== '' || $artist !== '' || $coverUrl !== '';

    $classes = ['pz-audio'];
    $classes[] = $tagged ? 'pz-audio-tagged' : 'pz-audio-plain';
    if ($coverUrl !== '') {
        // The cover is the play button's face, so the button has to know.
        $classes[] = 'pz-audio-has-cover';
    }
    $extraClass = trim((string)($options['class'] ?? ''));
    if ($extraClass !== '') {
        $classes[] = $extraClass;
    }

    $labelPlay = t('audio_player.play', [], 'Play');
    $labelPause = t('audio_player.pause', [], 'Pause');
    $labelSeek = t('audio_player.seek', [], 'Seek');
    $labelSpeed = t('audio_player.speed', [], 'Playback speed');
    // Said in the player's own box when the <audio> element gives up, because
    // a greyed play button on its own leaves the reader guessing. Which of the
    // two it is comes from the media error (js/audio-player.js).
    $labelUnsupported = t('audio_player.unsupported', [], 'Your browser cannot play this audio format');
    $labelLoadError = t('audio_player.load_error', [], 'This recording could not be loaded');
    $labelVolume = t('audio_player.volume', [], 'Volume');
    $labelMute = t('audio_player.mute', [], 'Mute');
    $labelUnmute = t('audio_player.unmute', [], 'Unmute');

    $html = '<div class="' . $escape(implode(' ', $classes)) . '" data-pz-audio'
        . ' data-label-play="' . $escape($labelPlay) . '"'
        . ' data-label-pause="' . $escape($labelPause) . '"'
        . ' data-label-unsupported="' . $escape($labelUnsupported) . '"'
        . ' data-label-load-error="' . $escape($labelLoadError) . '"'
        . ' data-label-mute="' . $escape($labelMute) . '"'
        . ' data-label-unmute="' . $escape($labelUnmute) . '"';
    if ($size > 0) {
        $html .= ' data-size="' . $escape((string)$size) . '"';
    }
    $html .= '>';

    // One square for both: with cover art the button wears it and shows the
    // glyph when the pointer is on it (and while playing, so pause stays
    // reachable); without, it is the plain accent square. Two boxes side by
    // side spent 48px of a 420px player saying the same thing twice.
    $html .= '<button type="button" class="pz-audio-play" aria-label="' . $escape($labelPlay) . '" title="' . $escape($labelPlay) . '">';
    if ($coverUrl !== '') {
        $html .= '<img class="pz-audio-cover" src="' . $escape($coverUrl) . '" alt="" loading="lazy" decoding="async">';
    }
    $html .= '<span class="pz-audio-play-icon" aria-hidden="true"></span>'
        . '</button>';

    $html .= '<div class="pz-audio-body">';
    if ($title !== '' || $artist !== '') {
        $html .= '<div class="pz-audio-tags">';
        if ($title !== '') {
            $html .= '<span class="pz-audio-title" title="' . $escape($title) . '">' . $escape($title) . '</span>';
        }
        if ($artist !== '') {
            $html .= '<span class="pz-audio-artist" title="' . $escape($artist) . '">' . $escape($artist) . '</span>';
        }
        $html .= '</div>';
    }

    $html .= '<div class="pz-audio-track is-plain" role="slider" tabindex="0"'
        . ' aria-label="' . $escape($labelSeek) . '"'
        . ' aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="0:00">'
        . '<div class="pz-audio-wave" aria-hidden="true"></div>'
        . '<div class="pz-audio-wave pz-audio-wave-played" aria-hidden="true"></div>'
        . '</div>';
    // Takes the track's place once the browser has refused the file; empty
    // and out of the way until then, and never announced before it has text.
    $html .= '<p class="pz-audio-error" role="status"></p>';
    $html .= '</div>';

    // min/max/step are the browser's own defaults for a range, so the public
    // sanitizer dropping them (its input allow-list has no such attribute)
    // changes nothing: the slider still runs 0 to 100 by 1.
    $volume = '<div class="pz-audio-volume">'
        . '<button type="button" class="pz-audio-volume-btn" aria-label="' . $escape($labelMute) . '" title="' . $escape($labelMute) . '">'
        . '<span class="pz-audio-volume-icon" aria-hidden="true"></span>'
        . '</button>'
        . '<input type="range" class="pz-audio-volume-slider" min="0" max="100" step="1" value="100"'
        . ' aria-label="' . $escape($labelVolume) . '" title="' . $escape($labelVolume) . '">'
        . '</div>';

    $html .= '<div class="pz-audio-side">'
        . '<span class="pz-audio-time"><span class="pz-audio-elapsed">0:00</span><span class="pz-audio-total"></span></span>'
        . $volume
        . '<button type="button" class="pz-audio-speed" aria-label="' . $escape($labelSpeed) . '" title="' . $escape($labelSpeed) . '">1&times;</button>'
        . '</div>';

    $html .= '<audio class="pz-audio-el" preload="metadata" src="' . $escape($src) . '"></audio>';
    $html .= '</div>';

    return $html;
}

/**
 * The tags to render for one attachment of a note, or an empty set when the
 * file is not where this process can read it.
 *
 * Attachments kept in a bucket are read through a full download
 * (AttachmentStorage::localFile()), which is far too much work for a title,
 * so only a file on disk is parsed: a bucket-stored recording gets the plain
 * waveform player, as an untagged file does.
 *
 * @return array{title: string, artist: string, has_cover: bool}
 */
function poznoteAudioAttachmentTags(array $attachment): array
{
    $empty = ['title' => '', 'artist' => '', 'has_cover' => false];

    $filename = (string)($attachment['filename'] ?? '');
    if ($filename === '') {
        return $empty;
    }

    require_once __DIR__ . '/attachments.php';
    require_once __DIR__ . '/audio-metadata.php';

    $storage = poznoteAttachmentStorage();
    $path = $storage->localFileIfOnDisk($filename);
    if ($path === null) {
        return $empty;
    }

    $meta = poznoteAudioMetadata($path);

    return [
        'title' => $meta['title'],
        'artist' => $meta['artist'] !== '' ? $meta['artist'] : $meta['album'],
        'has_cover' => $meta['has_cover'],
    ];
}
