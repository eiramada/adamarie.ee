(() => {
  function initMenu() {
    const menuButton = document.querySelector(".menu-button");
    const navLinks = document.querySelector(".nav-links");

    if (!menuButton || !navLinks) return;

    const backgroundRegions = [
      document.querySelector("main"),
      document.querySelector("footer")
    ].filter(Boolean);

    const menuIsOpen = () => menuButton.getAttribute("aria-expanded") === "true";

    const setBackgroundInert = (isInert) => {
      backgroundRegions.forEach((region) => region.toggleAttribute("inert", isInert));
    };

    const closeMenu = ({ returnFocus = false } = {}) => {
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.setAttribute("aria-label", "Ava menüü");
      navLinks.classList.remove("is-open");
      document.body.classList.remove("menu-open");
      setBackgroundInert(false);

      if (returnFocus) menuButton.focus();
    };

    const openMenu = () => {
      menuButton.setAttribute("aria-expanded", "true");
      menuButton.setAttribute("aria-label", "Sulge menüü");
      navLinks.classList.add("is-open");
      document.body.classList.add("menu-open");
      setBackgroundInert(true);
      navLinks.querySelector("a")?.focus();
    };

    menuButton.addEventListener("click", () => {
      if (menuIsOpen()) {
        closeMenu({ returnFocus: true });
      } else {
        openMenu();
      }
    });

    navLinks.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => closeMenu());
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menuIsOpen()) {
        closeMenu({ returnFocus: true });
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth >= 1040 && menuIsOpen()) closeMenu();
    });
  }

  function setCurrentYear() {
    const year = document.getElementById("year");
    if (year) year.textContent = new Date().getFullYear();
  }

  function initCopyEmail() {
    const copyEmailButton = document.getElementById("copy-email");
    const contactStatus = document.getElementById("contact-status");

    if (!copyEmailButton || !contactStatus) return;

    const setContactStatus = (message, state) => {
      contactStatus.textContent = message;
      contactStatus.dataset.state = state;
    };

    if (copyEmailButton) {
      const fallbackCopy = (text) => {
        const temporaryInput = document.createElement("textarea");
        temporaryInput.value = text;
        temporaryInput.setAttribute("readonly", "");
        temporaryInput.style.position = "fixed";
        temporaryInput.style.opacity = "0";
        document.body.appendChild(temporaryInput);
        temporaryInput.select();
        const copied = document.execCommand("copy");
        temporaryInput.remove();

        if (!copied) throw new Error("Copy command failed");
      };

      copyEmailButton.addEventListener("click", async () => {
        const emailAddress = copyEmailButton.dataset.email;

        try {
          let copiedWithClipboardApi = false;

          if (navigator.clipboard?.writeText) {
            try {
              await navigator.clipboard.writeText(emailAddress);
              copiedWithClipboardApi = true;
            } catch {
              // Use the selection-based fallback below.
            }
          }

          if (!copiedWithClipboardApi) {
            fallbackCopy(emailAddress);
          }

          setContactStatus("E-posti aadress on lõikelauale kopeeritud.", "success");
        } catch {
          setContactStatus(
            `Kopeerimine ei õnnestunud. Vali aadress käsitsi: ${emailAddress}`,
            "error"
          );
        }
      });
    }
  }

  initMenu();
  setCurrentYear();
  initCopyEmail();
})();
