<?php
/**
 * Tags read out of audio files (src/lib/audio-metadata.php).
 *
 * Every file here is built byte by byte in the test: the suite ships no
 * binaries, and a handmade container is also the only way to pin down what
 * the parser does with the odd corners (an unsynchronised ID3 tag, a cover
 * that is not an image, a QuickTime "meta" atom without its version field).
 */

require_once __DIR__ . '/../src/lib/audio-metadata.php';

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

function audioTestSynchsafe(int $size): string
{
    return chr(($size >> 21) & 0x7F) . chr(($size >> 14) & 0x7F) . chr(($size >> 7) & 0x7F) . chr($size & 0x7F);
}

function audioTestUint32be(int $value): string
{
    return pack('N', $value);
}

function audioTestUint32le(int $value): string
{
    return pack('V', $value);
}

/** A one-pixel PNG, used wherever a test needs real picture bytes. */
function audioTestPngBytes(): string
{
    return base64_decode(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    );
}

/** An ID3v2.3 or 2.4 frame. */
function audioTestId3Frame(string $id, string $body, int $major = 3): string
{
    $size = $major >= 4 ? audioTestSynchsafe(strlen($body)) : audioTestUint32be(strlen($body));
    return $id . $size . "\x00\x00" . $body;
}

function audioTestId3Tag(string $frames, int $major = 3, int $flags = 0, int $padding = 0): string
{
    $body = $frames . str_repeat("\x00", $padding);
    return 'ID3' . chr($major) . "\x00" . chr($flags) . audioTestSynchsafe(strlen($body)) . $body;
}

function audioTestId3v1Tag(string $title, string $artist, string $album): string
{
    return 'TAG'
        . str_pad(substr($title, 0, 30), 30, "\0")
        . str_pad(substr($artist, 0, 30), 30, "\0")
        . str_pad(substr($album, 0, 30), 30, "\0")
        . str_repeat("\0", 4 + 30 + 1); // year, comment, genre
}

/** The picture payload of an APIC frame. */
function audioTestApicBody(string $mime, string $description, string $data): string
{
    return "\x00" . $mime . "\x00" . "\x03" . $description . "\x00" . $data;
}

function audioTestFlacBlock(int $type, string $body, bool $last = false): string
{
    $header = chr(($last ? 0x80 : 0) | $type) . substr(audioTestUint32be(strlen($body)), 1, 3);
    return $header . $body;
}

/** A Vorbis comment payload: vendor string then KEY=value entries. */
function audioTestVorbisComments(array $entries, string $vendor = 'poznote-test'): string
{
    $body = audioTestUint32le(strlen($vendor)) . $vendor . audioTestUint32le(count($entries));
    foreach ($entries as $entry) {
        $body .= audioTestUint32le(strlen($entry)) . $entry;
    }
    return $body;
}

function audioTestFlacPictureBlock(string $mime, string $data): string
{
    return audioTestUint32be(3)
        . audioTestUint32be(strlen($mime)) . $mime
        . audioTestUint32be(0) . ''
        . audioTestUint32be(1) . audioTestUint32be(1) . audioTestUint32be(24) . audioTestUint32be(0)
        . audioTestUint32be(strlen($data)) . $data;
}

/** One Ogg page carrying a whole packet. */
function audioTestOggPage(string $payload, int $sequence): string
{
    $segments = [];
    $remaining = strlen($payload);
    while ($remaining >= 255) {
        $segments[] = 255;
        $remaining -= 255;
    }
    $segments[] = $remaining;

    $header = 'OggS' . "\x00" . "\x00"
        . str_repeat("\x00", 8)
        . audioTestUint32le(1)
        . audioTestUint32le($sequence)
        . audioTestUint32le(0)
        . chr(count($segments));
    foreach ($segments as $segment) {
        $header .= chr($segment);
    }
    return $header . $payload;
}

function audioTestMp4Atom(string $name, string $body): string
{
    return audioTestUint32be(8 + strlen($body)) . $name . $body;
}

