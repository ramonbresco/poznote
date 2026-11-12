<?php
/**
 * poznoteParseRangeHeader(): what the attachment endpoint answers a browser
 * that asks for the middle of a file (moving the playhead of a recording it
 * has not finished downloading, resuming a large download).
 */

require_once __DIR__ . '/../src/lib/attachments.php';

const RANGE_TEST_SIZE = 1000;

test('a Range header that is absent or empty asks for the whole body', function () {
    assertSame(null, poznoteParseRangeHeader(null, RANGE_TEST_SIZE));
    assertSame(null, poznoteParseRangeHeader('', RANGE_TEST_SIZE));
    assertSame(null, poznoteParseRangeHeader('   ', RANGE_TEST_SIZE));
});

test('a Range this server cannot read is ignored, not refused', function () {
    // RFC 7233: an unreadable Range must be treated as absent.
    assertSame(null, poznoteParseRangeHeader('items=0-10', RANGE_TEST_SIZE), 'unknown unit');
    assertSame(null, poznoteParseRangeHeader('bytes', RANGE_TEST_SIZE), 'no range at all');
    assertSame(null, poznoteParseRangeHeader('bytes=', RANGE_TEST_SIZE), 'empty range');
    assertSame(null, poznoteParseRangeHeader('bytes=abc-def', RANGE_TEST_SIZE), 'not numbers');
    assertSame(null, poznoteParseRangeHeader('bytes=10', RANGE_TEST_SIZE), 'no dash');
    assertSame(null, poznoteParseRangeHeader('bytes=200-100', RANGE_TEST_SIZE), 'inverted');
});

test('several ranges at once are answered with the whole body', function () {
    // Legal, and no media element ever asks for it.
    assertSame(null, poznoteParseRangeHeader('bytes=0-10,20-30', RANGE_TEST_SIZE));
});

test('a closed range is taken as written', function () {
    assertSame(
        ['start' => 0, 'end' => 99, 'length' => 100],
        poznoteParseRangeHeader('bytes=0-99', RANGE_TEST_SIZE)
    );
    assertSame(
        ['start' => 400, 'end' => 599, 'length' => 200],
        poznoteParseRangeHeader('bytes=400-599', RANGE_TEST_SIZE)
    );
});

test('an open range runs to the last byte', function () {
    assertSame(
        ['start' => 500, 'end' => 999, 'length' => 500],
        poznoteParseRangeHeader('bytes=500-', RANGE_TEST_SIZE)
    );
});

test('a suffix range counts back from the end', function () {
    assertSame(
        ['start' => 900, 'end' => 999, 'length' => 100],
        poznoteParseRangeHeader('bytes=-100', RANGE_TEST_SIZE)
    );
    assertSame(
        ['start' => 0, 'end' => 999, 'length' => 1000],
        poznoteParseRangeHeader('bytes=-5000', RANGE_TEST_SIZE),
        'a suffix longer than the file is the whole file'
    );
});

test('an end past the last byte is clamped', function () {
    assertSame(
        ['start' => 10, 'end' => 999, 'length' => 990],
        poznoteParseRangeHeader('bytes=10-5000', RANGE_TEST_SIZE)
    );
});

test('a single byte is a range of one', function () {
    assertSame(['start' => 0, 'end' => 0, 'length' => 1], poznoteParseRangeHeader('bytes=0-0', RANGE_TEST_SIZE));
    assertSame(['start' => 999, 'end' => 999, 'length' => 1], poznoteParseRangeHeader('bytes=999-999', RANGE_TEST_SIZE));
});

test('the unit and the spacing are read loosely', function () {
    assertSame(
        ['start' => 0, 'end' => 99, 'length' => 100],
        poznoteParseRangeHeader('BYTES=0-99', RANGE_TEST_SIZE)
    );
    assertSame(
        ['start' => 0, 'end' => 99, 'length' => 100],
        poznoteParseRangeHeader(' bytes= 0 - 99 ', RANGE_TEST_SIZE)
    );
});

test('a range outside the file is unsatisfiable, so the caller answers 416', function () {
    assertSame(false, poznoteParseRangeHeader('bytes=1000-', RANGE_TEST_SIZE), 'start at the size');
    assertSame(false, poznoteParseRangeHeader('bytes=5000-6000', RANGE_TEST_SIZE), 'start past the end');
    assertSame(false, poznoteParseRangeHeader('bytes=-0', RANGE_TEST_SIZE), 'zero bytes from the end');
});

test('a body of zero or unknown length is never ranged', function () {
    assertSame(null, poznoteParseRangeHeader('bytes=0-10', 0));
    assertSame(null, poznoteParseRangeHeader('bytes=0-10', -1));
});

test('a one-byte file, the smallest the maths has to hold', function () {
    assertSame(['start' => 0, 'end' => 0, 'length' => 1], poznoteParseRangeHeader('bytes=0-', 1));
    assertSame(false, poznoteParseRangeHeader('bytes=1-', 1), 'past the only byte');
});

// ---------------------------------------------------------------------------
// If-Range: a resumed download must not glue two different files together
// ---------------------------------------------------------------------------

const RANGE_TEST_ETAG = '"abc123"';
const RANGE_TEST_MTIME = 1762905600;

test('without If-Range the Range stands', function () {
    assertSame(true, poznoteIfRangeAllowsRange(null, RANGE_TEST_ETAG, RANGE_TEST_MTIME));
    assertSame(true, poznoteIfRangeAllowsRange('  ', RANGE_TEST_ETAG, RANGE_TEST_MTIME));
});

test('If-Range with the current entity tag keeps the Range', function () {
    assertSame(true, poznoteIfRangeAllowsRange('"abc123"', RANGE_TEST_ETAG, RANGE_TEST_MTIME));
});

test('If-Range with another entity tag drops the Range', function () {
    assertSame(false, poznoteIfRangeAllowsRange('"other"', RANGE_TEST_ETAG, RANGE_TEST_MTIME));
    // Strong comparison: a weak tag never matches, even with the same value.
    assertSame(false, poznoteIfRangeAllowsRange('W/"abc123"', RANGE_TEST_ETAG, RANGE_TEST_MTIME));
});

test('If-Range with a date keeps the Range only for the exact Last-Modified', function () {
    $sent = gmdate('D, d M Y H:i:s', RANGE_TEST_MTIME) . ' GMT';
    assertSame(true, poznoteIfRangeAllowsRange($sent, RANGE_TEST_ETAG, RANGE_TEST_MTIME));

    $earlier = gmdate('D, d M Y H:i:s', RANGE_TEST_MTIME - 60) . ' GMT';
    $later = gmdate('D, d M Y H:i:s', RANGE_TEST_MTIME + 60) . ' GMT';
    assertSame(false, poznoteIfRangeAllowsRange($earlier, RANGE_TEST_ETAG, RANGE_TEST_MTIME), 'the file changed since');
    assertSame(false, poznoteIfRangeAllowsRange($later, RANGE_TEST_ETAG, RANGE_TEST_MTIME), 'not the date that was sent');
});

test('an If-Range nobody can read drops the Range rather than trusting it', function () {
    assertSame(false, poznoteIfRangeAllowsRange('not a validator', RANGE_TEST_ETAG, RANGE_TEST_MTIME));
    assertSame(false, poznoteIfRangeAllowsRange('"abc123"', '', RANGE_TEST_MTIME), 'no tag to compare with');
});
