const form = document.getElementById("student-form-element");
const list = document.getElementById("student-list");
const message = document.getElementById("form-message");
const fields = ["full_name","register_no","email","phone","course","department","semester","academic_year","cgpa","skills","achievements","projects"];

function showMessage(text, type = "success") {
  message.textContent = text;
  message.className = `form-message ${type}`;
}
function getFormData() {
  return Object.fromEntries(fields.map(key => [key, document.getElementById(key).value.trim()]));
}
function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}
async function loadStudents(query = "") {
  list.innerHTML = '<p class="muted">Loading portfolios…</p>';
  try {
    const response = await fetch(`/api/students?q=${encodeURIComponent(query)}`);
    const students = await response.json();
    document.getElementById("total-students").textContent = students.length;
    if (!students.length) {
      list.innerHTML = '<div class="empty-state"><span>▤</span><h3>No portfolios found</h3><p>Create a portfolio using the form above.</p></div>';
      return;
    }
    list.innerHTML = students.map(student => `
      <article class="student-card">
        <div class="student-avatar">${escapeHTML(student.full_name.charAt(0).toUpperCase())}</div>
        <div class="student-info"><h3>${escapeHTML(student.full_name)}</h3><p>${escapeHTML(student.register_no)} · ${escapeHTML(student.course || "Course not specified")}</p><div class="skill-preview">${escapeHTML(student.skills || "No skills added yet")}</div></div>
        <div class="student-actions"><button class="small-button view-button" data-action="view" data-id="${student.id}">View</button><button class="small-button" data-action="edit" data-id="${student.id}">Edit</button><button class="small-button delete-button" data-action="delete" data-id="${student.id}">Delete</button></div>
      </article>`).join("");
  } catch {
    list.innerHTML = '<p class="form-message error">Could not connect to the server. Please start the application using npm start.</p>';
  }
}
form.addEventListener("submit", async event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const id = document.getElementById("student-id").value;
  try {
    const response = await fetch(id ? `/api/students/${id}` : "/api/students", {
      method: id ? "PUT" : "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(getFormData())
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Something went wrong.");
    form.reset();
    document.getElementById("student-id").value = "";
    document.getElementById("save-button").textContent = "Save portfolio";
    document.getElementById("cancel-edit").classList.add("hidden");
    showMessage(result.message);
    loadStudents(document.getElementById("search-input").value.trim());
  } catch (error) { showMessage(error.message, "error"); }
});
form.addEventListener("reset", () => setTimeout(() => {
  document.getElementById("student-id").value = "";
  document.getElementById("save-button").textContent = "Save portfolio";
  document.getElementById("cancel-edit").classList.add("hidden");
}, 0));
document.getElementById("cancel-edit").addEventListener("click", () => form.reset());
document.getElementById("search-button").addEventListener("click", () => loadStudents(document.getElementById("search-input").value.trim()));
document.getElementById("show-all-button").addEventListener("click", () => { document.getElementById("search-input").value = ""; loadStudents(); });
document.getElementById("search-input").addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); loadStudents(event.target.value.trim()); } });
list.addEventListener("click", async event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const id = button.dataset.id;
  if (button.dataset.action === "delete") {
    if (!confirm("Are you sure you want to delete this student portfolio?")) return;
    const response = await fetch(`/api/students/${id}`, {method:"DELETE"});
    const result = await response.json();
    if (!response.ok) return alert(result.error || "Unable to delete record.");
    loadStudents(document.getElementById("search-input").value.trim());
  }
  if (button.dataset.action === "edit" || button.dataset.action === "view") {
    const response = await fetch(`/api/students/${id}`);
    const student = await response.json();
    if (!response.ok) return alert(student.error || "Unable to load record.");
    if (button.dataset.action === "view") {
      alert([
        `Name: ${student.full_name}`, `Register number: ${student.register_no}`, `Email: ${student.email}`,
        `Phone: ${student.phone || "—"}`, `Course: ${student.course || "—"}`, `Department: ${student.department || "—"}`,
        `Semester: ${student.semester || "—"}`, `Academic year: ${student.academic_year || "—"}`, `CGPA: ${student.cgpa || "—"}`,
        `Skills: ${student.skills || "—"}`, `Achievements: ${student.achievements || "—"}`, `Projects: ${student.projects || "—"}`
      ].join("\n"));
    } else {
      document.getElementById("student-id").value = student.id;
      fields.forEach(key => document.getElementById(key).value = student[key] || "");
      document.getElementById("save-button").textContent = "Update portfolio";
      document.getElementById("cancel-edit").classList.remove("hidden");
      showMessage("You are editing this portfolio.", "info");
      document.getElementById("student-form").scrollIntoView({behavior:"smooth"});
    }
  }
});
loadStudents();