function audioTestMp4TextItem(string $name, string $value): string
{
    $data = audioTestUint32be(1) . audioTestUint32be(0) . $value;
    return audioTestMp4Atom($name, audioTestMp4Atom('data', $data));
}

function audioTestMp4CoverItem(string $data, int $type = 14): string
{
    $body = audioTestUint32be($type) . audioTestUint32be(0) . $data;
    return audioTestMp4Atom('covr', audioTestMp4Atom('data', $body));
}

function audioTestWavChunk(string $id, string $body): string
{
    $padded = $body . (strlen($body) % 2 === 1 ? "\0" : '');
    return $id . audioTestUint32le(strlen($body)) . $padded;
}

/** Write bytes to a scratch file and hand the path to the body. */
function audioTestWithFile(string $bytes, callable $body): void
{
    $path = tempnam(sys_get_temp_dir(), 'pozaudio_');
    file_put_contents($path, $bytes);
    try {
        $body($path);
    } finally {
        @unlink($path);
    }
}

// ---------------------------------------------------------------------------
// ID3v2
// ---------------------------------------------------------------------------

test('ID3v2.3: title, artist and album', function () {
    $frames = audioTestId3Frame('TIT2', "\x00" . 'Supersonic')
        . audioTestId3Frame('TPE1', "\x00" . 'Skrillex')
        . audioTestId3Frame('TALB', "\x00" . 'Quest For Fire');
    audioTestWithFile(audioTestId3Tag($frames) . str_repeat("\xFF", 64), function ($path) {
        $meta = poznoteAudioMetadata($path);
        assertSame('Supersonic', $meta['title']);
        assertSame('Skrillex', $meta['artist']);
        assertSame('Quest For Fire', $meta['album']);
        assertSame(false, $meta['has_cover']);
    });
});

test('ID3v2.3: UTF-16 text with a byte order mark', function () {
    $utf16 = "\xFF\xFE" . mb_convert_encoding('Été à Paris', 'UTF-16LE', 'UTF-8');
    $frames = audioTestId3Frame('TIT2', "\x01" . $utf16);
    audioTestWithFile(audioTestId3Tag($frames), function ($path) {
        assertSame('Été à Paris', poznoteAudioMetadata($path)['title']);
    });
});

test('ID3v2.3: Latin-1 text becomes UTF-8', function () {
    $frames = audioTestId3Frame('TIT2', "\x00" . "Caf\xE9");
    audioTestWithFile(audioTestId3Tag($frames), function ($path) {
        assertSame('Café', poznoteAudioMetadata($path)['title']);
    });
});

test('ID3v2.4: synchsafe frame sizes and UTF-8 text', function () {
    $frames = audioTestId3Frame('TIT2', "\x03" . 'Ocean Drive', 4)
        . audioTestId3Frame('TPE1', "\x03" . 'Duke Dumont', 4);
    audioTestWithFile(audioTestId3Tag($frames, 4), function ($path) {
        $meta = poznoteAudioMetadata($path);
        assertSame('Ocean Drive', $meta['title']);
        assertSame('Duke Dumont', $meta['artist']);
    });
});

test('ID3v2.2: three-character frame ids', function () {
    $body = "\x00" . 'Blue Monday';
    $frames = 'TT2' . substr(audioTestUint32be(strlen($body)), 1, 3) . $body;
    $artist = "\x00" . 'New Order';
    $frames .= 'TP1' . substr(audioTestUint32be(strlen($artist)), 1, 3) . $artist;
    audioTestWithFile(audioTestId3Tag($frames, 2), function ($path) {
        $meta = poznoteAudioMetadata($path);
        assertSame('Blue Monday', $meta['title']);
        assertSame('New Order', $meta['artist']);
    });
});

test('ID3v2: padding after the frames stops the walk', function () {
    $frames = audioTestId3Frame('TIT2', "\x00" . 'Padded');
    audioTestWithFile(audioTestId3Tag($frames, 3, 0, 512), function ($path) {
        assertSame('Padded', poznoteAudioMetadata($path)['title']);
    });
});

