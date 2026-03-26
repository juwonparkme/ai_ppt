document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("prompt-form");
    const submitButton = document.getElementById("prompt-submit");
    const submitLabel = document.getElementById("prompt-submit-label");
    const progress = document.getElementById("generation-progress");
    const topicField = document.getElementById("user-input");
    const suggestedChips = document.querySelectorAll(".suggested-topic-chip");
    const submitButtons = document.querySelectorAll("[data-generate-submit]");

    if (!form || !submitButton || !submitLabel || !progress || !topicField) {
        return;
    }

    suggestedChips.forEach(function (chip) {
        chip.addEventListener("click", function () {
            topicField.value = chip.dataset.topic || "";
            topicField.focus();
        });
    });

    topicField.addEventListener("keydown", function (event) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            form.requestSubmit();
        }
    });

    form.addEventListener("submit", function (event) {
        const selectedTemplate = form.querySelector('input[name="presentation_id"]:checked');

        if (!topicField.value.trim()) {
            event.preventDefault();
            window.alert("주제를 입력해 주세요.");
            topicField.focus();
            return;
        }

        if (!selectedTemplate) {
            event.preventDefault();
            window.alert("템플릿을 하나 선택해 주세요.");
            return;
        }

        progress.classList.remove("hidden");
        submitButtons.forEach(function (button) {
            button.disabled = true;
        });
        submitButton.querySelector(".material-symbols-outlined").textContent = "autorenew";
        submitLabel.textContent = "생성 중...";
    });
});
