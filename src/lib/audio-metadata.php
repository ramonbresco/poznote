<?php
/**
 * Title, artist, album and cover art read out of an audio file.
 *
 * The note player (css/components/audio-player.css, js/audio-player.js) shows
 * a plain waveform for a file that carries nothing, and a cover with a title
 * and an artist for one that does. Which of the two it is can only be known
 * by reading the file's tags, and that is what this module does.
 *
 * It reads headers, never the audio: an ID3 tag sits at the start of an MP3,
 * the metadata blocks of a FLAC come before the first frame, an MP4 keeps its
 * tags in moov/udta/meta/ilst. Nothing here decodes a single sample, so the
 * cost is a handful of seeks whatever the length of the recording. The cover
 * is the one thing that can be large, so it is read only when asked for
 * (poznoteAudioCoverArt()) and refused above POZNOTE_AUDIO_COVER_MAX_BYTES.
 *
 * Formats: ID3v2.2/2.3/2.4 and ID3v1 (MP3), MP4/M4A atoms, FLAC metadata
 * blocks, Ogg Vorbis and Opus comments, RIFF INFO (WAV). WebM/Matroska is
 * left out on purpose: it is what a browser records, and a recording carries
 * no tags for this to find.
 *
 * The type of a cover is sniffed from its own first bytes, never taken from
 * what the tag declares, so nothing can be served as an image that is not one
 * (the same rule as lib/ai-note-vision.php).
 */

/** Never read more than this looking for tags, whatever a header claims. */
const POZNOTE_AUDIO_TAG_READ_LIMIT = 4 * 1024 * 1024;

/** An embedded picture larger than this is left where it is. */
const POZNOTE_AUDIO_COVER_MAX_BYTES = 8 * 1024 * 1024;

/** A text frame longer than this is a broken tag, not a title. */
const POZNOTE_AUDIO_TEXT_MAX_BYTES = 8 * 1024;

/** Characters kept of a single tag value. */
const POZNOTE_AUDIO_TEXT_MAX_CHARS = 200;

/** The shape every parser in here returns. */
function poznoteAudioEmptyMetadata(): array
{
    return ['title' => '', 'artist' => '', 'album' => '', 'has_cover' => false, 'cover' => null];
}

/**
 * Tags of an audio file on disk.
 *
 * @param string $path      readable path to the file
 * @param bool   $withCover also extract the embedded picture into ['cover']
 * @return array{title: string, artist: string, album: string, has_cover: bool, cover: array{mime: string, data: string}|null}
 */
function poznoteAudioMetadata(string $path, bool $withCover = false): array
{
    $meta = poznoteAudioEmptyMetadata();
    if ($path === '' || !is_file($path) || !is_readable($path)) {
        return $meta;
    }
    $size = @filesize($path);
    if ($size === false || $size <= 0) {
        return $meta;
    }
    $handle = @fopen($path, 'rb');
    if (!$handle) {
        return $meta;
    }

    try {
        $head = (string)fread($handle, 16);
        if (strncmp($head, 'ID3', 3) === 0) {
            $meta = poznoteAudioParseId3v2($handle, $withCover) ?? $meta;
        } elseif (strncmp($head, 'fLaC', 4) === 0) {
            $meta = poznoteAudioParseFlac($handle, $size, $withCover) ?? $meta;
        } elseif (strncmp($head, 'OggS', 4) === 0) {
            $meta = poznoteAudioParseOgg($handle, $size, $withCover) ?? $meta;
        } elseif (strncmp($head, 'RIFF', 4) === 0 && substr($head, 8, 4) === 'WAVE') {
            $meta = poznoteAudioParseWav($handle, $size) ?? $meta;
        } elseif (substr($head, 4, 4) === 'ftyp') {
            $meta = poznoteAudioParseMp4($handle, $size, $withCover) ?? $meta;
        }

        if ($meta['title'] === '' || $meta['artist'] === '' || $meta['album'] === '') {
            $meta = poznoteAudioFillFromId3v1($handle, $size, $meta);
        }
    } catch (Throwable $e) {
        // A malformed file is a file without tags, not an error page.
        $meta = poznoteAudioEmptyMetadata();
    } finally {
        fclose($handle);
    }

    return $meta;
}

/**
 * The embedded picture of an audio file, or null when it has none this
 * instance can serve.
 *
 * @return array{mime: string, data: string}|null
 */
