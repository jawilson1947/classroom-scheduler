import {
  computePosition,
  offset,
  flip,
  shift,
  arrow,
  autoUpdate,
} from "@floating-ui/dom";

class TooltipManager {
  constructor() {
    this.tooltips = new Map();
    this.init();
  }

  init() {
    // Find all elements with data-tooltip attribute
    const elements = document.querySelectorAll("[data-tooltip]");
    elements.forEach((element) => this.setupTooltip(element));
  }

  setupTooltip(element) {
    const content = element.getAttribute("data-tooltip");
    const placement = element.getAttribute("data-tooltip-placement") || "top";
    const variant = element.getAttribute("data-tooltip-variant") || "default";

    // Create tooltip element
    const tooltip = this.createTooltipElement(content, variant);
    document.body.appendChild(tooltip);

    const arrowEl = tooltip.querySelector(".tooltip-arrow");

    let cleanup = null;

    // Show tooltip on hover
    const showTooltip = () => {
      tooltip.classList.remove("hidden");
      tooltip.classList.add("block");

      cleanup = autoUpdate(element, tooltip, () => {
        computePosition(element, tooltip, {
          placement: placement,
          middleware: [
            offset(10),
            flip({
              fallbackAxisSideDirection: "start",
            }),
            shift({ padding: 8 }),
            arrow({ element: arrowEl, padding: 8 }),
          ],
        }).then(({ x, y, placement, middlewareData }) => {
          Object.assign(tooltip.style, {
            left: `${x}px`,
            top: `${y}px`,
          });

          const { x: arrowX, y: arrowY } = middlewareData.arrow || {};
          const side = placement.split("-")[0];

          // Get variant background classes
          const arrowBg =
            variant === "dark"
              ? "bg-gray-950 dark:bg-gray-800"
              : "bg-white dark:bg-[#1E2634]";

          // Arrow border classes that match tooltip border for both light and dark modes
          const arrowBorderClasses =
            variant === "dark"
              ? "border-gray-800 dark:border-gray-700"
              : "border-gray-200 dark:border-gray-700";

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
          arrowEl.className = `tooltip-arrow absolute h-3 w-3 rotate-45 ${arrowBg} ${arrowBorderSides} ${arrowBorderClasses}`;

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
    };

    // Hide tooltip on mouse leave
    const hideTooltip = () => {
      tooltip.classList.remove("block");
      tooltip.classList.add("hidden");
      if (cleanup) {
        cleanup();
        cleanup = null;
      }
    };

    // Attach event listeners
    element.addEventListener("mouseenter", showTooltip);
    element.addEventListener("mouseleave", hideTooltip);
    element.addEventListener("focus", showTooltip);
    element.addEventListener("blur", hideTooltip);

    // Store tooltip reference for cleanup
    this.tooltips.set(element, {
      tooltip,
      cleanup: () => {
        element.removeEventListener("mouseenter", showTooltip);
        element.removeEventListener("mouseleave", hideTooltip);
        element.removeEventListener("focus", showTooltip);
        element.removeEventListener("blur", hideTooltip);
        tooltip.remove();
      },
    });
  }

  createTooltipElement(content, variant) {
    const tooltip = document.createElement("div");
    tooltip.setAttribute("role", "tooltip");

    const variantClasses =
      variant === "dark"
        ? "bg-gray-950 text-white border-gray-800 dark:bg-gray-800 dark:border-gray-700"
        : "bg-white text-gray-700 border-gray-200 dark:bg-[#1E2634] dark:text-white dark:border-gray-700";

    tooltip.className = `hidden absolute z-99999 whitespace-nowrap rounded-lg border px-3.5 py-2 text-xs font-medium shadow-md ${variantClasses}`;

    tooltip.innerHTML = `
      ${content}
      <div class="tooltip-arrow absolute h-3 w-3"></div>
    `;

    return tooltip;
  }

  destroy() {
    this.tooltips.forEach(({ cleanup }) => cleanup());
    this.tooltips.clear();
  }
}

// Initialize tooltip manager
const tooltipManager = new TooltipManager();

// Export for manual reinitialization when new elements are added dynamically
export const initTooltips = () => {
  tooltipManager.init();
};

// Also expose globally for backward compatibility
window.initTooltips = initTooltips;

export default tooltipManager;
