const btnText = document.querySelector(".PABoxButton");
btnText.addEventListener("click", () => {
    if (btnText.textContent === "START PERSONAL ASSISTANT") {
      btnText.textContent = "STOP PERSONAL ASSISTANT";
    } else {
      btnText.textContent = "START PERSONAL ASSISTANT";
    }
  });