function poznoteAudioCoverArt(string $path): ?array
{
    $meta = poznoteAudioMetadata($path, true);
    return $meta['cover'];
}

/** True when the file is one of the containers this module can read. */
function poznoteAudioMetadataSupportsFile(string $path): bool
{
    if ($path === '' || !is_file($path) || !is_readable($path)) {
        return false;
    }
    $handle = @fopen($path, 'rb');
    if (!$handle) {
        return false;
    }
    $head = (string)fread($handle, 16);
    fclose($handle);

    return strncmp($head, 'ID3', 3) === 0
        || strncmp($head, 'fLaC', 4) === 0
        || strncmp($head, 'OggS', 4) === 0
        || (strncmp($head, 'RIFF', 4) === 0 && substr($head, 8, 4) === 'WAVE')
        || substr($head, 4, 4) === 'ftyp';
}

// ---------------------------------------------------------------------------
// Byte helpers
// ---------------------------------------------------------------------------

function poznoteAudioUint32be(string $raw): int
{
    if (strlen($raw) < 4) {
        return 0;
    }
    return (ord($raw[0]) << 24) | (ord($raw[1]) << 16) | (ord($raw[2]) << 8) | ord($raw[3]);
}

function poznoteAudioUint32le(string $raw): int
{
    if (strlen($raw) < 4) {
        return 0;
    }
    return ord($raw[0]) | (ord($raw[1]) << 8) | (ord($raw[2]) << 16) | (ord($raw[3]) << 24);
}

function poznoteAudioUint24be(string $raw): int
{
    if (strlen($raw) < 3) {
        return 0;
    }
    return (ord($raw[0]) << 16) | (ord($raw[1]) << 8) | ord($raw[2]);
}

/** ID3 sizes are seven bits per byte, the eighth always zero. */
function poznoteAudioSynchsafe(string $raw): int
{
    if (strlen($raw) < 4) {
        return 0;
    }
    return ((ord($raw[0]) & 0x7F) << 21)
        | ((ord($raw[1]) & 0x7F) << 14)
        | ((ord($raw[2]) & 0x7F) << 7)
        | (ord($raw[3]) & 0x7F);
}

/** A reader that seeks in an open file. */
function poznoteAudioFileReader($handle): callable
{
    return static function (int $offset, int $length) use ($handle): string {
        if ($length <= 0 || $offset < 0) {
            return '';
        }
        if (fseek($handle, $offset) !== 0) {
            return '';
        }
        return (string)fread($handle, $length);
    };
}

/** The same reader over a string already in memory. */
function poznoteAudioStringReader(string $body): callable
{
    return static function (int $offset, int $length) use ($body): string {
        if ($length <= 0 || $offset < 0) {
            return '';
        }
        return substr($body, $offset, $length);
    };
}

/**
 * What a picture really is, read from its own first bytes.
 * Anything else is refused rather than passed on with a borrowed type.
 */
function poznoteAudioSniffImageMime(string $bytes): ?string
{
    if (strlen($bytes) < 12) {
        return null;
    }
    if (strncmp($bytes, "\xFF\xD8\xFF", 3) === 0) {
        return 'image/jpeg';
    }
    if (strncmp($bytes, "\x89PNG\r\n\x1A\n", 8) === 0) {
        return 'image/png';
    }
    if (strncmp($bytes, 'GIF87a', 6) === 0 || strncmp($bytes, 'GIF89a', 6) === 0) {
        return 'image/gif';
    }
    if (strncmp($bytes, 'RIFF', 4) === 0 && substr($bytes, 8, 4) === 'WEBP') {
        return 'image/webp';
    }
    return null;
}

/** A picture, kept only when its bytes say what it is. */
function poznoteAudioMakeCover(string $data): ?array
{
    if ($data === '' || strlen($data) > POZNOTE_AUDIO_COVER_MAX_BYTES) {
        return null;
    }
    $mime = poznoteAudioSniffImageMime($data);
    if ($mime === null) {
        return null;
    }
    return ['mime' => $mime, 'data' => $data];
}

/**
 * One tag value, cut to its first line, valid UTF-8 and a sane length.
 */
