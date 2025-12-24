import Tooltip from "./Tooltip";

export default function TooltipPlacement() {
  return (
    <div className="flex flex-col items-center gap-10 sm:flex-row">
      {/* <!-- Top --> */}
      <Tooltip content="This is a tooltip" placement="top">
        <button className="inline-flex px-4 py-3 text-sm font-medium text-white rounded-lg bg-brand-500 shadow-theme-xs">
          Tooltip Top
        </button>
      </Tooltip>

      {/* <!-- Right --> */}
      <Tooltip content="This is a tooltip" placement="right">
        <button className="inline-flex px-4 py-3 text-sm font-medium text-white rounded-lg bg-brand-500 shadow-theme-xs">
          Tooltip Right
        </button>
      </Tooltip>

      {/* <!-- Left --> */}
      <Tooltip content="This is a tooltip" placement="left">
        <button className="inline-flex px-4 py-3 text-sm font-medium text-white rounded-lg bg-brand-500 shadow-theme-xs">
          Tooltip Left
        </button>
      </Tooltip>

      {/* <!-- Bottom --> */}
      <Tooltip content="This is a tooltip" placement="bottom">
        <button className="inline-flex px-4 py-3 text-sm font-medium text-white rounded-lg bg-brand-500 shadow-theme-xs">
          Tooltip Bottom
        </button>
      </Tooltip>
    </div>
  );
}
