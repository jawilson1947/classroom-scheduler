"use client";
import { ReactNode, useRef, useState } from "react";
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  arrow,
  Placement,
} from "@floating-ui/react";

type TooltipPlacement = "top" | "right" | "bottom" | "left";

interface TooltipProps {
  content: ReactNode;
  placement?: TooltipPlacement;
  children: ReactNode;
  variant?: "default" | "dark";
}

export default function Tooltip({
  content,
  placement = "top",
  children,
  variant = "default",
}: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const arrowRef = useRef(null);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: placement as Placement,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(10),
      flip({
        fallbackAxisSideDirection: "start",
      }),
      shift({ padding: 8 }),
      arrow({
        element: arrowRef,
        padding: 8,
      }),
    ],
  });

  const hover = useHover(context, {
    move: false,
    delay: { open: 100 },
  });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "tooltip" });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ]);

  const variantClasses =
    variant === "dark"
      ? "bg-gray-950 text-white border border-gray-800 dark:bg-gray-800 dark:border-gray-700"
      : "bg-white text-gray-700 border border-gray-200 dark:bg-[#1E2634] dark:text-white dark:border-gray-700";

  const arrowBg =
    variant === "dark"
      ? "bg-gray-950 dark:bg-gray-800"
      : "bg-white dark:bg-[#1E2634]";

  // Get arrow position from context
  const arrowX = context.middlewareData.arrow?.x;
  const arrowY = context.middlewareData.arrow?.y;
  const side = context.placement.split("-")[0];

  // Arrow border classes that match tooltip border for both light and dark modes
  const arrowBorderClasses =
    variant === "dark"
      ? "border-gray-800 dark:border-gray-700"
      : "border-gray-200 dark:border-gray-700";

  // Arrow positioning based on placement
  const getArrowStyles = () => {
    const baseStyle: React.CSSProperties = {
      position: "absolute" as const,
      width: "12px",
      height: "12px",
      transform: "rotate(45deg)",
    };

    switch (side) {
      case "top":
        return {
          ...baseStyle,
          bottom: "-6px",
          left: arrowX != null ? `${arrowX}px` : "50%",
        };
      case "bottom":
        return {
          ...baseStyle,
          top: "-6px",
          left: arrowX != null ? `${arrowX}px` : "50%",
        };
      case "left":
        return {
          ...baseStyle,
          right: "-6px",
          top: arrowY != null ? `${arrowY}px` : "50%",
        };
      case "right":
        return {
          ...baseStyle,
          left: "-6px",
          top: arrowY != null ? `${arrowY}px` : "50%",
        };
      default:
        return baseStyle;
    }
  };

  // Get border side classes based on placement
  const getArrowBorderSides = () => {
    switch (side) {
      case "top":
        return "border-r border-b";
      case "bottom":
        return "border-l border-t";
      case "left":
        return "border-r border-t";
      case "right":
        return "border-l border-b";
      default:
        return "";
    }
  };

  return (
    <>
      <span
        ref={refs.setReference}
        {...getReferenceProps()}
        className="inline-flex"
      >
        {children}
      </span>
      {isOpen && (
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          {...getFloatingProps()}
          className={`z-99999 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-medium shadow-md ${variantClasses}`}
        >
          {content}
          <div
            ref={arrowRef}
            style={getArrowStyles()}
            className={`${arrowBg} ${getArrowBorderSides()} ${arrowBorderClasses}`}
          />
        </div>
      )}
    </>
  );
}
