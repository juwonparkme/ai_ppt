document.addEventListener("DOMContentLoaded", function () {
    const helpers = window.PresentationResultEditorHelpers || {};
    const templatePreview = window.PresentationResultTemplatePreview || {};
    const previewSource = document.getElementById("editor-preview-data");
    const metaSource = document.getElementById("editor-meta-data");
    const initialPreviewItems = previewSource ? JSON.parse(previewSource.textContent) : [];
    const editorMeta = metaSource ? JSON.parse(metaSource.textContent) : {};

    const cleanText = helpers.cleanText || function (value, fallback) {
        const text = String(value || "").trim();
        return text || fallback;
    };
    const cleanBullets = helpers.cleanBullets || function (value) {
        return Array.isArray(value) ? value : [];
    };
    const normalizePreviewItem = helpers.normalizePreviewItem || function (item) {
        return item || {};
    };
    const createSlide = helpers.createSlide || function () {
        return { kind: "slide", slide_kind: "title", title: "Presentation", subtitle: "", bullets: [], notes: "" };
    };
    const isImageSlide = helpers.isImageSlide || function (slide) {
        return slide && slide.kind === "image";
    };
    const supportsBullets = helpers.supportsBullets || function (slide) {
        return !isImageSlide(slide) && slide.slide_kind !== "title";
    };
    const backendFooterLabel = helpers.backendFooterLabel || function (backend) {
        return backend;
    };
    const buildSlideCard = helpers.buildSlideCard;

    const elements = {
        slideList: document.getElementById("editor-slide-list"),
        slideCountPill: document.getElementById("editor-slide-count-pill"),
        slideCountFooter: document.getElementById("editor-slide-count-footer"),
        slideCountInspector: document.getElementById("editor-slide-count-inspector"),
        backendFooter: document.getElementById("editor-backend-footer"),
        imagePreview: document.getElementById("editor-image-preview"),
        textPreview: document.getElementById("editor-text-preview"),
        saveIndicator: document.getElementById("editor-save-indicator"),
        savePill: document.getElementById("inspector-save-pill"),
        deckHeading: document.getElementById("inspector-deck-heading"),
        deckTitleInput: document.getElementById("inspector-deck-title"),
        slideTitleInput: document.getElementById("inspector-slide-title-input"),
        slideSubtitleInput: document.getElementById("inspector-slide-subtitle-input"),
        subtitleField: document.getElementById("inspector-subtitle-field"),
        bulletsField: document.getElementById("inspector-bullets-field"),
        bulletsList: document.getElementById("inspector-bullets-list"),
        addBullet: document.getElementById("inspector-add-bullet"),
        addSlide: document.getElementById("inspector-add-slide"),
        deleteSlide: document.getElementById("inspector-delete-slide"),
        toolbarButtons: Array.from(document.querySelectorAll("[data-editor-action]")),
        downloadLinks: Array.from(document.querySelectorAll("#result-download, #result-download-secondary")),
        downloadLabels: Array.from(document.querySelectorAll("#result-download-label, #result-download-secondary-label")),
        downloadToast: document.getElementById("download-toast"),
        downloadToastTitle: document.getElementById("download-toast-title"),
        downloadToastText: document.getElementById("download-toast-text"),
    };

    const state = {
        deckTitle: cleanText(editorMeta.title, "presentation"),
        backend: cleanText(editorMeta.backend, "pptxgenjs"),
        template: cleanText(editorMeta.template, "modern-a"),
        downloadUrl: cleanText(editorMeta.downloadUrl, ""),
        primaryActionLabel: cleanText(editorMeta.primaryActionLabel, "다운로드"),
        historyId: editorMeta.historyId || null,
        editorUrl: cleanText(editorMeta.editorUrl, ""),
        csrfToken: cleanText(editorMeta.csrfToken, ""),
        assetUrls: editorMeta.assetUrls || {},
        previewItems: Array.isArray(initialPreviewItems) ? initialPreviewItems.map(normalizePreviewItem) : [],
        selectedIndex: 0,
        version: 0,
        isDirty: false,
        isSaving: false,
        isRendering: false,
        saveTimer: 0,
        activeCanvasElement: null,
    };

    if (!state.previewItems.length) {
        state.previewItems = [createSlide(state.deckTitle, "title")];
    }

    function getSelectedSlide() {
        return state.previewItems[state.selectedIndex] || state.previewItems[0];
    }

    function clearCanvasSelection() {
        if (!state.activeCanvasElement) {
            return;
        }
        state.activeCanvasElement.style.boxShadow = "";
        state.activeCanvasElement.style.backgroundColor = "";
        state.activeCanvasElement = null;
    }

    function setCanvasSelection(element) {
        if (!element) {
            return;
        }
        clearCanvasSelection();
        state.activeCanvasElement = element;
        state.activeCanvasElement.style.boxShadow = "0 0 0 2px rgba(79, 70, 229, 0.18)";
        state.activeCanvasElement.style.backgroundColor = "rgba(79, 70, 229, 0.06)";
    }

    function selectEditableText(element) {
        if (!element) {
            return;
        }
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(element);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    function showToast(title, message) {
        if (!elements.downloadToast || !elements.downloadToastTitle || !elements.downloadToastText) {
            return;
        }
        elements.downloadToastTitle.textContent = title;
        elements.downloadToastText.textContent = message;
        elements.downloadToast.classList.remove("hidden");
        window.clearTimeout(showToast.timeoutId);
        showToast.timeoutId = window.setTimeout(function () {
            elements.downloadToast.classList.add("hidden");
        }, 2600);
    }

    function setSaveState(text, tone) {
        if (elements.saveIndicator) {
            elements.saveIndicator.textContent = text;
            elements.saveIndicator.className = "hidden rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] lg:inline-flex";
            elements.saveIndicator.style.backgroundColor = "";
            elements.saveIndicator.style.color = "";
            if (tone === "active") {
                elements.saveIndicator.classList.add("bg-primary/10", "text-primary");
            } else {
                elements.saveIndicator.classList.add("bg-surface-container-low", "text-on-surface-variant");
            }
            if (tone === "danger") {
                elements.saveIndicator.style.backgroundColor = "rgba(220, 38, 38, 0.08)";
                elements.saveIndicator.style.color = "#dc2626";
            }
        }

        if (elements.savePill) {
            elements.savePill.textContent = tone === "danger" ? "Error" : tone === "active" ? "Syncing" : "Draft";
        }
    }

    function markDirty() {
        state.version += 1;
        state.isDirty = true;
        setSaveState("자동 저장 대기", "active");
        window.clearTimeout(state.saveTimer);
        state.saveTimer = window.setTimeout(function () {
            saveDraft();
        }, 600);
    }

    function updateCounts() {
        const text = state.previewItems.length + " slides";
        if (elements.slideCountPill) {
            elements.slideCountPill.textContent = String(state.previewItems.length);
        }
        if (elements.slideCountFooter) {
            elements.slideCountFooter.textContent = text;
        }
        if (elements.slideCountInspector) {
            elements.slideCountInspector.textContent = text;
        }
        if (elements.backendFooter) {
            elements.backendFooter.textContent = backendFooterLabel(state.backend);
        }
    }

    function renderSlideList() {
        if (!elements.slideList || typeof buildSlideCard !== "function") {
            return;
        }
        elements.slideList.innerHTML = "";
        state.previewItems.forEach(function (preview, index) {
            elements.slideList.appendChild(
                buildSlideCard(
                    preview,
                    index,
                    state.selectedIndex,
                    function (nextIndex) {
                        state.selectedIndex = nextIndex;
                        renderEditor();
                    },
                    function (deleteIndex) {
                        deleteSlideAt(deleteIndex);
                    },
                    {
                        previewItems: state.previewItems,
                        template: state.template,
                        assetUrls: state.assetUrls,
                        deckTitle: state.deckTitle,
                    }
                )
            );
        });
    }

    function readEditableValue(element, compact) {
        const raw = String(element.textContent || "").replace(/\u00a0/g, " ");
        return compact ? raw.replace(/\s+/g, " ").trim() : raw.trim();
    }

    function focusCanvasField(field) {
        if (!elements.textPreview) {
            return false;
        }
        const target = elements.textPreview.querySelector('[data-editor-field="' + field + '"]');
        if (!target) {
            return false;
        }
        target.focus();
        setCanvasSelection(target);
        selectEditableText(target);
        return true;
    }

    function renderCanvas(slide) {
        if (!slide) {
            return;
        }

        clearCanvasSelection();

        if (isImageSlide(slide)) {
            if (elements.imagePreview) {
                elements.imagePreview.src = slide.image_url || "";
                elements.imagePreview.classList.remove("hidden");
            }
            if (elements.textPreview) {
                elements.textPreview.classList.add("hidden");
                elements.textPreview.innerHTML = "";
            }
            return;
        }

        if (elements.imagePreview) {
            elements.imagePreview.classList.add("hidden");
        }
        if (elements.textPreview) {
            elements.textPreview.classList.remove("hidden");
            elements.textPreview.innerHTML =
                typeof templatePreview.renderCanvasPreview === "function"
                    ? templatePreview.renderCanvasPreview({
                          slide: slide,
                          previewItems: state.previewItems,
                          selectedIndex: state.selectedIndex,
                          template: state.template,
                          assetUrls: state.assetUrls,
                          deckTitle: state.deckTitle,
                      })
                    : "";
        }
        bindCanvasEditors();
    }

    function updateSlideFromCanvas(editor, finalize) {
        const slide = getSelectedSlide();
        if (!slide) {
            return;
        }

        const field = editor.dataset.editorField;
        let changed = false;

        if (field === "title") {
            const nextTitle = cleanText(readEditableValue(editor, true), "Untitled Slide");
            if (slide.title !== nextTitle) {
                slide.title = nextTitle;
                changed = true;
            }
            if (elements.slideTitleInput && elements.slideTitleInput.value !== slide.title) {
                elements.slideTitleInput.value = slide.title;
            }
        } else if (field === "subtitle") {
            const nextSubtitle = readEditableValue(editor, false);
            if (slide.subtitle !== nextSubtitle) {
                slide.subtitle = nextSubtitle;
                changed = true;
            }
            if (elements.slideSubtitleInput && elements.slideSubtitleInput.value !== slide.subtitle) {
                elements.slideSubtitleInput.value = slide.subtitle;
            }
        } else if (field === "bullet") {
            const bulletIndex = Number(editor.dataset.bulletIndex || "-1");
            if (!Array.isArray(slide.bullets) || bulletIndex < 0 || bulletIndex >= slide.bullets.length) {
                return;
            }
            const nextBullet = readEditableValue(editor, false);
            if (finalize && !nextBullet) {
                slide.bullets.splice(bulletIndex, 1);
                changed = true;
            } else if (slide.bullets[bulletIndex] !== nextBullet) {
                slide.bullets[bulletIndex] = nextBullet;
                changed = true;
            }
        }

        if (!changed) {
            return;
        }

        markDirty();
        if (finalize) {
            renderEditor();
            return;
        }

        renderSlideList();
        renderInspector(slide);
    }

    function bindCanvasEditors() {
        if (!elements.textPreview) {
            return;
        }

        const editors = Array.from(elements.textPreview.querySelectorAll("[data-editor-field]"));
        const removeButtons = Array.from(elements.textPreview.querySelectorAll("[data-bullet-remove-index]"));

        editors.forEach(function (editor) {
            editor.addEventListener("focus", function () {
                setCanvasSelection(editor);
            });

            editor.addEventListener("click", function () {
                setCanvasSelection(editor);
            });

            editor.addEventListener("input", function () {
                updateSlideFromCanvas(editor, false);
            });

            editor.addEventListener("blur", function () {
                updateSlideFromCanvas(editor, true);
            });
        });

        removeButtons.forEach(function (button) {
            button.addEventListener("click", function () {
                const slide = getSelectedSlide();
                const bulletIndex = Number(button.dataset.bulletRemoveIndex || "-1");
                if (!slide || bulletIndex < 0 || bulletIndex >= slide.bullets.length) {
                    return;
                }
                slide.bullets.splice(bulletIndex, 1);
                markDirty();
                renderEditor();
            });
        });
    }

    function autoResizeTextarea(textarea) {
        if (!textarea) {
            return;
        }
        textarea.style.height = "0px";
        textarea.style.height = Math.max(textarea.scrollHeight, 112) + "px";
    }

    function createBulletEditor(text, index) {
        const wrapper = document.createElement("div");
        wrapper.className = "flex items-start gap-2";
        wrapper.innerHTML =
            '<textarea class="min-h-20 flex-1 resize-none overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm leading-6 text-on-surface outline-none transition focus:border-primary"></textarea>' +
            '<button class="rounded-2xl border border-outline-variant/20 px-3 py-3 text-xs font-semibold text-on-surface-variant transition hover:bg-surface-container" type="button">삭제</button>';

        const textarea = wrapper.querySelector("textarea");
        const removeButton = wrapper.querySelector("button");
        textarea.value = text;
        autoResizeTextarea(textarea);

        textarea.addEventListener("input", function () {
            const slide = getSelectedSlide();
            autoResizeTextarea(textarea);
            slide.bullets[index] = textarea.value;
            markDirty();
            renderCanvas(slide);
            renderSlideList();
            updateCounts();
        });

        removeButton.addEventListener("click", function () {
            const slide = getSelectedSlide();
            slide.bullets.splice(index, 1);
            markDirty();
            renderEditor();
        });

        return wrapper;
    }

    function renderInspector(slide) {
        if (!slide) {
            return;
        }

        if (elements.deckHeading) {
            elements.deckHeading.textContent = state.deckTitle;
        }
        if (elements.deckTitleInput && elements.deckTitleInput.value !== state.deckTitle) {
            elements.deckTitleInput.value = state.deckTitle;
        }
        if (elements.slideTitleInput) {
            elements.slideTitleInput.value = slide.title || "";
            elements.slideTitleInput.disabled = isImageSlide(slide);
        }
        if (elements.slideSubtitleInput) {
            elements.slideSubtitleInput.value = slide.subtitle || "";
            elements.slideSubtitleInput.disabled = isImageSlide(slide);
        }
        if (elements.subtitleField) {
            elements.subtitleField.classList.toggle("opacity-50", isImageSlide(slide));
        }
        if (elements.bulletsField) {
            elements.bulletsField.classList.toggle("hidden", !supportsBullets(slide));
        }
        if (elements.addBullet) {
            elements.addBullet.disabled = !supportsBullets(slide);
        }
        if (!elements.bulletsList) {
            return;
        }

        elements.bulletsList.innerHTML = "";
        if (!supportsBullets(slide)) {
            return;
        }

        slide.bullets.forEach(function (bullet, index) {
            elements.bulletsList.appendChild(createBulletEditor(bullet, index));
        });

        if (!slide.bullets.length) {
            const empty = document.createElement("p");
            empty.className = "rounded-2xl border border-dashed border-outline-variant/20 bg-surface-container-low px-4 py-5 text-sm text-on-surface-variant";
            empty.textContent = "불릿 없음. 추가 버튼으로 넣으세요.";
            elements.bulletsList.appendChild(empty);
        }
    }

    function updateDownloadLinks() {
        elements.downloadLabels.forEach(function (label) {
            label.textContent = state.isRendering ? "렌더링 중..." : state.primaryActionLabel;
        });

        elements.downloadLinks.forEach(function (link) {
            link.setAttribute("href", state.downloadUrl || "#");
            link.style.pointerEvents = state.isRendering ? "none" : "";
            link.style.opacity = state.isRendering ? "0.6" : "";
        });
    }

    function renderEditor(refreshList) {
        if (refreshList !== false) {
            renderSlideList();
        }
        renderCanvas(getSelectedSlide());
        renderInspector(getSelectedSlide());
        updateCounts();
        updateDownloadLinks();
    }

    function addBullet() {
        const slide = getSelectedSlide();
        if (!supportsBullets(slide)) {
            showToast(state.deckTitle, "이 슬라이드 타입은 불릿을 지원하지 않습니다.");
            return;
        }
        slide.bullets.push("새 포인트");
        slide.bullets = cleanBullets(slide.bullets);
        markDirty();
        renderEditor();
    }

    function addSlide() {
        const nextKind = state.selectedIndex === 0 ? "bullets" : getSelectedSlide().slide_kind;
        state.previewItems.splice(state.selectedIndex + 1, 0, createSlide(state.deckTitle, nextKind));
        state.selectedIndex += 1;
        markDirty();
        renderEditor();
    }

    function deleteSlideAt(index) {
        state.selectedIndex = index;
        if (state.previewItems.length === 1) {
            state.previewItems[0] = createSlide(state.deckTitle, "title");
            state.selectedIndex = 0;
        } else {
            state.previewItems.splice(state.selectedIndex, 1);
            state.selectedIndex = Math.max(0, state.selectedIndex - 1);
        }
        markDirty();
        renderEditor();
    }

    function deleteSlide() {
        deleteSlideAt(state.selectedIndex);
    }

    function payloadForRequest(action) {
        return {
            action: action,
            title: state.deckTitle,
            download_url: state.downloadUrl,
            backend: state.backend,
            template: state.template,
            primary_action_label: state.primaryActionLabel,
            history_id: state.historyId,
            preview_items: state.previewItems.map(function (slide) {
                return {
                    kind: slide.kind,
                    slide_kind: slide.slide_kind,
                    title: slide.title,
                    subtitle: slide.subtitle,
                    bullets: cleanBullets(slide.bullets),
                    image_url: slide.image_url || "",
                    notes: slide.notes || "",
                };
            }),
        };
    }

    async function postEditor(action) {
        if (!state.editorUrl) {
            throw new Error("에디터 저장 경로가 없습니다.");
        }

        const response = await fetch(state.editorUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": state.csrfToken,
            },
            body: JSON.stringify(payloadForRequest(action)),
        });
        const data = await response.json().catch(function () {
            return {};
        });

        if (!response.ok) {
            throw new Error(data.error || "에디터 요청 실패");
        }
        return data;
    }

    async function saveDraft() {
        const requestVersion = state.version;
        if (!state.isDirty || state.isSaving || state.isRendering) {
            return;
        }

        state.isSaving = true;
        setSaveState("자동 저장 중", "active");

        try {
            const data = await postEditor("save");
            state.historyId = data.history_id || state.historyId;
            if (requestVersion === state.version) {
                state.isDirty = false;
                setSaveState("자동 저장됨", "idle");
            } else {
                setSaveState("변경 반영 중", "active");
                window.clearTimeout(state.saveTimer);
                state.saveTimer = window.setTimeout(function () {
                    saveDraft();
                }, 300);
            }
        } catch (error) {
            setSaveState("저장 실패", "danger");
            showToast(state.deckTitle, error.message);
        } finally {
            state.isSaving = false;
        }
    }

    async function handleDownload(event) {
        event.preventDefault();
        if (state.isRendering) {
            return;
        }

        window.clearTimeout(state.saveTimer);
        state.isRendering = true;
        updateDownloadLinks();
        setSaveState("수정본 렌더링", "active");

        try {
            const data = await postEditor("render");
            state.historyId = data.history_id || state.historyId;
            state.backend = cleanText(data.backend, state.backend);
            state.primaryActionLabel = cleanText(data.primary_action_label, "다운로드");
            state.downloadUrl = cleanText(data.download_url, state.downloadUrl);
            state.deckTitle = cleanText(data.title, state.deckTitle);
            state.isDirty = false;
            renderEditor();
            setSaveState("수정본 준비 완료", "idle");
            showToast(state.deckTitle, "수정본 다운로드를 시작합니다.");
            if (state.downloadUrl) {
                window.location.href = state.downloadUrl;
            }
        } catch (error) {
            setSaveState("렌더 실패", "danger");
            showToast(state.deckTitle, error.message);
        } finally {
            state.isRendering = false;
            updateDownloadLinks();
        }
    }

    if (elements.deckTitleInput) {
        elements.deckTitleInput.addEventListener("input", function () {
            state.deckTitle = cleanText(elements.deckTitleInput.value, "presentation");
            markDirty();
            renderEditor(false);
        });
    }

    if (elements.slideTitleInput) {
        elements.slideTitleInput.addEventListener("input", function () {
            getSelectedSlide().title = cleanText(elements.slideTitleInput.value, "Untitled Slide");
            markDirty();
            renderEditor();
        });
    }

    if (elements.slideSubtitleInput) {
        elements.slideSubtitleInput.addEventListener("input", function () {
            getSelectedSlide().subtitle = elements.slideSubtitleInput.value.trim();
            markDirty();
            renderEditor(false);
        });
    }

    if (elements.addBullet) {
        elements.addBullet.addEventListener("click", addBullet);
    }
    if (elements.addSlide) {
        elements.addSlide.addEventListener("click", addSlide);
    }
    if (elements.deleteSlide) {
        elements.deleteSlide.addEventListener("click", deleteSlide);
    }

    elements.toolbarButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            const action = button.dataset.editorAction;
            if (action === "focus-title") {
                if (!focusCanvasField("title") && elements.slideTitleInput) {
                    elements.slideTitleInput.focus();
                    elements.slideTitleInput.select();
                }
            } else if (action === "focus-subtitle") {
                if (!focusCanvasField("subtitle") && elements.slideSubtitleInput) {
                    elements.slideSubtitleInput.focus();
                    elements.slideSubtitleInput.select();
                }
            } else if (action === "add-bullet") {
                addBullet();
            } else if (action === "add-slide") {
                addSlide();
            } else if (action === "delete-slide") {
                deleteSlide();
            }
        });
    });

    elements.downloadLinks.forEach(function (link) {
        link.addEventListener("click", handleDownload);
    });

    renderEditor();
    setSaveState("자동 저장됨", "idle");
});