function poznoteAudioCleanTagValue(string $text): string
{
    $nul = strpos($text, "\0");
    if ($nul !== false) {
        $text = substr($text, 0, $nul);
    }
    // Bytes that are not UTF-8 are read as Latin-1: a tag written by an old
    // encoder is still worth showing, and every pattern below needs /u.
    if ($text !== '' && !poznoteAudioIsValidUtf8($text)) {
        $text = poznoteAudioLatin1ToUtf8($text);
    }
    $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]+/u', ' ', $text) ?? '';
    $text = trim(preg_replace('/\s+/u', ' ', $text) ?? '');
    if ($text === '') {
        return '';
    }
    if (function_exists('mb_substr')) {
        return mb_substr($text, 0, POZNOTE_AUDIO_TEXT_MAX_CHARS, 'UTF-8');
    }
    return substr($text, 0, POZNOTE_AUDIO_TEXT_MAX_CHARS * 4);
}

function poznoteAudioIsValidUtf8(string $text): bool
{
    return (bool)preg_match('//u', $text);
}

function poznoteAudioLatin1ToUtf8(string $text): string
{
    if (function_exists('mb_convert_encoding')) {
        $out = @mb_convert_encoding($text, 'UTF-8', 'ISO-8859-1');
        if (is_string($out)) {
            return $out;
        }
    }
    $out = '';
    $length = strlen($text);
    for ($i = 0; $i < $length; $i++) {
        $code = ord($text[$i]);
        $out .= $code < 0x80 ? chr($code) : chr(0xC0 | ($code >> 6)) . chr(0x80 | ($code & 0x3F));
    }
    return $out;
}

function poznoteAudioUtf16ToUtf8(string $body, ?string $forced = null): string
{
    $encoding = $forced;
    $bom = substr($body, 0, 2);
    if ($encoding === null) {
        if ($bom === "\xFF\xFE") {
            $encoding = 'UTF-16LE';
            $body = substr($body, 2);
        } elseif ($bom === "\xFE\xFF") {
            $encoding = 'UTF-16BE';
            $body = substr($body, 2);
        } else {
            $encoding = 'UTF-16LE';
        }
    } elseif ($bom === "\xFF\xFE" || $bom === "\xFE\xFF") {
        $body = substr($body, 2);
    }

    if (function_exists('mb_convert_encoding')) {
        $out = @mb_convert_encoding($body, 'UTF-8', $encoding);
        if (is_string($out)) {
            return $out;
        }
    }
    if (function_exists('iconv')) {
        $out = @iconv($encoding, 'UTF-8//IGNORE', $body);
        if (is_string($out)) {
            return $out;
        }
    }

    $out = '';
    $length = strlen($body) - (strlen($body) % 2);
    $little = $encoding === 'UTF-16LE';
    for ($i = 0; $i < $length; $i += 2) {
        $code = $little
            ? ord($body[$i]) | (ord($body[$i + 1]) << 8)
            : (ord($body[$i]) << 8) | ord($body[$i + 1]);
        if ($code === 0) {
            break;
        }
        $out .= poznoteAudioCodePointToUtf8($code);
    }
    return $out;
}

function poznoteAudioCodePointToUtf8(int $code): string
{
    if ($code < 0x80) {
        return chr($code);
    }
    if ($code < 0x800) {
        return chr(0xC0 | ($code >> 6)) . chr(0x80 | ($code & 0x3F));
    }
    return chr(0xE0 | ($code >> 12)) . chr(0x80 | (($code >> 6) & 0x3F)) . chr(0x80 | ($code & 0x3F));
}

// ---------------------------------------------------------------------------
// ID3v2 (MP3 and anything else that carries one)
// ---------------------------------------------------------------------------

function poznoteAudioParseId3v2($handle, bool $withCover): ?array
{
    if (fseek($handle, 0) !== 0) {
        return null;
    }
    $header = (string)fread($handle, 10);
    if (strlen($header) < 10 || strncmp($header, 'ID3', 3) !== 0) {
        return null;
    }
    $major = ord($header[3]);
    if ($major < 2 || $major > 4) {
        return null;
    }
    $tagFlags = ord($header[5]);
    $tagSize = poznoteAudioSynchsafe(substr($header, 6, 4));
    if ($tagSize <= 0) {
        return null;
    }

    if (($tagFlags & 0x80) !== 0) {
        // Unsynchronisation rewrites bytes all through the tag, so nothing in
        // it can be addressed until the whole thing is undone. A tag too big
        // to hold in memory is left alone rather than read.
        if ($tagSize > POZNOTE_AUDIO_TAG_READ_LIMIT) {
            return null;
        }
        $body = str_replace("\xFF\x00", "\xFF", (string)fread($handle, $tagSize));
        return poznoteAudioParseId3v2Frames(poznoteAudioStringReader($body), $major, $tagFlags, 0, strlen($body), $withCover);
    }

    return poznoteAudioParseId3v2Frames(poznoteAudioFileReader($handle), $major, $tagFlags, 10, 10 + $tagSize, $withCover);
}

