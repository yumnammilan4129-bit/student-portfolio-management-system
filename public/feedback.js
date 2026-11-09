const feedbackForm = document.getElementById("feedback-form");
const feedbackMessage = document.getElementById("feedback-message");
feedbackForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!feedbackForm.reportValidity()) return;
  const data = Object.fromEntries(new FormData(feedbackForm).entries());
  data.rating = Number(data.rating);
  try {
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to submit feedback.");
    feedbackForm.reset();
    feedbackMessage.textContent = result.message;
    feedbackMessage.className = "form-message success";
  } catch (error) {
    feedbackMessage.textContent = error.message;
    feedbackMessage.className = "form-message error";
  }
});
