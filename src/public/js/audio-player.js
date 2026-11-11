/**
 * The audio player of a note: what lib/audio-player.php renders, made to work.
 *
 * The shell comes from the server (play button, cover, title, an empty track);
 * this adds playback, seeking and the waveform. The waveform is the one thing
 * only the browser can produce: peaks are the samples themselves, and nothing
 * in the Docker image can decode an MP3, so the file is decoded here, once,
 * and the peaks are kept in this browser (localStorage) so the next read of
 * the note draws them without downloading anything.
 *
 * Decoding costs a download and a lot of memory, so it is rationed:
 *   - a file up to EAGER_MAX_BYTES (a voice note, which is what a waveform is
 *     most useful for) is read as soon as the player is on screen;
 *   - a larger one up to DEMAND_MAX_BYTES waits for the first play, by which
 *     point the browser is fetching the bytes anyway;
 *   - anything above that keeps the plain bar, for ever.
 * Decoding happens in an OfflineAudioContext at 8 kHz: decodeAudioData
 * resamples to the context's rate, which is what keeps an hour-long recording
 * from turning into a gigabyte of floats.
 */
(function () {
    'use strict';

    var EAGER_MAX_BYTES = 4 * 1024 * 1024;
    var DEMAND_MAX_BYTES = 25 * 1024 * 1024;
    var PEAK_RESOLUTION = 128;      // peaks stored per file, downsampled to the bars drawn
    var BAR_PITCH = 5;              // one bar plus its gap, in px
    var MIN_BAR_HEIGHT = 10;        // percent, so silence is still a line
    var DECODE_SAMPLE_RATE = 8000;
    var STORAGE_PREFIX = 'poznote-audio-peaks:';
    var STORAGE_MAX_ENTRIES = 400;
    var VOLUME_KEY = 'poznote-audio-volume';
    var SPEEDS = [1, 1.25, 1.5, 2, 0.75];

    var pending = Object.create(null);

    function storage() {
        try {
            return window.localStorage;
        } catch (e) {
            return null;
        }
    }

    /** The address of a file, without what only says who is asking for it. */
    function peakKey(root, src) {
        var path = src;
        try {
            path = new URL(src, window.location.href).pathname;
        } catch (e) {
            path = String(src || '').split('?')[0];
        }
        return STORAGE_PREFIX + path + ':' + (root.getAttribute('data-size') || '');
    }

    function readStoredPeaks(key) {
        var store = storage();
        if (!store) return null;
        var raw;
        try {
            raw = store.getItem(key);
        } catch (e) {
            return null;
        }
        if (!raw || raw.length < 8) return null;
        var peaks = [];
        for (var i = 0; i < raw.length; i++) {
            var value = parseInt(raw[i], 36);
            if (isNaN(value)) return null;
            peaks.push(value / 35);
        }
        return peaks;
    }

    function writeStoredPeaks(key, peaks) {
        var store = storage();
        if (!store) return;
        var raw = '';
        for (var i = 0; i < peaks.length; i++) {
            raw += Math.max(0, Math.min(35, Math.round(peaks[i] * 35))).toString(36);
        }
        try {
            store.setItem(key, raw);
        } catch (e) {
            // Out of room: the peaks of other files are the only thing in here
            // worth dropping, and they can all be computed again.
            prunePeaks(store);
            try {
                store.setItem(key, raw);
            } catch (ignored) {
                // Nothing to do: the waveform is simply computed again next time.
            }
        }
    }

    function prunePeaks(store) {
        var keys = [];
        try {
            for (var i = 0; i < store.length; i++) {
                var name = store.key(i);
                if (name && name.indexOf(STORAGE_PREFIX) === 0) keys.push(name);
            }
            for (var j = 0; j < keys.length; j++) {
                store.removeItem(keys[j]);
            }
        } catch (e) {
            // A storage that refuses to be read is one that holds nothing of ours.
        }
        return keys.length > STORAGE_MAX_ENTRIES;
    }

    /* One volume for every player in this browser, kept between notes: set it
       once for a quiet recording and the next one opens where you left it.
       A level of 0 is muted; the level to come back to is remembered with it,
       because unmuting back to silence would look like a broken button. */
    function readVolume() {
        var store = storage();
        var raw = null;
        try {
            raw = store ? store.getItem(VOLUME_KEY) : null;
        } catch (e) {
            raw = null;
        }
        var value = parseFloat(raw);
        if (!isFinite(value) || value < 0 || value > 1) return 1;
        return value;
    }

    function writeVolume(value) {
        var store = storage();
        if (!store) return;
        try {
            store.setItem(VOLUME_KEY, String(value));
        } catch (e) {
            // A full or blocked store only costs this browser the memory.
        }
    }

    function formatTime(seconds) {
        if (!isFinite(seconds) || seconds < 0) seconds = 0;
        var total = Math.floor(seconds);
        var hours = Math.floor(total / 3600);
        var minutes = Math.floor((total % 3600) / 60);
        var secs = total % 60;
        if (hours > 0) {
            return hours + ':' + String(minutes).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
        }
        return minutes + ':' + String(secs).padStart(2, '0');
    }

    // --- Waveform ----------------------------------------------------------

    function barCount(track) {
        var width = track.clientWidth || track.getBoundingClientRect().width || 0;
        if (!width) return 0;
        return Math.max(8, Math.min(PEAK_RESOLUTION, Math.floor(width / BAR_PITCH)));
    }

    /* A file that carries a title, an artist or cover art shows a progress
       line, not a waveform: the words take the room the bars would need, and
       a line is what the second mockup of the issue asks for. It also spares
       the download, since peaks can only be had by decoding the whole file. */
    function isLineOnly(root) {
        return root.classList.contains('pz-audio-tagged');
    }

    function drawWave(state) {
        if (state.lineOnly) {
            state.track.classList.add('is-plain');
            return;
        }
        var peaks = state.peaks;
        var count = barCount(state.track);
        if (!peaks || !count) return;
        if (state.drawnCount === count) return;
        state.drawnCount = count;

        var waves = state.track.querySelectorAll('.pz-audio-wave');
        for (var w = 0; w < waves.length; w++) {
            var wave = waves[w];
            wave.textContent = '';
            var fragment = document.createDocumentFragment();
            for (var i = 0; i < count; i++) {
                var from = Math.floor((i * peaks.length) / count);
                var to = Math.max(from + 1, Math.floor(((i + 1) * peaks.length) / count));
                var peak = 0;
                for (var p = from; p < to && p < peaks.length; p++) {
                    if (peaks[p] > peak) peak = peaks[p];
                }
                var bar = document.createElement('span');
                bar.className = 'pz-audio-bar';
                bar.style.height = Math.max(MIN_BAR_HEIGHT, Math.round(peak * 100)) + '%';
                fragment.appendChild(bar);
            }
            wave.appendChild(fragment);
        }
        state.track.classList.remove('is-plain');
    }

    function decodeBuffer(buffer) {
        var Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        if (!Ctx) return Promise.reject(new Error('no audio context'));
        var context;
        try {
            context = new Ctx(1, 1, DECODE_SAMPLE_RATE);
        } catch (e) {
            return Promise.reject(e);
        }
        return new Promise(function (resolve, reject) {
            var decoded = context.decodeAudioData(buffer, resolve, reject);
            // Safari's callback form returns nothing; everywhere else this is
            // the promise that settles.
            if (decoded && typeof decoded.then === 'function') {
                decoded.then(resolve, reject);
            }
        });
    }

    function peaksFromAudioBuffer(audioBuffer) {
        var channels = Math.min(2, audioBuffer.numberOfChannels);
        var length = audioBuffer.length;
        if (!length) return null;
        var peaks = Array.from({ length: PEAK_RESOLUTION });
        var highest = 0;

        for (var i = 0; i < PEAK_RESOLUTION; i++) peaks[i] = 0;
        for (var c = 0; c < channels; c++) {
            var data = audioBuffer.getChannelData(c);
            for (var s = 0; s < length; s++) {
                var slot = Math.floor((s / length) * PEAK_RESOLUTION);
                var value = data[s];
                if (value < 0) value = -value;
                if (value > peaks[slot]) peaks[slot] = value;
            }
        }
        for (var k = 0; k < PEAK_RESOLUTION; k++) {
            if (peaks[k] > highest) highest = peaks[k];
        }
        if (highest <= 0) return null;
        for (var n = 0; n < PEAK_RESOLUTION; n++) {
            peaks[n] = peaks[n] / highest;
        }
        return peaks;
    }

    function loadPeaks(state, limit) {
        if (state.lineOnly) return;
        if (state.peaks || state.peaksFailed || state.peaksLoading) return;
        var size = parseInt(state.root.getAttribute('data-size') || '0', 10) || 0;
        if (size && size > limit) return;

        var key = state.peakKey;
        if (pending[key]) {
            pending[key].then(function (peaks) {
                if (peaks) {
                    state.peaks = peaks;
                    drawWave(state);
                }
            });
            return;
        }

        state.peaksLoading = true;
        var request = fetch(state.audio.currentSrc || state.audio.src, { credentials: 'same-origin' })
            .then(function (response) {
                if (!response.ok) throw new Error('http ' + response.status);
                var length = parseInt(response.headers.get('content-length') || '0', 10) || 0;
                if (length > limit) {
                    if (response.body && response.body.cancel) response.body.cancel();
                    throw new Error('too large');
                }
                return response.arrayBuffer();
            })
            .then(decodeBuffer)
            .then(function (audioBuffer) {
                var peaks = peaksFromAudioBuffer(audioBuffer);
                if (!peaks) throw new Error('silent');
                writeStoredPeaks(key, peaks);
                return peaks;
            })
            .catch(function () {
                return null;
            })
            .then(function (peaks) {
                delete pending[key];
                state.peaksLoading = false;
                if (!peaks) {
                    state.peaksFailed = true;
                    return null;
                }
                state.peaks = peaks;
                drawWave(state);
                return peaks;
            });

        pending[key] = request;
    }

    // --- Playback ----------------------------------------------------------

    function setProgress(state) {
        var audio = state.audio;
        var duration = isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
        var ratio = duration ? Math.min(1, Math.max(0, audio.currentTime / duration)) : 0;
        state.root.style.setProperty('--pz-audio-progress', (ratio * 100).toFixed(2) + '%');
        // Always "where we are / how long it is", at rest as well as while it
        // plays, so the number never changes meaning under the reader. A
        // player too narrow for both keeps the length and drops the position
        // (@container), the position being the thing the bar already shows.
        state.elapsed.textContent = formatTime(audio.currentTime);
        state.total.textContent = duration ? formatTime(duration) : '';
        state.track.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
        state.track.setAttribute('aria-valuetext', formatTime(audio.currentTime));
    }

    function pauseOthers(state) {
        var players = document.querySelectorAll('[data-pz-audio] .pz-audio-el');
        for (var i = 0; i < players.length; i++) {
            if (players[i] !== state.audio && !players[i].paused) players[i].pause();
        }
    }

    function seekToPointer(state, event) {
        var rect = state.track.getBoundingClientRect();
        if (!rect.width) return;
        var ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
        var duration = state.audio.duration;
        if (!isFinite(duration) || duration <= 0) return;
        state.audio.currentTime = ratio * duration;
        setProgress(state);
    }

    function nudge(state, seconds) {
        var duration = state.audio.duration;
        if (!isFinite(duration) || duration <= 0) return;
        state.audio.currentTime = Math.min(duration, Math.max(0, state.audio.currentTime + seconds));
        setProgress(state);
    }

    function wire(root) {
        if (root.getAttribute('data-pz-audio-ready') === '1') return;
        var audio = root.querySelector('.pz-audio-el');
        var track = root.querySelector('.pz-audio-track');
        var playButton = root.querySelector('.pz-audio-play');
        if (!audio || !track || !playButton) return;
        root.setAttribute('data-pz-audio-ready', '1');

        var state = {
            root: root,
            audio: audio,
            track: track,
            elapsed: root.querySelector('.pz-audio-elapsed'),
            total: root.querySelector('.pz-audio-total'),
            lineOnly: isLineOnly(root),
            peaks: null,
            peaksLoading: false,
            peaksFailed: false,
            drawnCount: 0,
            speedIndex: 0
        };
        state.peakKey = peakKey(root, audio.getAttribute('src') || '');

        // A cover that cannot be fetched leaves the player as an untagged one
        // rather than a broken image.
        var cover = root.querySelector('.pz-audio-cover');
        if (cover) {
            cover.addEventListener('error', function () {
                cover.remove();
                // The button wears the cover, so without one it goes back to
                // being the plain accent square rather than an empty hole.
                root.classList.remove('pz-audio-has-cover');
            });
        }

        playButton.addEventListener('click', function () {
            if (audio.paused) {
                pauseOthers(state);
                var played = audio.play();
                if (played && typeof played.catch === 'function') {
                    played.catch(function () {
                        root.classList.add('is-error');
                    });
                }
                loadPeaks(state, DEMAND_MAX_BYTES);
            } else {
                audio.pause();
            }
        });

        var volumeBox = root.querySelector('.pz-audio-volume');
        var volumeSlider = root.querySelector('.pz-audio-volume-slider');
        var volumeButton = root.querySelector('.pz-audio-volume-btn');
        if (volumeBox && volumeSlider && volumeButton) {
            var lastHeard = 1;
            var paintVolume = function () {
                var level = audio.volume;
                volumeSlider.value = String(Math.round(level * 100));
                volumeBox.classList.toggle('is-muted', level === 0);
                var label = root.getAttribute(level === 0 ? 'data-label-unmute' : 'data-label-mute') || '';
                volumeButton.setAttribute('aria-label', label);
                volumeButton.setAttribute('title', label);
            };
            audio.volume = readVolume();
            if (audio.volume > 0) lastHeard = audio.volume;
            paintVolume();

            volumeSlider.addEventListener('input', function () {
                var level = Math.max(0, Math.min(100, parseInt(volumeSlider.value, 10) || 0)) / 100;
                audio.volume = level;
                if (level > 0) lastHeard = level;
                writeVolume(level);
                paintVolume();
            });

            volumeButton.addEventListener('click', function () {
                var level = audio.volume === 0 ? (lastHeard || 1) : 0;
                audio.volume = level;
                writeVolume(level);
                paintVolume();
            });

            // Another player on the page may have changed it since.
            audio.addEventListener('play', function () {
                audio.volume = readVolume();
                paintVolume();
            });
        }

        var speedButton = root.querySelector('.pz-audio-speed');
        if (speedButton) {
            speedButton.addEventListener('click', function () {
                state.speedIndex = (state.speedIndex + 1) % SPEEDS.length;
                var rate = SPEEDS[state.speedIndex];
                audio.playbackRate = rate;
                speedButton.textContent = (rate === 1 ? '1' : String(rate)) + '×';
                speedButton.classList.toggle('is-changed', rate !== 1);
            });
        }

        var labelPlay = root.getAttribute('data-label-play') || playButton.getAttribute('aria-label') || 'Play';
        var labelPause = root.getAttribute('data-label-pause') || labelPlay;
        var setPlayLabel = function (label) {
            playButton.setAttribute('aria-label', label);
            playButton.setAttribute('title', label);
        };

        audio.addEventListener('play', function () {
            root.classList.add('is-playing');
            setPlayLabel(labelPause);
        });
        audio.addEventListener('pause', function () {
            root.classList.remove('is-playing');
            setPlayLabel(labelPlay);
        });
        audio.addEventListener('ended', function () {
            root.classList.remove('is-playing');
            setPlayLabel(labelPlay);
        });
        audio.addEventListener('timeupdate', function () {
            setProgress(state);
        });
        audio.addEventListener('loadedmetadata', function () {
            setProgress(state);
        });
        // The browser has given up on the file. Which of the two reasons it is
        // matters: a format no browser decodes (.wma, .aiff) is a dead end the
        // reader should be told about plainly, a failed fetch is a glitch that
        // reloading may well fix, and saying the wrong one is worse than
        // saying nothing. MEDIA_ERR_SRC_NOT_SUPPORTED is the format case.
        audio.addEventListener('error', function () {
            root.classList.add('is-error');
            playButton.disabled = true;
            state.peaksFailed = true;
            var code = audio.error ? audio.error.code : 0;
            var unsupported = code === 4 || (window.MediaError && code === window.MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED);
            var notice = root.querySelector('.pz-audio-error');
            if (notice) {
                var text = root.getAttribute(unsupported ? 'data-label-unsupported' : 'data-label-load-error') || '';
                notice.textContent = text;
                notice.setAttribute('title', text);
            }
        });

        var dragging = false;
        track.addEventListener('pointerdown', function (event) {
            if (event.button !== undefined && event.button !== 0) return;
            dragging = true;
            try {
                // A pointer the browser is not tracking (a synthesised event,
                // a pointer already released) makes this throw, and the seek
                // below is the part that matters.
                if (track.setPointerCapture) track.setPointerCapture(event.pointerId);
            } catch (e) {
                // Carry on without capture: the move handler still follows.
            }
            seekToPointer(state, event);
            event.preventDefault();
        });
        track.addEventListener('pointermove', function (event) {
            if (dragging) seekToPointer(state, event);
        });
        var endDrag = function () {
            dragging = false;
        };
        track.addEventListener('pointerup', endDrag);
        track.addEventListener('pointercancel', endDrag);

        track.addEventListener('keydown', function (event) {
            if (event.key === 'ArrowLeft') {
                nudge(state, -5);
            } else if (event.key === 'ArrowRight') {
                nudge(state, 5);
            } else if (event.key === 'Home') {
                nudge(state, -Infinity);
            } else if (event.key === 'End') {
                nudge(state, Infinity);
            } else if (event.key === ' ' || event.key === 'Enter') {
                playButton.click();
            } else {
                return;
            }
            event.preventDefault();
        });

        var stored = state.lineOnly ? null : readStoredPeaks(state.peakKey);
        if (stored) {
            state.peaks = stored;
        }

        if (typeof ResizeObserver === 'function') {
            var observer = new ResizeObserver(function () {
                drawWave(state);
            });
            observer.observe(track);
        } else {
            window.addEventListener('resize', function () {
                state.drawnCount = 0;
                drawWave(state);
            });
        }
        drawWave(state);
        setProgress(state);

        if (!state.peaks && !state.lineOnly) {
            watchForView(state);
        }
    }

    /** A small file gets its waveform as soon as anyone can see the player. */
    function watchForView(state) {
        var start = function () {
            loadPeaks(state, EAGER_MAX_BYTES);
        };
        if (typeof IntersectionObserver !== 'function') {
            start();
            return;
        }
        var observer = new IntersectionObserver(function (entries) {
            for (var i = 0; i < entries.length; i++) {
                if (entries[i].isIntersecting) {
                    observer.disconnect();
                    start();
                    return;
                }
            }
        }, { rootMargin: '200px' });
        observer.observe(state.root);
    }

    function setup(scope) {
        var roots = (scope || document).querySelectorAll('[data-pz-audio]');
        for (var i = 0; i < roots.length; i++) {
            wire(roots[i]);
        }
    }

    window.poznoteSetupAudioPlayers = setup;

    /**
     * Players that arrive after the page does: the journal fetches its entry
     * bodies, a share reloads a note it is allowed to edit. Watching costs
     * nothing until something is added, and the check below is one selector.
     */
    function watchForNewPlayers() {
        if (typeof MutationObserver !== 'function') return;
        var scheduled = false;
        new MutationObserver(function () {
            if (scheduled) return;
            scheduled = true;
            window.setTimeout(function () {
                scheduled = false;
                if (document.querySelector('[data-pz-audio]:not([data-pz-audio-ready])')) {
                    setup(document);
                }
            }, 150);
        }).observe(document.body, { childList: true, subtree: true });
    }

    function start() {
        setup(document);
        watchForNewPlayers();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