function poznoteAudioParseId3v2Frames(callable $read, int $major, int $tagFlags, int $pos, int $end, bool $withCover): array
{
    $meta = poznoteAudioEmptyMetadata();

    if (($tagFlags & 0x40) !== 0) {
        // Extended header: synchsafe and self-inclusive in 2.4, a plain size
        // that excludes its own four bytes in 2.3.
        $raw = $read($pos, 4);
        if (strlen($raw) === 4) {
            $extended = $major >= 4 ? poznoteAudioSynchsafe($raw) : poznoteAudioUint32be($raw) + 4;
            if ($extended > 0 && $pos + $extended < $end) {
                $pos += $extended;
            }
        }
    }

    $headerLength = $major === 2 ? 6 : 10;
    $fields = $major === 2
        ? ['TT2' => 'title', 'TP1' => 'artist', 'TAL' => 'album', 'PIC' => 'picture']
        : ['TIT2' => 'title', 'TPE1' => 'artist', 'TALB' => 'album', 'APIC' => 'picture'];

    while ($pos + $headerLength <= $end) {
        $header = $read($pos, $headerLength);
        if (strlen($header) < $headerLength) {
            break;
        }
        $id = substr($header, 0, $major === 2 ? 3 : 4);
        if (trim($id, "\0") === '') {
            break; // padding: the frames are over
        }

        if ($major === 2) {
            $frameSize = poznoteAudioUint24be(substr($header, 3, 3));
            $frameFlags = 0;
        } else {
            $sizeRaw = substr($header, 4, 4);
            $frameSize = $major >= 4 ? poznoteAudioSynchsafe($sizeRaw) : poznoteAudioUint32be($sizeRaw);
            $frameFlags = (ord($header[8]) << 8) | ord($header[9]);
        }
        if ($frameSize <= 0) {
            break;
        }
        $dataAt = $pos + $headerLength;
        if ($dataAt + $frameSize > $end) {
            break;
        }
        $pos = $dataAt + $frameSize;

        $field = $fields[$id] ?? null;
        if ($field === null) {
            continue;
        }
        // A compressed or encrypted frame is not worth a decoder here.
        $unusable = $major === 3 ? ($frameFlags & 0xC000) !== 0 : ($frameFlags & 0x000C) !== 0;
        if ($unusable) {
            continue;
        }

        $dataSize = $frameSize;
        if ($major >= 4 && ($frameFlags & 0x0001) !== 0) {
            $dataAt += 4; // data length indicator
            $dataSize -= 4;
        }
        if ($dataSize <= 0) {
            continue;
        }
        $frameUnsync = $major >= 4 && ($frameFlags & 0x0002) !== 0;

        if ($field === 'picture') {
            $meta['has_cover'] = true;
            if (!$withCover || $meta['cover'] !== null || $dataSize > POZNOTE_AUDIO_COVER_MAX_BYTES) {
                continue;
            }
            $raw = $read($dataAt, $dataSize);
            if ($frameUnsync) {
                $raw = str_replace("\xFF\x00", "\xFF", $raw);
            }
            $meta['cover'] = poznoteAudioPictureFromId3Frame($raw, $major);
            continue;
        }

        if ($meta[$field] !== '') {
            continue;
        }
        $raw = $read($dataAt, min($dataSize, POZNOTE_AUDIO_TEXT_MAX_BYTES));
        if ($frameUnsync) {
            $raw = str_replace("\xFF\x00", "\xFF", $raw);
        }
        $meta[$field] = poznoteAudioDecodeTagText($raw);
    }

    return $meta;
}

