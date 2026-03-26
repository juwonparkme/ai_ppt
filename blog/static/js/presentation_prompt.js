document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("prompt-form");
    const submitButton = document.getElementById("prompt-submit");
    const submitLabel = document.getElementById("prompt-submit-label");
    const progress = document.getElementById("generation-progress");

    if (!form || !submitButton || !submitLabel || !progress) {
        return;
    }

    form.addEventListener("submit", function (event) {
        const topic = form.querySelector('textarea[name="user-input"]');
        const selectedTemplate = form.querySelector('input[name="presentation_id"]:checked');

        if (!topic || !topic.value.trim()) {
            event.preventDefault();
            window.alert("주제를 입력해 주세요.");
            topic?.focus();
            return;
        }

        if (!selectedTemplate) {
            event.preventDefault();
            window.alert("템플릿을 하나 선택해 주세요.");
            return;
        }

        progress.classList.remove("hidden");
        submitButton.disabled = true;
        submitButton.querySelector(".material-symbols-outlined").textContent = "autorenew";
        submitLabel.textContent = "생성 중...";
    });
});
