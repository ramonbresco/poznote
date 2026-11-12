// Workspace Background Image Management
// Handles background images per workspace, the one the speed dial keeps of
// its own (issue #1714) and the one of each Kanban board (issue #1771): both
// shown in full, so their opacity goes up to 100%

(function() {
    'use strict';

    let currentWorkspace = null;
    let currentBackgroundUrl = null;
    let pendingFile = null;
    let currentScope = '';
    let currentFolderId = null;
    let defaultDescription = null;

    var SPEED_DIAL_SCOPE = 'speed_dial';
    var KANBAN_SCOPE = 'kanban';
    var OPACITY_MIN = 5;

    function opacityMax() {
        return currentScope === SPEED_DIAL_SCOPE || currentScope === KANBAN_SCOPE ? 100 : 25;
    }

    function buildOpacitySettingKey(workspace) {
        // One per board, whatever workspace the folder is in (lib/kanban-background.php)
        if (currentScope === KANBAN_SCOPE) return 'kanban_background_opacity_' + currentFolderId;
        if (currentScope !== SPEED_DIAL_SCOPE) return 'background_opacity_' + workspace;
        // Each speed dial has its own: the page says which one (public/speed_dial.php)
        var boardKey = document.body.getAttribute('data-board-key');
        return 'speed_dial_background_opacity_' + workspace + (boardKey ? '_' + boardKey : '');
    }

    function scopeParam() {
        if (!currentScope) return '';
        if (currentScope === KANBAN_SCOPE) return '&scope=' + KANBAN_SCOPE + '&folder_id=' + encodeURIComponent(currentFolderId);
        return '&scope=' + currentScope + '&board=' + encodeURIComponent(document.body.getAttribute('data-board') || '');
    }

    // The highest value is also the default
    function normalizeOpacity(value) {
        var parsed = parseInt(value, 10);
        if (isNaN(parsed)) return opacityMax();
        if (parsed < OPACITY_MIN) return OPACITY_MIN;
        return Math.min(parsed, opacityMax());
    }

    function getBackgroundOpacity(workspace, callback) {
        var key = buildOpacitySettingKey(workspace);
        fetch('/api/v1/settings/' + encodeURIComponent(key), {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            credentials: 'same-origin'
        })
            .then(function(r) { return r.json(); })
            .then(function(j) {
                if (j && j.success) {
                    callback(normalizeOpacity(j.value));
                } else {
                    callback(opacityMax());
                }
            })
            .catch(function() { callback(opacityMax()); });
    }

    function setBackgroundOpacity(workspace, opacity, callback) {
        var key = buildOpacitySettingKey(workspace);
        fetch('/api/v1/settings/' + encodeURIComponent(key), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ value: String(opacity) })
        })
            .then(function(r) { return r.json(); })
            .then(function(j) {
                if (callback) callback(!!(j && j.success));
            })
            .catch(function() {
                if (callback) callback(false);
            });
    }

    window.openSpeedDialBackgroundModal = function(workspace) {
        openBackgroundModalForWorkspace(workspace, SPEED_DIAL_SCOPE);
    };

    // The board's header button (kanban_content.php) says which folder, and
    // brings the modal's description: the default one speaks of a workspace.
    window.openKanbanBackgroundModal = function(folderId, description) {
        var workspace = typeof window.getSelectedWorkspace === 'function' ? window.getSelectedWorkspace() : '';
        currentFolderId = String(folderId);
        openBackgroundModalForWorkspace(workspace || 'Poznote', KANBAN_SCOPE, description);
    };

    // Shown in place, the board is not reloaded: its columns keep their scroll
    function applyKanbanBackground(folderId, url, opacity) {
        var container = document.querySelector('#kanban-view-container[data-folder-id="' + folderId + '"]');
        if (!container) return;
        var layer = container.querySelector('.kanban-background');
        container.classList.toggle('has-kanban-background', !!url);
        if (!layer) return;
        if (url) {
            layer.style.backgroundImage = 'url("' + String(url).replace(/["\\]/g, '\\$&') + '")';
            layer.style.opacity = String(opacity / 100);
        } else {
            layer.style.backgroundImage = '';
            layer.style.opacity = '';
        }
    }

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', function() {
        initWorkspaceBackgroundButtons();
    });

    function initWorkspaceBackgroundButtons() {
        document.addEventListener('click', handleWorkspaceBackgroundActionClick);

        // Initialize modal controls
        initBackgroundModalControls();
    }

    function handleWorkspaceBackgroundActionClick(event) {
        var kanbanButton = event.target && event.target.closest
            ? event.target.closest('[data-action="open-kanban-background"]')
            : null;
        if (kanbanButton) {
            event.preventDefault();
            event.stopPropagation();
            window.openKanbanBackgroundModal(kanbanButton.getAttribute('data-folder-id'), kanbanButton.getAttribute('data-description'));
            return;
        }

        var button = event.target && event.target.closest
            ? event.target.closest('.workspace-background-action, .btn-background')
            : null;
        if (!button || button.disabled) return;

        event.preventDefault();
        event.stopPropagation();

        var workspace = button.getAttribute('data-ws');
        if (!workspace) return;

        openBackgroundModalForWorkspace(workspace);
    }

    function initBackgroundModalControls() {
        const modal = document.getElementById('backgroundImageModal');
        const uploadBtn = document.getElementById('uploadBackgroundBtn');
        const removeBtn = document.getElementById('removeBackgroundBtn');
        const saveBtn = document.getElementById('saveBackgroundBtn');
        const cancelBtn = document.getElementById('cancelBackgroundBtn');
        const fileInput = document.getElementById('backgroundImageInput');
        const opacityInput = document.getElementById('backgroundOpacityInput');
        const opacityValue = document.getElementById('backgroundOpacityValue');

        if (!modal) return;

        // Upload button
        if (uploadBtn) {
            uploadBtn.addEventListener('click', function() {
                fileInput.click();
            });
        }

        // File input change
        if (fileInput) {
            fileInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    previewBackgroundImage(file);
                }
            });
        }

        // Remove button
        if (removeBtn) {
            removeBtn.addEventListener('click', function() {
                removeBackgroundPreview();
            });
        }

        // Opacity slider
        if (opacityInput && opacityValue) {
            opacityInput.addEventListener('input', function() {
                opacityValue.textContent = this.value;
                updatePreviewOpacity(this.value);
            });
        }

        // Save button
        if (saveBtn) {
            saveBtn.addEventListener('click', function() {
                saveWorkspaceBackground();
            });
        }

        // Cancel button
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
                closeBackgroundModal();
            });
        }

        // Close modal on overlay click
        var pressedOnBackdrop = false;
        modal.addEventListener('mousedown', function(e) {
            pressedOnBackdrop = (e.target === modal);
        });
        modal.addEventListener('click', function(e) {
            if (e.target === modal && pressedOnBackdrop) {
                closeBackgroundModal();
            }
            pressedOnBackdrop = false;
        });
    }

    function openBackgroundModalForWorkspace(workspace, scope, description) {
        const modal = document.getElementById('backgroundImageModal');
        const descriptionEl = document.getElementById('backgroundImageDescription');
        const preview = document.getElementById('backgroundPreview');
        const opacityInput = document.getElementById('backgroundOpacityInput');
        const removeBtn = document.getElementById('removeBackgroundBtn');

        if (!modal) return;

        currentWorkspace = workspace;
        currentScope = scope || '';
        pendingFile = null;

        if (descriptionEl) {
            if (defaultDescription === null) defaultDescription = descriptionEl.textContent;
            descriptionEl.textContent = description || defaultDescription;
        }

        // Load current settings for this workspace
        opacityInput.max = opacityMax();
        opacityInput.value = opacityMax();
        document.getElementById('backgroundOpacityValue').textContent = opacityMax();

        getBackgroundOpacity(workspace, function(savedOpacity) {
            opacityInput.value = savedOpacity;
            document.getElementById('backgroundOpacityValue').textContent = savedOpacity;
            updatePreviewOpacity(savedOpacity);
        });

        // Check if background exists for this workspace
        fetch('api_upload_background.php?workspace=' + encodeURIComponent(workspace) + scopeParam())
            .then(response => response.json())
            .then(data => {
                if (data.success && data.exists) {
                    currentBackgroundUrl = data.url;
                    preview.style.backgroundImage = `url('${data.url}')`;
                    const currentOpacity = normalizeOpacity(opacityInput.value);
                    const previewOpacity = Math.min(currentOpacity, opacityMax());
                    preview.style.opacity = previewOpacity / 100;
                    preview.querySelector('.no-background-text').style.display = 'none';
                    removeBtn.style.display = 'inline-block';
                } else {
                    currentBackgroundUrl = null;
                    preview.style.backgroundImage = 'none';
                    preview.style.opacity = 1;
                    preview.querySelector('.no-background-text').style.display = 'block';
                    removeBtn.style.display = 'none';
                }
            })
            .catch(error => {
                // Error loading background, ignore silently
            });

        modal.style.display = 'flex';
    }

    // The speed dial draws its image itself (public/speed_dial.php); a Kanban
    // board is repainted in place. url: the picture saved, null when removed.
    function finishSave(url, opacity) {
        const reload = currentScope === SPEED_DIAL_SCOPE;
        if (currentScope === KANBAN_SCOPE) {
            applyKanbanBackground(currentFolderId, url, opacity);
        }
        closeBackgroundModal();
        if (reload) window.location.reload();
    }

    function closeBackgroundModal() {
        const modal = document.getElementById('backgroundImageModal');
        const fileInput = document.getElementById('backgroundImageInput');
        
        if (modal) modal.style.display = 'none';
        if (fileInput) fileInput.value = '';
        pendingFile = null;
        currentWorkspace = null;
        currentFolderId = null;
    }

    function previewBackgroundImage(file) {
        const preview = document.getElementById('backgroundPreview');
        const removeBtn = document.getElementById('removeBackgroundBtn');
        
        if (!file.type.match('image.*')) {
            if (typeof window.showError === 'function') {
                window.showError((typeof window.t === 'function' ? window.t('workspace_background.invalid_image', null, 'Please select a valid image file') : 'Please select a valid image file'));
            } else {
                alert((typeof window.t === 'function' ? window.t('workspace_background.invalid_image', null, 'Please select a valid image file') : 'Please select a valid image file'));
            }
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            const opacityInput = document.getElementById('backgroundOpacityInput');
            const opacity = opacityInput ? opacityInput.value : opacityMax();
            const previewOpacity = Math.min(opacity, opacityMax());
            preview.style.backgroundImage = `url('${e.target.result}')`;
            preview.style.opacity = previewOpacity / 100;
            preview.querySelector('.no-background-text').style.display = 'none';
            removeBtn.style.display = 'inline-block';
            pendingFile = file;
        };
        reader.readAsDataURL(file);
    }

    function removeBackgroundPreview() {
        const preview = document.getElementById('backgroundPreview');
        const removeBtn = document.getElementById('removeBackgroundBtn');

        preview.style.backgroundImage = 'none';
        preview.style.opacity = 1;
        preview.querySelector('.no-background-text').style.display = 'block';
        removeBtn.style.display = 'none';
        pendingFile = null;
        currentBackgroundUrl = null;
    }

    function updatePreviewOpacity(value) {
        const preview = document.getElementById('backgroundPreview');
        if (preview && preview.style.backgroundImage && preview.style.backgroundImage !== 'none') {
            const previewOpacity = Math.min(value, opacityMax());
            preview.style.opacity = previewOpacity / 100;
        }
    }

    function saveWorkspaceBackground() {
        const opacityInput = document.getElementById('backgroundOpacityInput');
        const opacity = normalizeOpacity(opacityInput.value);

        if (!currentWorkspace) {
            closeBackgroundModal();
            return;
        }

        // Save opacity for this workspace
        setBackgroundOpacity(currentWorkspace, opacity, function(success) {
            if (!success) {
                if (typeof window.showError === 'function') {
                    window.showError((typeof window.t === 'function' ? window.t('workspace_background.opacity_error', null, 'Error saving opacity setting') : 'Error saving opacity setting'));
                } else {
                    alert((typeof window.t === 'function' ? window.t('workspace_background.opacity_error', null, 'Error saving opacity setting') : 'Error saving opacity setting'));
                }
            }

            // If there's a pending file, upload it
            if (pendingFile) {
                uploadWorkspaceBackground(pendingFile, opacity);
            } else if (currentBackgroundUrl === null) {
                // Remove background
                deleteWorkspaceBackground(opacity);
            } else {
                // Just close the modal (opacity already saved)
                finishSave(currentBackgroundUrl, opacity);
            }
        });
    }

    function uploadWorkspaceBackground(file, opacity) {
        const formData = new FormData();
        formData.append('background', file);
        formData.append('workspace', currentWorkspace);
        if (currentScope === KANBAN_SCOPE) {
            formData.append('scope', currentScope);
            formData.append('folder_id', currentFolderId);
        } else if (currentScope) {
            formData.append('scope', currentScope);
            formData.append('board', document.body.getAttribute('data-board') || '');
        }

        fetch('api_upload_background.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                if (!currentScope) localStorage.setItem('backgroundImageUrl_' + currentWorkspace, data.url);
                finishSave(data.url, opacity);
            } else {
                if (typeof window.showError === 'function') {
                    window.showError(data.error || (typeof window.t === 'function' ? window.t('workspace_background.upload_error', null, 'Error uploading image') : 'Error uploading image'));
                } else {
                    alert(data.error || (typeof window.t === 'function' ? window.t('workspace_background.upload_error', null, 'Error uploading image') : 'Error uploading image'));
                }
            }
        })
        .catch(error => {
            if (typeof window.showError === 'function') {
                window.showError((typeof window.t === 'function' ? window.t('workspace_background.upload_error', null, 'Error uploading image') : 'Error uploading image'));
            } else {
                alert((typeof window.t === 'function' ? window.t('workspace_background.upload_error', null, 'Error uploading image') : 'Error uploading image'));
            }
        });
    }

    function deleteWorkspaceBackground(opacity) {
        fetch('api_upload_background.php?workspace=' + encodeURIComponent(currentWorkspace) + scopeParam(), {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                if (!currentScope) localStorage.removeItem('backgroundImageUrl_' + currentWorkspace);
                finishSave(null, opacity);
            } else {
                if (typeof window.showError === 'function') {
                    window.showError(data.error || (typeof window.t === 'function' ? window.t('workspace_background.remove_error', null, 'Error removing image') : 'Error removing image'));
                } else {
                    alert(data.error || (typeof window.t === 'function' ? window.t('workspace_background.remove_error', null, 'Error removing image') : 'Error removing image'));
                }
            }
        })
        .catch(error => {
            if (typeof window.showError === 'function') {
                window.showError((typeof window.t === 'function' ? window.t('workspace_background.remove_error', null, 'Error removing image') : 'Error removing image'));
            } else {
                alert((typeof window.t === 'function' ? window.t('workspace_background.remove_error', null, 'Error removing image') : 'Error removing image'));
            }
        });
    }

})();