function poznoteAudioDecodeTagText(string $raw): string
{
    if ($raw === '') {
        return '';
    }
    $encoding = ord($raw[0]);
    $body = substr($raw, 1);
    switch ($encoding) {
        case 1:
            $text = poznoteAudioUtf16ToUtf8($body);
            break;
        case 2:
            $text = poznoteAudioUtf16ToUtf8($body, 'UTF-16BE');
            break;
        case 3:
            $text = $body;
            break;
        default:
            $text = poznoteAudioLatin1ToUtf8($body);
            break;
    }
    return poznoteAudioCleanTagValue($text);
}

/** Past a string terminated the way this text encoding terminates one. */
function poznoteAudioSkipTerminatedString(string $raw, int $offset, int $encoding): ?int
{
    $length = strlen($raw);
    if ($encoding === 1 || $encoding === 2) {
        for ($i = $offset; $i + 1 < $length; $i += 2) {
            if ($raw[$i] === "\0" && $raw[$i + 1] === "\0") {
                return $i + 2;
            }
        }
        return null;
    }
    $nul = strpos($raw, "\0", $offset);
    return $nul === false ? null : $nul + 1;
}

function poznoteAudioPictureFromId3Frame(string $raw, int $major): ?array
{
    if (strlen($raw) < 6) {
        return null;
    }
    $encoding = ord($raw[0]);
    if ($major === 2) {
        $offset = 4; // three-character image format, no terminator
    } else {
        $offset = poznoteAudioSkipTerminatedString($raw, 1, 0); // MIME string, always Latin-1
        if ($offset === null) {
            return null;
        }
    }
    $offset += 1; // picture type
    $offset = poznoteAudioSkipTerminatedString($raw, $offset, $encoding);
    if ($offset === null || $offset >= strlen($raw)) {
        return null;
    }

    return poznoteAudioMakeCover(substr($raw, $offset));
}

// ---------------------------------------------------------------------------
// ID3v1: the last 128 bytes, and only what ID3v2 did not already say
// ---------------------------------------------------------------------------

function poznoteAudioFillFromId3v1($handle, int $size, array $meta): array
{
    if ($size < 128 || fseek($handle, $size - 128) !== 0) {
        return $meta;
    }
    $tag = (string)fread($handle, 128);
    if (strlen($tag) < 128 || strncmp($tag, 'TAG', 3) !== 0) {
        return $meta;
    }

    $fields = ['title' => 3, 'artist' => 33, 'album' => 63];
    foreach ($fields as $field => $offset) {
        if ($meta[$field] !== '') {
            continue;
        }
        $value = rtrim(substr($tag, $offset, 30), " \0");
        if ($value !== '') {
            $meta[$field] = poznoteAudioCleanTagValue(poznoteAudioLatin1ToUtf8($value));
        }
    }

    return $meta;
}

// ---------------------------------------------------------------------------
// FLAC: metadata blocks before the first audio frame
// ---------------------------------------------------------------------------

function poznoteAudioParseFlac($handle, int $size, bool $withCover): ?array
{
    $meta = poznoteAudioEmptyMetadata();
    $read = poznoteAudioFileReader($handle);
    $pos = 4;

    for ($block = 0; $block < 64; $block++) {
        $header = $read($pos, 4);
        if (strlen($header) < 4) {
            break;
        }
        $flag = ord($header[0]);
        $type = $flag & 0x7F;
        $length = poznoteAudioUint24be(substr($header, 1, 3));
        $dataAt = $pos + 4;
        if ($length < 0 || $dataAt + $length > $size) {
            break;
        }

        if ($type === 4 && $length <= POZNOTE_AUDIO_TAG_READ_LIMIT) {
            $meta = poznoteAudioMergeVorbisComments($meta, $read($dataAt, $length), $withCover);
        } elseif ($type === 6) {
            $meta['has_cover'] = true;
            if ($withCover && $meta['cover'] === null && $length <= POZNOTE_AUDIO_COVER_MAX_BYTES) {
                $meta['cover'] = poznoteAudioPictureFromFlacBlock($read($dataAt, $length));
            }
        }

        $pos = $dataAt + $length;
        if (($flag & 0x80) !== 0) {
            break; // last metadata block
        }
    }

    return $meta;
}