test('ID3v2: an APIC picture is announced and read only when asked for', function () {
    $png = audioTestPngBytes();
    $frames = audioTestId3Frame('TIT2', "\x00" . 'With cover')
        . audioTestId3Frame('APIC', audioTestApicBody('image/png', 'Front', $png));
    audioTestWithFile(audioTestId3Tag($frames), function ($path) use ($png) {
        $meta = poznoteAudioMetadata($path);
        assertSame(true, $meta['has_cover']);
        assertSame(null, $meta['cover']);

        $cover = poznoteAudioCoverArt($path);
        assertSame('image/png', $cover['mime']);
        assertSame($png, $cover['data']);
    });
});

test('ID3v2: a picture frame holding something else is refused', function () {
    $frames = audioTestId3Frame('APIC', audioTestApicBody('image/png', '', 'not an image at all'));
    audioTestWithFile(audioTestId3Tag($frames), function ($path) {
        assertSame(true, poznoteAudioMetadata($path)['has_cover']);
        assertSame(null, poznoteAudioCoverArt($path));
    });
});

test('ID3v2: a picture whose bytes are a JPEG is served as one, whatever the tag says', function () {
    $jpeg = "\xFF\xD8\xFF\xE0" . str_repeat("\x20", 32);
    $frames = audioTestId3Frame('APIC', audioTestApicBody('image/png', '', $jpeg));
    audioTestWithFile(audioTestId3Tag($frames), function ($path) {
        assertSame('image/jpeg', poznoteAudioCoverArt($path)['mime']);
    });
});

test('ID3v2: an unsynchronised tag is put back together before it is read', function () {
    $frames = audioTestId3Frame('TIT2', "\x00" . 'Unsync');
    $tag = audioTestId3Tag($frames);
    // Unsynchronise the frame area: every 0xFF gains a 0x00 after it.
    $body = str_replace("\xFF", "\xFF\x00", substr($tag, 10));
    $unsynced = 'ID3' . "\x03\x00" . chr(0x80) . audioTestSynchsafe(strlen($body)) . $body;
    audioTestWithFile($unsynced, function ($path) {
        assertSame('Unsync', poznoteAudioMetadata($path)['title']);
    });
});

test('ID3v1 fills in what ID3v2 did not say', function () {
    $frames = audioTestId3Frame('TIT2', "\x00" . 'From v2');
    $file = audioTestId3Tag($frames) . str_repeat("\x00", 256) . audioTestId3v1Tag('From v1', 'Artist v1', 'Album v1');
    audioTestWithFile($file, function ($path) {
        $meta = poznoteAudioMetadata($path);
        assertSame('From v2', $meta['title']);
        assertSame('Artist v1', $meta['artist']);
        assertSame('Album v1', $meta['album']);
    });
});

test('ID3v1 alone is still read', function () {
    audioTestWithFile(str_repeat("\x00", 512) . audioTestId3v1Tag('Only v1', 'Someone', ''), function ($path) {
        $meta = poznoteAudioMetadata($path);
        assertSame('Only v1', $meta['title']);
        assertSame('Someone', $meta['artist']);
        assertSame('', $meta['album']);
    });
});

// ---------------------------------------------------------------------------
// FLAC
// ---------------------------------------------------------------------------

test('FLAC: Vorbis comments and a PICTURE block', function () {
    $png = audioTestPngBytes();
    $file = 'fLaC'
        . audioTestFlacBlock(0, str_repeat("\x00", 34))
        . audioTestFlacBlock(4, audioTestVorbisComments(['TITLE=Nightcall', 'ARTIST=Kavinsky', 'ALBUM=OutRun']))
        . audioTestFlacBlock(6, audioTestFlacPictureBlock('image/png', $png), true);
    audioTestWithFile($file, function ($path) use ($png) {
        $meta = poznoteAudioMetadata($path);
        assertSame('Nightcall', $meta['title']);
        assertSame('Kavinsky', $meta['artist']);
        assertSame('OutRun', $meta['album']);
        assertSame(true, $meta['has_cover']);
        assertSame($png, poznoteAudioCoverArt($path)['data']);
    });
});

