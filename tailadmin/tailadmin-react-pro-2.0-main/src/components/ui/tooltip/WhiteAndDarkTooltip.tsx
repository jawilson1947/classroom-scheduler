import Tooltip from "./Tooltip";

export default function WhiteAndDarkTooltip() {
  return (
    <div className="flex items-center gap-10">
      {/* <!-- White --> */}
      <Tooltip content="This is a tooltip" placement="top" variant="default">
        <button className="inline-flex px-4 py-3 text-sm font-medium text-white rounded-lg bg-brand-500 shadow-theme-xs">
          White Tooltip
        </button>
      </Tooltip>

      {/* <!-- Dark --> */}
      <Tooltip content="This is a tooltip" placement="top" variant="dark">
        <button className="inline-flex px-4 py-3 text-sm font-medium text-white rounded-lg bg-brand-500 shadow-theme-xs">
          Dark Tooltip
        </button>
      </Tooltip>
    </div>
  );
}