/** A FLAC PICTURE block, which is also what METADATA_BLOCK_PICTURE holds. */
function poznoteAudioPictureFromFlacBlock(string $raw): ?array
{
    if (strlen($raw) < 32) {
        return null;
    }
    $offset = 4; // picture type
    $mimeLength = poznoteAudioUint32be(substr($raw, $offset, 4));
    $offset += 4 + $mimeLength;
    if ($mimeLength < 0 || $offset + 4 > strlen($raw)) {
        return null;
    }
    $descriptionLength = poznoteAudioUint32be(substr($raw, $offset, 4));
    $offset += 4 + $descriptionLength;
    $offset += 16; // width, height, depth, indexed colours
    if ($descriptionLength < 0 || $offset + 4 > strlen($raw)) {
        return null;
    }
    $dataLength = poznoteAudioUint32be(substr($raw, $offset, 4));
    $offset += 4;
    if ($dataLength <= 0 || $offset + $dataLength > strlen($raw)) {
        return null;
    }

    return poznoteAudioMakeCover(substr($raw, $offset, $dataLength));
}

/**
 * A Vorbis comment block: a vendor string, then "KEY=value" entries.
 * The same shape is used by FLAC, Ogg Vorbis and Opus.
 */
function poznoteAudioMergeVorbisComments(array $meta, string $raw, bool $withCover): array
{
    $length = strlen($raw);
    if ($length < 8) {
        return $meta;
    }
    $offset = 4 + poznoteAudioUint32le(substr($raw, 0, 4)); // vendor string
    if ($offset + 4 > $length) {
        return $meta;
    }
    $count = poznoteAudioUint32le(substr($raw, $offset, 4));
    $offset += 4;
    if ($count < 0 || $count > 4096) {
        return $meta;
    }

    $wanted = ['TITLE' => 'title', 'ARTIST' => 'artist', 'ALBUM' => 'album', 'ALBUMARTIST' => 'artist'];

    for ($i = 0; $i < $count; $i++) {
        if ($offset + 4 > $length) {
            break;
        }
        $entryLength = poznoteAudioUint32le(substr($raw, $offset, 4));
        $offset += 4;
        if ($entryLength <= 0 || $offset + $entryLength > $length) {
            break;
        }
        $entry = substr($raw, $offset, $entryLength);
        $offset += $entryLength;

        $equals = strpos($entry, '=');
        if ($equals === false) {
            continue;
        }
        $key = strtoupper(substr($entry, 0, $equals));
        $value = substr($entry, $equals + 1);

        if ($key === 'METADATA_BLOCK_PICTURE') {
            $meta['has_cover'] = true;
            if ($withCover && $meta['cover'] === null && strlen($value) <= POZNOTE_AUDIO_COVER_MAX_BYTES) {
                $decoded = base64_decode($value, true);
                if (is_string($decoded)) {
                    $meta['cover'] = poznoteAudioPictureFromFlacBlock($decoded);
                }
            }
            continue;
        }

        $field = $wanted[$key] ?? null;
        if ($field === null || $meta[$field] !== '' || $value === '') {
            continue;
        }
        $meta[$field] = poznoteAudioCleanTagValue($value);
    }

    return $meta;
}

// ---------------------------------------------------------------------------
// Ogg: the comment header is the second packet of the stream
// ---------------------------------------------------------------------------

function poznoteAudioParseOgg($handle, int $size, bool $withCover): ?array
{
    $meta = poznoteAudioEmptyMetadata();
    $read = poznoteAudioFileReader($handle);

    $buffer = '';
    $pos = 0;
    $packetComplete = false;

    // Pages are read until one ends a packet (a segment shorter than 255) or
    // the buffer reaches the read limit: a cover of several megabytes is
    // spread over many pages and has to be put back together to be read.
    for ($page = 0; $page < 4096 && $pos < $size && !$packetComplete; $page++) {
        $header = $read($pos, 27);
        if (strlen($header) < 27 || strncmp($header, 'OggS', 4) !== 0) {
            break;
        }
        $segmentCount = ord($header[26]);
        $table = $read($pos + 27, $segmentCount);
        if (strlen($table) < $segmentCount) {
            break;
        }
        $payloadLength = 0;
        for ($i = 0; $i < $segmentCount; $i++) {
            $segment = ord($table[$i]);
            $payloadLength += $segment;
            if ($segment < 255 && $page > 0) {
                $packetComplete = true;
            }
        }
        $payloadAt = $pos + 27 + $segmentCount;

        if ($page > 0) {
            if (strlen($buffer) + $payloadLength > POZNOTE_AUDIO_TAG_READ_LIMIT) {
                break;
            }
            $buffer .= $read($payloadAt, $payloadLength);
        }
        $pos = $payloadAt + $payloadLength;
    }

    if ($buffer === '') {
        return $meta;
    }

    if (strncmp($buffer, "\x03vorbis", 7) === 0) {
        return poznoteAudioMergeVorbisComments($meta, substr($buffer, 7), $withCover);
    }
    if (strncmp($buffer, 'OpusTags', 8) === 0) {
        return poznoteAudioMergeVorbisComments($meta, substr($buffer, 8), $withCover);
    }
    if (strncmp($buffer, "\x7FFLAC", 5) === 0) {
        // FLAC in an Ogg stream: the first packet holds the usual blocks.
        return $meta;
    }

    return $meta;
}

