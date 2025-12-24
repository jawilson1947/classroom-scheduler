import {
  computePosition,
  offset,
  flip,
  shift,
  arrow,
  autoUpdate,
} from "@floating-ui/dom";

class PopoverManager {
  constructor() {
    this.popovers = new Map();
    this.activePopover = null;
    this.init();
  }

  init() {
    // Find all elements with data-popover attribute
    const elements = document.querySelectorAll("[data-popover]");
    elements.forEach((element) => this.setupPopover(element));

    // Close popover when clicking outside
    document.addEventListener("click", (e) => {
      if (this.activePopover) {
        const { element, popover } = this.activePopover;
        if (!element.contains(e.target) && !popover.contains(e.target)) {
          this.hidePopover(this.activePopover);
        }
      }
    });
  }

  setupPopover(element) {
    const contentSelector = element.getAttribute("data-popover");
    const placement = element.getAttribute("data-popover-placement") || "right";

    // Find the popover content template
    const contentTemplate = document.querySelector(contentSelector);
    if (!contentTemplate) {
      console.warn(`Popover content not found: ${contentSelector}`);
      return;
    }

    // Create popover element
    const popover = this.createPopoverElement(contentTemplate);
    document.body.appendChild(popover);

    const arrowEl = popover.querySelector(".popover-arrow");

    let cleanup = null;

    // Toggle popover on click
    const togglePopover = (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Close any other open popover
      if (this.activePopover && this.activePopover.element !== element) {
        this.hidePopover(this.activePopover);
      }

      const isVisible = popover.classList.contains("block");

      if (isVisible) {
        this.hidePopover({ element, popover, cleanup });
      } else {
        this.showPopover({ element, popover, arrowEl, placement });
      }
    };

    // Attach click listener
    element.addEventListener("click", togglePopover);

    // Store popover reference
    this.popovers.set(element, {
      popover,
      cleanup: () => {
        element.removeEventListener("click", togglePopover);
        popover.remove();
      },
    });
  }

  showPopover({ element, popover, arrowEl, placement }) {
    popover.classList.remove("hidden");
    popover.classList.add("block");

    // Different offset based on placement - more space for top/bottom
    const getOffset = () => {
      return placement === "top" || placement === "bottom" ? 20 : 10;
    };

    const cleanup = autoUpdate(element, popover, () => {
      computePosition(element, popover, {
        placement: placement,
        middleware: [
          offset(getOffset()),
          flip({
            fallbackAxisSideDirection: "start",
          }),
          shift({ padding: 8 }),
          arrow({ element: arrowEl, padding: 8 }),
        ],
      }).then(({ x, y, placement, middlewareData }) => {
        Object.assign(popover.style, {
          left: `${x}px`,
          top: `${y}px`,
        });

        const { x: arrowX, y: arrowY } = middlewareData.arrow || {};
        const side = placement.split("-")[0];

        // Arrow background
        const arrowBg = "bg-white dark:bg-[#1E2634]";

        // Arrow border classes
        const arrowBorderClasses = "border-gray-200 dark:border-gray-700";

        // Get border side classes based on placement
        let arrowBorderSides = "";
        switch (side) {
          case "top":
            arrowBorderSides = "border-r border-b";
            break;
          case "bottom":
            arrowBorderSides = "border-l border-t";
            break;
          case "left":
            arrowBorderSides = "border-r border-t";
            break;
          case "right":
            arrowBorderSides = "border-l border-b";
            break;
        }

        // Set arrow classes
        arrowEl.className = `popover-arrow absolute h-3 w-3 rotate-45 ${arrowBg} ${arrowBorderSides} ${arrowBorderClasses}`;

        // Position arrow based on placement
        const arrowOffset = "-6px";

        switch (side) {
          case "top":
            Object.assign(arrowEl.style, {
              bottom: arrowOffset,
              left: arrowX != null ? `${arrowX}px` : "50%",
              top: "",
              right: "",
            });
            break;
          case "bottom":
            Object.assign(arrowEl.style, {
              top: arrowOffset,
              left: arrowX != null ? `${arrowX}px` : "50%",
              bottom: "",
              right: "",
            });
            break;
          case "left":
            Object.assign(arrowEl.style, {
              right: arrowOffset,
              top: arrowY != null ? `${arrowY}px` : "50%",
              left: "",
              bottom: "",
            });
            break;
          case "right":
            Object.assign(arrowEl.style, {
              left: arrowOffset,
              top: arrowY != null ? `${arrowY}px` : "50%",
              right: "",
              bottom: "",
            });
            break;
        }
      });
    });

    this.activePopover = { element, popover, cleanup };
  }

  hidePopover({ popover, cleanup }) {
    popover.classList.remove("block");
    popover.classList.add("hidden");
    if (cleanup) {
      cleanup();
    }
    this.activePopover = null;
  }

  createPopoverElement(contentTemplate) {
    const popover = document.createElement("div");
    popover.className =
      "hidden absolute z-99999  bg-white border border-gray-200 rounded-xl  dark:bg-[#1E2634] dark:border-gray-700";

    // Clone the content
    popover.innerHTML = `
      ${contentTemplate.innerHTML}
      <div class="popover-arrow absolute h-3 w-3"></div>
    `;

    return popover;
  }

  destroy() {
    this.popovers.forEach(({ cleanup }) => cleanup());
    this.popovers.clear();
  }
}

// Initialize popover manager
const popoverManager = new PopoverManager();

// Export for manual reinitialization when new elements are added dynamically
export const initPopovers = () => {
  popoverManager.init();
};

// Also expose globally for backward compatibility
window.initPopovers = initPopovers;

export default popoverManager;
