console.log("THEME JS LOADED");

(function () {
  function applyTheme(theme) {
    document.body.classList.remove("theme-dark", "theme-pink");
    document.body.classList.add(theme);
    localStorage.setItem("theme", theme);
  }

  // Load saved theme
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme) {
    applyTheme(savedTheme);
  }

  // Click handlers
  document.querySelectorAll(".theme-switcher button").forEach(btn => {
    btn.addEventListener("click", () => {
      applyTheme("theme-" + btn.dataset.theme);
    });
  });
})();