// ---------------------------------------------------------------------------
// MP4 / M4A: moov > udta > meta > ilst
// ---------------------------------------------------------------------------

function poznoteAudioParseMp4($handle, int $size, bool $withCover): ?array
{
    $meta = poznoteAudioEmptyMetadata();
    $read = poznoteAudioFileReader($handle);

    $ilst = poznoteAudioFindMp4Atom($read, 0, $size, ['moov', 'udta', 'meta', 'ilst'], 0);
    if ($ilst === null) {
        return $meta;
    }

    $fields = [
        "\xA9nam" => 'title',
        "\xA9ART" => 'artist',
        'aART' => 'artist',
        "\xA9alb" => 'album',
        'covr' => 'picture',
    ];

    [$pos, $end] = $ilst;
    for ($item = 0; $item < 512 && $pos + 8 <= $end; $item++) {
        $header = $read($pos, 8);
        if (strlen($header) < 8) {
            break;
        }
        $itemSize = poznoteAudioUint32be(substr($header, 0, 4));
        $name = substr($header, 4, 4);
        if ($itemSize < 8 || $pos + $itemSize > $end) {
            break;
        }

        $field = $fields[$name] ?? null;
        if ($field !== null) {
            $data = poznoteAudioReadMp4DataAtom($read, $pos + 8, $pos + $itemSize, $field === 'picture', $withCover && $meta['cover'] === null);
            if ($field === 'picture') {
                if ($data !== null) {
                    $meta['has_cover'] = true;
                    if ($withCover && $meta['cover'] === null && $data !== '') {
                        $meta['cover'] = poznoteAudioMakeCover($data);
                    }
                }
            } elseif ($data !== null && $data !== '' && $meta[$field] === '') {
                $meta[$field] = poznoteAudioCleanTagValue($data);
            }
        }

        $pos += $itemSize;
    }

    return $meta;
}

/**
 * Walk down a chain of container atoms and return the [start, end] of the
 * last one's payload.
 *
 * @param list<string> $path
 * @return array{0: int, 1: int}|null
 */
function poznoteAudioFindMp4Atom(callable $read, int $pos, int $end, array $path, int $depth): ?array
{
    if ($path === []) {
        return [$pos, $end];
    }
    $wanted = $path[0];

    for ($atom = 0; $atom < 1024 && $pos + 8 <= $end; $atom++) {
        $header = $read($pos, 8);
        if (strlen($header) < 8) {
            return null;
        }
        $atomSize = poznoteAudioUint32be(substr($header, 0, 4));
        $name = substr($header, 4, 4);
        $headerLength = 8;

        if ($atomSize === 1) {
            // 64-bit size. PHP ints are signed 64-bit, and a file this large
            // is not one this reads anyway, so only the low half is used.
            $extended = $read($pos + 8, 8);
            if (strlen($extended) < 8) {
                return null;
            }
            $atomSize = poznoteAudioUint32be(substr($extended, 4, 4));
            $headerLength = 16;
        } elseif ($atomSize === 0) {
            $atomSize = $end - $pos;
        }
        if ($atomSize < $headerLength || $pos + $atomSize > $end) {
            return null;
        }

        if ($name === $wanted) {
            $childAt = $pos + $headerLength;
            // "meta" is a full atom in MP4: four bytes of version and flags
            // come before its children. QuickTime writes it as a plain
            // container, so the four bytes are skipped only when what follows
            // them reads as an atom.
            if ($name === 'meta' && !poznoteAudioLooksLikeMp4Atom($read, $childAt + 4, $pos + $atomSize)) {
                return poznoteAudioFindMp4Atom($read, $childAt, $pos + $atomSize, array_slice($path, 1), $depth + 1);
            }
            if ($name === 'meta') {
                $childAt += 4;
            }
            return poznoteAudioFindMp4Atom($read, $childAt, $pos + $atomSize, array_slice($path, 1), $depth + 1);
        }

        $pos += $atomSize;
    }

    return null;
}

