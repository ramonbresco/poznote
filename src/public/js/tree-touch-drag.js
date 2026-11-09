// Drag and drop in the notes tree, with a finger.
//
// js/events-drag-drop.js is built on the browser's own drag and drop, which a
// touch screen never starts: there is no mouse to press and move, and a finger
// held on a row is how the browser scrolls. So on a touch screen the rows are
// left undraggable (isTouchDragDevice there) and nothing could be moved.
//
// A press held on a row starts the drag here instead, and from that moment on
// this file plays the browser's part: it raises the same dragstart, dragenter,
// dragleave, dragover, drop and dragend events, on the elements under the
// finger, carrying one DataTransfer of its own. Every handler of
// events-drag-drop.js therefore runs exactly as it does with a mouse, with the
// same drop indicators, the same folder auto-expand, the same note reordering
// and the same multi-selection rules. Nothing of that logic is repeated here.
//
// What the browser does for a real drag and is done here by hand: the drag
// image (it draws none for an event we raise ourselves), scrolling the tree
// when the finger nears its top or bottom edge, and deciding to deliver the
// drop (the browser delivers it only when the last dragover was prevented,
// which is the rule used below).
(function () {
    'use strict';

    // Same as the browser's own press-and-hold, and as the long presses
    // elsewhere in the app (js/dashboard-page.js, js/speed-dial.js)
    var LONG_PRESS_MS = 450;
    // How far the finger may wander before the press counts as a scroll of the
    // tree, or as the swipe between the list and the note. A held finger is
    // never perfectly still on a real screen, and a press given up here is a
    // press that ends in the browser's own long press instead.
    var TOUCH_SLOP = 10;
    // How close to an edge of the tree the finger scrolls it, and how fast
    var EDGE_BAND = 56;
    var EDGE_MAX_STEP = 16;
    // Controls with a tap of their own, and a row being renamed in place
    var EXCLUDED = '.note-actions-toggle, .folder-actions-toggle, input, textarea, select, [contenteditable="true"]';

    // The finger on a row before the press is long enough
    var press = null;
    // The drag under way, once it is
    var drag = null;
    // True from the end of a drag until the click that ends the same gesture:
    // without it the finger coming up would open the note it just moved.
    var justDragged = false;

    function isTouchDevice() {
        return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    }

    function isReadOnly() {
        return !!(document.body && document.body.classList.contains('shared-workspace-readonly'));
    }

    // The row the finger is on, and the element the drag starts from: the note
    // link, or the folder's header line. Mirrors what events-drag-drop.js makes
    // draggable with a mouse, system folders (Favorites, Trash) excluded.
    function dragSourceFrom(target) {
        if (!target || !target.closest || target.closest(EXCLUDED)) return null;

        var noteLink = target.closest('.links_arbo_left');
        if (noteLink) return noteLink;

        var folderToggle = target.closest('.folder-toggle');
        if (!folderToggle) return null;
        var header = folderToggle.parentElement;
        if (!header || !header.classList.contains('folder-header')) return null;
        if (header.classList.contains('system-folder')) return null;
        return folderToggle;
    }

    // One event the handlers of events-drag-drop.js cannot tell from a real
    // one. Safari has shipped versions whose DragEvent constructor drops the
    // dataTransfer, hence the mouse event carrying it by hand.
    function dragEvent(type, x, y, dataTransfer, relatedTarget) {
        var init = {
            bubbles: true,
            cancelable: true,
            composed: true,
            view: window,
            clientX: x,
            clientY: y,
            screenX: x,
            screenY: y,
            relatedTarget: relatedTarget || null,
            dataTransfer: dataTransfer
        };

        if (typeof window.DragEvent === 'function') {
            try {
                var ev = new DragEvent(type, init);
                if (ev.dataTransfer === dataTransfer) return ev;
            } catch (e) { /* fall through to the mouse event below */ }
        }

        var fallback = new MouseEvent(type, init);
        try {
            Object.defineProperty(fallback, 'dataTransfer', { value: dataTransfer, enumerable: true });
        } catch (e2) {
            console.debug('tree-touch-drag: could not carry the dataTransfer:', e2);
        }
        return fallback;
    }

    // Returns false when a handler called preventDefault(), which is how the
    // browser itself reads "this element takes the drop".
    function send(type, element, x, y, relatedTarget) {
        if (!element || !drag) return false;
        return !element.dispatchEvent(dragEvent(type, x, y, drag.dataTransfer, relatedTarget));
    }

    // The drag image the browser would have drawn, built from the same clone
    // the mouse drag hands to setDragImage (css/drag-drop.css).
    function makeGhost(source) {
        var ghost;
        if (source.classList.contains('links_arbo_left')) {
            ghost = source.cloneNode(true);
            // The source row is marked .dragging by the dragstart handler, and
            // that class is position/z-index/transform !important on a rule
            // heavier than the one below: a clone wearing it would sit in the
            // page flow instead of under the finger.
            ghost.classList.remove('dragging');
            ghost.removeAttribute('data-dragging');
            ghost.classList.add('tree-drag-ghost-note');
            ghost.style.width = source.offsetWidth + 'px';
        } else {
            ghost = document.createElement('div');
            ghost.className = 'tree-drag-ghost';
            var icon = document.createElement('i');
            icon.className = 'lucide lucide-folder';
            ghost.appendChild(icon);
            var name = source.querySelector('.folder-name');
            ghost.appendChild(document.createTextNode(name ? name.textContent : ''));
        }
        ghost.classList.add('tree-touch-drag-ghost');
        ghost.removeAttribute('id');
        ghost.setAttribute('aria-hidden', 'true');
        document.body.appendChild(ghost);
        return ghost;
    }

    function placeGhost(x, y) {
        if (!drag || !drag.ghost) return;
        // Held a little above the finger, so the row being dropped on stays in
        // sight instead of sitting under the hand.
        // The scale is the one the two ghost rules give their clone
        // (css/drag-drop.css); written here because the placement has to be
        // an inline transform and the two cannot be split.
        drag.ghost.style.transform = 'translate(' + Math.round(x - drag.ghostDx) + 'px, ' +
            Math.round(y - drag.ghostDy) + 'px) scale(1.02)';
    }

    function cancelPress() {
        if (press) clearTimeout(press.timer);
        press = null;
    }

    function startDrag(x, y) {
        var source = press.source;
        cancelPress();

        if (typeof window.DataTransfer !== 'function') return false;
        var dataTransfer;
        try {
            dataTransfer = new DataTransfer();
        } catch (e) {
            console.debug('tree-touch-drag: no DataTransfer to drag with:', e);
            return false;
        }

        drag = {
            source: source,
            dataTransfer: dataTransfer,
            lastTarget: null,
            accepted: false,
            moved: false,
            startX: x,
            startY: y
        };
        window.currentDragData = null;
        send('dragstart', source, x, y);

        // A row that produces no drag data has nothing to move: a favorite
        // folder shortcut, a row of a workspace shared for reading. Leave the
        // gesture to the browser rather than hold a drag that cannot land.
        if (!window.currentDragData) {
            send('dragend', source, x, y);
            drag = null;
            return false;
        }

        var rect = source.getBoundingClientRect();
        drag.ghostDx = Math.min(Math.max(x - rect.left, 16), 60);
        drag.ghostDy = rect.height + 8;
        drag.ghost = makeGhost(source);
        placeGhost(x, y);
        document.body.classList.add('tree-touch-dragging');

        if (navigator.vibrate) {
            try { navigator.vibrate(12); } catch (e3) { /* not allowed here */ }
        }
        startEdgeScroll();
        return true;
    }

    // Where the finger is, told to the tree as the browser would tell it.
    // The ghost takes no pointer events, so it is never what is found here.
    function dragTo(x, y) {
        if (!drag) return;
        drag.x = x;
        drag.y = y;
        placeGhost(x, y);

        var target = document.elementFromPoint(x, y);
        if (target !== drag.lastTarget) {
            send('dragleave', drag.lastTarget, x, y, target);
            send('dragenter', target, x, y, drag.lastTarget);
            drag.lastTarget = target;
        }

        drag.accepted = send('dragover', target, x, y);
    }

    function scrollerFor(element) {
        var node = element;
        while (node && node !== document.body) {
            if (node.classList && node.classList.contains('notes-list-scrollable-content')) return node;
            node = node.parentElement;
        }
        return document.querySelector('#left_col .notes-list-scrollable-content');
    }

    function startEdgeScroll() {
        var scroller = scrollerFor(drag.source);
        if (!scroller) return;

        drag.frame = window.requestAnimationFrame(function step() {
            if (!drag) return;
            drag.frame = window.requestAnimationFrame(step);
            if (drag.y === undefined) return;

            var rect = scroller.getBoundingClientRect();
            var delta = 0;
            if (drag.y < rect.top + EDGE_BAND) {
                delta = -Math.ceil(EDGE_MAX_STEP * (rect.top + EDGE_BAND - drag.y) / EDGE_BAND);
            } else if (drag.y > rect.bottom - EDGE_BAND) {
                delta = Math.ceil(EDGE_MAX_STEP * (drag.y - (rect.bottom - EDGE_BAND)) / EDGE_BAND);
            }
            if (!delta) return;

            var before = scroller.scrollTop;
            scroller.scrollTop = before + delta;
            // Rows moved under a finger that did not: say where it is now, so
            // the indicator follows the row it is really over.
            if (scroller.scrollTop !== before) dragTo(drag.x, drag.y);
        });
    }

    // commit tells apart the finger lifted (the drop happens) from the gesture
    // taken away by the system (it does not).
    function endDrag(commit) {
        if (!drag) return;

        var finished = drag;
        if (finished.frame) window.cancelAnimationFrame(finished.frame);

        var x = finished.x === undefined ? 0 : finished.x;
        var y = finished.y === undefined ? 0 : finished.y;

        // The browser delivers the drop only where the last dragover was
        // prevented; a drag that never moved has nowhere to land either.
        if (commit && finished.accepted && finished.moved && finished.lastTarget) {
            send('drop', finished.lastTarget, x, y);
        } else {
            send('dragleave', finished.lastTarget, x, y, null);
        }

        send('dragend', finished.source, x, y);

        if (finished.ghost && finished.ghost.parentNode) {
            finished.ghost.parentNode.removeChild(finished.ghost);
        }
        document.body.classList.remove('tree-touch-dragging');
        drag = null;
        justDragged = true;
    }

    function onTouchStart(event) {
        cancelPress();
        justDragged = false;

        if (!isTouchDevice() || isReadOnly()) return;
        if (!event.touches || event.touches.length !== 1) return;

        var source = dragSourceFrom(event.target);
        if (!source) return;

        var touch = event.touches[0];
        press = {
            source: source,
            x: touch.clientX,
            y: touch.clientY,
            timer: setTimeout(function () {
                var held = press;
                if (held) startDrag(held.x, held.y);
            }, LONG_PRESS_MS)
        };
    }

    function onTouchMove(event) {
        if (!event.touches || !event.touches.length) return;
        var touch = event.touches[0];

        if (drag) {
            // Hold the tree still: this gesture moves a row, it does not scroll
            if (event.cancelable) event.preventDefault();
            if (Math.abs(touch.clientX - drag.startX) > TOUCH_SLOP ||
                Math.abs(touch.clientY - drag.startY) > TOUCH_SLOP) {
                drag.moved = true;
            }
            dragTo(touch.clientX, touch.clientY);
            return;
        }

        if (!press) return;
        if (Math.abs(touch.clientX - press.x) > TOUCH_SLOP ||
            Math.abs(touch.clientY - press.y) > TOUCH_SLOP) {
            cancelPress();
        }
    }

    function onTouchEnd() {
        cancelPress();
        endDrag(true);
    }

    function onTouchCancel() {
        cancelPress();
        endDrag(false);
    }

    // Android answers a press held on a link with its own menu (open in a new
    // tab, copy link address, select text) and, having opened it, takes the
    // touch sequence away as a touchcancel: the drag just lifted would die
    // under a menu that has nothing to do with the tree. iOS raises no such
    // event, and a mouse right-click is somebody else's (handleTreeContextMenu
    // in js/notes-list-events.js), so this is turned down on touch only.
    //
    // Turned down for the whole row rather than only while a press is on: a
    // finger that wandered past the slop has given the press up, and would
    // then be answered by that menu instead of by nothing.
    function onContextMenu(event) {
        if (!isTouchDevice()) return;
        if (!drag && !press && !dragSourceFrom(event.target)) return;
        event.preventDefault();
    }

    // The finger coming up after a drag: the click it leaves behind would open
    // the note that was just moved, or fold the folder. Swallowed in the
    // capture phase, once, the flag falling with it and at the next touchstart.
    function onClickCapture(event) {
        if (!justDragged) return;
        justDragged = false;

        var target = event.target;
        if (!target || !target.closest) return;
        if (!target.closest('.links_arbo_left, .note-list-item, .folder-toggle')) return;

        event.preventDefault();
        event.stopPropagation();
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    // Not passive: a drag under way has to stop the tree from scrolling
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('touchcancel', onTouchCancel, { passive: true });
    // Not passive: this one exists to call preventDefault()
    document.addEventListener('contextmenu', onContextMenu, { passive: false });
    document.addEventListener('click', onClickCapture, true);

    // Read by the pointerup tap fallback of js/events-drag-drop.js, which runs
    // before the click above: a finger that is dragging is not opening a note.
    window.poznoteTreeTouchDragActive = function () {
        return !!drag;
    };
}());