test('FLAC: comment keys are matched whatever their case', function () {
    $file = 'fLaC' . audioTestFlacBlock(4, audioTestVorbisComments(['title=Lowercase', 'Artist=Mixed']), true);
    audioTestWithFile($file, function ($path) {
        $meta = poznoteAudioMetadata($path);
        assertSame('Lowercase', $meta['title']);
        assertSame('Mixed', $meta['artist']);
    });
});

// ---------------------------------------------------------------------------
// Ogg
// ---------------------------------------------------------------------------

test('Ogg Opus: OpusTags on the second page', function () {
    $file = audioTestOggPage('OpusHead' . str_repeat("\x00", 11), 0)
        . audioTestOggPage('OpusTags' . audioTestVorbisComments(['TITLE=Voice note', 'ARTIST=Me']), 1);
    audioTestWithFile($file, function ($path) {
        $meta = poznoteAudioMetadata($path);
        assertSame('Voice note', $meta['title']);
        assertSame('Me', $meta['artist']);
    });
});

test('Ogg Vorbis: the comment packet is read', function () {
    $file = audioTestOggPage("\x01vorbis" . str_repeat("\x00", 23), 0)
        . audioTestOggPage("\x03vorbis" . audioTestVorbisComments(['TITLE=Sous le ciel', 'ALBUM=Paris']), 1);
    audioTestWithFile($file, function ($path) {
        $meta = poznoteAudioMetadata($path);
        assertSame('Sous le ciel', $meta['title']);
        assertSame('Paris', $meta['album']);
    });
});

test('Ogg: a base64 METADATA_BLOCK_PICTURE is a cover', function () {
    $png = audioTestPngBytes();
    $picture = base64_encode(audioTestFlacPictureBlock('image/png', $png));
    $file = audioTestOggPage('OpusHead' . str_repeat("\x00", 11), 0)
        . audioTestOggPage('OpusTags' . audioTestVorbisComments(['TITLE=Cover', 'METADATA_BLOCK_PICTURE=' . $picture]), 1);
    audioTestWithFile($file, function ($path) use ($png) {
        assertSame(true, poznoteAudioMetadata($path)['has_cover']);
        assertSame($png, poznoteAudioCoverArt($path)['data']);
    });
});

// ---------------------------------------------------------------------------
// MP4 / M4A
// ---------------------------------------------------------------------------

test('MP4: iTunes text items and cover art', function () {
    $png = audioTestPngBytes();
    $ilst = audioTestMp4Atom('ilst',
        audioTestMp4TextItem("\xA9nam", 'Supersonic (my existence)')
        . audioTestMp4TextItem("\xA9ART", 'Skrillex, Noisia')
        . audioTestMp4TextItem("\xA9alb", 'Quest For Fire')
        . audioTestMp4CoverItem($png)
    );
    $meta = audioTestMp4Atom('meta', "\x00\x00\x00\x00" . audioTestMp4Atom('hdlr', str_repeat("\x00", 24)) . $ilst);
    $file = audioTestMp4Atom('ftyp', 'M4A ' . str_repeat("\x00", 12))
        . audioTestMp4Atom('moov', audioTestMp4Atom('udta', $meta));

    audioTestWithFile($file, function ($path) use ($png) {
        $parsed = poznoteAudioMetadata($path);
        assertSame('Supersonic (my existence)', $parsed['title']);
        assertSame('Skrillex, Noisia', $parsed['artist']);
        assertSame('Quest For Fire', $parsed['album']);
        assertSame(true, $parsed['has_cover']);
        assertSame($png, poznoteAudioCoverArt($path)['data']);
    });
});