/** Whether an atom header with a size that fits starts right here. */
function poznoteAudioLooksLikeMp4Atom(callable $read, int $pos, int $end): bool
{
    if ($pos + 8 > $end) {
        return false;
    }
    $header = $read($pos, 8);
    if (strlen($header) < 8) {
        return false;
    }
    $atomSize = poznoteAudioUint32be(substr($header, 0, 4));
    if ($atomSize < 8 || $pos + $atomSize > $end) {
        return false;
    }
    return (bool)preg_match('/^[\x20-\x7E\xA9]{4}$/', substr($header, 4, 4));
}

/**
 * The "data" atom inside an iTunes metadata item.
 *
 * @return string|null the payload, '' when it exists but was not read
 */
function poznoteAudioReadMp4DataAtom(callable $read, int $pos, int $end, bool $isPicture, bool $wantBytes): ?string
{
    for ($atom = 0; $atom < 16 && $pos + 16 <= $end; $atom++) {
        $header = $read($pos, 16);
        if (strlen($header) < 16) {
            return null;
        }
        $atomSize = poznoteAudioUint32be(substr($header, 0, 4));
        $name = substr($header, 4, 4);
        if ($atomSize < 16 || $pos + $atomSize > $end) {
            return null;
        }
        if ($name !== 'data') {
            $pos += $atomSize;
            continue;
        }

        $payloadAt = $pos + 16;
        $payloadLength = $atomSize - 16;
        if ($payloadLength <= 0) {
            return null;
        }
        if ($isPicture) {
            if (!$wantBytes || $payloadLength > POZNOTE_AUDIO_COVER_MAX_BYTES) {
                return '';
            }
            return $read($payloadAt, $payloadLength);
        }

        $type = poznoteAudioUint32be(substr($header, 8, 4)) & 0x00FFFFFF;
        if ($type !== 1) {
            return null; // not UTF-8 text
        }
        return $read($payloadAt, min($payloadLength, POZNOTE_AUDIO_TEXT_MAX_BYTES));
    }

    return null;
}

// ---------------------------------------------------------------------------
// WAV: the RIFF INFO list
// ---------------------------------------------------------------------------

function poznoteAudioParseWav($handle, int $size): ?array
{
    $meta = poznoteAudioEmptyMetadata();
    $read = poznoteAudioFileReader($handle);
    $pos = 12;
    $fields = ['INAM' => 'title', 'IART' => 'artist', 'IPRD' => 'album'];

    for ($chunk = 0; $chunk < 256 && $pos + 8 <= $size; $chunk++) {
        $header = $read($pos, 8);
        if (strlen($header) < 8) {
            break;
        }
        $id = substr($header, 0, 4);
        $length = poznoteAudioUint32le(substr($header, 4, 4));
        if ($length < 0 || $pos + 8 + $length > $size) {
            break;
        }

        if ($id === 'LIST' && $length >= 4 && $length <= POZNOTE_AUDIO_TAG_READ_LIMIT) {
            $list = $read($pos + 8, $length);
            if (strncmp($list, 'INFO', 4) === 0) {
                $inner = 4;
                while ($inner + 8 <= strlen($list)) {
                    $innerId = substr($list, $inner, 4);
                    $innerLength = poznoteAudioUint32le(substr($list, $inner + 4, 4));
                    $inner += 8;
                    if ($innerLength <= 0 || $inner + $innerLength > strlen($list)) {
                        break;
                    }
                    $field = $fields[$innerId] ?? null;
                    if ($field !== null && $meta[$field] === '') {
                        $value = rtrim(substr($list, $inner, $innerLength), "\0");
                        $meta[$field] = poznoteAudioCleanTagValue(
                            poznoteAudioIsValidUtf8($value) ? $value : poznoteAudioLatin1ToUtf8($value)
                        );
                    }
                    $inner += $innerLength + ($innerLength % 2); // chunks are word-aligned
                }
            }
        }

        $pos += 8 + $length + ($length % 2);
    }

    return $meta;
}
