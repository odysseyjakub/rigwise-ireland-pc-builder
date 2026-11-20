const toggles = [...document.querySelectorAll(".theme-toggle")];

function setTheme(dark) {
  document.body.classList.toggle("dark-theme", dark);
  for (const toggle of toggles) {
    toggle.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
  }
}

try {
  setTheme(window.localStorage.getItem("rigwise-theme") === "dark");
} catch {
  setTheme(false);
}

for (const toggle of toggles) {
  toggle.addEventListener("click", () => {
    const dark = !document.body.classList.contains("dark-theme");
    setTheme(dark);
    try {
      window.localStorage.setItem("rigwise-theme", dark ? "dark" : "light");
    } catch {}
  });
}

const year = document.querySelector("#year");
if (year) year.textContent = new Date().getFullYear();