test('MP4: a QuickTime "meta" without version bytes is still read', function () {
    $ilst = audioTestMp4Atom('ilst', audioTestMp4TextItem("\xA9nam", 'No version field'));
    $meta = audioTestMp4Atom('meta', audioTestMp4Atom('hdlr', str_repeat("\x00", 24)) . $ilst);
    $file = audioTestMp4Atom('ftyp', 'qt  ' . str_repeat("\x00", 12))
        . audioTestMp4Atom('moov', audioTestMp4Atom('udta', $meta));

    audioTestWithFile($file, function ($path) {
        assertSame('No version field', poznoteAudioMetadata($path)['title']);
    });
});

test('MP4: a text item that is not UTF-8 typed is skipped', function () {
    $data = audioTestUint32be(0) . audioTestUint32be(0) . 'binary';
    $ilst = audioTestMp4Atom('ilst', audioTestMp4Atom("\xA9nam", audioTestMp4Atom('data', $data)));
    $meta = audioTestMp4Atom('meta', "\x00\x00\x00\x00" . $ilst);
    $file = audioTestMp4Atom('ftyp', 'M4A ' . str_repeat("\x00", 12))
        . audioTestMp4Atom('moov', audioTestMp4Atom('udta', $meta));

    audioTestWithFile($file, function ($path) {
        assertSame('', poznoteAudioMetadata($path)['title']);
    });
});

// ---------------------------------------------------------------------------
// WAV
// ---------------------------------------------------------------------------

test('WAV: the RIFF INFO list', function () {
    $info = 'INFO'
        . audioTestWavChunk('INAM', "Memo 3\0")
        . audioTestWavChunk('IART', "Recorder\0");
    $body = 'WAVE' . audioTestWavChunk('fmt ', str_repeat("\x00", 16)) . audioTestWavChunk('LIST', $info);
    $file = 'RIFF' . audioTestUint32le(strlen($body)) . $body;

    audioTestWithFile($file, function ($path) {
        $meta = poznoteAudioMetadata($path);
        assertSame('Memo 3', $meta['title']);
        assertSame('Recorder', $meta['artist']);
    });
});

// ---------------------------------------------------------------------------
// Files with nothing to say
// ---------------------------------------------------------------------------

test('A file with no tags gives empty values, not an error', function () {
    audioTestWithFile(str_repeat("\xFF\xFB", 2048), function ($path) {
        $meta = poznoteAudioMetadata($path);
        assertSame('', $meta['title']);
        assertSame('', $meta['artist']);
        assertSame('', $meta['album']);
        assertSame(false, $meta['has_cover']);
        assertSame(null, $meta['cover']);
    });
});

test('A missing file gives empty values', function () {
    $meta = poznoteAudioMetadata('/nonexistent/poznote/audio.mp3');
    assertSame('', $meta['title']);
    assertSame(false, $meta['has_cover']);
});

test('A truncated ID3 header does not throw', function () {
    audioTestWithFile('ID3' . "\x03\x00\x00", function ($path) {
        assertSame('', poznoteAudioMetadata($path)['title']);
    });
});

test('A tag value is cut to a readable length', function () {
    $frames = audioTestId3Frame('TIT2', "\x00" . str_repeat('a', 500));
    audioTestWithFile(audioTestId3Tag($frames), function ($path) {
        assertSame(POZNOTE_AUDIO_TEXT_MAX_CHARS, mb_strlen(poznoteAudioMetadata($path)['title'], 'UTF-8'));
    });
});

test('Control characters and runs of spaces are squeezed out of a tag', function () {
    $frames = audioTestId3Frame('TIT2', "\x00" . "  Tabbed\ttitle \x01 here  ");
    audioTestWithFile(audioTestId3Tag($frames), function ($path) {
        assertSame('Tabbed title here', poznoteAudioMetadata($path)['title']);
    });
});

test('Only known containers are offered to the parser', function () {
    audioTestWithFile(audioTestId3Tag(audioTestId3Frame('TIT2', "\x00" . 'x')), function ($path) {
        assertSame(true, poznoteAudioMetadataSupportsFile($path));
    });
    audioTestWithFile("\x1A\x45\xDF\xA3" . str_repeat("\x00", 64), function ($path) {
        assertSame(false, poznoteAudioMetadataSupportsFile($path));
    });
});
